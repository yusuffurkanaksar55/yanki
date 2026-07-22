create or replace function public.require_active_system_admin(
  actor_user_id uuid,
  managed_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.user_profiles profile
    join public.user_role_assignments role_assignment
      on role_assignment.user_id = profile.user_id
    where profile.user_id = actor_user_id
      and profile.onboarding_status = 'ACTIVE'
      and role_assignment.role_code = 'SYSTEM_ADMIN'
      and role_assignment.starts_at <= now()
      and (
        role_assignment.ends_at is null
        or role_assignment.ends_at > now()
      )
      and (
        (
          role_assignment.scope_type = 'PLATFORM'
          and role_assignment.scope_id is null
        )
        or (
          role_assignment.scope_type = 'ORGANIZATION'
          and role_assignment.scope_id = managed_organization_id
        )
      )
  ) then
    raise exception 'ADMINISTRATION_SCOPE_DENIED';
  end if;
end;
$$;

revoke all on function public.require_active_system_admin(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.require_active_system_admin(uuid, uuid)
to service_role;

create or replace function public.validate_manager_assignment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_manager_id uuid;
  hierarchy_depth integer := 0;
  scope_organization_id uuid;
begin
  if new.scope_unit_id is not null then
    select organization_id
      into scope_organization_id
    from public.organization_units
    where id = new.scope_unit_id
      and status = 'ACTIVE';

    if scope_organization_id is null then
      raise exception 'MANAGER_SCOPE_UNIT_INVALID';
    end if;

    if scope_organization_id <> new.organization_id then
      raise exception 'MANAGER_SCOPE_ORGANIZATION_MISMATCH';
    end if;
  end if;

  if new.ends_at is not null and new.ends_at <= now() then
    return new;
  end if;

  if not exists (
    select 1
    from public.organization_unit_memberships membership
    join public.user_profiles profile
      on profile.user_id = membership.user_id
    where membership.organization_id = new.organization_id
      and membership.user_id = new.manager_user_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())
      and profile.onboarding_status = 'ACTIVE'
  ) then
    raise exception 'MANAGER_NOT_ACTIVE_IN_ORGANIZATION';
  end if;

  if not exists (
    select 1
    from public.organization_unit_memberships membership
    join public.user_profiles profile
      on profile.user_id = membership.user_id
    where membership.organization_id = new.organization_id
      and membership.user_id = new.direct_report_user_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())
      and profile.onboarding_status = 'ACTIVE'
  ) then
    raise exception 'DIRECT_REPORT_NOT_ACTIVE_IN_ORGANIZATION';
  end if;

  if new.relationship_type <> 'DIRECT_MANAGER' then
    return new;
  end if;

  current_manager_id := new.manager_user_id;

  while current_manager_id is not null loop
    if current_manager_id = new.direct_report_user_id then
      raise exception 'MANAGER_ASSIGNMENT_CYCLE';
    end if;

    hierarchy_depth := hierarchy_depth + 1;

    if hierarchy_depth > 100 then
      raise exception 'MANAGER_HIERARCHY_DEPTH_EXCEEDED';
    end if;

    select manager_user_id
      into current_manager_id
    from public.manager_assignments
    where direct_report_user_id = current_manager_id
      and relationship_type = 'DIRECT_MANAGER'
      and organization_id = new.organization_id
      and id is distinct from new.id
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    limit 1;
  end loop;

  return new;
end;
$$;

drop trigger if exists manager_assignments_validate_scope
on public.manager_assignments;

create trigger manager_assignments_validate_scope
before insert or update of
  organization_id,
  scope_unit_id,
  manager_user_id,
  direct_report_user_id,
  relationship_type,
  ends_at
on public.manager_assignments
for each row
execute function public.validate_manager_assignment_scope();

create or replace function public.admin_upsert_organization_unit(
  actor_user_id uuid,
  managed_organization_id uuid,
  managed_unit_id uuid,
  unit_name text,
  unit_slug text,
  managed_unit_type text,
  managed_parent_unit_id uuid,
  managed_status text
)
returns public.organization_units
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.organization_units%rowtype;
  operation text;
begin
  perform public.require_active_system_admin(
    actor_user_id,
    managed_organization_id
  );

  if not exists (
    select 1
    from public.organizations organization
    where organization.id = managed_organization_id
      and organization.status = 'ACTIVE'
  ) then
    raise exception 'ORGANIZATION_NOT_ACTIVE';
  end if;

  unit_name := btrim(unit_name);
  unit_slug := lower(btrim(unit_slug));

  if length(unit_name) < 2 or length(unit_name) > 120 then
    raise exception 'UNIT_NAME_INVALID';
  end if;

  if managed_unit_type not in ('DEPARTMENT', 'UNIT', 'TEAM', 'CUSTOM') then
    raise exception 'UNIT_TYPE_INVALID';
  end if;

  if managed_status not in ('ACTIVE', 'ARCHIVED') then
    raise exception 'UNIT_STATUS_INVALID';
  end if;

  if managed_unit_id is null then
    if managed_status <> 'ACTIVE' then
      raise exception 'NEW_UNIT_STATUS_INVALID';
    end if;

    if unit_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or length(unit_slug) > 120 then
      raise exception 'UNIT_SLUG_INVALID';
    end if;

    insert into public.organization_units (
      organization_id,
      parent_unit_id,
      unit_type,
      name,
      slug
    ) values (
      managed_organization_id,
      managed_parent_unit_id,
      managed_unit_type,
      unit_name,
      unit_slug
    )
    returning * into result;

    operation := 'CREATED';
  else
    select *
      into result
    from public.organization_units
    where id = managed_unit_id
      and organization_id = managed_organization_id
    for update;

    if not found then
      raise exception 'UNIT_NOT_FOUND';
    end if;

    if managed_status = 'ARCHIVED' and result.status <> 'ARCHIVED' then
      if exists (
        select 1
        from public.organization_units child
        where child.parent_unit_id = managed_unit_id
          and child.status = 'ACTIVE'
      ) or exists (
        select 1
        from public.organization_unit_memberships membership
        where membership.unit_id = managed_unit_id
          and membership.starts_at <= now()
          and (membership.ends_at is null or membership.ends_at > now())
      ) or exists (
        select 1
        from public.user_role_assignments role_assignment
        where role_assignment.scope_id = managed_unit_id
          and role_assignment.scope_type in ('DEPARTMENT', 'UNIT', 'TEAM')
          and role_assignment.starts_at <= now()
          and (
            role_assignment.ends_at is null
            or role_assignment.ends_at > now()
          )
      ) or exists (
        select 1
        from public.manager_assignments manager_assignment
        where manager_assignment.scope_unit_id = managed_unit_id
          and manager_assignment.starts_at <= now()
          and (
            manager_assignment.ends_at is null
            or manager_assignment.ends_at > now()
          )
      ) then
        raise exception 'UNIT_ARCHIVE_BLOCKED';
      end if;
    end if;

    update public.organization_units
    set name = unit_name,
        parent_unit_id = managed_parent_unit_id,
        unit_type = managed_unit_type,
        status = managed_status
    where id = managed_unit_id
    returning * into result;

    operation := 'UPDATED';
  end if;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'ORGANIZATION',
    managed_organization_id,
    'ORGANIZATION_UNIT_' || operation,
    jsonb_build_object(
      'unitId', result.id,
      'status', result.status
    )
  );

  return result;
end;
$$;

revoke all on function public.admin_upsert_organization_unit(
  uuid, uuid, uuid, text, text, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.admin_upsert_organization_unit(
  uuid, uuid, uuid, text, text, text, uuid, text
) to service_role;

create or replace function public.admin_set_user_hierarchy_context(
  actor_user_id uuid,
  managed_organization_id uuid,
  target_user_id uuid,
  primary_unit_id uuid,
  primary_membership_kind text,
  direct_manager_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_membership_id uuid;
  mutation_time timestamptz := clock_timestamp();
begin
  perform public.require_active_system_admin(
    actor_user_id,
    managed_organization_id
  );

  if primary_membership_kind not in ('MEMBER', 'LEADER') then
    raise exception 'MEMBERSHIP_KIND_INVALID';
  end if;

  if not exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = target_user_id
      and profile.onboarding_status = 'ACTIVE'
  ) then
    raise exception 'TARGET_USER_NOT_ACTIVE';
  end if;

  if not exists (
    select 1
    from public.organization_units unit
    where unit.id = primary_unit_id
      and unit.organization_id = managed_organization_id
      and unit.status = 'ACTIVE'
  ) then
    raise exception 'PRIMARY_UNIT_INVALID';
  end if;

  if not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.organization_id = managed_organization_id
      and membership.user_id = target_user_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())
  ) then
    raise exception 'TARGET_USER_OUTSIDE_ORGANIZATION';
  end if;

  update public.organization_unit_memberships membership
  set ends_at = greatest(
        mutation_time,
        membership.starts_at + interval '1 microsecond'
      ),
      is_primary = false
  where membership.organization_id = managed_organization_id
    and membership.user_id = target_user_id
    and membership.is_primary
    and membership.starts_at <= mutation_time
    and (membership.ends_at is null or membership.ends_at > mutation_time)
    and (
      membership.unit_id <> primary_unit_id
      or membership.membership_kind <> primary_membership_kind
    );

  select membership.id
    into active_membership_id
  from public.organization_unit_memberships membership
  where membership.unit_id = primary_unit_id
    and membership.user_id = target_user_id
    and membership.membership_kind = primary_membership_kind
    and membership.starts_at <= mutation_time
    and (membership.ends_at is null or membership.ends_at > mutation_time)
  limit 1;

  if active_membership_id is null then
    insert into public.organization_unit_memberships (
      organization_id,
      unit_id,
      user_id,
      membership_kind,
      is_primary
    ) values (
      managed_organization_id,
      primary_unit_id,
      target_user_id,
      primary_membership_kind,
      true
    );
  else
    update public.organization_unit_memberships
    set is_primary = true
    where id = active_membership_id;
  end if;

  update public.manager_assignments manager_assignment
  set ends_at = greatest(
        mutation_time,
        manager_assignment.starts_at + interval '1 microsecond'
      )
  where manager_assignment.organization_id = managed_organization_id
    and manager_assignment.direct_report_user_id = target_user_id
    and manager_assignment.relationship_type = 'DIRECT_MANAGER'
    and manager_assignment.starts_at <= mutation_time
    and (
      manager_assignment.ends_at is null
      or manager_assignment.ends_at > mutation_time
    )
    and manager_assignment.manager_user_id is distinct from direct_manager_user_id;

  if direct_manager_user_id is not null and not exists (
    select 1
    from public.manager_assignments manager_assignment
    where manager_assignment.organization_id = managed_organization_id
      and manager_assignment.manager_user_id = direct_manager_user_id
      and manager_assignment.direct_report_user_id = target_user_id
      and manager_assignment.relationship_type = 'DIRECT_MANAGER'
      and manager_assignment.starts_at <= mutation_time
      and (
        manager_assignment.ends_at is null
        or manager_assignment.ends_at > mutation_time
      )
  ) then
    insert into public.manager_assignments (
      organization_id,
      manager_user_id,
      direct_report_user_id,
      relationship_type,
      scope_unit_id
    ) values (
      managed_organization_id,
      direct_manager_user_id,
      target_user_id,
      'DIRECT_MANAGER',
      primary_unit_id
    );
  end if;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'ORGANIZATION',
    managed_organization_id,
    'USER_HIERARCHY_CONTEXT_UPDATED',
    jsonb_build_object(
      'targetUserId', target_user_id,
      'primaryUnitId', primary_unit_id,
      'membershipKind', primary_membership_kind,
      'hasDirectManager', direct_manager_user_id is not null
    )
  );

  return jsonb_build_object(
    'organizationId', managed_organization_id,
    'userId', target_user_id
  );
end;
$$;

revoke all on function public.admin_set_user_hierarchy_context(
  uuid, uuid, uuid, uuid, text, uuid
) from public, anon, authenticated;
grant execute on function public.admin_set_user_hierarchy_context(
  uuid, uuid, uuid, uuid, text, uuid
) to service_role;

create or replace function public.admin_assign_user_role(
  actor_user_id uuid,
  managed_organization_id uuid,
  target_user_id uuid,
  assigned_role_code text,
  assigned_unit_id uuid
)
returns public.user_role_assignments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  assigned_scope_id uuid;
  assigned_scope_type text;
  result public.user_role_assignments%rowtype;
  unit_type text;
begin
  perform public.require_active_system_admin(
    actor_user_id,
    managed_organization_id
  );

  if assigned_role_code not in (
    'SYSTEM_ADMIN',
    'EMPLOYEE',
    'TEAM_LEADER',
    'C_LEVEL_REVIEWER',
    'BOARD_REVIEWER'
  ) then
    raise exception 'ROLE_NOT_MANAGEABLE';
  end if;

  if not exists (
    select 1
    from public.user_profiles profile
    join public.organization_unit_memberships membership
      on membership.user_id = profile.user_id
    where profile.user_id = target_user_id
      and profile.onboarding_status = 'ACTIVE'
      and membership.organization_id = managed_organization_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())
  ) then
    raise exception 'TARGET_USER_OUTSIDE_ORGANIZATION';
  end if;

  if assigned_role_code in (
    'SYSTEM_ADMIN',
    'C_LEVEL_REVIEWER',
    'BOARD_REVIEWER'
  ) then
    assigned_scope_type := 'ORGANIZATION';
    assigned_scope_id := managed_organization_id;
  else
    select unit.unit_type
      into unit_type
    from public.organization_units unit
    join public.organization_unit_memberships membership
      on membership.unit_id = unit.id
      and membership.organization_id = unit.organization_id
    where unit.id = assigned_unit_id
      and unit.organization_id = managed_organization_id
      and unit.status = 'ACTIVE'
      and membership.user_id = target_user_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())
    limit 1;

    if unit_type is null then
      raise exception 'ROLE_UNIT_MEMBERSHIP_REQUIRED';
    end if;

    assigned_scope_type := case
      when unit_type in ('DEPARTMENT', 'TEAM') then unit_type
      else 'UNIT'
    end;
    assigned_scope_id := assigned_unit_id;
  end if;

  select *
    into result
  from public.user_role_assignments role_assignment
  where role_assignment.user_id = target_user_id
    and role_assignment.role_code = assigned_role_code
    and role_assignment.scope_type = assigned_scope_type
    and role_assignment.scope_id is not distinct from assigned_scope_id
    and role_assignment.starts_at <= now()
    and (
      role_assignment.ends_at is null
      or role_assignment.ends_at > now()
    )
  limit 1;

  if result.id is null then
    insert into public.user_role_assignments (
      user_id,
      role_code,
      scope_type,
      scope_id
    ) values (
      target_user_id,
      assigned_role_code,
      assigned_scope_type,
      assigned_scope_id
    )
    returning * into result;

    insert into public.audit_events (
      actor_user_id,
      event_scope_type,
      event_scope_id,
      event_type,
      safe_metadata
    ) values (
      actor_user_id,
      'ORGANIZATION',
      managed_organization_id,
      'USER_ROLE_ASSIGNED',
      jsonb_build_object(
        'targetUserId', target_user_id,
        'roleAssignmentId', result.id,
        'roleCode', assigned_role_code,
        'scopeType', assigned_scope_type,
        'scopeId', assigned_scope_id
      )
    );
  end if;

  return result;
end;
$$;

revoke all on function public.admin_assign_user_role(
  uuid, uuid, uuid, text, uuid
) from public, anon, authenticated;
grant execute on function public.admin_assign_user_role(
  uuid, uuid, uuid, text, uuid
) to service_role;

create or replace function public.admin_end_user_role(
  actor_user_id uuid,
  managed_organization_id uuid,
  role_assignment_id uuid
)
returns public.user_role_assignments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  assignment_organization_id uuid;
  mutation_time timestamptz := clock_timestamp();
  result public.user_role_assignments%rowtype;
begin
  perform public.require_active_system_admin(
    actor_user_id,
    managed_organization_id
  );

  select role_assignment.*
    into result
  from public.user_role_assignments role_assignment
  where role_assignment.id = role_assignment_id
    and role_assignment.starts_at <= mutation_time
    and (
      role_assignment.ends_at is null
      or role_assignment.ends_at > mutation_time
    )
  for update of role_assignment;

  if result.id is null or result.role_code = 'PROJECT_MANAGER' then
    raise exception 'ROLE_ASSIGNMENT_NOT_FOUND';
  end if;

  if result.scope_type = 'ORGANIZATION' then
    assignment_organization_id := result.scope_id;
  elsif result.scope_type in ('DEPARTMENT', 'UNIT', 'TEAM') then
    select unit.organization_id
      into assignment_organization_id
    from public.organization_units unit
    where unit.id = result.scope_id;
  end if;

  if assignment_organization_id is distinct from managed_organization_id then
    raise exception 'ROLE_ASSIGNMENT_NOT_FOUND';
  end if;

  if result.role_code = 'SYSTEM_ADMIN'
    and result.scope_type = 'ORGANIZATION'
    and not exists (
      select 1
      from public.user_role_assignments other_admin
      where other_admin.id <> result.id
        and other_admin.role_code = 'SYSTEM_ADMIN'
        and other_admin.scope_type = 'ORGANIZATION'
        and other_admin.scope_id = managed_organization_id
        and other_admin.starts_at <= mutation_time
        and (
          other_admin.ends_at is null
          or other_admin.ends_at > mutation_time
        )
    ) then
    raise exception 'LAST_SYSTEM_ADMIN_REQUIRED';
  end if;

  update public.user_role_assignments
  set ends_at = greatest(
        mutation_time,
        starts_at + interval '1 microsecond'
      )
  where id = result.id
  returning * into result;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'ORGANIZATION',
    managed_organization_id,
    'USER_ROLE_ENDED',
    jsonb_build_object(
      'targetUserId', result.user_id,
      'roleAssignmentId', result.id,
      'roleCode', result.role_code,
      'scopeType', result.scope_type,
      'scopeId', result.scope_id
    )
  );

  return result;
end;
$$;

revoke all on function public.admin_end_user_role(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.admin_end_user_role(uuid, uuid, uuid)
to service_role;

comment on function public.admin_upsert_organization_unit(
  uuid, uuid, uuid, text, text, text, uuid, text
) is 'Service-role-only atomic organization-unit administration with scoped system-admin validation and safe audit metadata.';

comment on function public.admin_set_user_hierarchy_context(
  uuid, uuid, uuid, uuid, text, uuid
) is 'Service-role-only atomic primary membership and direct-manager administration. Stores identity-domain metadata only.';

comment on function public.admin_assign_user_role(
  uuid, uuid, uuid, text, uuid
) is 'Service-role-only scoped role assignment for active organization members.';

comment on function public.admin_end_user_role(uuid, uuid, uuid)
is 'Service-role-only role termination with last organization system-admin protection.';

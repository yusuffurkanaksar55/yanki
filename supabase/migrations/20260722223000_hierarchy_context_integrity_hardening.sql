create or replace function public.validate_organization_unit_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_parent_id uuid;
  parent_organization_id uuid;
  parent_status text;
begin
  if new.parent_unit_id is null then
    return new;
  end if;

  select organization_id, status
    into parent_organization_id, parent_status
  from public.organization_units
  where id = new.parent_unit_id;

  if parent_organization_id is null then
    raise exception 'UNIT_PARENT_NOT_FOUND';
  end if;

  if parent_organization_id <> new.organization_id then
    raise exception 'UNIT_PARENT_ORGANIZATION_MISMATCH';
  end if;

  if new.status = 'ACTIVE' and parent_status <> 'ACTIVE' then
    raise exception 'UNIT_PARENT_NOT_ACTIVE';
  end if;

  current_parent_id := new.parent_unit_id;

  while current_parent_id is not null loop
    if current_parent_id = new.id then
      raise exception 'UNIT_HIERARCHY_CYCLE';
    end if;

    select parent_unit_id
      into current_parent_id
    from public.organization_units
    where id = current_parent_id;
  end loop;

  return new;
end;
$$;

drop trigger if exists organization_units_validate_parent
on public.organization_units;

create trigger organization_units_validate_parent
before insert or update of organization_id, parent_unit_id, status
on public.organization_units
for each row
execute function public.validate_organization_unit_parent();

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
  ended_orphaned_role_count integer := 0;
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

  update public.user_role_assignments role_assignment
  set ends_at = greatest(
        mutation_time,
        role_assignment.starts_at + interval '1 microsecond'
      )
  where role_assignment.user_id = target_user_id
    and role_assignment.scope_type in ('DEPARTMENT', 'UNIT', 'TEAM')
    and role_assignment.starts_at <= mutation_time
    and (
      role_assignment.ends_at is null
      or role_assignment.ends_at > mutation_time
    )
    and exists (
      select 1
      from public.organization_units unit
      where unit.id = role_assignment.scope_id
        and unit.organization_id = managed_organization_id
    )
    and not exists (
      select 1
      from public.organization_unit_memberships membership
      where membership.user_id = target_user_id
        and membership.unit_id = role_assignment.scope_id
        and membership.starts_at <= mutation_time
        and (membership.ends_at is null or membership.ends_at > mutation_time)
    );

  get diagnostics ended_orphaned_role_count = row_count;

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

  if direct_manager_user_id is not null then
    update public.manager_assignments manager_assignment
    set scope_unit_id = primary_unit_id
    where manager_assignment.organization_id = managed_organization_id
      and manager_assignment.manager_user_id = direct_manager_user_id
      and manager_assignment.direct_report_user_id = target_user_id
      and manager_assignment.relationship_type = 'DIRECT_MANAGER'
      and manager_assignment.starts_at <= mutation_time
      and (
        manager_assignment.ends_at is null
        or manager_assignment.ends_at > mutation_time
      )
      and manager_assignment.scope_unit_id is distinct from primary_unit_id;

    if not exists (
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
      'hasDirectManager', direct_manager_user_id is not null,
      'endedOrphanedRoleCount', ended_orphaned_role_count
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

comment on function public.admin_set_user_hierarchy_context(
  uuid, uuid, uuid, uuid, text, uuid
) is 'Service-role-only atomic primary membership and direct-manager administration with stale unit-role cleanup. Stores identity-domain metadata only.';

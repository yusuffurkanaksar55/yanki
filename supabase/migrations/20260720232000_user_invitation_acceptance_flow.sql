alter table public.user_invitations
add column display_name text,
add column organization_id uuid references public.organizations (id) on delete cascade,
add column unit_id uuid,
add column membership_kind text not null default 'MEMBER',
add column manager_user_id uuid references auth.users (id) on delete set null,
add column invited_auth_user_id uuid references auth.users (id) on delete set null;

alter table public.user_invitations
add constraint user_invitations_display_name_not_blank check (
  display_name is null or length(btrim(display_name)) > 0
),
add constraint user_invitations_membership_kind_check check (
  membership_kind in ('MEMBER', 'LEADER')
),
add constraint user_invitations_hierarchy_pair_check check (
  (organization_id is null and unit_id is null)
  or (organization_id is not null and unit_id is not null)
),
add constraint user_invitations_unit_fk foreign key (organization_id, unit_id)
references public.organization_units (organization_id, id) on delete cascade;

create unique index user_invitations_open_auth_user_unique_idx
on public.user_invitations (invited_auth_user_id)
where invited_auth_user_id is not null
  and accepted_at is null
  and revoked_at is null;

create index user_invitations_organization_lookup_idx
on public.user_invitations (organization_id, created_at desc)
where organization_id is not null;

create or replace function public.validate_user_invitation_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  invitation_unit_type text;
  manager_in_organization boolean;
begin
  if new.organization_id is null then
    if new.unit_id is not null or new.manager_user_id is not null then
      raise exception 'Invitation hierarchy context is incomplete.';
    end if;

    return new;
  end if;

  if new.unit_id is null then
    raise exception 'Invitation organization requires a unit.';
  end if;

  select unit_type
    into invitation_unit_type
  from public.organization_units
  where id = new.unit_id
    and organization_id = new.organization_id
    and status = 'ACTIVE';

  if invitation_unit_type is null then
    raise exception 'Invitation unit must be active and belong to the organization.';
  end if;

  if new.invited_scope_type = 'ORGANIZATION' then
    if new.invited_scope_id <> new.organization_id then
      raise exception 'Organization invitation scope must match the invitation organization.';
    end if;
  elsif new.invited_scope_type in ('DEPARTMENT', 'UNIT', 'TEAM') then
    if new.invited_scope_id <> new.unit_id then
      raise exception 'Unit invitation scope must match the invitation unit.';
    end if;

    if invitation_unit_type <> new.invited_scope_type
      and not (
        invitation_unit_type = 'CUSTOM'
        and new.invited_scope_type = 'UNIT'
      ) then
      raise exception 'Invitation scope type must match the invitation unit type.';
    end if;
  else
    raise exception 'Invitation hierarchy supports organization and unit scopes only.';
  end if;

  if new.manager_user_id is not null then
    select exists (
      select 1
      from public.organization_unit_memberships membership
      join public.user_profiles profile
        on profile.user_id = membership.user_id
      where membership.organization_id = new.organization_id
        and membership.user_id = new.manager_user_id
        and membership.starts_at <= now()
        and (membership.ends_at is null or membership.ends_at > now())
        and profile.onboarding_status = 'ACTIVE'
    ) into manager_in_organization;

    if not manager_in_organization then
      raise exception 'Invitation manager must be an active organization member.';
    end if;
  end if;

  return new;
end;
$$;

create trigger user_invitations_validate_hierarchy
before insert or update of
  organization_id,
  unit_id,
  manager_user_id,
  invited_scope_type,
  invited_scope_id
on public.user_invitations
for each row
execute function public.validate_user_invitation_hierarchy();

create or replace function public.accept_user_invitation(
  invitation_id uuid,
  accepting_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invitation_record public.user_invitations%rowtype;
  accepting_email text;
  primary_membership boolean;
begin
  select *
    into invitation_record
  from public.user_invitations
  where id = invitation_id
  for update;

  if invitation_record.id is null then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if invitation_record.accepted_at is not null then
    raise exception 'INVITATION_ALREADY_ACCEPTED';
  end if;

  if invitation_record.revoked_at is not null then
    raise exception 'INVITATION_REVOKED';
  end if;

  if invitation_record.expires_at <= now() then
    raise exception 'INVITATION_EXPIRED';
  end if;

  if invitation_record.invited_auth_user_id is null
    or invitation_record.invited_auth_user_id <> accepting_user_id then
    raise exception 'INVITATION_USER_MISMATCH';
  end if;

  select lower(email)
    into accepting_email
  from auth.users
  where id = accepting_user_id;

  if accepting_email is null
    or accepting_email <> lower(invitation_record.email) then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  if invitation_record.display_name is null
    or invitation_record.organization_id is null
    or invitation_record.unit_id is null then
    raise exception 'INVITATION_CONTEXT_INCOMPLETE';
  end if;

  insert into public.user_profiles (
    user_id,
    email,
    display_name,
    onboarding_status,
    activated_at
  ) values (
    accepting_user_id,
    accepting_email,
    invitation_record.display_name,
    'ACTIVE',
    now()
  )
  on conflict (user_id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      onboarding_status = 'ACTIVE',
      activated_at = coalesce(public.user_profiles.activated_at, now());

  if not exists (
    select 1
    from public.user_role_assignments role_assignment
    where role_assignment.user_id = accepting_user_id
      and role_assignment.role_code = invitation_record.invited_role_code
      and role_assignment.scope_type = invitation_record.invited_scope_type
      and role_assignment.scope_id is not distinct from invitation_record.invited_scope_id
      and role_assignment.ends_at is null
  ) then
    insert into public.user_role_assignments (
      user_id,
      role_code,
      scope_type,
      scope_id
    ) values (
      accepting_user_id,
      invitation_record.invited_role_code,
      invitation_record.invited_scope_type,
      invitation_record.invited_scope_id
    );
  end if;

  select not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.organization_id = invitation_record.organization_id
      and membership.user_id = accepting_user_id
      and membership.is_primary
      and membership.ends_at is null
  ) into primary_membership;

  if not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.unit_id = invitation_record.unit_id
      and membership.user_id = accepting_user_id
      and membership.membership_kind = invitation_record.membership_kind
      and membership.ends_at is null
  ) then
    insert into public.organization_unit_memberships (
      organization_id,
      unit_id,
      user_id,
      membership_kind,
      is_primary
    ) values (
      invitation_record.organization_id,
      invitation_record.unit_id,
      accepting_user_id,
      invitation_record.membership_kind,
      primary_membership
    );
  end if;

  if invitation_record.manager_user_id is not null then
    if exists (
      select 1
      from public.manager_assignments manager_assignment
      where manager_assignment.direct_report_user_id = accepting_user_id
        and manager_assignment.relationship_type = 'DIRECT_MANAGER'
        and manager_assignment.ends_at is null
    ) then
      update public.manager_assignments
      set organization_id = invitation_record.organization_id,
          manager_user_id = invitation_record.manager_user_id,
          scope_unit_id = invitation_record.unit_id
      where direct_report_user_id = accepting_user_id
        and relationship_type = 'DIRECT_MANAGER'
        and ends_at is null;
    else
      insert into public.manager_assignments (
        organization_id,
        manager_user_id,
        direct_report_user_id,
        relationship_type,
        scope_unit_id
      ) values (
        invitation_record.organization_id,
        invitation_record.manager_user_id,
        accepting_user_id,
        'DIRECT_MANAGER',
        invitation_record.unit_id
      );
    end if;
  end if;

  update public.user_invitations
  set accepted_by_user_id = accepting_user_id,
      accepted_at = now()
  where id = invitation_record.id;

  insert into public.audit_events (
    actor_user_id,
    event_type,
    event_scope_type,
    event_scope_id,
    safe_metadata
  ) values (
    accepting_user_id,
    'USER_INVITATION_ACCEPTED',
    'ORGANIZATION',
    invitation_record.organization_id,
    jsonb_build_object(
      'invitationId', invitation_record.id,
      'roleCode', invitation_record.invited_role_code,
      'scopeType', invitation_record.invited_scope_type
    )
  );

  return jsonb_build_object(
    'user_id', accepting_user_id,
    'email', accepting_email,
    'display_name', invitation_record.display_name,
    'onboarding_status', 'ACTIVE'
  );
end;
$$;

revoke all on function public.accept_user_invitation(uuid, uuid) from public;
revoke all on function public.accept_user_invitation(uuid, uuid) from anon;
revoke all on function public.accept_user_invitation(uuid, uuid) from authenticated;
grant execute on function public.accept_user_invitation(uuid, uuid) to service_role;

comment on function public.accept_user_invitation(uuid, uuid) is
  'Atomically activates an invited profile and creates identity-domain role, unit membership, manager, and audit records. Service role only.';

comment on column public.user_invitations.invited_auth_user_id is
  'Supabase Auth user created by the trusted invitation sender. Acceptance requires the authenticated caller to match this id and invitation email.';

comment on column public.user_invitations.token_hash is
  'Hash of a server-only invitation correlation secret. Supabase Auth delivers and verifies the user-facing invitation link; no raw custom secret is returned to the browser.';

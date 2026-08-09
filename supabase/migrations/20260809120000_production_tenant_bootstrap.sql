create table public.tenant_bootstrap_operations (
  request_id uuid primary key,
  request_fingerprint text not null,
  organization_id uuid not null unique
    references public.organizations (id) on delete restrict,
  initial_unit_id uuid not null,
  administrator_user_id uuid not null unique
    references auth.users (id) on delete restrict,
  invitation_id uuid not null unique
    references public.user_invitations (id) on delete restrict,
  completed_at timestamptz not null default now(),
  constraint tenant_bootstrap_operations_fingerprint_check check (
    request_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint tenant_bootstrap_operations_unit_fk foreign key (
    organization_id,
    initial_unit_id
  ) references public.organization_units (organization_id, id) on delete restrict
);

alter table public.tenant_bootstrap_operations enable row level security;

create or replace function public.get_tenant_bootstrap_operation(
  bootstrap_request_id uuid,
  expected_request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  operation_record record;
begin
  if bootstrap_request_id is null
    or expected_request_fingerprint is null
    or expected_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'TENANT_BOOTSTRAP_REQUEST_INVALID';
  end if;

  select
    operation.request_id,
    operation.request_fingerprint,
    operation.organization_id,
    operation.initial_unit_id,
    operation.administrator_user_id,
    operation.invitation_id,
    operation.completed_at,
    organization.slug as organization_slug,
    invitation.accepted_at,
    invitation.revoked_at,
    invitation.expires_at
    into operation_record
  from public.tenant_bootstrap_operations operation
  join public.organizations organization
    on organization.id = operation.organization_id
  join public.user_invitations invitation
    on invitation.id = operation.invitation_id
  where operation.request_id = bootstrap_request_id;

  if operation_record.request_id is null then
    return jsonb_build_object('found', false);
  end if;

  if operation_record.request_fingerprint <> expected_request_fingerprint then
    raise exception 'TENANT_BOOTSTRAP_REQUEST_CONFLICT';
  end if;

  return jsonb_build_object(
    'found', true,
    'requestId', operation_record.request_id,
    'organizationId', operation_record.organization_id,
    'organizationSlug', operation_record.organization_slug,
    'initialUnitId', operation_record.initial_unit_id,
    'administratorUserId', operation_record.administrator_user_id,
    'invitationId', operation_record.invitation_id,
    'invitationAccepted', operation_record.accepted_at is not null,
    'invitationRevoked', operation_record.revoked_at is not null,
    'invitationExpired', operation_record.expires_at <= now(),
    'completedAt', operation_record.completed_at
  );
end;
$$;

create or replace function public.bootstrap_organization_tenant(
  bootstrap_request_id uuid,
  expected_request_fingerprint text,
  bootstrap_administrator_user_id uuid,
  organization_name text,
  organization_slug text,
  administrator_email text,
  administrator_display_name text,
  initial_unit_name text,
  initial_unit_slug text,
  invitation_expires_in_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_operation jsonb;
  normalized_organization_name text := btrim(organization_name);
  normalized_organization_slug text := lower(btrim(organization_slug));
  normalized_administrator_email text := lower(btrim(administrator_email));
  normalized_administrator_display_name text := btrim(administrator_display_name);
  normalized_initial_unit_name text := btrim(initial_unit_name);
  normalized_initial_unit_slug text := lower(btrim(initial_unit_slug));
  calculated_request_fingerprint text;
  auth_user_record record;
  created_organization_id uuid;
  created_initial_unit_id uuid;
  created_invitation_id uuid;
  invitation_expires_at timestamptz;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('bootstrap_organization_tenant', 0)
  );

  if bootstrap_request_id is null
    or bootstrap_administrator_user_id is null
    or expected_request_fingerprint is null then
    raise exception 'TENANT_BOOTSTRAP_REQUEST_INVALID';
  end if;

  if length(normalized_organization_name) < 2
    or length(normalized_organization_name) > 120 then
    raise exception 'TENANT_BOOTSTRAP_ORGANIZATION_NAME_INVALID';
  end if;

  if length(normalized_organization_slug) < 3
    or length(normalized_organization_slug) > 63
    or normalized_organization_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'TENANT_BOOTSTRAP_ORGANIZATION_SLUG_INVALID';
  end if;

  if length(normalized_administrator_email) > 320
    or normalized_administrator_email
      !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'TENANT_BOOTSTRAP_ADMINISTRATOR_EMAIL_INVALID';
  end if;

  if length(normalized_administrator_display_name) < 2
    or length(normalized_administrator_display_name) > 120 then
    raise exception 'TENANT_BOOTSTRAP_ADMINISTRATOR_NAME_INVALID';
  end if;

  if length(normalized_initial_unit_name) < 2
    or length(normalized_initial_unit_name) > 120 then
    raise exception 'TENANT_BOOTSTRAP_UNIT_NAME_INVALID';
  end if;

  if length(normalized_initial_unit_slug) < 2
    or length(normalized_initial_unit_slug) > 63
    or normalized_initial_unit_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'TENANT_BOOTSTRAP_UNIT_SLUG_INVALID';
  end if;

  if invitation_expires_in_days < 1 or invitation_expires_in_days > 30 then
    raise exception 'TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID';
  end if;

  calculated_request_fingerprint := encode(
    extensions.digest(
      convert_to(
        concat_ws(
          E'\n',
          normalized_organization_name,
          normalized_organization_slug,
          normalized_administrator_email,
          normalized_administrator_display_name,
          normalized_initial_unit_name,
          normalized_initial_unit_slug,
          invitation_expires_in_days::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  if expected_request_fingerprint <> calculated_request_fingerprint then
    raise exception 'TENANT_BOOTSTRAP_FINGERPRINT_INVALID';
  end if;

  existing_operation := public.get_tenant_bootstrap_operation(
    bootstrap_request_id,
    expected_request_fingerprint
  );

  if (existing_operation ->> 'found')::boolean then
    return existing_operation || jsonb_build_object('replayed', true);
  end if;

  select
    auth_user.id,
    auth_user.email,
    auth_user.raw_app_meta_data
    into auth_user_record
  from auth.users auth_user
  where auth_user.id = bootstrap_administrator_user_id;

  if auth_user_record.id is null
    or lower(auth_user_record.email) <> normalized_administrator_email then
    raise exception 'TENANT_BOOTSTRAP_AUTH_USER_INVALID';
  end if;

  if coalesce(
    auth_user_record.raw_app_meta_data ->> 'tenant_bootstrap_request_id',
    ''
  ) <> bootstrap_request_id::text then
    raise exception 'TENANT_BOOTSTRAP_AUTH_MARKER_INVALID';
  end if;

  if exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = bootstrap_administrator_user_id
      or lower(profile.email) = normalized_administrator_email
  ) or exists (
    select 1
    from public.user_role_assignments role_assignment
    where role_assignment.user_id = bootstrap_administrator_user_id
  ) or exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.user_id = bootstrap_administrator_user_id
  ) then
    raise exception 'TENANT_BOOTSTRAP_ADMINISTRATOR_ALREADY_CONFIGURED';
  end if;

  if exists (
    select 1
    from public.organizations organization
    where organization.slug = normalized_organization_slug
  ) then
    raise exception 'TENANT_BOOTSTRAP_ORGANIZATION_SLUG_EXISTS';
  end if;

  insert into public.organizations (name, slug, status)
  values (
    normalized_organization_name,
    normalized_organization_slug,
    'ACTIVE'
  )
  returning id into created_organization_id;

  insert into public.organization_units (
    organization_id,
    parent_unit_id,
    unit_type,
    name,
    slug,
    status
  ) values (
    created_organization_id,
    null,
    'CUSTOM',
    normalized_initial_unit_name,
    normalized_initial_unit_slug,
    'ACTIVE'
  )
  returning id into created_initial_unit_id;

  insert into public.user_profiles (
    user_id,
    email,
    display_name,
    onboarding_status,
    activated_at
  ) values (
    bootstrap_administrator_user_id,
    normalized_administrator_email,
    normalized_administrator_display_name,
    'INVITED',
    null
  );

  invitation_expires_at := now() + make_interval(days => invitation_expires_in_days);

  insert into public.user_invitations (
    email,
    token_hash,
    invited_role_code,
    invited_scope_type,
    invited_scope_id,
    invited_by_user_id,
    expires_at,
    display_name,
    organization_id,
    unit_id,
    membership_kind,
    manager_user_id,
    invited_auth_user_id
  ) values (
    normalized_administrator_email,
    encode(
      extensions.digest(extensions.gen_random_bytes(32), 'sha256'),
      'hex'
    ),
    'SYSTEM_ADMIN',
    'ORGANIZATION',
    created_organization_id,
    null,
    invitation_expires_at,
    normalized_administrator_display_name,
    created_organization_id,
    created_initial_unit_id,
    'MEMBER',
    null,
    bootstrap_administrator_user_id
  )
  returning id into created_invitation_id;

  insert into public.tenant_bootstrap_operations (
    request_id,
    request_fingerprint,
    organization_id,
    initial_unit_id,
    administrator_user_id,
    invitation_id
  ) values (
    bootstrap_request_id,
    expected_request_fingerprint,
    created_organization_id,
    created_initial_unit_id,
    bootstrap_administrator_user_id,
    created_invitation_id
  );

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    null,
    'ORGANIZATION',
    created_organization_id,
    'TENANT_BOOTSTRAP_CREATED',
    jsonb_build_object(
      'requestId', bootstrap_request_id,
      'invitationId', created_invitation_id,
      'initialUnitId', created_initial_unit_id,
      'invitationExpiresAt', invitation_expires_at
    )
  );

  return jsonb_build_object(
    'found', true,
    'replayed', false,
    'requestId', bootstrap_request_id,
    'organizationId', created_organization_id,
    'organizationSlug', normalized_organization_slug,
    'initialUnitId', created_initial_unit_id,
    'administratorUserId', bootstrap_administrator_user_id,
    'invitationId', created_invitation_id,
    'invitationAccepted', false,
    'invitationRevoked', false,
    'invitationExpired', false,
    'completedAt', now()
  );
end;
$$;

create or replace function public.renew_tenant_bootstrap_invitation(
  bootstrap_request_id uuid,
  expected_request_fingerprint text,
  invitation_expires_in_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  operation_record record;
  renewed_expires_at timestamptz;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('bootstrap_organization_tenant', 0)
  );

  if bootstrap_request_id is null
    or expected_request_fingerprint is null
    or expected_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'TENANT_BOOTSTRAP_REQUEST_INVALID';
  end if;

  if invitation_expires_in_days < 1 or invitation_expires_in_days > 30 then
    raise exception 'TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID';
  end if;

  select
    operation.request_fingerprint,
    operation.organization_id,
    operation.invitation_id,
    invitation.accepted_at,
    invitation.revoked_at
    into operation_record
  from public.tenant_bootstrap_operations operation
  join public.user_invitations invitation
    on invitation.id = operation.invitation_id
  where operation.request_id = bootstrap_request_id
  for update of operation, invitation;

  if operation_record.invitation_id is null then
    raise exception 'TENANT_BOOTSTRAP_REQUEST_NOT_FOUND';
  end if;

  if operation_record.request_fingerprint <> expected_request_fingerprint then
    raise exception 'TENANT_BOOTSTRAP_REQUEST_CONFLICT';
  end if;

  if operation_record.accepted_at is not null then
    raise exception 'TENANT_BOOTSTRAP_INVITATION_ALREADY_ACCEPTED';
  end if;

  if operation_record.revoked_at is not null then
    raise exception 'TENANT_BOOTSTRAP_INVITATION_REVOKED';
  end if;

  renewed_expires_at := now() + make_interval(days => invitation_expires_in_days);

  update public.user_invitations
  set expires_at = renewed_expires_at
  where id = operation_record.invitation_id;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    null,
    'ORGANIZATION',
    operation_record.organization_id,
    'TENANT_BOOTSTRAP_INVITATION_REISSUED',
    jsonb_build_object(
      'requestId', bootstrap_request_id,
      'invitationId', operation_record.invitation_id,
      'invitationExpiresAt', renewed_expires_at
    )
  );

  return jsonb_build_object(
    'renewed', true,
    'requestId', bootstrap_request_id,
    'organizationId', operation_record.organization_id,
    'invitationId', operation_record.invitation_id,
    'invitationExpiresAt', renewed_expires_at
  );
end;
$$;

revoke all on table public.tenant_bootstrap_operations
from public, anon, authenticated, service_role;

revoke all on function public.get_tenant_bootstrap_operation(uuid, text)
from public, anon, authenticated;
grant execute on function public.get_tenant_bootstrap_operation(uuid, text)
to service_role;

revoke all on function public.bootstrap_organization_tenant(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
) from public, anon, authenticated;
grant execute on function public.bootstrap_organization_tenant(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
) to service_role;

revoke all on function public.renew_tenant_bootstrap_invitation(
  uuid,
  text,
  integer
) from public, anon, authenticated;
grant execute on function public.renew_tenant_bootstrap_invitation(
  uuid,
  text,
  integer
) to service_role;

comment on table public.tenant_bootstrap_operations is
  'Content-free idempotency records for trusted tenant bootstrap operations. Direct API access is denied.';
comment on function public.get_tenant_bootstrap_operation(uuid, text) is
  'Returns content-free status for one exact service-role bootstrap request and rejects fingerprint reuse.';
comment on function public.bootstrap_organization_tenant(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
) is
  'Atomically creates one tenant, initial unit, invited administrator profile, invitation, retention policy, and content-free audit record for a marked Auth user.';
comment on function public.renew_tenant_bootstrap_invitation(uuid, text, integer) is
  'Renews an unaccepted and unrevoked initial-administrator invitation for one exact bootstrap request without producing an authentication token.';

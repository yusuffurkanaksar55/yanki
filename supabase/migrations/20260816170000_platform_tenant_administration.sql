create or replace function public.require_active_platform_system_admin(
  actor_user_id uuid
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
      and role_assignment.scope_type = 'PLATFORM'
      and role_assignment.scope_id is null
      and role_assignment.starts_at <= now()
      and (
        role_assignment.ends_at is null
        or role_assignment.ends_at > now()
      )
  ) then
    raise exception 'PLATFORM_ADMINISTRATION_SCOPE_DENIED' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.list_platform_organization_tenants(
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  perform public.require_active_platform_system_admin(actor_user_id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'organizationId', organization.id,
        'organizationName', organization.name,
        'organizationSlug', organization.slug,
        'organizationStatus', organization.status,
        'createdAt', organization.created_at,
        'bootstrapManaged', operation.request_id is not null,
        'requestId', operation.request_id,
        'administratorDisplayName', invitation.display_name,
        'administratorEmail', invitation.email,
        'invitationExpiresAt', invitation.expires_at,
        'invitationStatus', case
          when invitation.id is null then null
          when invitation.accepted_at is not null then 'ACCEPTED'
          when invitation.revoked_at is not null then 'REVOKED'
          when invitation.expires_at <= now() then 'EXPIRED'
          else 'PENDING'
        end
      )
      order by organization.created_at desc, organization.id
    ),
    '[]'::jsonb
  ) into result
  from public.organizations organization
  left join public.tenant_bootstrap_operations operation
    on operation.organization_id = organization.id
  left join public.user_invitations invitation
    on invitation.id = operation.invitation_id;

  return result;
end;
$$;

create or replace function public.platform_bootstrap_organization_tenant(
  actor_user_id uuid,
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
  result jsonb;
begin
  perform public.require_active_platform_system_admin(actor_user_id);

  result := public.bootstrap_organization_tenant(
    bootstrap_request_id,
    expected_request_fingerprint,
    bootstrap_administrator_user_id,
    organization_name,
    organization_slug,
    administrator_email,
    administrator_display_name,
    initial_unit_name,
    initial_unit_slug,
    invitation_expires_in_days
  );

  if not coalesce((result ->> 'replayed')::boolean, false) then
    insert into public.audit_events (
      actor_user_id,
      event_scope_type,
      event_scope_id,
      event_type,
      safe_metadata
    ) values (
      actor_user_id,
      'ORGANIZATION',
      (result ->> 'organizationId')::uuid,
      'PLATFORM_TENANT_CREATED',
      jsonb_build_object(
        'requestId', bootstrap_request_id,
        'invitationId', (result ->> 'invitationId')::uuid,
        'initialUnitId', (result ->> 'initialUnitId')::uuid
      )
    );
  end if;

  return result;
end;
$$;

create or replace function public.platform_renew_tenant_bootstrap_invitation(
  actor_user_id uuid,
  bootstrap_request_id uuid,
  invitation_expires_in_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  operation_record record;
  result jsonb;
begin
  perform public.require_active_platform_system_admin(actor_user_id);

  select
    operation.request_fingerprint,
    operation.organization_id,
    invitation.email
    into operation_record
  from public.tenant_bootstrap_operations operation
  join public.user_invitations invitation
    on invitation.id = operation.invitation_id
  where operation.request_id = bootstrap_request_id;

  if operation_record.request_fingerprint is null then
    raise exception 'TENANT_BOOTSTRAP_REQUEST_NOT_FOUND';
  end if;

  result := public.renew_tenant_bootstrap_invitation(
    bootstrap_request_id,
    operation_record.request_fingerprint,
    invitation_expires_in_days
  );

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'ORGANIZATION',
    operation_record.organization_id,
    'PLATFORM_TENANT_INVITATION_REISSUED',
    jsonb_build_object('requestId', bootstrap_request_id)
  );

  return result || jsonb_build_object(
    'administratorEmail', operation_record.email
  );
end;
$$;

revoke all on function public.require_active_platform_system_admin(uuid)
from public, anon, authenticated;
grant execute on function public.require_active_platform_system_admin(uuid)
to service_role;

revoke all on function public.list_platform_organization_tenants(uuid)
from public, anon, authenticated;
grant execute on function public.list_platform_organization_tenants(uuid)
to service_role;

revoke all on function public.platform_bootstrap_organization_tenant(
  uuid, uuid, text, uuid, text, text, text, text, text, text, integer
) from public, anon, authenticated;
grant execute on function public.platform_bootstrap_organization_tenant(
  uuid, uuid, text, uuid, text, text, text, text, text, text, integer
) to service_role;

revoke all on function public.platform_renew_tenant_bootstrap_invitation(
  uuid, uuid, integer
) from public, anon, authenticated;
grant execute on function public.platform_renew_tenant_bootstrap_invitation(
  uuid, uuid, integer
) to service_role;

comment on function public.require_active_platform_system_admin(uuid) is
  'Requires an active profile and an exact active PLATFORM-scoped SYSTEM_ADMIN assignment.';
comment on function public.list_platform_organization_tenants(uuid) is
  'Lists content-free tenant onboarding summaries after repeating exact platform authorization.';
comment on function public.platform_bootstrap_organization_tenant(
  uuid, uuid, text, uuid, text, text, text, text, text, text, integer
) is
  'Wraps the idempotent tenant bootstrap for an authenticated platform operator and records content-free actor metadata.';
comment on function public.platform_renew_tenant_bootstrap_invitation(
  uuid, uuid, integer
) is
  'Renews one incomplete first-administrator invitation for an authenticated platform operator without producing an action link.';

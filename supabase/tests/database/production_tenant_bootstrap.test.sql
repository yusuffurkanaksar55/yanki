begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

select has_table(
  'public',
  'tenant_bootstrap_operations',
  'Tenant bootstrap operation table exists'
);

select ok(
  (
    select class.relrowsecurity
    from pg_catalog.pg_class class
    where class.oid = 'public.tenant_bootstrap_operations'::regclass
  ),
  'Tenant bootstrap operations have RLS enabled'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.tenant_bootstrap_operations',
    'SELECT'
  ),
  'Authenticated browser clients cannot read bootstrap operations'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.tenant_bootstrap_operations',
    'SELECT'
  ),
  'Service role cannot bypass the narrow bootstrap functions'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.get_tenant_bootstrap_operation(uuid,text)',
    'EXECUTE'
  ),
  'Trusted operators can read exact bootstrap request status'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_tenant_bootstrap_operation(uuid,text)',
    'EXECUTE'
  ),
  'Browser clients cannot read bootstrap request status'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.bootstrap_organization_tenant(uuid,text,uuid,text,text,text,text,text,text,integer)',
    'EXECUTE'
  ),
  'Trusted operators can execute tenant bootstrap'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.bootstrap_organization_tenant(uuid,text,uuid,text,text,text,text,text,text,integer)',
    'EXECUTE'
  ),
  'Browser clients cannot execute tenant bootstrap'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.renew_tenant_bootstrap_invitation(uuid,text,integer)',
    'EXECUTE'
  ),
  'Trusted operators can renew an incomplete bootstrap invitation'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.renew_tenant_bootstrap_invitation(uuid,text,integer)',
    'EXECUTE'
  ),
  'Browser clients cannot renew bootstrap invitations'
);

insert into auth.users (id, email, raw_app_meta_data)
values
  (
    '92222222-2222-4222-8222-222222222222',
    'first.admin@bootstrap.test',
    jsonb_build_object(
      'tenant_bootstrap_request_id',
      '91111111-1111-4111-8111-111111111111'
    )
  ),
  (
    '93333333-3333-4333-8333-333333333333',
    'wrong.marker@bootstrap.test',
    jsonb_build_object(
      'tenant_bootstrap_request_id',
      '90000000-0000-4000-8000-000000000000'
    )
  ),
  (
    '94444444-4444-4444-8444-444444444444',
    'duplicate.slug@bootstrap.test',
    jsonb_build_object(
      'tenant_bootstrap_request_id',
      '95555555-5555-4555-8555-555555555555'
    )
  );

create temporary table bootstrap_test_input as
select
  '91111111-1111-4111-8111-111111111111'::uuid as request_id,
  'Bootstrap Test Organization'::text as organization_name,
  'bootstrap-test-organization'::text as organization_slug,
  'first.admin@bootstrap.test'::text as administrator_email,
  'First Bootstrap Admin'::text as administrator_display_name,
  'Administration'::text as initial_unit_name,
  'administration'::text as initial_unit_slug,
  7 as invitation_expires_in_days;

alter table bootstrap_test_input add column request_fingerprint text;

update bootstrap_test_input
set request_fingerprint = encode(
  extensions.digest(
    convert_to(
      concat_ws(
        E'\n',
        organization_name,
        organization_slug,
        administrator_email,
        administrator_display_name,
        initial_unit_name,
        initial_unit_slug,
        invitation_expires_in_days::text
      ),
      'UTF8'
    ),
    'sha256'
  ),
  'hex'
);

create temporary table bootstrap_test_result as
select public.bootstrap_organization_tenant(
  input.request_id,
  input.request_fingerprint,
  '92222222-2222-4222-8222-222222222222',
  input.organization_name,
  input.organization_slug,
  input.administrator_email,
  input.administrator_display_name,
  input.initial_unit_name,
  input.initial_unit_slug,
  input.invitation_expires_in_days
) as result
from bootstrap_test_input input;

select is(
  (select result ->> 'replayed' from bootstrap_test_result),
  'false',
  'The first exact bootstrap request is not reported as a replay'
);

select ok(
  exists (
    select 1
    from public.organizations organization
    where organization.id = (
      select (result ->> 'organizationId')::uuid
      from bootstrap_test_result
    )
      and organization.slug = 'bootstrap-test-organization'
      and organization.status = 'ACTIVE'
  ),
  'Bootstrap creates one active organization'
);

select ok(
  exists (
    select 1
    from public.organization_units unit
    where unit.id = (
      select (result ->> 'initialUnitId')::uuid
      from bootstrap_test_result
    )
      and unit.organization_id = (
        select (result ->> 'organizationId')::uuid
        from bootstrap_test_result
      )
      and unit.unit_type = 'CUSTOM'
      and unit.slug = 'administration'
  ),
  'Bootstrap creates an active tenant-scoped initial unit'
);

select ok(
  exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = '92222222-2222-4222-8222-222222222222'
      and profile.onboarding_status = 'INVITED'
      and profile.activated_at is null
  ),
  'Bootstrap creates an invited profile without prematurely activating it'
);

select ok(
  exists (
    select 1
    from public.user_invitations invitation
    where invitation.id = (
      select (result ->> 'invitationId')::uuid
      from bootstrap_test_result
    )
      and invitation.invited_role_code = 'SYSTEM_ADMIN'
      and invitation.invited_scope_type = 'ORGANIZATION'
      and invitation.invited_scope_id = (
        select (result ->> 'organizationId')::uuid
        from bootstrap_test_result
      )
      and invitation.invited_auth_user_id =
        '92222222-2222-4222-8222-222222222222'
  ),
  'Bootstrap creates an exact organization-admin invitation'
);

select ok(
  exists (
    select 1
    from public.organization_evaluation_retention_policies policy
    where policy.organization_id = (
      select (result ->> 'organizationId')::uuid
      from bootstrap_test_result
    )
      and policy.retention_days = 730
      and not policy.automatic_purge_enabled
  ),
  'The organization receives the default disabled retention policy'
);

select ok(
  not exists (
    select 1
    from public.user_role_assignments role_assignment
    where role_assignment.user_id = '92222222-2222-4222-8222-222222222222'
  ),
  'The invited identity receives no role before accepting the invitation'
);

select ok(
  not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.user_id = '92222222-2222-4222-8222-222222222222'
  ),
  'The invited identity receives no membership before accepting the invitation'
);

select ok(
  exists (
    select 1
    from public.audit_events audit_event
    where audit_event.event_type = 'TENANT_BOOTSTRAP_CREATED'
      and audit_event.event_scope_id = (
        select (result ->> 'organizationId')::uuid
        from bootstrap_test_result
      )
      and not (
        audit_event.safe_metadata
          ?| array['email', 'displayName', 'password', 'token', 'content']
      )
  ),
  'Bootstrap audit metadata contains no email, password, token, or content'
);

select is(
  (
    select public.bootstrap_organization_tenant(
      input.request_id,
      input.request_fingerprint,
      '92222222-2222-4222-8222-222222222222',
      input.organization_name,
      input.organization_slug,
      input.administrator_email,
      input.administrator_display_name,
      input.initial_unit_name,
      input.initial_unit_slug,
      input.invitation_expires_in_days
    ) ->> 'replayed'
    from bootstrap_test_input input
  ),
  'true',
  'An exact repeated request is idempotent'
);

select is(
  (
    select count(*)::integer
    from public.organizations organization
    where organization.slug = 'bootstrap-test-organization'
  ),
  1,
  'An idempotent replay creates no duplicate organization'
);

select throws_ok(
  $$
    select public.get_tenant_bootstrap_operation(
      '91111111-1111-4111-8111-111111111111',
      repeat('a', 64)
    )
  $$,
  'TENANT_BOOTSTRAP_REQUEST_CONFLICT',
  'A request id cannot be reused with a different fingerprint'
);

select throws_ok(
  $$
    select public.bootstrap_organization_tenant(
      '96666666-6666-4666-8666-666666666666',
      encode(
        extensions.digest(
          convert_to(
            concat_ws(
              E'\n',
              'Wrong Marker Organization',
              'wrong-marker-organization',
              'wrong.marker@bootstrap.test',
              'Wrong Marker Admin',
              'Administration',
              'administration',
              '7'
            ),
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      ),
      '93333333-3333-4333-8333-333333333333',
      'Wrong Marker Organization',
      'wrong-marker-organization',
      'wrong.marker@bootstrap.test',
      'Wrong Marker Admin',
      'Administration',
      'administration',
      7
    )
  $$,
  'TENANT_BOOTSTRAP_AUTH_MARKER_INVALID',
  'An Auth identity without the exact server-only request marker is rejected'
);

select throws_ok(
  $$
    select public.bootstrap_organization_tenant(
      '95555555-5555-4555-8555-555555555555',
      encode(
        extensions.digest(
          convert_to(
            concat_ws(
              E'\n',
              'Duplicate Slug Organization',
              'bootstrap-test-organization',
              'duplicate.slug@bootstrap.test',
              'Duplicate Slug Admin',
              'Administration',
              'administration',
              '7'
            ),
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      ),
      '94444444-4444-4444-8444-444444444444',
      'Duplicate Slug Organization',
      'bootstrap-test-organization',
      'duplicate.slug@bootstrap.test',
      'Duplicate Slug Admin',
      'Administration',
      'administration',
      7
    )
  $$,
  'TENANT_BOOTSTRAP_ORGANIZATION_SLUG_EXISTS',
  'A different request cannot claim an existing organization slug'
);

update public.user_invitations
set created_at = now() - interval '2 days',
    expires_at = now() - interval '1 day'
where id = (
  select (result ->> 'invitationId')::uuid
  from bootstrap_test_result
);

select lives_ok(
  format(
    'select public.renew_tenant_bootstrap_invitation(%L::uuid, %L, 7)',
    (select request_id from bootstrap_test_input),
    (select request_fingerprint from bootstrap_test_input)
  ),
  'An exact trusted request can renew an expired bootstrap invitation'
);

select ok(
  (
    select invitation.expires_at > now()
    from public.user_invitations invitation
    where invitation.id = (
      select (result ->> 'invitationId')::uuid
      from bootstrap_test_result
    )
  ),
  'Invitation renewal creates a new future expiry'
);

select ok(
  exists (
    select 1
    from public.audit_events audit_event
    where audit_event.event_type = 'TENANT_BOOTSTRAP_INVITATION_REISSUED'
      and not (
        audit_event.safe_metadata
          ?| array['email', 'displayName', 'password', 'token', 'content']
      )
  ),
  'Invitation renewal audit metadata contains no email, password, token, or content'
);

select lives_ok(
  format(
    'select public.accept_user_invitation(%L::uuid, %L::uuid)',
    (select result ->> 'invitationId' from bootstrap_test_result),
    '92222222-2222-4222-8222-222222222222'
  ),
  'The bootstrap administrator can use the existing atomic invitation acceptance'
);

select ok(
  exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = '92222222-2222-4222-8222-222222222222'
      and profile.onboarding_status = 'ACTIVE'
      and profile.activated_at is not null
  ),
  'Invitation acceptance activates the bootstrap administrator profile'
);

select ok(
  exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.user_id = '92222222-2222-4222-8222-222222222222'
      and membership.organization_id = (
        select (result ->> 'organizationId')::uuid
        from bootstrap_test_result
      )
      and membership.unit_id = (
        select (result ->> 'initialUnitId')::uuid
        from bootstrap_test_result
      )
      and membership.is_primary
      and membership.ends_at is null
  ),
  'Invitation acceptance creates the initial primary membership'
);

select ok(
  exists (
    select 1
    from public.user_role_assignments role_assignment
    where role_assignment.user_id = '92222222-2222-4222-8222-222222222222'
      and role_assignment.role_code = 'SYSTEM_ADMIN'
      and role_assignment.scope_type = 'ORGANIZATION'
      and role_assignment.scope_id = (
        select (result ->> 'organizationId')::uuid
        from bootstrap_test_result
      )
      and role_assignment.ends_at is null
  ),
  'Invitation acceptance grants only the organization-scoped system-admin role'
);

select * from finish();

rollback;

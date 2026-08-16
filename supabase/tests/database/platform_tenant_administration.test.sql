begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select has_function(
  'public',
  'require_active_platform_system_admin',
  array['uuid'],
  'Exact platform administrator authorization function exists'
);

select has_function(
  'public',
  'list_platform_organization_tenants',
  array['uuid'],
  'Platform tenant listing function exists'
);

select has_function(
  'public',
  'platform_bootstrap_organization_tenant',
  array[
    'uuid', 'uuid', 'text', 'uuid', 'text', 'text', 'text', 'text',
    'text', 'text', 'integer'
  ],
  'Platform tenant bootstrap wrapper exists'
);

select has_function(
  'public',
  'platform_renew_tenant_bootstrap_invitation',
  array['uuid', 'uuid', 'integer'],
  'Platform first-administrator invitation renewal exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.list_platform_organization_tenants(uuid)',
    'EXECUTE'
  ),
  'Service role can list tenant onboarding summaries'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.list_platform_organization_tenants(uuid)',
    'EXECUTE'
  ),
  'Authenticated browser clients cannot list all tenants directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.platform_bootstrap_organization_tenant(uuid,uuid,text,uuid,text,text,text,text,text,text,integer)',
    'EXECUTE'
  ),
  'Service role can execute the platform bootstrap wrapper'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.platform_bootstrap_organization_tenant(uuid,uuid,text,uuid,text,text,text,text,text,text,integer)',
    'EXECUTE'
  ),
  'Authenticated browser clients cannot bootstrap tenants directly'
);

insert into auth.users (id, email, raw_app_meta_data)
values
  (
    '81111111-1111-4111-8111-111111111111',
    'platform.operator@example.test',
    '{}'::jsonb
  ),
  (
    '82222222-2222-4222-8222-222222222222',
    'organization.admin@example.test',
    '{}'::jsonb
  ),
  (
    '83333333-3333-4333-8333-333333333333',
    'customer.admin@example.test',
    jsonb_build_object(
      'tenant_bootstrap_request_id',
      '84444444-4444-4444-8444-444444444444'
    )
  );

insert into public.user_profiles (
  user_id,
  email,
  display_name,
  onboarding_status,
  activated_at
) values
  (
    '81111111-1111-4111-8111-111111111111',
    'platform.operator@example.test',
    'Platform Operator',
    'ACTIVE',
    now()
  ),
  (
    '82222222-2222-4222-8222-222222222222',
    'organization.admin@example.test',
    'Organization Administrator',
    'ACTIVE',
    now()
  );

insert into public.user_role_assignments (
  user_id,
  role_code,
  scope_type,
  scope_id
) values
  (
    '81111111-1111-4111-8111-111111111111',
    'SYSTEM_ADMIN',
    'PLATFORM',
    null
  ),
  (
    '82222222-2222-4222-8222-222222222222',
    'SYSTEM_ADMIN',
    'ORGANIZATION',
    '85555555-5555-4555-8555-555555555555'
  );

select throws_ok(
  $$
    select public.list_platform_organization_tenants(
      '82222222-2222-4222-8222-222222222222'
    )
  $$,
  'PLATFORM_ADMINISTRATION_SCOPE_DENIED',
  'Organization administrators cannot list other tenants'
);

create temporary table platform_tenant_test_input as
select
  '84444444-4444-4444-8444-444444444444'::uuid as request_id,
  'Platform Customer Test'::text as organization_name,
  'platform-customer-test'::text as organization_slug,
  'customer.admin@example.test'::text as administrator_email,
  'Customer Administrator'::text as administrator_display_name,
  'Administration'::text as initial_unit_name,
  'administration'::text as initial_unit_slug,
  7 as invitation_expires_in_days;

alter table platform_tenant_test_input add column request_fingerprint text;

update platform_tenant_test_input
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

select throws_ok(
  format(
    'select public.platform_bootstrap_organization_tenant(%L::uuid, %L::uuid, %L, %L::uuid, %L, %L, %L, %L, %L, %L, %s)',
    '82222222-2222-4222-8222-222222222222',
    (select request_id from platform_tenant_test_input),
    (select request_fingerprint from platform_tenant_test_input),
    '83333333-3333-4333-8333-333333333333',
    (select organization_name from platform_tenant_test_input),
    (select organization_slug from platform_tenant_test_input),
    (select administrator_email from platform_tenant_test_input),
    (select administrator_display_name from platform_tenant_test_input),
    (select initial_unit_name from platform_tenant_test_input),
    (select initial_unit_slug from platform_tenant_test_input),
    (select invitation_expires_in_days from platform_tenant_test_input)
  ),
  'PLATFORM_ADMINISTRATION_SCOPE_DENIED',
  'Organization administrators cannot bootstrap another tenant'
);

create temporary table platform_tenant_test_result as
select public.platform_bootstrap_organization_tenant(
  '81111111-1111-4111-8111-111111111111',
  input.request_id,
  input.request_fingerprint,
  '83333333-3333-4333-8333-333333333333',
  input.organization_name,
  input.organization_slug,
  input.administrator_email,
  input.administrator_display_name,
  input.initial_unit_name,
  input.initial_unit_slug,
  input.invitation_expires_in_days
) as result
from platform_tenant_test_input input;

select is(
  (select result ->> 'replayed' from platform_tenant_test_result),
  'false',
  'Platform bootstrap creates the first tenant exactly once'
);

select ok(
  exists (
    select 1
    from public.organizations organization
    where organization.id = (
      select (result ->> 'organizationId')::uuid
      from platform_tenant_test_result
    )
      and organization.slug = 'platform-customer-test'
  ),
  'Platform bootstrap creates the requested organization'
);

select ok(
  public.list_platform_organization_tenants(
    '81111111-1111-4111-8111-111111111111'
  ) @> jsonb_build_array(jsonb_build_object(
    'organizationSlug', 'platform-customer-test',
    'bootstrapManaged', true,
    'administratorEmail', 'customer.admin@example.test',
    'invitationStatus', 'PENDING'
  )),
  'Platform listing returns only onboarding metadata for the new tenant'
);

select ok(
  exists (
    select 1
    from public.audit_events audit_event
    where audit_event.event_type = 'PLATFORM_TENANT_CREATED'
      and audit_event.actor_user_id =
        '81111111-1111-4111-8111-111111111111'
      and not (
        audit_event.safe_metadata
          ?| array['email', 'displayName', 'password', 'token', 'content']
      )
  ),
  'Platform tenant creation records the operator without sensitive metadata'
);

select lives_ok(
  $$
    select public.platform_renew_tenant_bootstrap_invitation(
      '81111111-1111-4111-8111-111111111111',
      '84444444-4444-4444-8444-444444444444',
      7
    )
  $$,
  'Platform operator can renew the exact pending first-administrator invitation'
);

select ok(
  exists (
    select 1
    from public.audit_events audit_event
    where audit_event.event_type = 'PLATFORM_TENANT_INVITATION_REISSUED'
      and audit_event.actor_user_id =
        '81111111-1111-4111-8111-111111111111'
      and not (
        audit_event.safe_metadata
          ?| array['email', 'displayName', 'password', 'token', 'content']
      )
  ),
  'Platform invitation renewal records content-free actor metadata'
);

select * from finish();

rollback;

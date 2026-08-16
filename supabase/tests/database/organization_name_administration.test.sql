begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select has_function(
  'public',
  'admin_update_organization_name',
  array['uuid', 'uuid', 'text'],
  'Trusted organization-name update function exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.admin_update_organization_name(uuid,uuid,text)',
    'EXECUTE'
  ),
  'Service-role code can invoke the trusted update function'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.admin_update_organization_name(uuid,uuid,text)',
    'EXECUTE'
  ),
  'Browser roles cannot invoke the mutation directly'
);

insert into auth.users (id, email)
values
  ('91111111-1111-4111-8111-111111111111', 'organization-admin@test.example'),
  ('92222222-2222-4222-8222-222222222222', 'organization-outsider@test.example');

insert into public.user_profiles (
  user_id,
  email,
  display_name,
  onboarding_status,
  activated_at
)
values
  (
    '91111111-1111-4111-8111-111111111111',
    'organization-admin@test.example',
    'Organization Admin',
    'ACTIVE',
    now()
  ),
  (
    '92222222-2222-4222-8222-222222222222',
    'organization-outsider@test.example',
    'Organization Outsider',
    'ACTIVE',
    now()
  );

insert into public.organizations (id, name, slug)
values (
  '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Original Organization',
  'stable-organization-slug'
);

insert into public.user_role_assignments (
  user_id,
  role_code,
  scope_type,
  scope_id
)
values (
  '91111111-1111-4111-8111-111111111111',
  'SYSTEM_ADMIN',
  'ORGANIZATION',
  '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

select throws_ok(
  $$
    select public.admin_update_organization_name(
      '92222222-2222-4222-8222-222222222222',
      '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'Unauthorized Name'
    )
  $$,
  'ADMINISTRATION_SCOPE_DENIED',
  'An unscoped user cannot rename the organization'
);

select throws_ok(
  $$
    select public.admin_update_organization_name(
      '91111111-1111-4111-8111-111111111111',
      '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      ' '
    )
  $$,
  'ORGANIZATION_NAME_INVALID',
  'A blank organization name is rejected'
);

select is(
  public.admin_update_organization_name(
    '91111111-1111-4111-8111-111111111111',
    '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '  Updated Organization  '
  ) ->> 'name',
  'Updated Organization',
  'An authorized tenant administrator can update the normalized display name'
);

select is(
  (
    select organization.slug
    from public.organizations organization
    where organization.id = '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  'stable-organization-slug',
  'Renaming does not change the stable organization slug'
);

select ok(
  exists (
    select 1
    from public.audit_events audit_event
    where audit_event.event_type = 'ORGANIZATION_NAME_UPDATED'
      and audit_event.event_scope_id = '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and audit_event.safe_metadata = jsonb_build_object(
        'organizationId',
        '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      )
  ),
  'The update writes content-free organization-scoped audit metadata'
);

select * from finish();

rollback;

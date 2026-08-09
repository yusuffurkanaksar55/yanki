begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_table(
  'public',
  'organization_evaluation_retention_policies',
  'Tenant evaluation-content retention policy table exists'
);

select ok(
  (
    select class.relrowsecurity
    from pg_catalog.pg_class class
    where class.oid =
      'public.organization_evaluation_retention_policies'::regclass
  ),
  'Retention policies have RLS enabled'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.organization_evaluation_retention_policies',
    'SELECT'
  ),
  'Authenticated browser clients cannot read retention policies directly'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.organization_evaluation_retention_policies',
    'SELECT'
  ),
  'Service role cannot bypass the narrow retention functions'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.list_manageable_evaluation_retention_policies(uuid)',
    'EXECUTE'
  ),
  'Trusted service code can list scoped content-free policies'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.list_manageable_evaluation_retention_policies(uuid)',
    'EXECUTE'
  ),
  'Browser clients cannot call the policy listing function directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.admin_update_evaluation_retention_policy(uuid,uuid,integer,boolean,boolean)',
    'EXECUTE'
  ),
  'Trusted service code can update a scoped policy'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.execute_due_evaluation_content_retention()',
    'EXECUTE'
  ),
  'Trusted operators can execute due retention'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.execute_due_evaluation_content_retention()',
    'EXECUTE'
  ),
  'Browser clients cannot execute destructive retention'
);

insert into auth.users (id, email)
values
  ('81111111-1111-4111-8111-111111111111', 'retention-admin@test.example'),
  ('82222222-2222-4222-8222-222222222222', 'retention-subject@test.example'),
  ('83333333-3333-4333-8333-333333333333', 'retention-outsider@test.example');

insert into public.user_profiles (
  user_id,
  email,
  display_name,
  onboarding_status,
  activated_at
)
values
  (
    '81111111-1111-4111-8111-111111111111',
    'retention-admin@test.example',
    'Retention Admin',
    'ACTIVE',
    now()
  ),
  (
    '82222222-2222-4222-8222-222222222222',
    'retention-subject@test.example',
    'Retention Subject',
    'ACTIVE',
    now()
  ),
  (
    '83333333-3333-4333-8333-333333333333',
    'retention-outsider@test.example',
    'Retention Outsider',
    'ACTIVE',
    now()
  );

insert into public.organizations (id, name, slug)
values (
  '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Retention Test Organization',
  'retention-test-organization'
);

insert into public.user_role_assignments (
  user_id,
  role_code,
  scope_type,
  scope_id
)
values (
  '81111111-1111-4111-8111-111111111111',
  'SYSTEM_ADMIN',
  'ORGANIZATION',
  '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

select is(
  (
    select policy.retention_days
    from public.organization_evaluation_retention_policies policy
    where policy.organization_id =
      '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  730,
  'New organizations receive a disabled 730-day default policy'
);

select throws_ok(
  $$
    select public.admin_update_evaluation_retention_policy(
      '83333333-3333-4333-8333-333333333333',
      '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      365,
      true,
      false
    )
  $$,
  'ADMINISTRATION_SCOPE_DENIED',
  'An unscoped active user cannot update a tenant policy'
);

select throws_ok(
  $$
    select public.admin_update_evaluation_retention_policy(
      '81111111-1111-4111-8111-111111111111',
      '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      29,
      true,
      false
    )
  $$,
  'EVALUATION_RETENTION_DAYS_INVALID',
  'Retention below the supported policy range is rejected'
);

select is(
  jsonb_array_length(
    public.list_manageable_evaluation_retention_policies(
      '81111111-1111-4111-8111-111111111111'
    ) -> 'policies'
  ),
  1,
  'The organization administrator lists only the scoped policy'
);

select is(
  public.admin_update_evaluation_retention_policy(
    '81111111-1111-4111-8111-111111111111',
    '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    30,
    true,
    true
  ) ->> 'legalHold',
  'true',
  'An authorized administrator can enable legal hold'
);

create temporary table retention_template_state as
select public.admin_save_evaluation_template_draft(
  '81111111-1111-4111-8111-111111111111',
  '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null,
  null,
  'Retention Test Template',
  'Retention boundary test template',
  jsonb_build_array(
    jsonb_build_object(
      'prompt', 'How effective was the contribution?',
      'questionType', 'RATING_1_TO_5',
      'isRequired', true,
      'options', '[]'::jsonb
    )
  )
) as result;

select public.admin_publish_evaluation_template_version(
  '81111111-1111-4111-8111-111111111111',
  (
    select (result ->> 'templateVersionId')::uuid
    from retention_template_state
  )
);

insert into public.evaluation_cycles (
  id,
  organization_id,
  template_version_id,
  name,
  cycle_type,
  status,
  opens_at,
  closes_at
)
values (
  '8ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (
    select (result ->> 'templateVersionId')::uuid
    from retention_template_state
  ),
  'Retention Test Cycle',
  'CUSTOM',
  'CLOSED',
  now() - interval '120 days',
  now() - interval '90 days'
);

insert into public.encrypted_evaluation_submissions (
  id,
  organization_id,
  evaluation_cycle_id,
  subject_user_id,
  template_version_id,
  assignment_kind,
  encrypted_payload,
  encryption_nonce,
  encryption_algorithm,
  encryption_key_version,
  encryption_context_version,
  payload_schema_version,
  stored_on
)
values
  (
    '8ddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '8ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '82222222-2222-4222-8222-222222222222',
    (
      select (result ->> 'templateVersionId')::uuid
      from retention_template_state
    ),
    'CUSTOM',
    decode(repeat('aa', 17), 'hex'),
    decode(repeat('bb', 12), 'hex'),
    'AES-256-GCM',
    'RETENTION_TEST_KEY',
    1,
    1,
    current_date - 100
  ),
  (
    '8eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '8ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '82222222-2222-4222-8222-222222222222',
    (
      select (result ->> 'templateVersionId')::uuid
      from retention_template_state
    ),
    'CUSTOM',
    decode(repeat('cc', 17), 'hex'),
    decode(repeat('dd', 12), 'hex'),
    'AES-256-GCM',
    'RETENTION_TEST_KEY',
    1,
    1,
    current_date
  );

select is(
  public.execute_due_evaluation_content_retention()
    ->> 'organizationsProcessed',
  '0',
  'Legal hold prevents the operator from processing the organization'
);

select ok(
  exists (
    select 1
    from public.encrypted_evaluation_submissions submission
    where submission.id = '8ddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ),
  'Expired ciphertext remains while legal hold is active'
);

select public.admin_update_evaluation_retention_policy(
  '81111111-1111-4111-8111-111111111111',
  '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  30,
  true,
  false
);

select is(
  public.execute_due_evaluation_content_retention()
    ->> 'organizationsProcessed',
  '1',
  'The operator processes the organization after legal hold is released'
);

select ok(
  not exists (
    select 1
    from public.encrypted_evaluation_submissions submission
    where submission.id = '8ddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ),
  'Expired ciphertext is deleted from the live database'
);

select ok(
  exists (
    select 1
    from public.encrypted_evaluation_submissions submission
    where submission.id = '8eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ),
  'Ciphertext inside the retention window remains available'
);

select ok(
  not exists (
    select 1
    from public.audit_events audit_event
    where audit_event.event_type = 'EVALUATION_CONTENT_RETENTION_EXECUTED'
      and audit_event.safe_metadata
        ?| array['deletedCount', 'submissionCount', 'content', 'subjectUserId']
  ),
  'Retention audit metadata contains no content, subject, or submission count'
);

select is(
  public.execute_due_evaluation_content_retention()
    ->> 'organizationsProcessed',
  '0',
  'A repeated same-day execution is idempotent'
);

select * from finish();

rollback;

begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select has_function(
  'public',
  'get_my_evaluation_assignments',
  array[]::text[],
  'Employee assignment RPC exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_my_evaluation_assignments()',
    'EXECUTE'
  ),
  'Authenticated users can execute the employee assignment RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_my_evaluation_assignments()',
    'EXECUTE'
  ),
  'Anonymous users cannot execute the employee assignment RPC'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'evaluator@test.example'),
  ('22222222-2222-4222-8222-222222222222', 'subject@test.example'),
  ('33333333-3333-4333-8333-333333333333', 'other-evaluator@test.example'),
  ('44444444-4444-4444-8444-444444444444', 'inactive@test.example');

insert into public.user_profiles (
  user_id,
  email,
  display_name,
  onboarding_status,
  activated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'evaluator@test.example',
    'Test Evaluator',
    'ACTIVE',
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'subject@test.example',
    'Test Subject',
    'ACTIVE',
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'other-evaluator@test.example',
    'Other Evaluator',
    'ACTIVE',
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'inactive@test.example',
    'Inactive Evaluator',
    'SUSPENDED',
    null
  );

insert into public.organizations (id, name, slug)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Assignment Test Organization',
  'assignment-test-organization'
);

insert into public.organization_units (
  id,
  organization_id,
  unit_type,
  name,
  slug
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'TEAM',
  'Assignment Test Team',
  'assignment-test-team'
);

insert into public.organization_unit_memberships (
  organization_id,
  unit_id,
  user_id,
  starts_at
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '11111111-1111-4111-8111-111111111111',
    now() - interval '2 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    now() - interval '2 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '33333333-3333-4333-8333-333333333333',
    now() - interval '2 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '44444444-4444-4444-8444-444444444444',
    now() - interval '2 days'
  );

insert into public.evaluation_cycles (
  id,
  organization_id,
  name,
  cycle_type,
  status,
  opens_at,
  closes_at
)
values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Open Assignment Test Cycle',
    'CUSTOM',
    'OPEN',
    now() - interval '1 day',
    now() + interval '1 day'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Draft Assignment Test Cycle',
    'CUSTOM',
    'DRAFT',
    now() - interval '1 day',
    now() + interval '1 day'
  );

insert into public.evaluation_assignments (
  organization_id,
  evaluation_cycle_id,
  evaluator_user_id,
  subject_user_id,
  assignment_kind,
  status
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'PROJECT_PEER',
    'PENDING'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '33333333-3333-4333-8333-333333333333',
    '22222222-2222-4222-8222-222222222222',
    'PROJECT_PEER',
    'PENDING'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'CUSTOM',
    'PENDING'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'CUSTOM',
    'CANCELLED'
  );

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select is(
  jsonb_array_length(
    public.get_my_evaluation_assignments() -> 'assignments'
  ),
  1,
  'Evaluator sees only their own non-cancelled and non-draft assignment'
);

select is(
  public.get_my_evaluation_assignments()
    -> 'assignments'
    -> 0
    ->> 'availability_status',
  'AVAILABLE',
  'Open assignment is marked available by the server clock'
);

select ok(
  not (
    public.get_my_evaluation_assignments()
      -> 'assignments'
      -> 0
      ?| array[
        'evaluator_user_id',
        'score',
        'comment',
        'payload',
        'credential'
      ]
  ),
  'Employee response contains no evaluator identity or evaluation content fields'
);

reset role;

update public.organization_unit_memberships
set ends_at = now() - interval '1 second'
where organization_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  and user_id = '11111111-1111-4111-8111-111111111111';

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select is(
  jsonb_array_length(
    public.get_my_evaluation_assignments() -> 'assignments'
  ),
  0,
  'Assignment access disappears when organization membership ends'
);

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';

select throws_ok(
  $$select public.get_my_evaluation_assignments()$$,
  '42501',
  'ACTIVE_PROFILE_REQUIRED',
  'Inactive profiles cannot read assignment metadata'
);

select * from finish();

rollback;

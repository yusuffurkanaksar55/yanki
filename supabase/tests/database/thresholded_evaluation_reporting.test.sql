begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

select ok(
  has_function_privilege(
    'service_role',
    'public.list_my_evaluation_report_targets(uuid)',
    'EXECUTE'
  ),
  'Trusted service code can list authorized report targets'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.list_my_evaluation_report_targets(uuid)',
    'EXECUTE'
  ),
  'Authenticated browser clients cannot list report targets directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.get_encrypted_evaluation_report_batch(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'Trusted service code can request an authorized identity-free encrypted batch'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_encrypted_evaluation_report_batch(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'Authenticated browser clients cannot request encrypted batches directly'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.can_review_evaluation_subject(uuid,uuid,uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'The reporting authorization predicate remains internal to database owners'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.get_thresholded_evaluation_report_batch_without_close_metadata(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'The compatibility implementation remains owner-only behind the complete reporting boundary'
);

insert into auth.users (id, email)
values
  ('51111111-1111-4111-8111-111111111111', 'report-reviewer@test.example'),
  ('52222222-2222-4222-8222-222222222222', 'report-leader@test.example'),
  ('52333333-3333-4233-8233-333333333333', 'report-unrelated-leader@test.example'),
  ('53333333-3333-4333-8333-333333333333', 'report-subject@test.example'),
  ('54444444-4444-4444-8444-444444444444', 'report-outsider@test.example'),
  ('55555555-5555-4555-8555-555555555555', 'report-admin@test.example'),
  ('56666666-6666-4666-8666-666666666666', 'report-dual-role@test.example'),
  ('57777777-7777-4777-8777-777777777777', 'report-employee@test.example'),
  ('58888888-8888-4888-8888-888888888888', 'report-evaluator-one@test.example'),
  ('59999999-9999-4999-8999-999999999999', 'report-evaluator-two@test.example'),
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'report-evaluator-three@test.example'),
  ('5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'report-evaluator-four@test.example');

insert into public.user_profiles (
  user_id,
  email,
  display_name,
  onboarding_status,
  activated_at
)
select
  user_record.id,
  user_record.email,
  split_part(user_record.email, '@', 1),
  'ACTIVE',
  now()
from auth.users user_record
where user_record.email like 'report-%@test.example';

insert into public.organizations (id, name, slug)
values
  (
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Reporting Test Organization',
    'reporting-test-organization'
  ),
  (
    '5ddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'Reporting Outside Organization',
    'reporting-outside-organization'
  );

insert into public.organization_units (
  id,
  organization_id,
  unit_type,
  name,
  slug
)
values
  (
    '5eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'TEAM',
    'Reporting Test Team',
    'reporting-test-team'
  ),
  (
    '5fffffff-ffff-4fff-8fff-ffffffffffff',
    '5ddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'TEAM',
    'Reporting Outside Team',
    'reporting-outside-team'
  );

insert into public.organization_unit_memberships (
  organization_id,
  unit_id,
  user_id,
  starts_at
)
select
  '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '5eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  user_record.id,
  now() - interval '1 day'
from auth.users user_record
where user_record.email like 'report-%@test.example'
  and user_record.id <> '54444444-4444-4444-8444-444444444444';

insert into public.organization_unit_memberships (
  organization_id,
  unit_id,
  user_id,
  starts_at
)
values (
  '5ddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '5fffffff-ffff-4fff-8fff-ffffffffffff',
  '54444444-4444-4444-8444-444444444444',
  now() - interval '1 day'
);

insert into public.user_role_assignments (
  user_id,
  role_code,
  scope_type,
  scope_id
)
values
  (
    '51111111-1111-4111-8111-111111111111',
    'C_LEVEL_REVIEWER',
    'ORGANIZATION',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  (
    '52222222-2222-4222-8222-222222222222',
    'TEAM_LEADER',
    'TEAM',
    '5eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ),
  (
    '52333333-3333-4233-8233-333333333333',
    'TEAM_LEADER',
    'TEAM',
    '5eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ),
  (
    '54444444-4444-4444-8444-444444444444',
    'C_LEVEL_REVIEWER',
    'ORGANIZATION',
    '5ddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'SYSTEM_ADMIN',
    'ORGANIZATION',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  (
    '56666666-6666-4666-8666-666666666666',
    'C_LEVEL_REVIEWER',
    'ORGANIZATION',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  (
    '56666666-6666-4666-8666-666666666666',
    'SYSTEM_ADMIN',
    'ORGANIZATION',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  (
    '57777777-7777-4777-8777-777777777777',
    'EMPLOYEE',
    'TEAM',
    '5eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  );

insert into public.manager_assignments (
  organization_id,
  manager_user_id,
  direct_report_user_id,
  relationship_type,
  scope_unit_id,
  starts_at
)
values (
  '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '52222222-2222-4222-8222-222222222222',
  '53333333-3333-4333-8333-333333333333',
  'DIRECT_MANAGER',
  '5eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  now() - interval '1 day'
);

create temporary table reporting_template_state as
select public.admin_save_evaluation_template_draft(
  '55555555-5555-4555-8555-555555555555',
  '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  null,
  null,
  'Threshold Reporting Template',
  'Threshold reporting database test template',
  jsonb_build_array(
    jsonb_build_object(
      'prompt', 'How effective was the contribution?',
      'questionType', 'RATING_1_TO_5',
      'isRequired', true,
      'options', '[]'::jsonb
    ),
    jsonb_build_object(
      'prompt', 'What should improve?',
      'questionType', 'LONG_TEXT',
      'isRequired', false,
      'options', '[]'::jsonb
    )
  )
) as result;

select public.admin_publish_evaluation_template_version(
  '55555555-5555-4555-8555-555555555555',
  (
    select (result ->> 'templateVersionId')::uuid
    from reporting_template_state
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
  closes_at,
  anonymity_threshold
)
values
  (
    '60111111-1111-4111-8111-111111111111',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    (select (result ->> 'templateVersionId')::uuid from reporting_template_state),
    'Closed Reporting Cycle',
    'CUSTOM',
    'CLOSED',
    now() - interval '2 days',
    now() - interval '1 day',
    1
  ),
  (
    '60222222-2222-4222-8222-222222222222',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    (select (result ->> 'templateVersionId')::uuid from reporting_template_state),
    'Open Reporting Cycle',
    'CUSTOM',
    'OPEN',
    now() - interval '1 day',
    now() + interval '1 day',
    1
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
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    '58888888-8888-4888-8888-888888888888',
    '53333333-3333-4333-8333-333333333333',
    'CUSTOM',
    'COMPLETED'
  ),
  (
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60222222-2222-4222-8222-222222222222',
    '59999999-9999-4999-8999-999999999999',
    '53333333-3333-4333-8333-333333333333',
    'CUSTOM',
    'COMPLETED'
  );

insert into public.encrypted_evaluation_submissions (
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
  payload_schema_version
)
select
  '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '60111111-1111-4111-8111-111111111111',
  '53333333-3333-4333-8333-333333333333',
  (select (result ->> 'templateVersionId')::uuid from reporting_template_state),
  'CUSTOM',
  decode(repeat(lpad(to_hex(sequence_number), 2, '0'), 17), 'hex'),
  decode(repeat(lpad(to_hex(sequence_number), 2, '0'), 12), 'hex'),
  'AES-256-GCM',
  'test-v1',
  1,
  1
from generate_series(1, 3) sequence_number;

insert into public.encrypted_evaluation_submissions (
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
  payload_schema_version
)
values (
  '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '60222222-2222-4222-8222-222222222222',
  '53333333-3333-4333-8333-333333333333',
  (select (result ->> 'templateVersionId')::uuid from reporting_template_state),
  'CUSTOM',
  decode(repeat('ab', 17), 'hex'),
  decode(repeat('ab', 12), 'hex'),
  'AES-256-GCM',
  'test-v1',
  1,
  1
);

select ok(
  public.can_review_evaluation_subject(
    '51111111-1111-4111-8111-111111111111',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    null,
    '53333333-3333-4333-8333-333333333333'
  ),
  'A scoped C-level reviewer can review another user'
);

select ok(
  public.can_review_evaluation_subject(
    '52222222-2222-4222-8222-222222222222',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    null,
    '53333333-3333-4333-8333-333333333333'
  ),
  'A scoped team leader with an active manager relationship can review the report'
);

select ok(
  not public.can_review_evaluation_subject(
    '52333333-3333-4233-8233-333333333333',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    null,
    '53333333-3333-4333-8333-333333333333'
  ),
  'A team leader without a manager relationship cannot review the report'
);

select ok(
  not public.can_review_evaluation_subject(
    '55555555-5555-4555-8555-555555555555',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    null,
    '53333333-3333-4333-8333-333333333333'
  ),
  'A system administrator cannot review evaluation content'
);

select ok(
  not public.can_review_evaluation_subject(
    '56666666-6666-4666-8666-666666666666',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    null,
    '53333333-3333-4333-8333-333333333333'
  ),
  'A reviewer who is also a system administrator is denied'
);

select ok(
  not public.can_review_evaluation_subject(
    '57777777-7777-4777-8777-777777777777',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    null,
    '53333333-3333-4333-8333-333333333333'
  ),
  'An employee cannot review evaluation reports'
);

select ok(
  not public.can_review_evaluation_subject(
    '54444444-4444-4444-8444-444444444444',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    null,
    '53333333-3333-4333-8333-333333333333'
  ),
  'A reviewer scoped to another organization cannot review the report'
);

select ok(
  not public.can_review_evaluation_subject(
    '53333333-3333-4333-8333-333333333333',
    '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '60111111-1111-4111-8111-111111111111',
    null,
    '53333333-3333-4333-8333-333333333333'
  ),
  'A user cannot review results about themselves'
);

create temporary table reviewer_targets as
select public.list_my_evaluation_report_targets(
  '51111111-1111-4111-8111-111111111111'
) as result;

select is(
  jsonb_array_length((select result -> 'targets' from reviewer_targets)),
  2,
  'The target list includes authorized active and completed cycles'
);

select ok(
  not (
    (select result -> 'targets' -> 0 from reviewer_targets)
      ?| array[
        'submission_count',
        'submissions',
        'questions',
        'encrypted_payload_hex'
      ]
  ),
  'Target discovery exposes no participation count, questions, or ciphertext'
);

select is(
  jsonb_array_length(
    public.list_my_evaluation_report_targets(
      '55555555-5555-4555-8555-555555555555'
    ) -> 'targets'
  ),
  0,
  'System administrators receive no report targets'
);

create temporary table first_available_batch as
select public.get_encrypted_evaluation_report_batch(
  '51111111-1111-4111-8111-111111111111',
  '60111111-1111-4111-8111-111111111111',
  '53333333-3333-4333-8333-333333333333'
) as result;

select is(
  (select result ->> 'status' from first_available_batch),
  'AVAILABLE',
  'A report is available after the first encrypted submission'
);

select is(
  (select (result ->> 'submission_count')::integer from first_available_batch),
  3,
  'An available report returns the current identity-free aggregate sample size'
);

select ok(
  not (
    select safe_metadata
    from public.audit_events
    where event_type = 'EVALUATION_REPORT_ACCESSED'
    order by occurred_at desc
    limit 1
  ) ?| array['submissionCount', 'submission_count'],
  'The reporting audit event does not store the exact participation count'
);

select throws_ok(
  $$
    select public.get_encrypted_evaluation_report_batch(
      '53333333-3333-4333-8333-333333333333',
      '60111111-1111-4111-8111-111111111111',
      '53333333-3333-4333-8333-333333333333'
    )
  $$,
  '42501',
  'REPORT_SELF_ACCESS_DENIED',
  'Self-report access is explicitly denied before report authorization'
);

select throws_ok(
  $$
    select public.get_encrypted_evaluation_report_batch(
      '57777777-7777-4777-8777-777777777777',
      '60111111-1111-4111-8111-111111111111',
      '53333333-3333-4333-8333-333333333333'
    )
  $$,
  '42501',
  'REPORTING_ACCESS_DENIED',
  'An employee cannot request a report batch'
);

select throws_ok(
  $$
    select public.get_encrypted_evaluation_report_batch(
      '55555555-5555-4555-8555-555555555555',
      '60111111-1111-4111-8111-111111111111',
      '53333333-3333-4333-8333-333333333333'
    )
  $$,
  '42501',
  'REPORTING_ACCESS_DENIED',
  'A system administrator cannot request a report batch'
);

select throws_ok(
  $$
    select public.get_encrypted_evaluation_report_batch(
      '56666666-6666-4666-8666-666666666666',
      '60111111-1111-4111-8111-111111111111',
      '53333333-3333-4333-8333-333333333333'
    )
  $$,
  '42501',
  'REPORTING_ACCESS_DENIED',
  'A dual system-admin and reviewer account cannot request a report batch'
);

select throws_ok(
  $$
    select public.get_encrypted_evaluation_report_batch(
      '54444444-4444-4444-8444-444444444444',
      '60111111-1111-4111-8111-111111111111',
      '53333333-3333-4333-8333-333333333333'
    )
  $$,
  '42501',
  'REPORTING_ACCESS_DENIED',
  'A cross-organization reviewer cannot request a report batch'
);

select is(
  public.get_encrypted_evaluation_report_batch(
    '51111111-1111-4111-8111-111111111111',
    '60222222-2222-4222-8222-222222222222',
    '53333333-3333-4333-8333-333333333333'
  ) ->> 'status',
  'AVAILABLE',
  'An active cycle report is available after its first submission'
);

insert into public.encrypted_evaluation_submissions (
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
  payload_schema_version
)
values (
  '5ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '60111111-1111-4111-8111-111111111111',
  '53333333-3333-4333-8333-333333333333',
  (select (result ->> 'templateVersionId')::uuid from reporting_template_state),
  'CUSTOM',
  decode(repeat('04', 17), 'hex'),
  decode(repeat('04', 12), 'hex'),
  'AES-256-GCM',
  'test-v1',
  1,
  1
);

create temporary table available_batch as
select public.get_encrypted_evaluation_report_batch(
  '51111111-1111-4111-8111-111111111111',
  '60111111-1111-4111-8111-111111111111',
  '53333333-3333-4333-8333-333333333333'
) as result;

select is(
  (select result ->> 'status' from available_batch),
  'AVAILABLE',
  'The completed-cycle report remains available as submissions arrive'
);

select ok(
  (select result ->> 'closed_at' from available_batch) is not null,
  'The trusted batch includes the non-sensitive cycle close timestamp required by the report response'
);

select is(
  (select (result ->> 'submission_count')::integer from available_batch),
  4,
  'An available aggregate reports its above-threshold sample size'
);

select is(
  jsonb_array_length((select result -> 'submissions' from available_batch)),
  4,
  'Exactly the authorized identity-free ciphertext batch is released'
);

select is(
  jsonb_array_length((select result -> 'questions' from available_batch)),
  2,
  'The immutable question set is released for trusted aggregation'
);

select ok(
  not (
    (select result -> 'submissions' -> 0 from available_batch)
      ?| array[
        'id',
        'stored_on',
        'created_at',
        'evaluator_user_id',
        'evaluation_assignment_id',
        'credential_id',
        'credential_digest'
      ]
  ),
  'The released ciphertext batch contains no evaluator, credential, row ID, or timing fields'
);

select ok(
  not (
    select safe_metadata
    from public.audit_events
    where event_type = 'EVALUATION_REPORT_ACCESSED'
    order by occurred_at desc
    limit 1
  ) ?| array['submissionCount', 'submission_count'],
  'Available-report audit metadata also omits the exact participation count'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.encrypted_evaluation_submissions',
    'SELECT'
  ),
  'Service-role code still cannot read the ciphertext table directly'
);

select * from finish();

rollback;

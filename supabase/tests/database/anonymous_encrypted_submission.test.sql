begin;

create extension if not exists pgtap with schema extensions;

select plan(54);

select has_table(
  'public',
  'security_rate_limit_buckets',
  'Anonymous endpoint rate-limit bucket table exists'
);

select has_table(
  'public',
  'security_abuse_event_counters',
  'Aggregate abuse event counter table exists'
);

select ok(
  (
    select class.relrowsecurity
    from pg_catalog.pg_class class
    where class.oid = 'public.security_rate_limit_buckets'::regclass
  ),
  'Rate-limit buckets have RLS enabled'
);

select ok(
  (
    select class.relrowsecurity
    from pg_catalog.pg_class class
    where class.oid = 'public.security_abuse_event_counters'::regclass
  ),
  'Aggregate abuse counters have RLS enabled'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.security_rate_limit_buckets',
    'SELECT'
  ),
  'Service role cannot read rate-limit buckets directly'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.security_abuse_event_counters',
    'SELECT'
  ),
  'Service role cannot read abuse counters directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.consume_anonymous_submission_request(text)',
    'EXECUTE'
  ),
  'Service role can request an anonymous submission quota decision'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.consume_anonymous_submission_request(text)',
    'EXECUTE'
  ),
  'Authenticated clients cannot consume anonymous submission quotas directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.get_anonymous_submission_abuse_summary(uuid)',
    'EXECUTE'
  ),
  'Service role can request the safe system-admin monitoring summary'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_anonymous_submission_abuse_summary(uuid)',
    'EXECUTE'
  ),
  'Authenticated clients cannot read abuse summaries directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.get_anonymous_submission_abuse_summary_for_operator()',
    'EXECUTE'
  ),
  'Service role can request the identifier-free operator summary'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_anonymous_submission_abuse_summary_for_operator()',
    'EXECUTE'
  ),
  'Authenticated clients cannot execute the operator summary'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name in (
        'security_rate_limit_buckets',
        'security_abuse_event_counters'
      )
      and column_info.column_name in (
        'ip_address',
        'device_id',
        'user_id',
        'organization_id',
        'assignment_id',
        'credential_digest',
        'request_body',
        'content'
      )
  ),
  0,
  'Abuse controls store no identity, tenant, credential, request, or content columns'
);

select has_table(
  'public',
  'anonymous_submission_credentials',
  'Anonymous credential identity table exists'
);

select has_table(
  'public',
  'encrypted_evaluation_submissions',
  'Encrypted anonymous submission table exists'
);

select ok(
  (
    select class.relrowsecurity
    from pg_catalog.pg_class class
    where class.oid = 'public.anonymous_submission_credentials'::regclass
  ),
  'Anonymous credential table has RLS enabled'
);

select ok(
  (
    select class.relrowsecurity
    from pg_catalog.pg_class class
    where class.oid = 'public.encrypted_evaluation_submissions'::regclass
  ),
  'Encrypted submission table has RLS enabled'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.anonymous_submission_credentials',
    'SELECT'
  ),
  'Authenticated clients cannot read anonymous credential rows'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.encrypted_evaluation_submissions',
    'SELECT'
  ),
  'Authenticated clients cannot read encrypted submissions'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.encrypted_evaluation_submissions',
    'INSERT'
  ),
  'Service role cannot bypass the atomic redemption function with direct inserts'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.issue_anonymous_submission_credential(uuid,uuid,text)',
    'EXECUTE'
  ),
  'Service role can execute credential issuance'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.issue_anonymous_submission_credential(uuid,uuid,text)',
    'EXECUTE'
  ),
  'Authenticated clients cannot issue credentials directly'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'encrypted_evaluation_submissions'
      and column_info.column_name in (
        'evaluator_user_id',
        'evaluation_assignment_id',
        'assignment_id',
        'credential_id',
        'credential_digest'
      )
  ),
  0,
  'Submission content has no evaluator, assignment, or credential linkage column'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'encrypted_evaluation_submissions'
      and column_info.column_name in ('created_at', 'submitted_at', 'stored_at')
  ),
  0,
  'Submission content stores no exact submission timestamp'
);

insert into auth.users (id, email)
values
  ('41111111-1111-4111-8111-111111111111', 'submission-admin@test.example'),
  ('42222222-2222-4222-8222-222222222222', 'submission-evaluator@test.example'),
  ('43333333-3333-4333-8333-333333333333', 'submission-subject@test.example'),
  ('44444444-4444-4444-8444-444444444444', 'submission-other@test.example');

insert into public.user_profiles (
  user_id,
  email,
  display_name,
  onboarding_status,
  activated_at
)
values
  (
    '41111111-1111-4111-8111-111111111111',
    'submission-admin@test.example',
    'Submission Admin',
    'ACTIVE',
    now()
  ),
  (
    '42222222-2222-4222-8222-222222222222',
    'submission-evaluator@test.example',
    'Submission Evaluator',
    'ACTIVE',
    now()
  ),
  (
    '43333333-3333-4333-8333-333333333333',
    'submission-subject@test.example',
    'Submission Subject',
    'ACTIVE',
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'submission-other@test.example',
    'Submission Other',
    'ACTIVE',
    now()
  );

insert into public.organizations (id, name, slug)
values (
  '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Submission Test Organization',
  'submission-test-organization'
);

insert into public.organization_units (
  id,
  organization_id,
  unit_type,
  name,
  slug
)
values (
  '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'TEAM',
  'Submission Test Team',
  'submission-test-team'
);

insert into public.organization_unit_memberships (
  organization_id,
  unit_id,
  user_id,
  starts_at
)
values
  (
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '41111111-1111-4111-8111-111111111111',
    now() - interval '1 day'
  ),
  (
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '42222222-2222-4222-8222-222222222222',
    now() - interval '1 day'
  ),
  (
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '43333333-3333-4333-8333-333333333333',
    now() - interval '1 day'
  ),
  (
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '44444444-4444-4444-8444-444444444444',
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
    '41111111-1111-4111-8111-111111111111',
    'SYSTEM_ADMIN',
    'PLATFORM',
    null
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'SYSTEM_ADMIN',
    'ORGANIZATION',
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

create temporary table submission_template_state as
select public.admin_save_evaluation_template_draft(
  '41111111-1111-4111-8111-111111111111',
  '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null,
  null,
  'Anonymous Submission Feedback',
  'Submission boundary test template',
  jsonb_build_array(
    jsonb_build_object(
      'prompt', 'How effective was the contribution?',
      'questionType', 'RATING_1_TO_5',
      'isRequired', true,
      'options', '[]'::jsonb
    ),
    jsonb_build_object(
      'prompt', 'What should continue?',
      'questionType', 'LONG_TEXT',
      'isRequired', false,
      'options', '[]'::jsonb
    )
  )
) as result;

select public.admin_publish_evaluation_template_version(
  '41111111-1111-4111-8111-111111111111',
  (
    select (result ->> 'templateVersionId')::uuid
    from submission_template_state
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
  '4ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (
    select (result ->> 'templateVersionId')::uuid
    from submission_template_state
  ),
  'Anonymous Submission Cycle',
  'CUSTOM',
  'OPEN',
  now() - interval '1 hour',
  now() + interval '1 day'
);

insert into public.evaluation_assignments (
  id,
  organization_id,
  evaluation_cycle_id,
  evaluator_user_id,
  subject_user_id,
  assignment_kind,
  status
)
values (
  '4ddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '4ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '42222222-2222-4222-8222-222222222222',
  '43333333-3333-4333-8333-333333333333',
  'CUSTOM',
  'PENDING'
);

select throws_ok(
  $$
    select public.issue_anonymous_submission_credential(
      '44444444-4444-4444-8444-444444444444',
      '4ddddddd-dddd-4ddd-8ddd-dddddddddddd',
      repeat('aa', 32)
    )
  $$,
  '42501',
  'EVALUATION_ASSIGNMENT_NOT_FOUND',
  'A different authenticated user cannot issue a credential for the assignment'
);

create temporary table first_credential_state as
select public.issue_anonymous_submission_credential(
  '42222222-2222-4222-8222-222222222222',
  '4ddddddd-dddd-4ddd-8ddd-dddddddddddd',
  repeat('ab', 32)
) as result;

select is(
  jsonb_array_length(
    (select result -> 'questions' from first_credential_state)
  ),
  2,
  'Credential issuance returns the exact immutable question set'
);

select ok(
  not (
    (select result from first_credential_state)
      ?| array['evaluator_user_id', 'evaluation_assignment_id', 'credential_digest']
  ),
  'Credential response omits evaluator identity and stored digest fields'
);

select is(
  (
    select octet_length(credential.credential_digest)
    from public.anonymous_submission_credentials credential
    where credential.evaluation_assignment_id = '4ddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and credential.status = 'PENDING'
  ),
  32,
  'Identity domain stores only a fixed-length credential digest'
);

select is(
  public.consume_anonymous_submission_request(repeat('01', 32))
    ->> 'error_code',
  'ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED',
  'An unknown credential receives a safe invalid response before its quota is exhausted'
);

do $$
declare
  request_number integer;
begin
  for request_number in 2..120 loop
    perform public.consume_anonymous_submission_request(
      lpad(to_hex(request_number), 64, '0')
    );
  end loop;
end;
$$;

select is(
  public.consume_anonymous_submission_request(repeat('fe', 32))
    ->> 'error_code',
  'ANONYMOUS_RATE_LIMIT_EXCEEDED',
  'The invalid-only global quota rejects excess unknown credential traffic'
);

select is(
  public.consume_anonymous_submission_request(repeat('ab', 32))
    ->> 'allowed',
  'true',
  'A recognized credential remains available when the invalid-only quota is exhausted'
);

do $$
declare
  request_number integer;
begin
  for request_number in 2..12 loop
    perform public.consume_anonymous_submission_request(repeat('ab', 32));
  end loop;
end;
$$;

select is(
  public.consume_anonymous_submission_request(repeat('ab', 32))
    ->> 'error_code',
  'ANONYMOUS_RATE_LIMIT_EXCEEDED',
  'A recognized credential has an isolated ten-minute quota'
);

select is(
  public.get_anonymous_submission_abuse_summary(
    '41111111-1111-4111-8111-111111111111'
  ) ->> 'invalid_credential_attempts_last_60_minutes',
  '121',
  'The system-admin summary reports aggregate invalid traffic without identifiers'
);

select is(
  public.get_anonymous_submission_abuse_summary(
    '41111111-1111-4111-8111-111111111111'
  ) ->> 'rate_limited_requests_last_60_minutes',
  '2',
  'The system-admin summary reports aggregate rejected request counts'
);

select ok(
  not (
    public.get_anonymous_submission_abuse_summary(
      '41111111-1111-4111-8111-111111111111'
    )
    ?| array[
      'user_id',
      'organization_id',
      'assignment_id',
      'credential',
      'credential_digest',
      'content'
    ]
  ),
  'The abuse summary contains no user, tenant, credential, assignment, or content keys'
);

select throws_ok(
  $$
    select public.get_anonymous_submission_abuse_summary(
      '44444444-4444-4444-8444-444444444444'
    )
  $$,
  '42501',
  'SECURITY_MONITORING_ACCESS_DENIED',
  'An organization-scoped system admin cannot read platform-wide abuse counters'
);

select throws_ok(
  $$
    select public.get_anonymous_submission_abuse_summary(
      '42222222-2222-4222-8222-222222222222'
    )
  $$,
  '42501',
  'SECURITY_MONITORING_ACCESS_DENIED',
  'A non-admin cannot read aggregate abuse counters'
);

select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$select public.get_anonymous_submission_abuse_summary_for_operator()$$,
  '42501',
  'SECURITY_MONITORING_OPERATOR_ACCESS_DENIED',
  'A non-service JWT claim cannot invoke the scheduled operator summary'
);

select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  public.get_anonymous_submission_abuse_summary_for_operator()
    ->> 'invalid_credential_attempts_last_60_minutes',
  '121',
  'The operator summary returns the same identifier-free aggregate count'
);

select ok(
  not (
    public.get_anonymous_submission_abuse_summary_for_operator()
    ?| array[
      'user_id',
      'organization_id',
      'assignment_id',
      'credential',
      'credential_digest',
      'content'
    ]
  ),
  'The operator summary contains no identity, tenant, credential, or content keys'
);

select public.issue_anonymous_submission_credential(
  '42222222-2222-4222-8222-222222222222',
  '4ddddddd-dddd-4ddd-8ddd-dddddddddddd',
  repeat('cd', 32)
);

select is(
  (
    select credential.status
    from public.anonymous_submission_credentials credential
    where credential.credential_digest = decode(repeat('ab', 32), 'hex')
  ),
  'REVOKED',
  'Issuing a replacement revokes the previous pending credential'
);

select is(
  (
    select count(*)::integer
    from public.anonymous_submission_credentials credential
    where credential.evaluation_assignment_id = '4ddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and credential.status = 'PENDING'
  ),
  1,
  'An assignment has at most one pending credential'
);

select throws_ok(
  $$select public.get_anonymous_submission_context(repeat('ab', 32))$$,
  'ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED',
  'A revoked credential cannot read anonymous submission context'
);

select is(
  jsonb_array_length(
    public.get_anonymous_submission_context(repeat('cd', 32)) -> 'questions'
  ),
  2,
  'A valid credential resolves the exact validation context'
);

select ok(
  not (
    public.get_anonymous_submission_context(repeat('cd', 32))
      -> 'questions'
      -> 0
      ? 'prompt'
  ),
  'Anonymous submission context omits question prompts not needed for validation'
);

select is(
  public.redeem_anonymous_submission_credential(
    repeat('cd', 32),
    repeat('ef', 17),
    repeat('12', 12),
    'test-v1',
    1,
    1
  ) ->> 'accepted',
  'true',
  'A valid one-time credential atomically accepts encrypted content'
);

select is(
  (
    select count(*)::integer
    from public.encrypted_evaluation_submissions submission
    where submission.organization_id = '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and submission.evaluation_cycle_id = '4ccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  1,
  'Exactly one encrypted anonymous submission is persisted for the fixture cycle'
);

select is(
  (
    select pg_typeof(submission.encrypted_payload)::text
    from public.encrypted_evaluation_submissions submission
    where submission.organization_id = '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and submission.evaluation_cycle_id = '4ccccccc-cccc-4ccc-8ccc-cccccccccccc'
    limit 1
  ),
  'bytea',
  'Evaluation payload is stored as binary ciphertext'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'encrypted_evaluation_submissions'
      and column_info.data_type in ('text', 'json', 'jsonb')
      and column_info.column_name not in (
        'assignment_kind',
        'encryption_algorithm',
        'encryption_key_version'
      )
  ),
  0,
  'Submission table has no plaintext answer or unrestricted JSON content column'
);

select is(
  (
    select assignment.status
    from public.evaluation_assignments assignment
    where assignment.id = '4ddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ),
  'COMPLETED',
  'Successful anonymous redemption completes the identity-domain assignment'
);

select is(
  (
    select credential.status
    from public.anonymous_submission_credentials credential
    where credential.credential_digest = decode(repeat('cd', 32), 'hex')
  ),
  'REDEEMED',
  'Successful anonymous redemption consumes the credential'
);

select throws_ok(
  $$
    select public.redeem_anonymous_submission_credential(
      repeat('cd', 32),
      repeat('aa', 17),
      repeat('34', 12),
      'test-v1',
      1,
      1
    )
  $$,
  'ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED',
  'A redeemed credential cannot create a duplicate submission'
);

select throws_ok(
  $$
    update public.encrypted_evaluation_submissions
    set stored_on = current_date - 1
  $$,
  'ENCRYPTED_EVALUATION_SUBMISSION_IMMUTABLE',
  'Encrypted submission rows cannot be modified'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.encrypted_evaluation_submissions',
    'SELECT'
  ),
  'Service role cannot read ciphertext directly outside a future reporting boundary'
);

select * from finish();

rollback;

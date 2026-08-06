begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select has_table(
  'public',
  'evaluation_template_versions',
  'Evaluation template versions table exists'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.evaluation_template_versions',
    'SELECT'
  ),
  'Authenticated clients cannot read template-version tables directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.admin_save_evaluation_template_draft(uuid,uuid,uuid,uuid,text,text,jsonb)',
    'EXECUTE'
  ),
  'Service role can execute the atomic draft save function'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.admin_publish_evaluation_template_version(uuid,uuid)',
    'EXECUTE'
  ),
  'Authenticated clients cannot publish template versions directly'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'template-admin@test.example'),
  ('22222222-2222-4222-8222-222222222222', 'template-evaluator@test.example'),
  ('33333333-3333-4333-8333-333333333333', 'template-subject@test.example');

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
    'template-admin@test.example',
    'Template Admin',
    'ACTIVE',
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'template-evaluator@test.example',
    'Template Evaluator',
    'ACTIVE',
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'template-subject@test.example',
    'Template Subject',
    'ACTIVE',
    now()
  );

insert into public.organizations (id, name, slug)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Template Test Organization',
  'template-test-organization'
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
  'Template Test Team',
  'template-test-team'
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
    now() - interval '1 day'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    now() - interval '1 day'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '33333333-3333-4333-8333-333333333333',
    now() - interval '1 day'
  );

insert into public.user_role_assignments (
  user_id,
  role_code,
  scope_type,
  scope_id
)
values (
  '11111111-1111-4111-8111-111111111111',
  'SYSTEM_ADMIN',
  'ORGANIZATION',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

create temporary table template_test_state as
select public.admin_save_evaluation_template_draft(
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null,
  null,
  'Project Feedback',
  'Versioned project feedback template',
  '[]'::jsonb
) as result;

select is(
  (
    select version.status
    from public.evaluation_template_versions version
    where version.id = (
      select (result ->> 'templateVersionId')::uuid
      from template_test_state
    )
  ),
  'DRAFT',
  'A new template starts as a draft'
);

select throws_ok(
  format(
    'select public.admin_publish_evaluation_template_version(%L, %L)',
    '11111111-1111-4111-8111-111111111111',
    (select result ->> 'templateVersionId' from template_test_state)
  ),
  'TEMPLATE_QUESTION_REQUIRED',
  'A draft without questions cannot be published'
);

select public.admin_save_evaluation_template_draft(
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select (result ->> 'templateId')::uuid from template_test_state),
  (select (result ->> 'templateVersionId')::uuid from template_test_state),
  'Project Feedback',
  'Versioned project feedback template',
  jsonb_build_array(
    jsonb_build_object(
      'prompt', 'How effective was the collaboration?',
      'questionType', 'RATING_1_TO_5',
      'isRequired', true,
      'options', '[]'::jsonb
    ),
    jsonb_build_object(
      'prompt', 'Which strength stood out?',
      'questionType', 'SINGLE_SELECT',
      'isRequired', true,
      'options', jsonb_build_array('Communication', 'Planning')
    )
  )
);

select public.admin_publish_evaluation_template_version(
  '11111111-1111-4111-8111-111111111111',
  (select (result ->> 'templateVersionId')::uuid from template_test_state)
);

select is(
  (
    select version.status
    from public.evaluation_template_versions version
    where version.id = (
      select (result ->> 'templateVersionId')::uuid
      from template_test_state
    )
  ),
  'PUBLISHED',
  'A valid draft can be published'
);

select throws_ok(
  format(
    'update public.evaluation_template_versions set name = %L where id = %L',
    'Changed after publication',
    (select result ->> 'templateVersionId' from template_test_state)
  ),
  'PUBLISHED_TEMPLATE_VERSION_IMMUTABLE',
  'Published version metadata cannot be changed'
);

select throws_ok(
  format(
    'update public.evaluation_template_questions set prompt = %L where template_version_id = %L',
    'Changed after publication',
    (select result ->> 'templateVersionId' from template_test_state)
  ),
  'PUBLISHED_TEMPLATE_VERSION_IMMUTABLE',
  'Published version questions cannot be changed'
);

create temporary table cloned_template_test_state as
select public.admin_clone_evaluation_template_version(
  '11111111-1111-4111-8111-111111111111',
  (select (result ->> 'templateVersionId')::uuid from template_test_state)
) as result;

select is(
  (
    select version.version_number
    from public.evaluation_template_versions version
    where version.id = (
      select (result ->> 'templateVersionId')::uuid
      from cloned_template_test_state
    )
  ),
  2,
  'Cloning creates the next version number'
);

select is(
  (
    select count(*)::integer
    from public.evaluation_template_questions question
    where question.template_version_id = (
      select (result ->> 'templateVersionId')::uuid
      from cloned_template_test_state
    )
  ),
  2,
  'Cloning copies the exact question set into the new draft'
);

select throws_ok(
  format(
    'update public.evaluation_template_questions set template_version_id = %L, position = 3 where template_version_id = %L and position = 1',
    (select result ->> 'templateVersionId' from cloned_template_test_state),
    (select result ->> 'templateVersionId' from template_test_state)
  ),
  'PUBLISHED_TEMPLATE_VERSION_IMMUTABLE',
  'A published question cannot be moved into an editable draft'
);

select throws_ok(
  format(
    'insert into public.evaluation_cycles (organization_id,template_version_id,name,cycle_type,status,opens_at,closes_at) values (%L,%L,%L,%L,%L,now(),now() + interval ''1 day'')',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (select result ->> 'templateVersionId' from cloned_template_test_state),
    'Draft Template Cycle',
    'CUSTOM',
    'OPEN'
  ),
  'PUBLISHED_TEMPLATE_VERSION_REQUIRED',
  'An evaluation cycle cannot bind a draft template version'
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
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select (result ->> 'templateVersionId')::uuid from template_test_state),
  'Published Template Cycle',
  'CUSTOM',
  'OPEN',
  now() - interval '1 hour',
  now() + interval '1 day'
);

select is(
  (
    select cycle.template_version_id
    from public.evaluation_cycles cycle
    where cycle.id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  (select (result ->> 'templateVersionId')::uuid from template_test_state),
  'A cycle binds the selected published version exactly'
);

insert into public.evaluation_assignments (
  organization_id,
  evaluation_cycle_id,
  evaluator_user_id,
  subject_user_id,
  assignment_kind,
  status
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'CUSTOM',
  'PENDING'
);

select is(
  (
    select assignment.template_version_id
    from public.evaluation_assignments assignment
    where assignment.evaluation_cycle_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  (select (result ->> 'templateVersionId')::uuid from template_test_state),
  'An assignment copies the exact template version from its cycle'
);

select throws_ok(
  format(
    'update public.evaluation_assignments set template_version_id = %L where evaluation_cycle_id = %L',
    (select result ->> 'templateVersionId' from cloned_template_test_state),
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  'EVALUATION_ASSIGNMENT_TEMPLATE_VERSION_MISMATCH',
  'An assignment cannot drift from its cycle template version'
);

select is(
  (
    select count(*)::integer
    from public.audit_events event
    where event.event_scope_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and event.event_type in (
        'EVALUATION_TEMPLATE_DRAFT_SAVED',
        'EVALUATION_TEMPLATE_VERSION_PUBLISHED',
        'EVALUATION_TEMPLATE_VERSION_CLONED'
      )
  ),
  4,
  'Template lifecycle writes safe administration audit events'
);

select * from finish();

rollback;

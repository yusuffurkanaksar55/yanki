create or replace function public.can_review_evaluation_subject(
  actor_user_id uuid,
  managed_organization_id uuid,
  managed_evaluation_cycle_id uuid,
  managed_project_id uuid,
  managed_subject_user_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with recursive subject_unit_ancestors as (
    select
      unit.id,
      unit.parent_unit_id
    from public.organization_unit_memberships membership
    join public.organization_units unit
      on unit.id = membership.unit_id
     and unit.organization_id = membership.organization_id
     and unit.status = 'ACTIVE'
    where membership.organization_id = managed_organization_id
      and membership.user_id = managed_subject_user_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())

    union

    select
      parent.id,
      parent.parent_unit_id
    from public.organization_units parent
    join subject_unit_ancestors child
      on child.parent_unit_id = parent.id
    where parent.organization_id = managed_organization_id
      and parent.status = 'ACTIVE'
  ),
  active_actor_roles as (
    select
      role.role_code,
      role.scope_type,
      role.scope_id
    from public.user_role_assignments role
    where role.user_id = actor_user_id
      and role.starts_at <= now()
      and (role.ends_at is null or role.ends_at > now())
  ),
  actor_state as (
    select
      actor_user_id is not null
      and actor_user_id <> managed_subject_user_id
      and exists (
        select 1
        from public.user_profiles profile
        where profile.user_id = actor_user_id
          and profile.onboarding_status = 'ACTIVE'
      )
      and exists (
        select 1
        from public.organization_unit_memberships membership
        where membership.organization_id = managed_organization_id
          and membership.user_id = actor_user_id
          and membership.starts_at <= now()
          and (membership.ends_at is null or membership.ends_at > now())
      ) as is_active
  ),
  subject_state as (
    select exists (
      select 1
      from public.user_profiles profile
      where profile.user_id = managed_subject_user_id
        and profile.onboarding_status = 'ACTIVE'
    ) and exists (
      select 1
      from public.organization_unit_memberships membership
      where membership.organization_id = managed_organization_id
        and membership.user_id = managed_subject_user_id
        and membership.starts_at <= now()
        and (membership.ends_at is null or membership.ends_at > now())
    ) as is_active
  ),
  scoped_roles as (
    select role.role_code
    from active_actor_roles role
    where role.role_code in (
      'TEAM_LEADER',
      'C_LEVEL_REVIEWER',
      'BOARD_REVIEWER'
    )
      and (
        (role.scope_type = 'PLATFORM' and role.scope_id is null)
        or (
          role.scope_type = 'ORGANIZATION'
          and role.scope_id = managed_organization_id
        )
        or (
          role.scope_type = 'EVALUATION_CYCLE'
          and role.scope_id = managed_evaluation_cycle_id
        )
        or (
          role.scope_type = 'PROJECT'
          and managed_project_id is not null
          and role.scope_id = managed_project_id
        )
        or (
          role.scope_type in ('DEPARTMENT', 'UNIT', 'TEAM')
          and role.scope_id in (select id from subject_unit_ancestors)
        )
      )
  )
  select
    (select is_active from actor_state)
    and (select is_active from subject_state)
    and not exists (
      select 1
      from active_actor_roles role
      where role.role_code = 'SYSTEM_ADMIN'
    )
    and (
      exists (
        select 1
        from scoped_roles role
        where role.role_code in ('C_LEVEL_REVIEWER', 'BOARD_REVIEWER')
      )
      or (
        exists (
          select 1
          from scoped_roles role
          where role.role_code = 'TEAM_LEADER'
        )
        and exists (
          select 1
          from public.manager_assignments manager
          where manager.organization_id = managed_organization_id
            and manager.manager_user_id = actor_user_id
            and manager.direct_report_user_id = managed_subject_user_id
            and manager.relationship_type in (
              'DIRECT_MANAGER',
              'FUNCTIONAL_MANAGER'
            )
            and manager.starts_at <= now()
            and (manager.ends_at is null or manager.ends_at > now())
        )
      )
    );
$$;

create or replace function public.list_my_evaluation_report_targets(
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  targets jsonb;
begin
  if actor_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = actor_user_id
      and profile.onboarding_status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'organization_id', target.organization_id,
        'organization_name', target.organization_name,
        'evaluation_cycle_id', target.evaluation_cycle_id,
        'evaluation_cycle_name', target.evaluation_cycle_name,
        'closed_at', target.closes_at,
        'project_id', target.project_id,
        'project_name', target.project_name,
        'project_code', target.project_code,
        'subject_user_id', target.subject_user_id,
        'subject_display_name', target.subject_display_name,
        'subject_email', target.subject_email,
        'template_version_id', target.template_version_id,
        'template_name', target.template_name,
        'template_version_number', target.template_version_number,
        'anonymity_threshold', target.anonymity_threshold
      )
      order by target.closes_at desc, target.subject_display_name, target.subject_email
    ),
    '[]'::jsonb
  )
  into targets
  from (
    select distinct
      assignment.organization_id,
      organization.name as organization_name,
      cycle.id as evaluation_cycle_id,
      cycle.name as evaluation_cycle_name,
      cycle.closes_at,
      assignment.project_id,
      project.name as project_name,
      project.code as project_code,
      assignment.subject_user_id,
      subject_profile.display_name as subject_display_name,
      subject_profile.email as subject_email,
      assignment.template_version_id,
      template_version.name as template_name,
      template_version.version_number as template_version_number,
      cycle.anonymity_threshold
    from public.evaluation_assignments assignment
    join public.evaluation_cycles cycle
      on cycle.id = assignment.evaluation_cycle_id
     and cycle.organization_id = assignment.organization_id
     and cycle.template_version_id = assignment.template_version_id
    join public.organizations organization
      on organization.id = assignment.organization_id
     and organization.status = 'ACTIVE'
    join public.user_profiles subject_profile
      on subject_profile.user_id = assignment.subject_user_id
    join public.evaluation_template_versions template_version
      on template_version.id = assignment.template_version_id
     and template_version.organization_id = assignment.organization_id
    left join public.projects project
      on project.id = assignment.project_id
     and project.organization_id = assignment.organization_id
    where assignment.status <> 'CANCELLED'
      and cycle.status <> 'DRAFT'
      and (
        cycle.status in ('CLOSED', 'ARCHIVED')
        or now() >= cycle.closes_at
      )
      and public.can_review_evaluation_subject(
        actor_user_id,
        assignment.organization_id,
        assignment.evaluation_cycle_id,
        assignment.project_id,
        assignment.subject_user_id
      )
  ) target;

  return jsonb_build_object('targets', targets);
end;
$$;

create or replace function public.get_encrypted_evaluation_report_batch(
  actor_user_id uuid,
  managed_evaluation_cycle_id uuid,
  managed_subject_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  report_record record;
  questions jsonb;
  submission_count integer;
  submissions jsonb;
begin
  if actor_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if actor_user_id = managed_subject_user_id then
    raise exception 'REPORT_SELF_ACCESS_DENIED' using errcode = '42501';
  end if;

  select
    cycle.id as evaluation_cycle_id,
    cycle.organization_id,
    organization.name as organization_name,
    cycle.project_id,
    project.name as project_name,
    project.code as project_code,
    cycle.name as evaluation_cycle_name,
    cycle.status as cycle_status,
    cycle.closes_at,
    cycle.anonymity_threshold,
    cycle.template_version_id,
    template_version.name as template_name,
    template_version.version_number as template_version_number,
    subject_profile.display_name as subject_display_name,
    subject_profile.email as subject_email
  into report_record
  from public.evaluation_cycles cycle
  join public.organizations organization
    on organization.id = cycle.organization_id
   and organization.status = 'ACTIVE'
  join public.evaluation_template_versions template_version
    on template_version.id = cycle.template_version_id
   and template_version.organization_id = cycle.organization_id
  join public.user_profiles subject_profile
    on subject_profile.user_id = managed_subject_user_id
  left join public.projects project
    on project.id = cycle.project_id
   and project.organization_id = cycle.organization_id
  where cycle.id = managed_evaluation_cycle_id
    and exists (
      select 1
      from public.evaluation_assignments assignment
      where assignment.organization_id = cycle.organization_id
        and assignment.evaluation_cycle_id = cycle.id
        and assignment.subject_user_id = managed_subject_user_id
        and assignment.status <> 'CANCELLED'
    );

  if report_record.evaluation_cycle_id is null then
    raise exception 'REPORT_TARGET_NOT_FOUND';
  end if;

  if report_record.cycle_status = 'DRAFT'
    or (
      report_record.cycle_status not in ('CLOSED', 'ARCHIVED')
      and now() < report_record.closes_at
    ) then
    raise exception 'REPORT_WINDOW_NOT_CLOSED';
  end if;

  if not public.can_review_evaluation_subject(
    actor_user_id,
    report_record.organization_id,
    report_record.evaluation_cycle_id,
    report_record.project_id,
    managed_subject_user_id
  ) then
    raise exception 'REPORTING_ACCESS_DENIED' using errcode = '42501';
  end if;

  select count(*)::integer
  into submission_count
  from public.encrypted_evaluation_submissions submission
  where submission.organization_id = report_record.organization_id
    and submission.evaluation_cycle_id = report_record.evaluation_cycle_id
    and submission.subject_user_id = managed_subject_user_id;

  insert into public.audit_events (
    actor_user_id,
    event_type,
    event_scope_type,
    event_scope_id,
    safe_metadata
  ) values (
    actor_user_id,
    'EVALUATION_REPORT_ACCESSED',
    'EVALUATION_CYCLE',
    report_record.evaluation_cycle_id,
    jsonb_build_object(
      'subjectUserId', managed_subject_user_id,
      'status', case
        when submission_count < report_record.anonymity_threshold
          then 'WITHHELD'
        else 'AVAILABLE'
      end,
      'anonymityThreshold', report_record.anonymity_threshold
    )
  );

  if submission_count < report_record.anonymity_threshold then
    return jsonb_build_object(
      'status', 'WITHHELD',
      'organization_id', report_record.organization_id,
      'organization_name', report_record.organization_name,
      'evaluation_cycle_id', report_record.evaluation_cycle_id,
      'evaluation_cycle_name', report_record.evaluation_cycle_name,
      'project_id', report_record.project_id,
      'project_name', report_record.project_name,
      'project_code', report_record.project_code,
      'subject_user_id', managed_subject_user_id,
      'subject_display_name', report_record.subject_display_name,
      'subject_email', report_record.subject_email,
      'template_version_id', report_record.template_version_id,
      'template_name', report_record.template_name,
      'template_version_number', report_record.template_version_number,
      'anonymity_threshold', report_record.anonymity_threshold
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'encrypted_payload_hex', encode(submission.encrypted_payload, 'hex'),
        'encryption_nonce_hex', encode(submission.encryption_nonce, 'hex'),
        'encryption_key_version', submission.encryption_key_version,
        'encryption_context_version', submission.encryption_context_version,
        'payload_schema_version', submission.payload_schema_version,
        'organization_id', submission.organization_id,
        'evaluation_cycle_id', submission.evaluation_cycle_id,
        'project_id', submission.project_id,
        'subject_user_id', submission.subject_user_id,
        'template_version_id', submission.template_version_id,
        'assignment_kind', submission.assignment_kind
      )
    ),
    '[]'::jsonb
  )
  into submissions
  from public.encrypted_evaluation_submissions submission
  where submission.organization_id = report_record.organization_id
    and submission.evaluation_cycle_id = report_record.evaluation_cycle_id
    and submission.subject_user_id = managed_subject_user_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', question.id,
        'position', question.position,
        'prompt', question.prompt,
        'question_type', question.question_type,
        'is_required', question.is_required,
        'options', question.options
      )
      order by question.position
    ),
    '[]'::jsonb
  )
  into questions
  from public.evaluation_template_questions question
  where question.organization_id = report_record.organization_id
    and question.template_version_id = report_record.template_version_id;

  return jsonb_build_object(
    'status', 'AVAILABLE',
    'organization_id', report_record.organization_id,
    'organization_name', report_record.organization_name,
    'evaluation_cycle_id', report_record.evaluation_cycle_id,
    'evaluation_cycle_name', report_record.evaluation_cycle_name,
    'project_id', report_record.project_id,
    'project_name', report_record.project_name,
    'project_code', report_record.project_code,
    'subject_user_id', managed_subject_user_id,
    'subject_display_name', report_record.subject_display_name,
    'subject_email', report_record.subject_email,
    'template_version_id', report_record.template_version_id,
    'template_name', report_record.template_name,
    'template_version_number', report_record.template_version_number,
    'anonymity_threshold', report_record.anonymity_threshold,
    'submission_count', submission_count,
    'questions', questions,
    'submissions', submissions
  );
end;
$$;

revoke all on function public.can_review_evaluation_subject(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.list_my_evaluation_report_targets(uuid)
from public, anon, authenticated;
grant execute on function public.list_my_evaluation_report_targets(uuid)
to service_role;

revoke all on function public.get_encrypted_evaluation_report_batch(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;
grant execute on function public.get_encrypted_evaluation_report_batch(
  uuid,
  uuid,
  uuid
) to service_role;

comment on function public.can_review_evaluation_subject(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
) is
  'Internal reporting authorization predicate. Denies self access and every active system administrator; accepts only current scoped reviewer roles, with an active manager relationship additionally required for team leaders.';

comment on function public.list_my_evaluation_report_targets(uuid) is
  'Lists closed, scoped report targets independently of participation state and without submission counts, ciphertext, or decrypted content. Executable only by trusted service-role code.';

comment on function public.get_encrypted_evaluation_report_batch(
  uuid,
  uuid,
  uuid
) is
  'Enforces closed-window, scope, admin-deny, self-deny, and anonymity-threshold rules before releasing an identity-free encrypted batch to trusted reporting code. Below threshold it releases no ciphertext and no exact count.';

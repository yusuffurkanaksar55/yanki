create unique index if not exists evaluation_cycles_organization_id_id_unique_idx
on public.evaluation_cycles (organization_id, id);

create table public.anonymous_submission_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  evaluation_assignment_id uuid not null references public.evaluation_assignments (id) on delete restrict,
  credential_digest bytea not null,
  status text not null default 'PENDING',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_on date,
  constraint anonymous_submission_credentials_digest_length_check check (
    octet_length(credential_digest) = 32
  ),
  constraint anonymous_submission_credentials_status_check check (
    status in ('PENDING', 'REDEEMED', 'REVOKED')
  ),
  constraint anonymous_submission_credentials_lifecycle_check check (
    (
      status = 'REDEEMED'
      and redeemed_on is not null
    )
    or (
      status in ('PENDING', 'REVOKED')
      and redeemed_on is null
    )
  ),
  constraint anonymous_submission_credentials_expiry_check check (
    expires_at > issued_at
  ),
  constraint anonymous_submission_credentials_digest_unique unique (
    credential_digest
  )
);

create unique index anonymous_submission_credentials_pending_assignment_idx
on public.anonymous_submission_credentials (evaluation_assignment_id)
where status = 'PENDING';

create index anonymous_submission_credentials_expiry_idx
on public.anonymous_submission_credentials (expires_at)
where status = 'PENDING';

alter table public.anonymous_submission_credentials enable row level security;

create table public.encrypted_evaluation_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  evaluation_cycle_id uuid not null,
  project_id uuid,
  subject_user_id uuid not null references auth.users (id) on delete restrict,
  template_version_id uuid not null,
  assignment_kind text not null,
  encrypted_payload bytea not null,
  encryption_nonce bytea not null,
  encryption_algorithm text not null,
  encryption_key_version text not null,
  encryption_context_version integer not null,
  payload_schema_version integer not null,
  stored_on date not null default current_date,
  constraint encrypted_evaluation_submissions_cycle_tenant_fk
    foreign key (organization_id, evaluation_cycle_id)
    references public.evaluation_cycles (organization_id, id)
    on delete restrict,
  constraint encrypted_evaluation_submissions_project_tenant_fk
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id)
    on delete restrict,
  constraint encrypted_evaluation_submissions_template_tenant_fk
    foreign key (organization_id, template_version_id)
    references public.evaluation_template_versions (organization_id, id)
    on delete restrict,
  constraint encrypted_evaluation_submissions_kind_check check (
    assignment_kind in (
      'PROJECT_PEER',
      'PROJECT_MANAGER_REVIEW',
      'PROJECT_MEMBER_REVIEW',
      'CUSTOM'
    )
  ),
  constraint encrypted_evaluation_submissions_ciphertext_check check (
    octet_length(encrypted_payload) between 17 and 1048576
  ),
  constraint encrypted_evaluation_submissions_nonce_check check (
    octet_length(encryption_nonce) = 12
  ),
  constraint encrypted_evaluation_submissions_algorithm_check check (
    encryption_algorithm = 'AES-256-GCM'
  ),
  constraint encrypted_evaluation_submissions_key_version_check check (
    encryption_key_version ~ '^[A-Za-z0-9._-]{1,64}$'
  ),
  constraint encrypted_evaluation_submissions_context_version_check check (
    encryption_context_version = 1
  ),
  constraint encrypted_evaluation_submissions_payload_version_check check (
    payload_schema_version = 1
  )
);

create index encrypted_evaluation_submissions_reporting_idx
on public.encrypted_evaluation_submissions (
  organization_id,
  evaluation_cycle_id,
  subject_user_id,
  assignment_kind
);

create index encrypted_evaluation_submissions_retention_idx
on public.encrypted_evaluation_submissions (organization_id, stored_on);

alter table public.encrypted_evaluation_submissions enable row level security;

create or replace function public.guard_anonymous_submission_credential_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status <> 'PENDING' then
    raise exception 'ANONYMOUS_CREDENTIAL_TERMINAL';
  end if;

  if new.status not in ('REDEEMED', 'REVOKED') then
    raise exception 'ANONYMOUS_CREDENTIAL_TRANSITION_INVALID';
  end if;

  if new.id <> old.id
    or new.organization_id <> old.organization_id
    or new.evaluation_assignment_id <> old.evaluation_assignment_id
    or new.credential_digest <> old.credential_digest
    or new.issued_at <> old.issued_at
    or new.expires_at <> old.expires_at then
    raise exception 'ANONYMOUS_CREDENTIAL_IDENTITY_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger anonymous_submission_credentials_guard_mutation
before update on public.anonymous_submission_credentials
for each row
execute function public.guard_anonymous_submission_credential_mutation();

create or replace function public.reject_encrypted_evaluation_submission_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'ENCRYPTED_EVALUATION_SUBMISSION_IMMUTABLE';
end;
$$;

create trigger encrypted_evaluation_submissions_reject_update
before update on public.encrypted_evaluation_submissions
for each row
execute function public.reject_encrypted_evaluation_submission_update();

create or replace function public.issue_anonymous_submission_credential(
  actor_user_id uuid,
  managed_assignment_id uuid,
  credential_digest_hex text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  assignment_record record;
  credential_expires_at timestamptz;
  decoded_credential_digest bytea;
  questions jsonb;
begin
  if actor_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if credential_digest_hex is null
    or credential_digest_hex !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'ANONYMOUS_CREDENTIAL_DIGEST_INVALID';
  end if;

  decoded_credential_digest := decode(credential_digest_hex, 'hex');

  if not exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = actor_user_id
      and profile.onboarding_status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501';
  end if;

  select
    assignment.id,
    assignment.organization_id,
    assignment.evaluation_cycle_id,
    assignment.project_id,
    assignment.evaluator_user_id,
    assignment.subject_user_id,
    assignment.assignment_kind,
    assignment.status as assignment_status,
    assignment.template_version_id,
    cycle.name as cycle_name,
    cycle.status as cycle_status,
    cycle.opens_at,
    cycle.closes_at,
    organization.name as organization_name,
    project.name as project_name,
    project.code as project_code,
    subject_profile.display_name as subject_display_name,
    subject_profile.email as subject_email,
    template_version.name as template_name,
    template_version.version_number as template_version_number,
    template_version.status as template_status,
    template.status as template_root_status
  into assignment_record
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
   and subject_profile.onboarding_status = 'ACTIVE'
  join public.evaluation_template_versions template_version
    on template_version.id = assignment.template_version_id
   and template_version.organization_id = assignment.organization_id
  join public.evaluation_templates template
    on template.id = template_version.template_id
   and template.organization_id = assignment.organization_id
  left join public.projects project
    on project.id = assignment.project_id
   and project.organization_id = assignment.organization_id
  where assignment.id = managed_assignment_id
  for update of assignment;

  if assignment_record.id is null
    or assignment_record.evaluator_user_id <> actor_user_id then
    raise exception 'EVALUATION_ASSIGNMENT_NOT_FOUND' using errcode = '42501';
  end if;

  if assignment_record.assignment_status <> 'PENDING' then
    raise exception 'EVALUATION_ASSIGNMENT_NOT_PENDING';
  end if;

  if assignment_record.cycle_status <> 'OPEN'
    or now() < assignment_record.opens_at
    or now() >= assignment_record.closes_at then
    raise exception 'EVALUATION_WINDOW_NOT_OPEN';
  end if;

  if assignment_record.template_status <> 'PUBLISHED'
    or assignment_record.template_root_status <> 'ACTIVE' then
    raise exception 'PUBLISHED_TEMPLATE_VERSION_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.organization_id = assignment_record.organization_id
      and membership.user_id = actor_user_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())
  ) then
    raise exception 'ACTIVE_ORGANIZATION_MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.organization_id = assignment_record.organization_id
      and membership.user_id = assignment_record.subject_user_id
      and membership.starts_at <= now()
      and (membership.ends_at is null or membership.ends_at > now())
  ) then
    raise exception 'ACTIVE_SUBJECT_MEMBERSHIP_REQUIRED';
  end if;

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
  where question.template_version_id = assignment_record.template_version_id
    and question.organization_id = assignment_record.organization_id;

  if jsonb_array_length(questions) = 0 then
    raise exception 'TEMPLATE_QUESTION_REQUIRED';
  end if;

  update public.anonymous_submission_credentials credential
  set status = 'REVOKED'
  where credential.evaluation_assignment_id = assignment_record.id
    and credential.status = 'PENDING';

  credential_expires_at := least(
    assignment_record.closes_at,
    now() + interval '1 hour'
  );

  insert into public.anonymous_submission_credentials (
    organization_id,
    evaluation_assignment_id,
    credential_digest,
    expires_at
  )
  values (
    assignment_record.organization_id,
    assignment_record.id,
    decoded_credential_digest,
    credential_expires_at
  );

  return jsonb_build_object(
    'expires_at', credential_expires_at,
    'organization_id', assignment_record.organization_id,
    'organization_name', assignment_record.organization_name,
    'evaluation_cycle_id', assignment_record.evaluation_cycle_id,
    'evaluation_cycle_name', assignment_record.cycle_name,
    'project_id', assignment_record.project_id,
    'project_name', assignment_record.project_name,
    'project_code', assignment_record.project_code,
    'subject_display_name', assignment_record.subject_display_name,
    'subject_email', assignment_record.subject_email,
    'template_version_id', assignment_record.template_version_id,
    'template_name', assignment_record.template_name,
    'template_version_number', assignment_record.template_version_number,
    'questions', questions
  );
end;
$$;

create or replace function public.get_anonymous_submission_context(
  credential_digest_hex text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  context_record record;
  decoded_credential_digest bytea;
  questions jsonb;
begin
  if credential_digest_hex is null
    or credential_digest_hex !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED';
  end if;

  decoded_credential_digest := decode(credential_digest_hex, 'hex');

  select
    credential.status as credential_status,
    credential.expires_at,
    assignment.organization_id,
    assignment.evaluation_cycle_id,
    assignment.project_id,
    assignment.subject_user_id,
    assignment.assignment_kind,
    assignment.status as assignment_status,
    assignment.template_version_id,
    cycle.status as cycle_status,
    cycle.opens_at,
    cycle.closes_at,
    template_version.status as template_status,
    template.status as template_root_status
  into context_record
  from public.anonymous_submission_credentials credential
  join public.evaluation_assignments assignment
    on assignment.id = credential.evaluation_assignment_id
   and assignment.organization_id = credential.organization_id
  join public.evaluation_cycles cycle
    on cycle.id = assignment.evaluation_cycle_id
   and cycle.organization_id = assignment.organization_id
   and cycle.template_version_id = assignment.template_version_id
  join public.evaluation_template_versions template_version
    on template_version.id = assignment.template_version_id
   and template_version.organization_id = assignment.organization_id
  join public.evaluation_templates template
    on template.id = template_version.template_id
   and template.organization_id = assignment.organization_id
  where credential.credential_digest = decoded_credential_digest;

  if context_record.credential_status = 'REDEEMED' then
    raise exception 'ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED';
  end if;

  if context_record.credential_status is null
    or context_record.credential_status <> 'PENDING'
    or context_record.expires_at <= now()
    or context_record.assignment_status <> 'PENDING'
    or context_record.cycle_status <> 'OPEN'
    or now() < context_record.opens_at
    or now() >= context_record.closes_at
    or context_record.template_status <> 'PUBLISHED'
    or context_record.template_root_status <> 'ACTIVE' then
    raise exception 'ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', question.id,
        'position', question.position,
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
  where question.template_version_id = context_record.template_version_id
    and question.organization_id = context_record.organization_id;

  return jsonb_build_object(
    'organization_id', context_record.organization_id,
    'evaluation_cycle_id', context_record.evaluation_cycle_id,
    'project_id', context_record.project_id,
    'subject_user_id', context_record.subject_user_id,
    'assignment_kind', context_record.assignment_kind,
    'template_version_id', context_record.template_version_id,
    'questions', questions
  );
end;
$$;

create or replace function public.redeem_anonymous_submission_credential(
  credential_digest_hex text,
  encrypted_payload_hex text,
  encryption_nonce_hex text,
  managed_encryption_key_version text,
  managed_encryption_context_version integer,
  managed_payload_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  assignment_record record;
  credential_record record;
  decoded_credential_digest bytea;
  decoded_encrypted_payload bytea;
  decoded_encryption_nonce bytea;
begin
  if credential_digest_hex is null
    or credential_digest_hex !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED';
  end if;

  if encrypted_payload_hex is null
    or encrypted_payload_hex !~ '^[0-9a-fA-F]+$'
    or length(encrypted_payload_hex) % 2 <> 0
    or length(encrypted_payload_hex) < 34
    or length(encrypted_payload_hex) > 2097152 then
    raise exception 'ENCRYPTED_EVALUATION_PAYLOAD_INVALID';
  end if;

  if encryption_nonce_hex is null
    or encryption_nonce_hex !~ '^[0-9a-fA-F]{24}$' then
    raise exception 'ENCRYPTION_NONCE_INVALID';
  end if;

  if managed_encryption_key_version is null
    or managed_encryption_key_version !~ '^[A-Za-z0-9._-]{1,64}$' then
    raise exception 'ENCRYPTION_KEY_VERSION_INVALID';
  end if;

  if managed_encryption_context_version <> 1
    or managed_payload_schema_version <> 1 then
    raise exception 'ENCRYPTION_PAYLOAD_VERSION_INVALID';
  end if;

  decoded_credential_digest := decode(credential_digest_hex, 'hex');
  decoded_encrypted_payload := decode(encrypted_payload_hex, 'hex');
  decoded_encryption_nonce := decode(encryption_nonce_hex, 'hex');

  select
    credential.id,
    credential.organization_id,
    credential.evaluation_assignment_id,
    credential.status,
    credential.expires_at
  into credential_record
  from public.anonymous_submission_credentials credential
  where credential.credential_digest = decoded_credential_digest
  for update;

  if credential_record.status = 'REDEEMED' then
    raise exception 'ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED';
  end if;

  if credential_record.id is null
    or credential_record.status <> 'PENDING'
    or credential_record.expires_at <= now() then
    raise exception 'ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED';
  end if;

  select
    assignment.id,
    assignment.organization_id,
    assignment.evaluation_cycle_id,
    assignment.project_id,
    assignment.subject_user_id,
    assignment.assignment_kind,
    assignment.status,
    assignment.template_version_id,
    cycle.status as cycle_status,
    cycle.opens_at,
    cycle.closes_at,
    template_version.status as template_status,
    template.status as template_root_status
  into assignment_record
  from public.evaluation_assignments assignment
  join public.evaluation_cycles cycle
    on cycle.id = assignment.evaluation_cycle_id
   and cycle.organization_id = assignment.organization_id
   and cycle.template_version_id = assignment.template_version_id
  join public.evaluation_template_versions template_version
    on template_version.id = assignment.template_version_id
   and template_version.organization_id = assignment.organization_id
  join public.evaluation_templates template
    on template.id = template_version.template_id
   and template.organization_id = assignment.organization_id
  where assignment.id = credential_record.evaluation_assignment_id
    and assignment.organization_id = credential_record.organization_id
  for update of assignment;

  if assignment_record.id is null
    or assignment_record.status <> 'PENDING'
    or assignment_record.cycle_status <> 'OPEN'
    or now() < assignment_record.opens_at
    or now() >= assignment_record.closes_at
    or assignment_record.template_status <> 'PUBLISHED'
    or assignment_record.template_root_status <> 'ACTIVE' then
    raise exception 'ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED';
  end if;

  insert into public.encrypted_evaluation_submissions (
    organization_id,
    evaluation_cycle_id,
    project_id,
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
    assignment_record.organization_id,
    assignment_record.evaluation_cycle_id,
    assignment_record.project_id,
    assignment_record.subject_user_id,
    assignment_record.template_version_id,
    assignment_record.assignment_kind,
    decoded_encrypted_payload,
    decoded_encryption_nonce,
    'AES-256-GCM',
    managed_encryption_key_version,
    managed_encryption_context_version,
    managed_payload_schema_version
  );

  update public.anonymous_submission_credentials
  set status = 'REDEEMED',
      redeemed_on = current_date
  where id = credential_record.id;

  update public.evaluation_assignments
  set status = 'COMPLETED'
  where id = assignment_record.id;

  return jsonb_build_object('accepted', true);
end;
$$;

revoke all on table public.anonymous_submission_credentials
from public, anon, authenticated, service_role;
revoke all on table public.encrypted_evaluation_submissions
from public, anon, authenticated, service_role;

revoke all on function public.issue_anonymous_submission_credential(
  uuid,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function public.get_anonymous_submission_context(text)
from public, anon, authenticated;
revoke all on function public.redeem_anonymous_submission_credential(
  text,
  text,
  text,
  text,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.issue_anonymous_submission_credential(
  uuid,
  uuid,
  text
) to service_role;
grant execute on function public.get_anonymous_submission_context(text)
to service_role;
grant execute on function public.redeem_anonymous_submission_credential(
  text,
  text,
  text,
  text,
  integer,
  integer
) to service_role;

comment on table public.anonymous_submission_credentials is
  'Identity-domain one-time eligibility credentials. Stores only a credential digest and assignment linkage; it never stores evaluation content or a submission identifier.';
comment on table public.encrypted_evaluation_submissions is
  'Anonymous content-domain evaluation records. Stores authenticated ciphertext and reporting metadata without evaluator, assignment, credential, plaintext answer, or exact submission timestamp fields.';
comment on column public.encrypted_evaluation_submissions.subject_user_id is
  'Evaluation subject required for future thresholded reporting. This is not the evaluator identity.';
comment on column public.encrypted_evaluation_submissions.encrypted_payload is
  'AES-256-GCM ciphertext produced only in trusted Edge Function code. Plaintext answers must never be persisted.';
comment on function public.issue_anonymous_submission_credential(uuid, uuid, text) is
  'Atomically revalidates authenticated assignment eligibility and stores only a one-time credential digest.';
comment on function public.get_anonymous_submission_context(text) is
  'Returns identity-free validation and encryption context for a valid pending credential to trusted server code only.';
comment on function public.redeem_anonymous_submission_credential(text, text, text, text, integer, integer) is
  'Atomically stores encrypted content without evaluator linkage, redeems the one-time credential, and completes the identity-domain assignment.';

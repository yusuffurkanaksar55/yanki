create table public.evaluation_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'ACTIVE',
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_templates_name_not_blank check (length(btrim(name)) > 0),
  constraint evaluation_templates_description_not_blank check (
    description is null or length(btrim(description)) > 0
  ),
  constraint evaluation_templates_status_check check (
    status in ('ACTIVE', 'ARCHIVED')
  )
);

create unique index evaluation_templates_active_name_unique_idx
on public.evaluation_templates (organization_id, lower(name))
where status = 'ACTIVE';

create unique index evaluation_templates_organization_id_id_unique_idx
on public.evaluation_templates (organization_id, id);

create index evaluation_templates_organization_status_idx
on public.evaluation_templates (organization_id, status, updated_at desc);

create trigger evaluation_templates_set_updated_at
before update on public.evaluation_templates
for each row
execute function public.set_updated_at();

alter table public.evaluation_templates enable row level security;

create table public.evaluation_template_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null,
  version_number integer not null,
  name text not null,
  description text,
  status text not null default 'DRAFT',
  created_by_user_id uuid references auth.users (id) on delete set null,
  published_by_user_id uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_template_versions_template_tenant_fk
    foreign key (organization_id, template_id)
    references public.evaluation_templates (organization_id, id)
    on delete restrict,
  constraint evaluation_template_versions_number_positive check (
    version_number > 0
  ),
  constraint evaluation_template_versions_name_not_blank check (
    length(btrim(name)) > 0
  ),
  constraint evaluation_template_versions_description_not_blank check (
    description is null or length(btrim(description)) > 0
  ),
  constraint evaluation_template_versions_status_check check (
    status in ('DRAFT', 'PUBLISHED')
  ),
  constraint evaluation_template_versions_publication_state_check check (
    (
      status = 'DRAFT'
      and published_at is null
      and published_by_user_id is null
    )
    or (
      status = 'PUBLISHED'
      and published_at is not null
    )
  ),
  constraint evaluation_template_versions_template_version_unique
    unique (template_id, version_number),
  constraint evaluation_template_versions_organization_id_id_unique
    unique (organization_id, id)
);

create unique index evaluation_template_versions_single_draft_idx
on public.evaluation_template_versions (template_id)
where status = 'DRAFT';

create index evaluation_template_versions_organization_status_idx
on public.evaluation_template_versions (
  organization_id,
  status,
  published_at desc,
  created_at desc
);

create table public.evaluation_template_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_version_id uuid not null,
  position integer not null,
  prompt text not null,
  question_type text not null,
  is_required boolean not null default true,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_template_questions_version_tenant_fk
    foreign key (organization_id, template_version_id)
    references public.evaluation_template_versions (organization_id, id)
    on delete restrict,
  constraint evaluation_template_questions_position_positive check (
    position > 0
  ),
  constraint evaluation_template_questions_prompt_not_blank check (
    length(btrim(prompt)) > 0
  ),
  constraint evaluation_template_questions_type_check check (
    question_type in (
      'RATING_1_TO_5',
      'RATING_1_TO_10',
      'YES_NO',
      'SINGLE_SELECT',
      'MULTI_SELECT',
      'SHORT_TEXT',
      'LONG_TEXT',
      'TAG_SELECTION'
    )
  ),
  constraint evaluation_template_questions_options_array_check check (
    jsonb_typeof(options) = 'array'
  ),
  constraint evaluation_template_questions_options_type_check check (
    (
      question_type in ('SINGLE_SELECT', 'MULTI_SELECT', 'TAG_SELECTION')
      and jsonb_array_length(options) >= 2
    )
    or (
      question_type not in ('SINGLE_SELECT', 'MULTI_SELECT', 'TAG_SELECTION')
      and jsonb_array_length(options) = 0
    )
  ),
  constraint evaluation_template_questions_position_unique
    unique (template_version_id, position)
);

create index evaluation_template_questions_version_position_idx
on public.evaluation_template_questions (template_version_id, position);

create or replace function public.validate_evaluation_template_version_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.status <> 'DRAFT' then
    raise exception 'TEMPLATE_VERSION_MUST_START_AS_DRAFT';
  end if;

  if tg_op = 'INSERT' then
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status = 'PUBLISHED' then
      raise exception 'PUBLISHED_TEMPLATE_VERSION_IMMUTABLE';
    end if;

    return old;
  end if;

  if old.status = 'PUBLISHED' then
    raise exception 'PUBLISHED_TEMPLATE_VERSION_IMMUTABLE';
  end if;

  if new.organization_id is distinct from old.organization_id
    or new.template_id is distinct from old.template_id
    or new.version_number is distinct from old.version_number
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception 'TEMPLATE_VERSION_IDENTITY_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger evaluation_template_versions_validate_mutation
before insert or update or delete
on public.evaluation_template_versions
for each row
execute function public.validate_evaluation_template_version_mutation();

create trigger evaluation_template_versions_set_updated_at
before update on public.evaluation_template_versions
for each row
execute function public.set_updated_at();

alter table public.evaluation_template_versions enable row level security;

create or replace function public.validate_evaluation_template_question_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  checked_organization_id uuid;
  checked_options jsonb;
  checked_template_version_id uuid;
  parent_status text;
begin
  checked_organization_id := case when tg_op = 'DELETE'
    then old.organization_id else new.organization_id end;
  checked_options := case when tg_op = 'DELETE'
    then old.options else new.options end;
  checked_template_version_id := case when tg_op = 'DELETE'
    then old.template_version_id else new.template_version_id end;

  select version.status
    into parent_status
  from public.evaluation_template_versions version
  where version.id = checked_template_version_id
    and version.organization_id = checked_organization_id;

  if parent_status is null then
    raise exception 'TEMPLATE_VERSION_NOT_FOUND';
  end if;

  if parent_status <> 'DRAFT' then
    raise exception 'PUBLISHED_TEMPLATE_VERSION_IMMUTABLE';
  end if;

  if tg_op <> 'DELETE' and exists (
    select 1
    from jsonb_array_elements(checked_options) option_value
    where jsonb_typeof(option_value) <> 'string'
      or length(btrim(option_value #>> '{}')) = 0
      or length(option_value #>> '{}') > 200
  ) then
    raise exception 'TEMPLATE_QUESTION_OPTIONS_INVALID';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger evaluation_template_questions_validate_mutation
before insert or update or delete
on public.evaluation_template_questions
for each row
execute function public.validate_evaluation_template_question_mutation();

create trigger evaluation_template_questions_set_updated_at
before update on public.evaluation_template_questions
for each row
execute function public.set_updated_at();

alter table public.evaluation_template_questions enable row level security;

revoke all on table public.evaluation_templates
from public, anon, authenticated;
revoke all on table public.evaluation_template_versions
from public, anon, authenticated;
revoke all on table public.evaluation_template_questions
from public, anon, authenticated;

grant select, insert, update, delete on table public.evaluation_templates
to service_role;
grant select, insert, update, delete on table public.evaluation_template_versions
to service_role;
grant select, insert, update, delete on table public.evaluation_template_questions
to service_role;

create or replace function public.admin_save_evaluation_template_draft(
  actor_user_id uuid,
  managed_organization_id uuid,
  managed_template_id uuid,
  managed_template_version_id uuid,
  template_name text,
  template_description text,
  template_questions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_description text;
  normalized_name text;
  question jsonb;
  question_options jsonb;
  question_position integer := 0;
  question_prompt text;
  question_type text;
  result_template public.evaluation_templates%rowtype;
  result_version public.evaluation_template_versions%rowtype;
begin
  perform public.require_active_system_admin(
    actor_user_id,
    managed_organization_id
  );

  if not exists (
    select 1
    from public.organizations organization
    where organization.id = managed_organization_id
      and organization.status = 'ACTIVE'
  ) then
    raise exception 'ORGANIZATION_NOT_ACTIVE';
  end if;

  normalized_name := btrim(template_name);
  normalized_description := nullif(btrim(template_description), '');

  if length(normalized_name) < 2 or length(normalized_name) > 160 then
    raise exception 'TEMPLATE_NAME_INVALID';
  end if;

  if normalized_description is not null
    and length(normalized_description) > 1000 then
    raise exception 'TEMPLATE_DESCRIPTION_INVALID';
  end if;

  if jsonb_typeof(template_questions) <> 'array'
    or jsonb_array_length(template_questions) > 100 then
    raise exception 'TEMPLATE_QUESTIONS_INVALID';
  end if;

  if managed_template_id is null and managed_template_version_id is null then
    insert into public.evaluation_templates (
      organization_id,
      name,
      description,
      created_by_user_id
    ) values (
      managed_organization_id,
      normalized_name,
      normalized_description,
      actor_user_id
    )
    returning * into result_template;

    insert into public.evaluation_template_versions (
      organization_id,
      template_id,
      version_number,
      name,
      description,
      created_by_user_id
    ) values (
      managed_organization_id,
      result_template.id,
      1,
      normalized_name,
      normalized_description,
      actor_user_id
    )
    returning * into result_version;
  elsif managed_template_id is not null
    and managed_template_version_id is not null then
    select template.*
      into result_template
    from public.evaluation_templates template
    where template.id = managed_template_id
      and template.organization_id = managed_organization_id
      and template.status = 'ACTIVE'
    for update;

    if result_template.id is null then
      raise exception 'TEMPLATE_NOT_FOUND';
    end if;

    select version.*
      into result_version
    from public.evaluation_template_versions version
    where version.id = managed_template_version_id
      and version.template_id = managed_template_id
      and version.organization_id = managed_organization_id
    for update;

    if result_version.id is null then
      raise exception 'TEMPLATE_VERSION_NOT_FOUND';
    end if;

    if result_version.status <> 'DRAFT' then
      raise exception 'PUBLISHED_TEMPLATE_VERSION_IMMUTABLE';
    end if;

    update public.evaluation_templates
    set name = normalized_name,
        description = normalized_description
    where id = result_template.id
    returning * into result_template;

    update public.evaluation_template_versions
    set name = normalized_name,
        description = normalized_description
    where id = result_version.id
    returning * into result_version;

    delete from public.evaluation_template_questions
    where template_version_id = result_version.id;
  else
    raise exception 'TEMPLATE_DRAFT_ID_PAIR_INVALID';
  end if;

  for question in
    select value from jsonb_array_elements(template_questions)
  loop
    question_position := question_position + 1;
    question_prompt := btrim(coalesce(question ->> 'prompt', ''));
    question_type := coalesce(question ->> 'questionType', '');
    question_options := coalesce(question -> 'options', '[]'::jsonb);

    if length(question_prompt) < 2 or length(question_prompt) > 1000 then
      raise exception 'TEMPLATE_QUESTION_PROMPT_INVALID';
    end if;

    insert into public.evaluation_template_questions (
      organization_id,
      template_version_id,
      position,
      prompt,
      question_type,
      is_required,
      options
    ) values (
      managed_organization_id,
      result_version.id,
      question_position,
      question_prompt,
      question_type,
      coalesce((question ->> 'isRequired')::boolean, true),
      question_options
    );
  end loop;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'ORGANIZATION',
    managed_organization_id,
    'EVALUATION_TEMPLATE_DRAFT_SAVED',
    jsonb_build_object(
      'templateId', result_template.id,
      'templateVersionId', result_version.id,
      'versionNumber', result_version.version_number,
      'questionCount', question_position
    )
  );

  return jsonb_build_object(
    'templateId', result_template.id,
    'templateVersionId', result_version.id,
    'versionNumber', result_version.version_number
  );
end;
$$;

create or replace function public.admin_publish_evaluation_template_version(
  actor_user_id uuid,
  managed_template_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  question_count integer;
  result_version public.evaluation_template_versions%rowtype;
begin
  select version.*
    into result_version
  from public.evaluation_template_versions version
  join public.evaluation_templates template
    on template.id = version.template_id
   and template.organization_id = version.organization_id
  where version.id = managed_template_version_id
    and template.status = 'ACTIVE'
  for update of version;

  if result_version.id is null then
    raise exception 'TEMPLATE_VERSION_NOT_FOUND';
  end if;

  perform public.require_active_system_admin(
    actor_user_id,
    result_version.organization_id
  );

  if result_version.status <> 'DRAFT' then
    raise exception 'TEMPLATE_VERSION_NOT_DRAFT';
  end if;

  select count(*)::integer
    into question_count
  from public.evaluation_template_questions question
  where question.template_version_id = result_version.id;

  if question_count = 0 then
    raise exception 'TEMPLATE_QUESTION_REQUIRED';
  end if;

  update public.evaluation_template_versions
  set status = 'PUBLISHED',
      published_at = clock_timestamp(),
      published_by_user_id = actor_user_id
  where id = result_version.id
  returning * into result_version;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'ORGANIZATION',
    result_version.organization_id,
    'EVALUATION_TEMPLATE_VERSION_PUBLISHED',
    jsonb_build_object(
      'templateId', result_version.template_id,
      'templateVersionId', result_version.id,
      'versionNumber', result_version.version_number,
      'questionCount', question_count
    )
  );

  return jsonb_build_object(
    'templateId', result_version.template_id,
    'templateVersionId', result_version.id,
    'versionNumber', result_version.version_number
  );
end;
$$;

create or replace function public.admin_clone_evaluation_template_version(
  actor_user_id uuid,
  source_template_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_version_number integer;
  result_version public.evaluation_template_versions%rowtype;
  source_version public.evaluation_template_versions%rowtype;
begin
  select version.*
    into source_version
  from public.evaluation_template_versions version
  join public.evaluation_templates template
    on template.id = version.template_id
   and template.organization_id = version.organization_id
  where version.id = source_template_version_id
    and version.status = 'PUBLISHED'
    and template.status = 'ACTIVE'
  for update of version;

  if source_version.id is null then
    raise exception 'PUBLISHED_TEMPLATE_VERSION_NOT_FOUND';
  end if;

  perform public.require_active_system_admin(
    actor_user_id,
    source_version.organization_id
  );

  if exists (
    select 1
    from public.evaluation_template_versions version
    where version.template_id = source_version.template_id
      and version.status = 'DRAFT'
  ) then
    raise exception 'TEMPLATE_DRAFT_ALREADY_EXISTS';
  end if;

  select max(version.version_number) + 1
    into next_version_number
  from public.evaluation_template_versions version
  where version.template_id = source_version.template_id;

  insert into public.evaluation_template_versions (
    organization_id,
    template_id,
    version_number,
    name,
    description,
    created_by_user_id
  ) values (
    source_version.organization_id,
    source_version.template_id,
    next_version_number,
    source_version.name,
    source_version.description,
    actor_user_id
  )
  returning * into result_version;

  insert into public.evaluation_template_questions (
    organization_id,
    template_version_id,
    position,
    prompt,
    question_type,
    is_required,
    options
  )
  select
    question.organization_id,
    result_version.id,
    question.position,
    question.prompt,
    question.question_type,
    question.is_required,
    question.options
  from public.evaluation_template_questions question
  where question.template_version_id = source_version.id
  order by question.position;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'ORGANIZATION',
    source_version.organization_id,
    'EVALUATION_TEMPLATE_VERSION_CLONED',
    jsonb_build_object(
      'templateId', source_version.template_id,
      'sourceTemplateVersionId', source_version.id,
      'templateVersionId', result_version.id,
      'versionNumber', result_version.version_number
    )
  );

  return jsonb_build_object(
    'templateId', result_version.template_id,
    'templateVersionId', result_version.id,
    'versionNumber', result_version.version_number
  );
end;
$$;

revoke all on function public.admin_save_evaluation_template_draft(
  uuid, uuid, uuid, uuid, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.admin_save_evaluation_template_draft(
  uuid, uuid, uuid, uuid, text, text, jsonb
) to service_role;

revoke all on function public.admin_publish_evaluation_template_version(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.admin_publish_evaluation_template_version(uuid, uuid)
to service_role;

revoke all on function public.admin_clone_evaluation_template_version(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.admin_clone_evaluation_template_version(uuid, uuid)
to service_role;

insert into public.evaluation_templates (
  organization_id,
  name,
  description,
  status,
  created_by_user_id
)
select
  cycle.organization_id,
  'Migrated legacy template',
  'Archived compatibility template for evaluation cycles created before template versioning.',
  'ARCHIVED',
  min(cycle.created_by_user_id::text)::uuid
from public.evaluation_cycles cycle
group by cycle.organization_id;

insert into public.evaluation_template_versions (
  organization_id,
  template_id,
  version_number,
  name,
  description,
  created_by_user_id
)
select
  template.organization_id,
  template.id,
  1,
  template.name,
  template.description,
  template.created_by_user_id
from public.evaluation_templates template
where template.status = 'ARCHIVED'
  and template.name = 'Migrated legacy template';

insert into public.evaluation_template_questions (
  organization_id,
  template_version_id,
  position,
  prompt,
  question_type,
  is_required,
  options
)
select
  version.organization_id,
  version.id,
  1,
  'General evaluation comment',
  'LONG_TEXT',
  false,
  '[]'::jsonb
from public.evaluation_template_versions version
join public.evaluation_templates template
  on template.id = version.template_id
where template.status = 'ARCHIVED'
  and template.name = 'Migrated legacy template';

update public.evaluation_template_versions version
set status = 'PUBLISHED',
    published_at = clock_timestamp(),
    published_by_user_id = version.created_by_user_id
from public.evaluation_templates template
where template.id = version.template_id
  and template.status = 'ARCHIVED'
  and template.name = 'Migrated legacy template';

alter table public.evaluation_cycles
add column template_version_id uuid;

update public.evaluation_cycles cycle
set template_version_id = version.id
from public.evaluation_template_versions version
join public.evaluation_templates template
  on template.id = version.template_id
where template.organization_id = cycle.organization_id
  and template.status = 'ARCHIVED'
  and template.name = 'Migrated legacy template'
  and version.version_number = 1;

alter table public.evaluation_cycles
alter column template_version_id set not null;

alter table public.evaluation_cycles
add constraint evaluation_cycles_template_version_tenant_fk
foreign key (organization_id, template_version_id)
references public.evaluation_template_versions (organization_id, id)
on delete restrict;

create or replace function public.validate_evaluation_cycle_template_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.evaluation_template_versions version
    where version.id = new.template_version_id
      and version.organization_id = new.organization_id
      and version.status = 'PUBLISHED'
  ) then
    raise exception 'PUBLISHED_TEMPLATE_VERSION_REQUIRED';
  end if;

  return new;
end;
$$;

create trigger evaluation_cycles_validate_template_version
before insert or update of organization_id, template_version_id
on public.evaluation_cycles
for each row
execute function public.validate_evaluation_cycle_template_version();

create index evaluation_cycles_template_version_idx
on public.evaluation_cycles (template_version_id, status, closes_at);

alter table public.evaluation_assignments
add column template_version_id uuid;

update public.evaluation_assignments assignment
set template_version_id = cycle.template_version_id
from public.evaluation_cycles cycle
where cycle.id = assignment.evaluation_cycle_id;

alter table public.evaluation_assignments
alter column template_version_id set not null;

alter table public.evaluation_assignments
add constraint evaluation_assignments_template_version_tenant_fk
foreign key (organization_id, template_version_id)
references public.evaluation_template_versions (organization_id, id)
on delete restrict;

create or replace function public.validate_evaluation_assignment_template_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  cycle_template_version_id uuid;
begin
  select cycle.template_version_id
    into cycle_template_version_id
  from public.evaluation_cycles cycle
  where cycle.id = new.evaluation_cycle_id
    and cycle.organization_id = new.organization_id;

  if cycle_template_version_id is null then
    raise exception 'EVALUATION_ASSIGNMENT_CYCLE_NOT_FOUND';
  end if;

  if new.template_version_id is null then
    new.template_version_id := cycle_template_version_id;
  elsif new.template_version_id <> cycle_template_version_id then
    raise exception 'EVALUATION_ASSIGNMENT_TEMPLATE_VERSION_MISMATCH';
  end if;

  return new;
end;
$$;

create trigger evaluation_assignments_validate_template_version
before insert or update of
  organization_id,
  evaluation_cycle_id,
  template_version_id
on public.evaluation_assignments
for each row
execute function public.validate_evaluation_assignment_template_version();

create index evaluation_assignments_template_version_idx
on public.evaluation_assignments (template_version_id, status, created_at desc);

create or replace function public.get_my_evaluation_assignments()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid := auth.uid();
  assignments jsonb;
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
        'id', assignment.id,
        'organization_id', assignment.organization_id,
        'organization_name', organization.name,
        'evaluation_cycle_id', cycle.id,
        'evaluation_cycle_name', cycle.name,
        'cycle_status', cycle.status,
        'opens_at', cycle.opens_at,
        'closes_at', cycle.closes_at,
        'project_id', project.id,
        'project_name', project.name,
        'project_code', project.code,
        'template_version_id', template_version.id,
        'template_name', template_version.name,
        'template_version_number', template_version.version_number,
        'subject_display_name', subject_profile.display_name,
        'subject_email', subject_profile.email,
        'assignment_kind', assignment.assignment_kind,
        'assignment_status', assignment.status,
        'availability_status', case
          when assignment.status = 'COMPLETED' then 'COMPLETED'
          when cycle.status <> 'OPEN' or now() >= cycle.closes_at then 'CLOSED'
          when now() < cycle.opens_at then 'UPCOMING'
          else 'AVAILABLE'
        end
      )
      order by
        case when assignment.status = 'PENDING' then 0 else 1 end,
        cycle.closes_at,
        assignment.created_at desc
    ),
    '[]'::jsonb
  )
  into assignments
  from public.evaluation_assignments assignment
  join public.evaluation_cycles cycle
    on cycle.id = assignment.evaluation_cycle_id
   and cycle.organization_id = assignment.organization_id
  join public.evaluation_template_versions template_version
    on template_version.id = assignment.template_version_id
   and template_version.organization_id = assignment.organization_id
   and template_version.id = cycle.template_version_id
  join public.organizations organization
    on organization.id = assignment.organization_id
   and organization.status = 'ACTIVE'
  join public.user_profiles subject_profile
    on subject_profile.user_id = assignment.subject_user_id
   and subject_profile.onboarding_status = 'ACTIVE'
  left join public.projects project
    on project.id = assignment.project_id
   and project.organization_id = assignment.organization_id
  where assignment.evaluator_user_id = actor_user_id
    and assignment.status <> 'CANCELLED'
    and cycle.status <> 'DRAFT'
    and exists (
      select 1
      from public.organization_unit_memberships actor_membership
      where actor_membership.organization_id = assignment.organization_id
        and actor_membership.user_id = actor_user_id
        and actor_membership.starts_at <= now()
        and (
          actor_membership.ends_at is null
          or actor_membership.ends_at > now()
        )
    )
    and exists (
      select 1
      from public.organization_unit_memberships subject_membership
      where subject_membership.organization_id = assignment.organization_id
        and subject_membership.user_id = assignment.subject_user_id
        and subject_membership.starts_at <= now()
        and (
          subject_membership.ends_at is null
          or subject_membership.ends_at > now()
        )
    );

  return jsonb_build_object('assignments', assignments);
end;
$$;

revoke all on function public.get_my_evaluation_assignments()
from public, anon, authenticated;
grant execute on function public.get_my_evaluation_assignments()
to authenticated;

comment on table public.evaluation_templates is
  'Tenant-scoped logical evaluation-template identities. Published content lives in immutable version rows.';
comment on table public.evaluation_template_versions is
  'Versioned evaluation configuration. Published rows are immutable and are the exact configuration bound to cycles and assignments.';
comment on table public.evaluation_template_questions is
  'Ordered question configuration for one template version. Mutation is allowed only while the parent version is a draft.';
comment on column public.evaluation_cycles.template_version_id is
  'Exact published template version used by this cycle. It cannot reference a draft.';
comment on column public.evaluation_assignments.template_version_id is
  'Exact template version copied from the parent cycle. Evaluation content is not stored here.';
comment on function public.admin_save_evaluation_template_draft(
  uuid, uuid, uuid, uuid, text, text, jsonb
) is 'Service-role-only atomic create/update operation for a scoped evaluation-template draft.';
comment on function public.admin_publish_evaluation_template_version(uuid, uuid)
is 'Service-role-only publication boundary. A published evaluation-template version becomes database-immutable.';
comment on function public.admin_clone_evaluation_template_version(uuid, uuid)
is 'Service-role-only operation that creates a new editable draft from a published evaluation-template version.';

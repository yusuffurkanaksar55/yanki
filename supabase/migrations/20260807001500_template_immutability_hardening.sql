create or replace function public.validate_evaluation_template_question_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  checked_organization_id uuid;
  checked_options jsonb;
  checked_template_version_id uuid;
  old_parent_status text;
  parent_status text;
begin
  if tg_op = 'UPDATE' then
    select version.status
      into old_parent_status
    from public.evaluation_template_versions version
    where version.id = old.template_version_id
      and version.organization_id = old.organization_id;

    if old_parent_status is null then
      raise exception 'TEMPLATE_VERSION_NOT_FOUND';
    end if;

    if old_parent_status <> 'DRAFT' then
      raise exception 'PUBLISHED_TEMPLATE_VERSION_IMMUTABLE';
    end if;
  end if;

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

create or replace function public.validate_evaluation_cycle_template_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.evaluation_template_versions version
    join public.evaluation_templates template
      on template.id = version.template_id
     and template.organization_id = version.organization_id
    where version.id = new.template_version_id
      and version.organization_id = new.organization_id
      and version.status = 'PUBLISHED'
      and template.status = 'ACTIVE'
  ) then
    raise exception 'PUBLISHED_TEMPLATE_VERSION_REQUIRED';
  end if;

  return new;
end;
$$;

comment on function public.validate_evaluation_template_question_mutation() is
  'Rejects every question mutation whose source or target version is published, including attempts to move a published question into a draft.';

comment on function public.validate_evaluation_cycle_template_version() is
  'Requires a cycle template version to be published, active, and in the same organization. Existing migrated legacy cycles remain readable.';

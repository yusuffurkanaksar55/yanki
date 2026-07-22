create or replace function public.admin_update_project_dates(
  actor_user_id uuid,
  managed_project_id uuid,
  managed_evaluation_cycle_id uuid,
  new_project_completed_on date,
  new_evaluation_closes_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cycle_record public.evaluation_cycles%rowtype;
  project_record public.projects%rowtype;
begin
  if not exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = actor_user_id
      and profile.onboarding_status = 'ACTIVE'
  ) then
    raise exception 'ACTIVE_PROFILE_REQUIRED';
  end if;

  select *
    into project_record
  from public.projects project
  where project.id = managed_project_id
  for update;

  if not found then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  if project_record.status = 'ARCHIVED' then
    raise exception 'PROJECT_DATES_NOT_EDITABLE';
  end if;

  if not (
    exists (
      select 1
      from public.user_role_assignments role_assignment
      where role_assignment.user_id = actor_user_id
        and role_assignment.role_code = 'SYSTEM_ADMIN'
        and role_assignment.starts_at <= now()
        and (
          role_assignment.ends_at is null
          or role_assignment.ends_at > now()
        )
        and (
          (
            role_assignment.scope_type = 'PLATFORM'
            and role_assignment.scope_id is null
          )
          or (
            role_assignment.scope_type = 'ORGANIZATION'
            and role_assignment.scope_id = project_record.organization_id
          )
        )
    )
    or (
      project_record.project_manager_user_id = actor_user_id
      and exists (
        select 1
        from public.user_role_assignments role_assignment
        where role_assignment.user_id = actor_user_id
          and role_assignment.role_code = 'PROJECT_MANAGER'
          and role_assignment.scope_type = 'PROJECT'
          and role_assignment.scope_id = project_record.id
          and role_assignment.starts_at <= now()
          and (
            role_assignment.ends_at is null
            or role_assignment.ends_at > now()
          )
      )
    )
  ) then
    raise exception 'ADMINISTRATION_SCOPE_DENIED';
  end if;

  select *
    into cycle_record
  from public.evaluation_cycles cycle
  where cycle.id = managed_evaluation_cycle_id
    and cycle.project_id = project_record.id
    and cycle.organization_id = project_record.organization_id
  for update;

  if not found then
    raise exception 'EVALUATION_CYCLE_NOT_FOUND';
  end if;

  if cycle_record.status not in ('DRAFT', 'OPEN') then
    raise exception 'PROJECT_DATES_NOT_EDITABLE';
  end if;

  if new_evaluation_closes_at is null then
    raise exception 'CLOSES_AT_REQUIRED';
  end if;

  if new_evaluation_closes_at <= cycle_record.opens_at then
    raise exception 'CLOSES_AT_MUST_BE_AFTER_OPENS_AT';
  end if;

  if new_project_completed_on is not null
    and project_record.starts_on is not null
    and new_project_completed_on < project_record.starts_on then
    raise exception 'PROJECT_COMPLETED_ON_MUST_NOT_PRECEDE_START';
  end if;

  update public.projects
  set completes_on = new_project_completed_on
  where id = project_record.id;

  update public.evaluation_cycles
  set project_completed_on = new_project_completed_on,
      closes_at = new_evaluation_closes_at
  where id = cycle_record.id;

  insert into public.audit_events (
    actor_user_id,
    event_scope_type,
    event_scope_id,
    event_type,
    safe_metadata
  ) values (
    actor_user_id,
    'PROJECT',
    project_record.id,
    'PROJECT_DATES_UPDATED',
    jsonb_build_object(
      'evaluationCycleId', cycle_record.id,
      'projectCompletedOn', new_project_completed_on,
      'evaluationClosesAt', new_evaluation_closes_at
    )
  );

  return jsonb_build_object(
    'projectId', project_record.id,
    'evaluationCycleId', cycle_record.id
  );
end;
$$;

revoke all on function public.admin_update_project_dates(
  uuid, uuid, uuid, date, timestamptz
) from public, anon, authenticated;

grant execute on function public.admin_update_project_dates(
  uuid, uuid, uuid, date, timestamptz
) to service_role;

comment on function public.admin_update_project_dates(
  uuid, uuid, uuid, date, timestamptz
) is
  'Atomically updates project completion and evaluation close dates after rechecking system-admin or assigned-project-manager authorization.';

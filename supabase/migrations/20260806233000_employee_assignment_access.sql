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

comment on function public.get_my_evaluation_assignments() is
  'Returns only the authenticated active user''s non-cancelled, non-draft assignment metadata after revalidating active organization membership. It never returns evaluation responses, anonymous credentials, or evaluator identity fields.';

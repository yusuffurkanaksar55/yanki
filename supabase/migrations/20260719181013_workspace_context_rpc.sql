create or replace function public.get_my_workspace_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with current_profile as (
    select
      user_id,
      email,
      display_name,
      onboarding_status
    from public.user_profiles
    where user_id = auth.uid()
  ),
  current_roles as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'role_code', role_code,
          'scope_type', scope_type,
          'scope_id', scope_id
        )
        order by role_code, scope_type
      ),
      '[]'::jsonb
    ) as roles
    from public.user_role_assignments
    where user_id = auth.uid()
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
  ),
  current_memberships as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'organization_id', organization_id,
          'organization_name', organization_name,
          'unit_id', unit_id,
          'unit_name', unit_name,
          'unit_type', unit_type,
          'membership_kind', membership_kind,
          'is_primary', is_primary
        )
        order by is_primary desc, organization_name, unit_name
      ),
      '[]'::jsonb
    ) as memberships
    from (
      select
        membership.organization_id,
        organization.name as organization_name,
        membership.unit_id,
        organization_unit.name as unit_name,
        organization_unit.unit_type,
        membership.membership_kind,
        membership.is_primary
      from public.organization_unit_memberships membership
      join public.organizations organization
        on organization.id = membership.organization_id
      join public.organization_units organization_unit
        on organization_unit.id = membership.unit_id
      where membership.user_id = auth.uid()
        and membership.starts_at <= now()
        and (membership.ends_at is null or membership.ends_at > now())
    ) membership_rows
  ),
  current_managers as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'manager_user_id', manager_assignment.manager_user_id,
          'manager_display_name', manager_profile.display_name,
          'manager_email', manager_profile.email,
          'relationship_type', manager_assignment.relationship_type
        )
        order by manager_assignment.relationship_type, manager_profile.display_name
      ),
      '[]'::jsonb
    ) as managers
    from public.manager_assignments manager_assignment
    left join public.user_profiles manager_profile
      on manager_profile.user_id = manager_assignment.manager_user_id
    where manager_assignment.direct_report_user_id = auth.uid()
      and manager_assignment.starts_at <= now()
      and (
        manager_assignment.ends_at is null
        or manager_assignment.ends_at > now()
      )
  )
  select jsonb_build_object(
    'profile', coalesce(to_jsonb(current_profile), 'null'::jsonb),
    'roles', current_roles.roles,
    'memberships', current_memberships.memberships,
    'managers', current_managers.managers
  )
  from current_profile
  cross join current_roles
  cross join current_memberships
  cross join current_managers;
$$;

revoke all on function public.get_my_workspace_context() from public;
grant execute on function public.get_my_workspace_context() to authenticated;

comment on function public.get_my_workspace_context() is
  'Returns only the authenticated user own non-sensitive profile, role, membership, and manager context for dashboard display. Does not return evaluation content.';

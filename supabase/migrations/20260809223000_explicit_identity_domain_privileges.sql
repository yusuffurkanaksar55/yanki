-- New Supabase projects no longer auto-grant API table privileges. Keep the
-- browser surface narrow and make trusted identity/configuration access explicit.
grant usage on schema public to authenticated, service_role;

grant select on table public.user_profiles to authenticated;

grant select, insert, update, delete on table
  public.app_roles,
  public.scope_types,
  public.user_role_assignments,
  public.audit_events,
  public.user_profiles,
  public.user_invitations,
  public.organizations,
  public.organization_units,
  public.organization_unit_memberships,
  public.manager_assignments,
  public.projects,
  public.project_memberships,
  public.evaluation_cycles,
  public.evaluation_assignments
to service_role;

comment on policy user_profiles_select_own_profile on public.user_profiles is
  'Authenticated users may read only their own profile after the explicit table SELECT grant; all writes remain trusted-server only.';

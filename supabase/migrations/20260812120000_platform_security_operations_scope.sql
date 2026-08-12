create or replace function public.get_anonymous_submission_abuse_summary(
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  observed_at timestamptz := clock_timestamp();
begin
  if not exists (
    select 1
    from public.user_profiles profile
    join public.user_role_assignments role_assignment
      on role_assignment.user_id = profile.user_id
    where profile.user_id = actor_user_id
      and profile.onboarding_status = 'ACTIVE'
      and role_assignment.role_code = 'SYSTEM_ADMIN'
      and role_assignment.scope_type = 'PLATFORM'
      and role_assignment.scope_id is null
      and role_assignment.starts_at <= observed_at
      and (
        role_assignment.ends_at is null
        or role_assignment.ends_at > observed_at
      )
  ) then
    raise exception 'SECURITY_MONITORING_ACCESS_DENIED'
      using errcode = '42501';
  end if;

  return public.read_anonymous_submission_abuse_summary();
end;
$$;

revoke all on function public.get_anonymous_submission_abuse_summary(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.get_anonymous_submission_abuse_summary(uuid)
to service_role;

comment on function public.get_anonymous_submission_abuse_summary(uuid) is
  'Platform-system-admin-only identifier-free abuse summary. Organization-scoped administrators cannot read platform-wide operational aggregates.';

create or replace function public.read_anonymous_submission_abuse_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invalid_last_24_hours integer;
  invalid_last_60_minutes integer;
  observed_at timestamptz := clock_timestamp();
  rate_limited_last_24_hours integer;
  rate_limited_last_60_minutes integer;
begin
  select
    coalesce(sum(event_counter.event_count) filter (
      where event_counter.event_type = 'ANONYMOUS_INVALID_CREDENTIAL'
        and event_counter.bucket_started_at
          >= observed_at - interval '60 minutes'
    ), 0)::integer,
    coalesce(sum(event_counter.event_count) filter (
      where event_counter.event_type = 'ANONYMOUS_INVALID_CREDENTIAL'
        and event_counter.bucket_started_at
          >= observed_at - interval '24 hours'
    ), 0)::integer,
    coalesce(sum(event_counter.event_count) filter (
      where event_counter.event_type = 'ANONYMOUS_SUBMISSION_RATE_LIMITED'
        and event_counter.bucket_started_at
          >= observed_at - interval '60 minutes'
    ), 0)::integer,
    coalesce(sum(event_counter.event_count) filter (
      where event_counter.event_type = 'ANONYMOUS_SUBMISSION_RATE_LIMITED'
        and event_counter.bucket_started_at
          >= observed_at - interval '24 hours'
    ), 0)::integer
  into
    invalid_last_60_minutes,
    invalid_last_24_hours,
    rate_limited_last_60_minutes,
    rate_limited_last_24_hours
  from public.security_abuse_event_counters event_counter;

  return jsonb_build_object(
    'invalid_credential_attempts_last_60_minutes', invalid_last_60_minutes,
    'invalid_credential_attempts_last_24_hours', invalid_last_24_hours,
    'rate_limited_requests_last_60_minutes', rate_limited_last_60_minutes,
    'rate_limited_requests_last_24_hours', rate_limited_last_24_hours,
    'known_credential_limit', 12,
    'known_credential_window_seconds', 600,
    'invalid_global_limit', 120,
    'invalid_global_window_seconds', 60,
    'counter_retention_days', 7
  );
end;
$$;

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

create or replace function public.get_anonymous_submission_abuse_summary_for_operator()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'SECURITY_MONITORING_OPERATOR_ACCESS_DENIED'
      using errcode = '42501';
  end if;

  return public.read_anonymous_submission_abuse_summary();
end;
$$;

revoke all on function public.read_anonymous_submission_abuse_summary()
from public, anon, authenticated, service_role;
revoke all on function public.get_anonymous_submission_abuse_summary(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.get_anonymous_submission_abuse_summary_for_operator()
from public, anon, authenticated, service_role;

grant execute on function public.get_anonymous_submission_abuse_summary(uuid)
to service_role;
grant execute on function public.get_anonymous_submission_abuse_summary_for_operator()
to service_role;

comment on function public.read_anonymous_submission_abuse_summary() is
  'Internal identifier-free aggregate builder. Direct execution is revoked from API roles.';
comment on function public.get_anonymous_submission_abuse_summary_for_operator() is
  'Service-role-only identifier-free abuse summary for scheduled alert delivery. Returns no tenant, user, request, credential, or evaluation content.';

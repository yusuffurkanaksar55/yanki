create table public.security_rate_limit_buckets (
  bucket_scope text not null,
  bucket_key_hash bytea not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  expires_at timestamptz not null,
  constraint security_rate_limit_buckets_pkey primary key (
    bucket_scope,
    bucket_key_hash,
    window_started_at
  ),
  constraint security_rate_limit_buckets_scope_check check (
    bucket_scope in (
      'ANONYMOUS_CREDENTIAL',
      'ANONYMOUS_INVALID_GLOBAL'
    )
  ),
  constraint security_rate_limit_buckets_key_length_check check (
    octet_length(bucket_key_hash) = 32
  ),
  constraint security_rate_limit_buckets_count_check check (
    request_count > 0
  ),
  constraint security_rate_limit_buckets_expiry_check check (
    expires_at > window_started_at
  )
);

create index security_rate_limit_buckets_expiry_idx
on public.security_rate_limit_buckets (expires_at);

alter table public.security_rate_limit_buckets enable row level security;

create table public.security_abuse_event_counters (
  event_type text not null,
  bucket_started_at timestamptz not null,
  event_count integer not null,
  constraint security_abuse_event_counters_pkey primary key (
    event_type,
    bucket_started_at
  ),
  constraint security_abuse_event_counters_type_check check (
    event_type in (
      'ANONYMOUS_INVALID_CREDENTIAL',
      'ANONYMOUS_SUBMISSION_RATE_LIMITED'
    )
  ),
  constraint security_abuse_event_counters_count_check check (
    event_count > 0
  )
);

create index security_abuse_event_counters_time_idx
on public.security_abuse_event_counters (bucket_started_at desc);

alter table public.security_abuse_event_counters enable row level security;

create or replace function public.consume_security_rate_limit(
  managed_bucket_scope text,
  managed_bucket_key_hash bytea,
  managed_limit integer,
  managed_window interval,
  managed_observed_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  consumed_count integer;
  current_window_started_at timestamptz;
begin
  if managed_bucket_scope not in (
    'ANONYMOUS_CREDENTIAL',
    'ANONYMOUS_INVALID_GLOBAL'
  )
    or managed_bucket_key_hash is null
    or octet_length(managed_bucket_key_hash) <> 32
    or managed_limit < 1
    or managed_window <= interval '0 seconds'
    or managed_window >= interval '1 day'
    or managed_observed_at is null then
    raise exception 'SECURITY_RATE_LIMIT_CONFIGURATION_INVALID';
  end if;

  current_window_started_at := date_bin(
    managed_window,
    managed_observed_at,
    timestamptz '2000-01-01 00:00:00+00'
  );

  delete from public.security_rate_limit_buckets bucket
  where bucket.expires_at <= managed_observed_at;

  insert into public.security_rate_limit_buckets (
    bucket_scope,
    bucket_key_hash,
    window_started_at,
    request_count,
    expires_at
  )
  values (
    managed_bucket_scope,
    managed_bucket_key_hash,
    current_window_started_at,
    1,
    current_window_started_at + interval '1 day'
  )
  on conflict (bucket_scope, bucket_key_hash, window_started_at)
  do update
  set request_count = public.security_rate_limit_buckets.request_count + 1,
      expires_at = excluded.expires_at
  returning request_count into consumed_count;

  return consumed_count;
end;
$$;

create or replace function public.record_security_abuse_event(
  managed_event_type text,
  managed_observed_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_event_bucket timestamptz;
begin
  if managed_event_type not in (
    'ANONYMOUS_INVALID_CREDENTIAL',
    'ANONYMOUS_SUBMISSION_RATE_LIMITED'
  )
    or managed_observed_at is null then
    raise exception 'SECURITY_ABUSE_EVENT_INVALID';
  end if;

  current_event_bucket := date_bin(
    interval '5 minutes',
    managed_observed_at,
    timestamptz '2000-01-01 00:00:00+00'
  );

  delete from public.security_abuse_event_counters event_counter
  where event_counter.bucket_started_at
    < current_event_bucket - interval '7 days';

  insert into public.security_abuse_event_counters (
    event_type,
    bucket_started_at,
    event_count
  )
  values (
    managed_event_type,
    current_event_bucket,
    1
  )
  on conflict (event_type, bucket_started_at)
  do update
  set event_count = public.security_abuse_event_counters.event_count + 1;
end;
$$;

create or replace function public.consume_anonymous_submission_request(
  credential_digest_hex text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bucket_key_hash bytea;
  bucket_limit integer;
  bucket_window interval;
  credential_record record;
  current_count integer;
  observed_at timestamptz := clock_timestamp();
  retry_after_seconds integer;
  window_started_at timestamptz;
begin
  if credential_digest_hex is not null
    and credential_digest_hex ~ '^[0-9a-fA-F]{64}$' then
    select
      credential.id,
      credential.status,
      credential.expires_at
    into credential_record
    from public.anonymous_submission_credentials credential
    where credential.credential_digest = decode(credential_digest_hex, 'hex');
  end if;

  if credential_record.id is not null then
    bucket_key_hash := extensions.digest(
      uuid_send(credential_record.id),
      'sha256'
    );
    bucket_limit := 12;
    bucket_window := interval '10 minutes';
    current_count := public.consume_security_rate_limit(
      'ANONYMOUS_CREDENTIAL',
      bucket_key_hash,
      bucket_limit,
      bucket_window,
      observed_at
    );
  else
    bucket_key_hash := decode(repeat('00', 32), 'hex');
    bucket_limit := 120;
    bucket_window := interval '1 minute';
    current_count := public.consume_security_rate_limit(
      'ANONYMOUS_INVALID_GLOBAL',
      bucket_key_hash,
      bucket_limit,
      bucket_window,
      observed_at
    );
  end if;

  window_started_at := date_bin(
    bucket_window,
    observed_at,
    timestamptz '2000-01-01 00:00:00+00'
  );
  retry_after_seconds := greatest(
    1,
    ceil(
      extract(
        epoch from (window_started_at + bucket_window - observed_at)
      )
    )::integer
  );

  if credential_record.id is null
    or credential_record.status <> 'PENDING'
    or credential_record.expires_at <= observed_at then
    perform public.record_security_abuse_event(
      'ANONYMOUS_INVALID_CREDENTIAL',
      observed_at
    );

    if current_count > bucket_limit then
      perform public.record_security_abuse_event(
        'ANONYMOUS_SUBMISSION_RATE_LIMITED',
        observed_at
      );

      return jsonb_build_object(
        'allowed', false,
        'error_code', 'ANONYMOUS_RATE_LIMIT_EXCEEDED',
        'retry_after_seconds', retry_after_seconds
      );
    end if;

    return jsonb_build_object(
      'allowed', false,
      'error_code', case
        when credential_record.status = 'REDEEMED'
          then 'ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED'
        else 'ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED'
      end
    );
  end if;

  if current_count > bucket_limit then
    perform public.record_security_abuse_event(
      'ANONYMOUS_SUBMISSION_RATE_LIMITED',
      observed_at
    );

    return jsonb_build_object(
      'allowed', false,
      'error_code', 'ANONYMOUS_RATE_LIMIT_EXCEEDED',
      'retry_after_seconds', retry_after_seconds
    );
  end if;

  return jsonb_build_object('allowed', true);
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
  invalid_last_24_hours integer;
  invalid_last_60_minutes integer;
  observed_at timestamptz := clock_timestamp();
  rate_limited_last_24_hours integer;
  rate_limited_last_60_minutes integer;
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

revoke all on table public.security_rate_limit_buckets
from public, anon, authenticated, service_role;
revoke all on table public.security_abuse_event_counters
from public, anon, authenticated, service_role;

revoke all on function public.consume_security_rate_limit(
  text,
  bytea,
  integer,
  interval,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.record_security_abuse_event(text, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function public.consume_anonymous_submission_request(text)
from public, anon, authenticated;
revoke all on function public.get_anonymous_submission_abuse_summary(uuid)
from public, anon, authenticated;

grant execute on function public.consume_anonymous_submission_request(text)
to service_role;
grant execute on function public.get_anonymous_submission_abuse_summary(uuid)
to service_role;

comment on table public.security_rate_limit_buckets is
  'Short-lived abuse-control counters keyed only by non-reversible operational hashes. Stores no IP address, device identifier, credential digest, user id, assignment id, evaluation content, or submission linkage.';
comment on table public.security_abuse_event_counters is
  'Five-minute aggregate abuse counters retained for seven days. Stores no actor, tenant, IP address, device identifier, credential, request body, content, or evaluator linkage.';
comment on function public.consume_anonymous_submission_request(text) is
  'Service-role-only privacy-preserving rate-limit decision for anonymous evaluation submissions. Known credentials use isolated buckets; invalid traffic uses a global invalid-only bucket.';
comment on function public.get_anonymous_submission_abuse_summary(uuid) is
  'Service-role-only system-admin summary of aggregate anonymous endpoint abuse counters without identifiers, secrets, request data, or content.';

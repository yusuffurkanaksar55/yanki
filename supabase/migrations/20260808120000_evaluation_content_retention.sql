create table public.organization_evaluation_retention_policies (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  retention_days integer not null default 730,
  automatic_purge_enabled boolean not null default false,
  legal_hold boolean not null default false,
  policy_version bigint not null default 1,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  last_purge_completed_at timestamptz,
  last_purge_cutoff_on date,
  constraint organization_evaluation_retention_days_check check (
    retention_days between 30 and 3650
  ),
  constraint organization_evaluation_retention_version_check check (
    policy_version > 0
  ),
  constraint organization_evaluation_retention_last_purge_pair_check check (
    (last_purge_completed_at is null and last_purge_cutoff_on is null)
    or (last_purge_completed_at is not null and last_purge_cutoff_on is not null)
  )
);

alter table public.organization_evaluation_retention_policies enable row level security;

create or replace function public.create_default_evaluation_retention_policy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.organization_evaluation_retention_policies (
    organization_id
  ) values (
    new.id
  ) on conflict (organization_id) do nothing;

  return new;
end;
$$;

create trigger organizations_create_default_evaluation_retention_policy
after insert on public.organizations
for each row
execute function public.create_default_evaluation_retention_policy();

insert into public.organization_evaluation_retention_policies (
  organization_id
)
select organization.id
from public.organizations organization
on conflict (organization_id) do nothing;

create or replace function public.list_manageable_evaluation_retention_policies(
  actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  policies jsonb;
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

  if not exists (
    select 1
    from public.user_role_assignments role_assignment
    where role_assignment.user_id = actor_user_id
      and role_assignment.role_code = 'SYSTEM_ADMIN'
      and role_assignment.starts_at <= now()
      and (
        role_assignment.ends_at is null
        or role_assignment.ends_at > now()
      )
  ) then
    raise exception 'ADMINISTRATION_SCOPE_DENIED' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'organizationId', organization.id,
        'organizationName', organization.name,
        'retentionDays', policy.retention_days,
        'automaticPurgeEnabled', policy.automatic_purge_enabled,
        'legalHold', policy.legal_hold,
        'policyVersion', policy.policy_version,
        'updatedAt', policy.updated_at,
        'lastPurgeCompletedAt', policy.last_purge_completed_at,
        'lastPurgeCutoffOn', policy.last_purge_cutoff_on
      ) order by organization.name, organization.id
    ),
    '[]'::jsonb
  ) into policies
  from public.organizations organization
  join public.organization_evaluation_retention_policies policy
    on policy.organization_id = organization.id
  where organization.status = 'ACTIVE'
    and exists (
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
            and role_assignment.scope_id = organization.id
          )
        )
    );

  return jsonb_build_object('policies', policies);
end;
$$;

create or replace function public.admin_update_evaluation_retention_policy(
  actor_user_id uuid,
  managed_organization_id uuid,
  managed_retention_days integer,
  managed_automatic_purge_enabled boolean,
  managed_legal_hold boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.organization_evaluation_retention_policies;
begin
  perform public.require_active_system_admin(
    actor_user_id,
    managed_organization_id
  );

  if managed_retention_days is null
    or managed_retention_days not between 30 and 3650 then
    raise exception 'EVALUATION_RETENTION_DAYS_INVALID';
  end if;

  if managed_automatic_purge_enabled is null or managed_legal_hold is null then
    raise exception 'EVALUATION_RETENTION_POLICY_INVALID';
  end if;

  if not exists (
    select 1
    from public.organizations organization
    where organization.id = managed_organization_id
      and organization.status = 'ACTIVE'
  ) then
    raise exception 'ORGANIZATION_NOT_FOUND';
  end if;

  insert into public.organization_evaluation_retention_policies (
    organization_id,
    retention_days,
    automatic_purge_enabled,
    legal_hold,
    updated_by_user_id,
    updated_at
  ) values (
    managed_organization_id,
    managed_retention_days,
    managed_automatic_purge_enabled,
    managed_legal_hold,
    actor_user_id,
    clock_timestamp()
  )
  on conflict (organization_id) do update
  set retention_days = excluded.retention_days,
      automatic_purge_enabled = excluded.automatic_purge_enabled,
      legal_hold = excluded.legal_hold,
      policy_version =
        public.organization_evaluation_retention_policies.policy_version + 1,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = excluded.updated_at
  returning * into result;

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
    'EVALUATION_RETENTION_POLICY_UPDATED',
    jsonb_build_object(
      'retentionDays', result.retention_days,
      'automaticPurgeEnabled', result.automatic_purge_enabled,
      'legalHold', result.legal_hold,
      'policyVersion', result.policy_version
    )
  );

  return jsonb_build_object(
    'organizationId', result.organization_id,
    'retentionDays', result.retention_days,
    'automaticPurgeEnabled', result.automatic_purge_enabled,
    'legalHold', result.legal_hold,
    'policyVersion', result.policy_version,
    'updatedAt', result.updated_at,
    'lastPurgeCompletedAt', result.last_purge_completed_at,
    'lastPurgeCutoffOn', result.last_purge_cutoff_on
  );
end;
$$;

create or replace function public.execute_due_evaluation_content_retention()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  policy record;
  retention_cutoff_on date;
  organizations_processed integer := 0;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('execute_due_evaluation_content_retention', 0)
  );

  for policy in
    select
      retention_policy.organization_id,
      retention_policy.retention_days,
      retention_policy.policy_version
    from public.organization_evaluation_retention_policies retention_policy
    where retention_policy.automatic_purge_enabled
      and not retention_policy.legal_hold
    order by retention_policy.organization_id
    for update
  loop
    retention_cutoff_on := current_date - policy.retention_days;

    if exists (
      select 1
      from public.organization_evaluation_retention_policies current_policy
      where current_policy.organization_id = policy.organization_id
        and current_policy.last_purge_cutoff_on >= retention_cutoff_on
    ) then
      continue;
    end if;

    delete from public.encrypted_evaluation_submissions submission
    where submission.organization_id = policy.organization_id
      and submission.stored_on < retention_cutoff_on;

    update public.organization_evaluation_retention_policies
    set last_purge_completed_at = clock_timestamp(),
        last_purge_cutoff_on = retention_cutoff_on
    where organization_id = policy.organization_id;

    insert into public.audit_events (
      actor_user_id,
      event_scope_type,
      event_scope_id,
      event_type,
      safe_metadata
    ) values (
      null,
      'ORGANIZATION',
      policy.organization_id,
      'EVALUATION_CONTENT_RETENTION_EXECUTED',
      jsonb_build_object(
        'cutoffOn', retention_cutoff_on,
        'policyVersion', policy.policy_version,
        'executionMode', 'SCHEDULED_OPERATOR'
      )
    );

    organizations_processed := organizations_processed + 1;
  end loop;

  return jsonb_build_object(
    'executed', true,
    'executedOn', current_date,
    'organizationsProcessed', organizations_processed
  );
end;
$$;

revoke all on table public.organization_evaluation_retention_policies
from public, anon, authenticated, service_role;

revoke all on function public.create_default_evaluation_retention_policy()
from public, anon, authenticated, service_role;

revoke all on function public.list_manageable_evaluation_retention_policies(uuid)
from public, anon, authenticated;
grant execute on function public.list_manageable_evaluation_retention_policies(uuid)
to service_role;

revoke all on function public.admin_update_evaluation_retention_policy(
  uuid,
  uuid,
  integer,
  boolean,
  boolean
) from public, anon, authenticated;
grant execute on function public.admin_update_evaluation_retention_policy(
  uuid,
  uuid,
  integer,
  boolean,
  boolean
) to service_role;

revoke all on function public.execute_due_evaluation_content_retention()
from public, anon, authenticated;
grant execute on function public.execute_due_evaluation_content_retention()
to service_role;

comment on table public.organization_evaluation_retention_policies is
  'Tenant-scoped encrypted evaluation-content retention configuration. It stores no evaluation content, evaluator identity, submission count, or participation state.';
comment on function public.list_manageable_evaluation_retention_policies(uuid) is
  'Returns content-free retention configuration only for organizations within the active system administrator scope.';
comment on function public.admin_update_evaluation_retention_policy(
  uuid,
  uuid,
  integer,
  boolean,
  boolean
) is
  'Updates tenant-scoped evaluation-content retention after repeating active system-admin authorization and writes content-free audit metadata.';
comment on function public.execute_due_evaluation_content_retention() is
  'Service-role-only operator boundary that deletes expired ciphertext from the live database without returning per-tenant submission counts. Existing backups expire under the independently configured backup policy.';

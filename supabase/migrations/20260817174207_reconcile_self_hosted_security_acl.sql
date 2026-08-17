-- Reconcile the imported self-hosted ACLs without replaying historical migrations.
-- This migration changes no table data. It leaves platform function bodies and
-- schemas unchanged while removing API execution from the orphaned public
-- event-trigger helper public.rls_auto_enable().

-- Every current application table and function is owned by postgres, and the
-- reviewed self-hosted migration connection runs as postgres. Replace the broad
-- public-schema defaults for that creator only. Supabase platform creator roles
-- and platform schemas intentionally retain their existing defaults.
alter default privileges for role postgres in schema public
revoke all privileges on tables from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
revoke all privileges on sequences from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
revoke execute on functions from public, anon, authenticated, service_role;

create or replace function public.accept_user_invitation(
  invitation_id uuid,
  accepting_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invitation_record public.user_invitations%rowtype;
  accepting_email text;
  primary_membership boolean;
begin
  select *
    into invitation_record
  from public.user_invitations
  where id = invitation_id
  for update;

  if invitation_record.id is null then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if invitation_record.accepted_at is not null then
    raise exception 'INVITATION_ALREADY_ACCEPTED';
  end if;

  if invitation_record.revoked_at is not null then
    raise exception 'INVITATION_REVOKED';
  end if;

  if invitation_record.expires_at <= now() then
    raise exception 'INVITATION_EXPIRED';
  end if;

  if invitation_record.invited_auth_user_id is null
    or invitation_record.invited_auth_user_id <> accepting_user_id then
    raise exception 'INVITATION_USER_MISMATCH';
  end if;

  select lower(email)
    into accepting_email
  from auth.users
  where id = accepting_user_id;

  if accepting_email is null
    or accepting_email <> lower(invitation_record.email) then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  if invitation_record.display_name is null
    or invitation_record.organization_id is null
    or invitation_record.unit_id is null then
    raise exception 'INVITATION_CONTEXT_INCOMPLETE';
  end if;

  if not exists (
    select 1
    from public.organizations organization
    join public.organization_units unit
      on unit.organization_id = organization.id
    where organization.id = invitation_record.organization_id
      and organization.status = 'ACTIVE'
      and unit.id = invitation_record.unit_id
      and unit.status = 'ACTIVE'
  ) then
    raise exception 'INVITATION_CONTEXT_INACTIVE';
  end if;

  if invitation_record.manager_user_id is not null
    and not exists (
      select 1
      from public.organization_unit_memberships membership
      join public.user_profiles profile
        on profile.user_id = membership.user_id
      where membership.organization_id = invitation_record.organization_id
        and membership.user_id = invitation_record.manager_user_id
        and membership.starts_at <= now()
        and (membership.ends_at is null or membership.ends_at > now())
        and profile.onboarding_status = 'ACTIVE'
    ) then
    raise exception 'INVITATION_MANAGER_INACTIVE';
  end if;

  insert into public.user_profiles (
    user_id,
    email,
    display_name,
    onboarding_status,
    activated_at
  ) values (
    accepting_user_id,
    accepting_email,
    invitation_record.display_name,
    'ACTIVE',
    now()
  )
  on conflict (user_id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      onboarding_status = 'ACTIVE',
      activated_at = coalesce(public.user_profiles.activated_at, now());

  if not exists (
    select 1
    from public.user_role_assignments role_assignment
    where role_assignment.user_id = accepting_user_id
      and role_assignment.role_code = invitation_record.invited_role_code
      and role_assignment.scope_type = invitation_record.invited_scope_type
      and role_assignment.scope_id is not distinct from invitation_record.invited_scope_id
      and role_assignment.ends_at is null
  ) then
    insert into public.user_role_assignments (
      user_id,
      role_code,
      scope_type,
      scope_id
    ) values (
      accepting_user_id,
      invitation_record.invited_role_code,
      invitation_record.invited_scope_type,
      invitation_record.invited_scope_id
    );
  end if;

  select not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.organization_id = invitation_record.organization_id
      and membership.user_id = accepting_user_id
      and membership.is_primary
      and membership.ends_at is null
  ) into primary_membership;

  if not exists (
    select 1
    from public.organization_unit_memberships membership
    where membership.unit_id = invitation_record.unit_id
      and membership.user_id = accepting_user_id
      and membership.membership_kind = invitation_record.membership_kind
      and membership.ends_at is null
  ) then
    insert into public.organization_unit_memberships (
      organization_id,
      unit_id,
      user_id,
      membership_kind,
      is_primary
    ) values (
      invitation_record.organization_id,
      invitation_record.unit_id,
      accepting_user_id,
      invitation_record.membership_kind,
      primary_membership
    );
  end if;

  if invitation_record.manager_user_id is not null then
    if exists (
      select 1
      from public.manager_assignments manager_assignment
      where manager_assignment.direct_report_user_id = accepting_user_id
        and manager_assignment.relationship_type = 'DIRECT_MANAGER'
        and manager_assignment.ends_at is null
    ) then
      update public.manager_assignments
      set organization_id = invitation_record.organization_id,
          manager_user_id = invitation_record.manager_user_id,
          scope_unit_id = invitation_record.unit_id
      where direct_report_user_id = accepting_user_id
        and relationship_type = 'DIRECT_MANAGER'
        and ends_at is null;
    else
      insert into public.manager_assignments (
        organization_id,
        manager_user_id,
        direct_report_user_id,
        relationship_type,
        scope_unit_id
      ) values (
        invitation_record.organization_id,
        invitation_record.manager_user_id,
        accepting_user_id,
        'DIRECT_MANAGER',
        invitation_record.unit_id
      );
    end if;
  end if;

  update public.user_invitations
  set accepted_by_user_id = accepting_user_id,
      accepted_at = now()
  where id = invitation_record.id;

  insert into public.audit_events (
    actor_user_id,
    event_type,
    event_scope_type,
    event_scope_id,
    safe_metadata
  ) values (
    accepting_user_id,
    'USER_INVITATION_ACCEPTED',
    'ORGANIZATION',
    invitation_record.organization_id,
    jsonb_build_object(
      'invitationId', invitation_record.id,
      'roleCode', invitation_record.invited_role_code,
      'scopeType', invitation_record.invited_scope_type
    )
  );

  return jsonb_build_object(
    'user_id', accepting_user_id,
    'email', accepting_email,
    'display_name', invitation_record.display_name,
    'onboarding_status', 'ACTIVE'
  );
end;
$$;

-- Start from an explicit table ACL baseline. Browser access remains restricted
-- to the authenticated user's own profile through RLS.
revoke all privileges on table
  public.anonymous_submission_credentials,
  public.app_roles,
  public.audit_events,
  public.encrypted_evaluation_submissions,
  public.evaluation_assignments,
  public.evaluation_cycles,
  public.evaluation_encryption_recovery_canaries,
  public.evaluation_template_questions,
  public.evaluation_template_versions,
  public.evaluation_templates,
  public.manager_assignments,
  public.organization_evaluation_retention_policies,
  public.organization_unit_memberships,
  public.organization_units,
  public.organizations,
  public.project_memberships,
  public.projects,
  public.scope_types,
  public.security_abuse_event_counters,
  public.security_rate_limit_buckets,
  public.tenant_bootstrap_operations,
  public.user_invitations,
  public.user_profiles,
  public.user_role_assignments
from public, anon, authenticated, service_role;

grant select on table public.user_profiles to authenticated;

grant select, insert, update, delete on table
  public.app_roles,
  public.audit_events,
  public.evaluation_assignments,
  public.evaluation_cycles,
  public.evaluation_template_questions,
  public.evaluation_template_versions,
  public.evaluation_templates,
  public.manager_assignments,
  public.organization_unit_memberships,
  public.organization_units,
  public.organizations,
  public.project_memberships,
  public.projects,
  public.scope_types,
  public.user_invitations,
  public.user_profiles,
  public.user_role_assignments
to service_role;

-- Reset only application-owned callable functions whose expected ACL has been
-- proven from the migration chain. Trigger functions and platform functions are
-- intentionally outside this list.
revoke all privileges on function
  public.accept_user_invitation(uuid, uuid),
  public.admin_assign_user_role(uuid, uuid, uuid, text, uuid),
  public.admin_clone_evaluation_template_version(uuid, uuid),
  public.admin_end_user_role(uuid, uuid, uuid),
  public.admin_publish_evaluation_template_version(uuid, uuid),
  public.admin_save_evaluation_template_draft(uuid, uuid, uuid, uuid, text, text, jsonb),
  public.admin_set_user_hierarchy_context(uuid, uuid, uuid, uuid, text, uuid),
  public.admin_update_evaluation_retention_policy(uuid, uuid, integer, boolean, boolean),
  public.admin_update_organization_name(uuid, uuid, text),
  public.admin_update_project_dates(uuid, uuid, uuid, date, timestamptz),
  public.admin_upsert_organization_unit(uuid, uuid, uuid, text, text, text, uuid, text),
  public.bootstrap_organization_tenant(uuid, text, uuid, text, text, text, text, text, text, integer),
  public.can_review_evaluation_subject(uuid, uuid, uuid, uuid, uuid),
  public.consume_anonymous_submission_request(text),
  public.consume_security_rate_limit(text, bytea, integer, interval, timestamptz),
  public.create_default_evaluation_retention_policy(),
  public.execute_due_evaluation_content_retention(),
  public.get_anonymous_submission_abuse_summary(uuid),
  public.get_anonymous_submission_abuse_summary_for_operator(),
  public.get_anonymous_submission_context(text),
  public.get_encrypted_evaluation_report_batch(uuid, uuid, uuid),
  public.get_my_evaluation_assignments(),
  public.get_my_workspace_context(),
  public.get_tenant_bootstrap_operation(uuid, text),
  public.get_thresholded_evaluation_report_batch_without_close_metadata(uuid, uuid, uuid),
  public.issue_anonymous_submission_credential(uuid, uuid, text),
  public.list_manageable_evaluation_retention_policies(uuid),
  public.list_my_evaluation_report_targets(uuid),
  public.list_platform_organization_tenants(uuid),
  public.list_referenced_evaluation_encryption_key_versions(),
  public.platform_bootstrap_organization_tenant(uuid, uuid, text, uuid, text, text, text, text, text, text, integer),
  public.platform_renew_tenant_bootstrap_invitation(uuid, uuid, integer),
  public.read_anonymous_submission_abuse_summary(),
  public.record_security_abuse_event(text, timestamptz),
  public.redeem_anonymous_submission_credential(text, text, text, text, integer, integer),
  public.renew_tenant_bootstrap_invitation(uuid, text, integer),
  public.require_active_organization_identity(uuid, uuid),
  public.require_active_platform_system_admin(uuid),
  public.require_active_system_admin(uuid, uuid),
  public.rls_auto_enable(),
  public.upsert_evaluation_encryption_recovery_canaries(text, jsonb)
from public, anon, authenticated, service_role;

grant execute on function
  public.get_my_evaluation_assignments(),
  public.get_my_workspace_context()
to authenticated;

grant execute on function
  public.accept_user_invitation(uuid, uuid),
  public.admin_assign_user_role(uuid, uuid, uuid, text, uuid),
  public.admin_clone_evaluation_template_version(uuid, uuid),
  public.admin_end_user_role(uuid, uuid, uuid),
  public.admin_publish_evaluation_template_version(uuid, uuid),
  public.admin_save_evaluation_template_draft(uuid, uuid, uuid, uuid, text, text, jsonb),
  public.admin_set_user_hierarchy_context(uuid, uuid, uuid, uuid, text, uuid),
  public.admin_update_evaluation_retention_policy(uuid, uuid, integer, boolean, boolean),
  public.admin_update_organization_name(uuid, uuid, text),
  public.admin_update_project_dates(uuid, uuid, uuid, date, timestamptz),
  public.admin_upsert_organization_unit(uuid, uuid, uuid, text, text, text, uuid, text),
  public.bootstrap_organization_tenant(uuid, text, uuid, text, text, text, text, text, text, integer),
  public.consume_anonymous_submission_request(text),
  public.execute_due_evaluation_content_retention(),
  public.get_anonymous_submission_abuse_summary(uuid),
  public.get_anonymous_submission_abuse_summary_for_operator(),
  public.get_anonymous_submission_context(text),
  public.get_encrypted_evaluation_report_batch(uuid, uuid, uuid),
  public.get_tenant_bootstrap_operation(uuid, text),
  public.issue_anonymous_submission_credential(uuid, uuid, text),
  public.list_manageable_evaluation_retention_policies(uuid),
  public.list_my_evaluation_report_targets(uuid),
  public.list_platform_organization_tenants(uuid),
  public.list_referenced_evaluation_encryption_key_versions(),
  public.platform_bootstrap_organization_tenant(uuid, uuid, text, uuid, text, text, text, text, text, text, integer),
  public.platform_renew_tenant_bootstrap_invitation(uuid, uuid, integer),
  public.redeem_anonymous_submission_credential(text, text, text, text, integer, integer),
  public.renew_tenant_bootstrap_invitation(uuid, text, integer),
  public.require_active_organization_identity(uuid, uuid),
  public.require_active_platform_system_admin(uuid),
  public.require_active_system_admin(uuid, uuid),
  public.upsert_evaluation_encryption_recovery_canaries(text, jsonb)
to service_role;

comment on function public.accept_user_invitation(uuid, uuid) is
  'Atomically accepts an invitation after revalidating active organization, unit, and optional manager context. Executable only by trusted service-role code.';

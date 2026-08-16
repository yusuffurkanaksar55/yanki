# Data Model

## Status

Supabase migrations exist for the default-deny security foundation, Supabase Auth-backed onboarding, configurable hierarchy, own-context RPCs, immutable versioned templates, project/cycle/assignment planning, identity-domain one-time credentials, content-domain encrypted evaluation submissions, immediate identity-separated reporting functions, tenant-scoped evaluation-content retention, production tenant bootstrap, and synthetic encrypted recovery canaries.

Generated TypeScript database types are stored in `src/types/supabase.ts` and should be regenerated after schema changes.

## Core Entities

Planned tables:

- `organizations`
- `departments`
- `units`
- `teams`
- `users`
- `roles`
- `user_roles`
- `role_scopes`
- `team_memberships`
- `manager_assignments`
- `projects`
- `project_memberships`
- `evaluation_templates`
- `evaluation_template_versions`
- `evaluation_template_questions`
- `evaluation_cycles`
- `evaluation_assignments`
- `anonymous_submission_credentials`
- `encrypted_evaluation_submissions`
- `organization_evaluation_retention_policies`
- `tenant_bootstrap_operations`
- `evaluation_encryption_recovery_canaries`
- `security_rate_limit_buckets`
- `security_abuse_event_counters`
- `result_access_scopes`
- `lessons_learned_cycles`
- `audit_events`

Implemented foundation tables:

- `app_roles`
- `scope_types`
- `user_role_assignments`
- `audit_events`
- `user_profiles`
- `user_invitations`
- `organizations`
- `organization_units`
- `organization_unit_memberships`
- `manager_assignments`
- `projects`
- `project_memberships`
- `evaluation_templates`
- `evaluation_template_versions`
- `evaluation_template_questions`
- `evaluation_cycles`
- `evaluation_assignments`
- `anonymous_submission_credentials`
- `encrypted_evaluation_submissions`
- `organization_evaluation_retention_policies`
- `tenant_bootstrap_operations`

Implemented foundation functions:

- `get_my_workspace_context()`
- `get_my_evaluation_assignments()`
- `accept_user_invitation()`
- `require_active_system_admin()`
- `admin_update_organization_name()`
- `admin_upsert_organization_unit()`
- `admin_set_user_hierarchy_context()`
- `admin_assign_user_role()`
- `admin_end_user_role()`
- `admin_update_project_dates()`
- `admin_save_evaluation_template_draft()`
- `admin_publish_evaluation_template_version()`
- `admin_clone_evaluation_template_version()`
- `can_review_evaluation_subject()`
- `list_my_evaluation_report_targets()`
- `get_encrypted_evaluation_report_batch()`
- `consume_anonymous_submission_request()`
- `get_anonymous_submission_abuse_summary()`
- `get_anonymous_submission_abuse_summary_for_operator()`
- `list_manageable_evaluation_retention_policies()`
- `admin_update_evaluation_retention_policy()`
- `execute_due_evaluation_content_retention()`
- `get_tenant_bootstrap_operation()`
- `bootstrap_organization_tenant()`
- `renew_tenant_bootstrap_invitation()`
- `upsert_evaluation_encryption_recovery_canaries()`

## Identity Domain

Identity-domain tables store users, roles, organization hierarchy, memberships, manager assignments, projects, evaluation assignments, user profiles, and invitations. These records may identify users and eligibility.

`user_profiles` stores identity and onboarding metadata for authenticated users. Authenticated users can read only their own row.

API privileges for the identity domain are versioned explicitly. `authenticated` has `SELECT` only on `user_profiles`, where RLS enforces own-row access. `service_role` has direct CRUD only on the reviewed identity/configuration tables needed by trusted Edge Functions. Sensitive content and operational tables are not included in that grant and continue to require their narrow functions.

`user_invitations` stores invitation metadata, a server-only correlation hash, the Supabase Auth user id, organization/unit placement, invited role scope, membership kind, and optional manager. It has no frontend client policy. `user-onboarding` creates and revokes invitations, while service-role-only `accept_user_invitation()` atomically activates the profile and creates scoped identity records after Auth user and email validation.

`tenant_bootstrap_operations` stores one content-free idempotency record per successful trusted bootstrap: request UUID, SHA-256 input fingerprint, resulting organization/unit/Auth-user/invitation identifiers, and completion time. It stores no password, service-role key, SMTP secret, invitation token, action link, or evaluation content. RLS is enabled and direct privileges are revoked from browser roles and `service_role`.

`bootstrap_organization_tenant()` serializes provisioning, validates normalized input and the exact Auth user email/server-controlled request marker, rejects preconfigured identities and duplicate tenant slugs, and atomically creates the organization, initial unit, invited administrator profile, organization-scoped system-admin invitation, default retention policy, operation record, and content-free audit event. `get_tenant_bootstrap_operation()` supports exact idempotent status checks. `renew_tenant_bootstrap_invitation()` can extend only an unaccepted and unrevoked initial invitation for the same request/fingerprint. All three functions are service-role-only.

`organizations` stores configurable company roots. `admin_update_organization_name()` changes only the normalized display name for an active tenant after repeating platform or exact-organization system-administrator authorization; the stable slug is unchanged and the audit metadata contains no name or evaluation data.

`organization_units` stores departments, units, teams, and custom hierarchy nodes under an organization.

`organization_unit_memberships` places users in organization units and can mark a primary membership.

`manager_assignments` stores direct manager, functional manager, and executive sponsor relationships.

The service-role-only organization-administration functions mutate the organization display name, units, primary memberships, direct-manager relationships, and manageable scoped roles atomically. They emit safe identity-domain audit metadata and do not access evaluation content.

`projects` stores identity-domain project metadata, including project manager, status, and optional start/completion dates.

`project_memberships` stores project participation and project-management membership metadata. It carries a required `organization_id` and a composite foreign key that must match the parent project tenant. Administrators can add active organization members to projects through `admin-project-cycles`; browser clients still do not read or write this table directly.

`evaluation_templates` is the tenant-scoped logical root. `evaluation_template_versions` stores snapshot metadata and lifecycle state. `evaluation_template_questions` stores ordered question prompts, required flags, supported question types, and selection options. Draft versions are editable; database triggers make a published version and every question beneath it permanently immutable. A new version is cloned from a published snapshot and begins as a draft.

`evaluation_cycles` stores time-bound evaluation configuration with open and close timestamps, optional project completion date, cycle type, status, and a required exact published `template_version_id`. The legacy `anonymity_threshold` compatibility field is fixed to `1`; it no longer delays report availability. A cycle does not require a fixed participant count.

`admin_update_project_dates()` atomically updates `projects.completes_on`, `evaluation_cycles.project_completed_on`, and `evaluation_cycles.closes_at` after verifying record scope, editable status, date ordering, and current system-administrator or exact assigned-project-manager authority. It is executable only by `service_role`.

`evaluation_assignments` stores identity-domain evaluator-to-subject eligibility for a cycle, with assignment kind, completion status, and the exact template version copied from its cycle. It prevents self assignments and template drift, validates organization and project scope consistency, remains default-deny to frontend clients, and does not store scores, comments, lessons learned text, anonymous credentials, encrypted payloads, or response content.

`get_my_evaluation_assignments()` returns a JSON list containing only the authenticated active user's own non-cancelled assignment display metadata for non-draft cycles. It revalidates active evaluator and subject organization membership and computes availability from the database clock. It does not return `evaluator_user_id` or any submission-domain field.

Project managers, project members, manager relationships, evaluators, and evaluation subjects must have active profiles and active memberships in the matching organization. Direct-manager uniqueness is scoped per organization so one global Auth identity can participate in multiple tenants.

`get_my_workspace_context()` returns the authenticated caller's own profile, roles, memberships, and manager relationships as non-sensitive JSON. It is not an evaluation content API and must not include scores, comments, submissions, anonymous credentials, or decrypted payloads.

## Anonymous Content Domain

Anonymous content-domain tables store encrypted submissions and non-sensitive metadata. They must not store evaluator identifiers, evaluator email addresses, employee numbers, IP addresses, device fingerprints, browser fingerprints, or other identifying metadata.

`anonymous_submission_credentials` is an identity-domain table keyed to one assignment. It stores organization scope, assignment id, a unique SHA-256 credential digest, lifecycle state, issuance/expiry timestamps, and date-only redemption metadata. It stores no answer, ciphertext, submission id, or raw credential. Terminal credentials are immutable.

`encrypted_evaluation_submissions` stores organization, cycle, optional project, evaluated subject, assignment kind, immutable template version, AES-256-GCM ciphertext and nonce, key/context/payload versions, and date-only `stored_on`. It deliberately has no evaluator, assignment, credential, digest, answer JSON, score, comment, or exact submission timestamp column. Update attempts are rejected.

`issue_anonymous_submission_credential()`, `get_anonymous_submission_context()`, and `redeem_anonymous_submission_credential()` are executable only by `service_role`. Direct table privileges are revoked even from `service_role`, forcing trusted code through the reviewed lifecycle functions.

Reporting adds no plaintext or materialized result table. `list_my_evaluation_report_targets()` returns authorized non-draft configuration targets without reading participation state. `get_encrypted_evaluation_report_batch()` counts within one organization/cycle/subject group and returns `EMPTY` with no count or content before the first submission. Afterward it returns only identity-free ciphertext and immutable question configuration to trusted code. Trusted code may return comments grouped and independently shuffled per question, but the result contract has no evaluator, assignment, submission, timestamp, sequence, or cross-question linkage metadata. Audit metadata records access state and mode without the exact submission count or content.

`list_referenced_evaluation_encryption_key_versions()` is executable only by `service_role`. It returns distinct key-version identifiers required by stored ciphertext, with no ciphertext, content, identity, per-version count, or timestamp. Trusted key-health code compares this inventory to server-only secret configuration and exposes only aggregate health status to system administrators.

`evaluation_encryption_recovery_canaries` is an operational cryptographic table, not evaluation content. Its primary key is the stable environment id plus encryption key version. It stores an AES-256-GCM encrypted random canary, 12-byte nonce, 32-byte canary digest, context version, and refresh time. It has no organization, user, evaluator, subject, assignment, credential, answer, or submission relationship. Direct privileges are revoked from `anon`, `authenticated`, and `service_role`; only `upsert_evaluation_encryption_recovery_canaries()` can refresh rows from trusted operator code.

`security_rate_limit_buckets` stores one-day operational buckets keyed only by a 32-byte non-reversible hash. Known credentials use isolated buckets; invalid credentials use one global invalid-only bucket. `security_abuse_event_counters` stores five-minute aggregate invalid-credential and rate-limited counts retained for seven days. Neither table stores an IP address, device identifier, user, organization, assignment, credential digest, request body, evaluation content, or linkage to a submission. RLS is enabled and direct privileges are revoked from browser roles and `service_role`.

`organization_evaluation_retention_policies` stores one row per tenant with a 30-to-3650-day live-content lifetime, disabled-by-default automation, legal hold, monotonically increasing policy version, updater, update time, and content-free last-purge metadata. It stores no submission count, subject, evaluator, credential, ciphertext, or content. Direct privileges are revoked from browser roles and `service_role`.

`execute_due_evaluation_content_retention()` is service-role-only. It serializes executions, skips disabled and legally held policies, deletes only ciphertext whose date-only `stored_on` precedes the current cutoff, and returns no submission/deletion count. Configuration and execution audit records also omit participation and content. Backup expiry remains outside this live-database model.

`consume_anonymous_submission_request()` is the service-role-only quota decision boundary. `get_anonymous_submission_abuse_summary()` is also service-role-only and repeats active system-administrator authorization before returning only aggregate counts and policy constants. `get_anonymous_submission_abuse_summary_for_operator()` repeats the service JWT-role check and returns the same identifier-free global summary to the scheduled alert process. Its shared aggregate builder has no API-role execute grant.

## Expected Constraints

- Foreign keys for hierarchy, memberships, project membership, assignments, templates, cycles, and scopes.
- Unique constraints for stable identifiers, template versions, assignment uniqueness, credential uniqueness, and duplicate prevention.
- Check constraints for score ranges, project completion dates, evaluation close dates, active windows, and threshold minimums.
- UTC timestamps for identity/configuration persistence and date-only content storage where exact submission time would increase correlation risk.
- Intentional indexes for authorization checks, scope lookups, assignment lookup, cycle filtering, and report aggregation.

## Project And Evaluation Cycle Data

Project and evaluation-cycle tables support multiple administrators and delegated project managers. Evaluation cycles may be opened without a fixed participant-count requirement, but they are time-bound with configurable open and close dates. Project completion and evaluation close dates now use an atomic trusted update flow; project memberships and evaluation assignments also remain behind trusted administration rather than direct frontend table access.

## Migration Rules

- All schema changes must use version-controlled Supabase migrations.
- RLS must be enabled on every table exposed through Supabase APIs.
- Sensitive tables must not be exposed directly to the frontend.
- Migrations must avoid secrets and plaintext sensitive sample data.
- `docs/DATA_MODEL.md` must be updated after schema changes.

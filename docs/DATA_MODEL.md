# Data Model

## Status

Supabase migrations exist for the default-deny security foundation, Supabase Auth-backed onboarding, configurable hierarchy, own-context RPCs, immutable versioned templates, project/cycle/assignment planning, identity-domain one-time credentials, and content-domain encrypted evaluation submissions.

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
- `evaluation_templates`
- `evaluation_template_versions`
- `evaluation_template_questions`
- `anonymous_submission_credentials`
- `encrypted_evaluation_submissions`
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
- `evaluation_cycles`
- `evaluation_assignments`

Implemented foundation functions:

- `get_my_workspace_context()`
- `get_my_evaluation_assignments()`
- `accept_user_invitation()`
- `require_active_system_admin()`
- `admin_upsert_organization_unit()`
- `admin_set_user_hierarchy_context()`
- `admin_assign_user_role()`
- `admin_end_user_role()`
- `admin_update_project_dates()`
- `admin_save_evaluation_template_draft()`
- `admin_publish_evaluation_template_version()`
- `admin_clone_evaluation_template_version()`

## Identity Domain

Identity-domain tables store users, roles, organization hierarchy, memberships, manager assignments, projects, evaluation assignments, user profiles, and invitations. These records may identify users and eligibility.

`user_profiles` stores identity and onboarding metadata for authenticated users. Authenticated users can read only their own row.

`user_invitations` stores invitation metadata, a server-only correlation hash, the Supabase Auth user id, organization/unit placement, invited role scope, membership kind, and optional manager. It has no frontend client policy. `user-onboarding` creates and revokes invitations, while service-role-only `accept_user_invitation()` atomically activates the profile and creates scoped identity records after Auth user and email validation.

`organizations` stores configurable company roots.

`organization_units` stores departments, units, teams, and custom hierarchy nodes under an organization.

`organization_unit_memberships` places users in organization units and can mark a primary membership.

`manager_assignments` stores direct manager, functional manager, and executive sponsor relationships.

The service-role-only organization-administration functions mutate units, primary memberships, direct-manager relationships, and manageable scoped roles atomically. They emit safe identity-domain audit metadata and do not access evaluation content.

`projects` stores identity-domain project metadata, including project manager, status, and optional start/completion dates.

`project_memberships` stores project participation and project-management membership metadata. It carries a required `organization_id` and a composite foreign key that must match the parent project tenant. Administrators can add active organization members to projects through `admin-project-cycles`; browser clients still do not read or write this table directly.

`evaluation_templates` is the tenant-scoped logical root. `evaluation_template_versions` stores snapshot metadata and lifecycle state. `evaluation_template_questions` stores ordered question prompts, required flags, supported question types, and selection options. Draft versions are editable; database triggers make a published version and every question beneath it permanently immutable. A new version is cloned from a published snapshot and begins as a draft.

`evaluation_cycles` stores time-bound evaluation configuration with open and close timestamps, optional project completion date, cycle type, status, anonymity threshold, and a required exact published `template_version_id`. It does not require a fixed participant count to open a cycle.

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

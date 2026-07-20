# Data Model

## Status

Supabase migrations exist for the default-deny security foundation, profile/invitation onboarding foundation, configurable organization hierarchy foundation, authenticated own-workspace context RPC, and project/evaluation-cycle configuration foundation. The complete anonymous submission data model is still conceptual and must be implemented in future reviewed phases.

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
- `question_templates`
- `questions`
- `template_questions`
- `evaluation_cycles`
- `evaluation_assignments`
- `anonymous_credentials`
- `encrypted_submissions`
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

Implemented foundation functions:

- `get_my_workspace_context()`

## Identity Domain

Identity-domain tables store users, roles, organization hierarchy, memberships, manager assignments, projects, evaluation assignments, user profiles, and invitations. These records may identify users and eligibility.

`user_profiles` stores identity and onboarding metadata for authenticated users. Authenticated users can read only their own row.

`user_invitations` stores invitation metadata and `token_hash` only. It has no frontend client policy; future trusted Edge Functions must create invitations, validate raw invitation secrets, activate profiles, and assign scoped roles.

`organizations` stores configurable company roots.

`organization_units` stores departments, units, teams, and custom hierarchy nodes under an organization.

`organization_unit_memberships` places users in organization units and can mark a primary membership.

`manager_assignments` stores direct manager, functional manager, and executive sponsor relationships.

`projects` stores identity-domain project metadata, including project manager, status, and optional start/completion dates.

`project_memberships` stores project participation and project-management membership metadata. Administrators can now add active organization members to projects through `admin-project-cycles`; browser clients still do not read or write this table directly.

`evaluation_cycles` stores time-bound evaluation configuration with open and close timestamps, optional project completion date, cycle type, status, and anonymity threshold. It does not require a fixed participant count to open a cycle.

`get_my_workspace_context()` returns the authenticated caller's own profile, roles, memberships, and manager relationships as non-sensitive JSON. It is not an evaluation content API and must not include scores, comments, submissions, anonymous credentials, or decrypted payloads.

## Anonymous Content Domain

Anonymous content-domain tables store encrypted submissions and non-sensitive metadata. They must not store evaluator identifiers, evaluator email addresses, employee numbers, IP addresses, device fingerprints, browser fingerprints, or other identifying metadata.

No anonymous content-domain table has been implemented yet.

## Expected Constraints

- Foreign keys for hierarchy, memberships, project membership, assignments, templates, cycles, and scopes.
- Unique constraints for stable identifiers, template versions, assignment uniqueness, credential uniqueness, and duplicate prevention.
- Check constraints for score ranges, project completion dates, evaluation close dates, active windows, and threshold minimums.
- UTC timestamps for persistence.
- Intentional indexes for authorization checks, scope lookups, assignment lookup, cycle filtering, and report aggregation.

## Project And Evaluation Cycle Data

Project and evaluation-cycle tables support multiple administrators and delegated project managers at the data-model level. Evaluation cycles may be opened without a fixed participant-count requirement, but they are time-bound with configurable open and close dates. Project completion dates, evaluation close dates, and project memberships must be set through trusted administrative flows rather than direct frontend table access.

## Migration Rules

- All schema changes must use version-controlled Supabase migrations.
- RLS must be enabled on every table exposed through Supabase APIs.
- Sensitive tables must not be exposed directly to the frontend.
- Migrations must avoid secrets and plaintext sensitive sample data.
- `docs/DATA_MODEL.md` must be updated after schema changes.

# Data Model

## Status

Supabase migrations exist for the default-deny security foundation, profile/invitation onboarding foundation, configurable organization hierarchy foundation, and authenticated own-workspace context RPC. The complete evaluation data model is still conceptual and must be implemented in future reviewed phases.

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
- `project_members`
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

## Planned Project And Evaluation Cycle Data

Future project and evaluation-cycle tables must support multiple administrators and delegated project managers. Evaluation cycles may be opened without a fixed participant-count requirement, but they must be time-bound with configurable open and close dates. Project completion dates and evaluation close dates must be set through trusted administrative flows rather than direct frontend table access.

## Migration Rules

- All schema changes must use version-controlled Supabase migrations.
- RLS must be enabled on every table exposed through Supabase APIs.
- Sensitive tables must not be exposed directly to the frontend.
- Migrations must avoid secrets and plaintext sensitive sample data.
- `docs/DATA_MODEL.md` must be updated after schema changes.

# Data Model

## Status

Supabase migrations exist for the default-deny security foundation and the profile/invitation onboarding foundation. The complete evaluation data model is still conceptual and must be implemented in future reviewed phases.

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

## Identity Domain

Identity-domain tables store users, roles, organization hierarchy, memberships, manager assignments, projects, evaluation assignments, user profiles, and invitations. These records may identify users and eligibility.

`user_profiles` stores identity and onboarding metadata for authenticated users. Authenticated users can read only their own row.

`user_invitations` stores invitation metadata and `token_hash` only. It has no frontend client policy; future trusted Edge Functions must create invitations, validate raw invitation secrets, activate profiles, and assign scoped roles.

## Anonymous Content Domain

Anonymous content-domain tables store encrypted submissions and non-sensitive metadata. They must not store evaluator identifiers, evaluator email addresses, employee numbers, IP addresses, device fingerprints, browser fingerprints, or other identifying metadata.

No anonymous content-domain table has been implemented yet.

## Expected Constraints

- Foreign keys for hierarchy, memberships, project membership, assignments, templates, cycles, and scopes.
- Unique constraints for stable identifiers, template versions, assignment uniqueness, credential uniqueness, and duplicate prevention.
- Check constraints for score ranges, date ranges, active windows, and threshold minimums.
- UTC timestamps for persistence.
- Intentional indexes for authorization checks, scope lookups, assignment lookup, cycle filtering, and report aggregation.

## Migration Rules

- All schema changes must use version-controlled Supabase migrations.
- RLS must be enabled on every table exposed through Supabase APIs.
- Sensitive tables must not be exposed directly to the frontend.
- Migrations must avoid secrets and plaintext sensitive sample data.
- `docs/DATA_MODEL.md` must be updated after schema changes.

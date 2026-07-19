# Project Context

## Product Purpose

The product is a secure company-internal web platform for anonymous employee, team, project, manager, annual performance, project completion, and lessons learned evaluations.

## Current Architecture

The repository currently contains the documentation foundation and a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application scaffold. The target backend architecture remains Supabase PostgreSQL, Supabase Auth, Supabase Edge Functions, and Supabase Row Level Security.

## Current Implementation Status

- Application UI: initial Turkish dashboard shell implemented.
- Authentication: typed Supabase Auth client foundation implemented for email/password sign-in, password reset request, local-session sign-out, and session-state gating.
- User profile onboarding: authenticated profile gate implemented with Turkish pending, inactive, and error states.
- Organization hierarchy: configurable organizations, units, memberships, manager assignments, and demo fixture script foundation implemented.
- Workspace context: authenticated own-context RPC and dashboard context panel implemented.
- Administration UI: protected hash-route administration shell implemented for admin-like roles, with project/cycle list and create form.
- Project and evaluation-cycle configuration: default-deny project, project membership, and time-bound evaluation-cycle foundation implemented.
- Supabase schema: initial default-deny security, profile/invitation onboarding, organization hierarchy, workspace context RPC, project, and evaluation-cycle migrations applied.
- Edge Functions: `admin-project-cycles` foundation implemented for project/cycle list and create actions.
- Anonymous credential flow: documented, not implemented.
- Encryption flow: documented, not implemented.
- Quality checks: lint, typecheck, Vitest, React Testing Library, production build, and documentation foundation tests are implemented.

## Important Business Rules

- Employees can submit assigned evaluations but cannot read submitted content.
- Employees cannot view evaluations about themselves or other employees.
- Team leaders can view only authorized aggregated anonymous results and cannot view their own results.
- C-Level reviewers can view only authorized aggregated anonymous results within assigned scopes.
- System administrators can manage configuration but cannot read evaluation content.
- Project managers and team leaders are evaluable.
- Published question templates must be versioned instead of modified destructively.
- Project completion can trigger lessons learned collection.
- Multiple users may hold admin, CEO/C-Level, project manager, team leader, and reviewer roles.
- Evaluation cycles are time-bound and do not require a fixed participant count to be opened.
- Administrators, or delegated project managers, can configure project completion and evaluation close dates in future management flows.

## Security Constraints

- Never store evaluator identity with evaluation or lessons learned content.
- Never store plaintext scores, comments, or lessons learned payloads.
- Never expose encryption keys or Supabase service-role credentials to the browser.
- Never rely only on frontend route protection.
- Enforce self-access prevention in UI, Edge Functions, authorization checks, and database policies.
- Do not reveal result aggregates below the configured anonymity threshold.
- Do not log sensitive payloads, anonymous credentials, decrypted content, exact submission timestamps, or evaluator-to-response mappings.

## Current Database Structure

The applied Supabase migrations create `app_roles`, `scope_types`, `user_role_assignments`, `audit_events`, `user_profiles`, `user_invitations`, `organizations`, `organization_units`, `organization_unit_memberships`, `manager_assignments`, `projects`, `project_memberships`, `evaluation_cycles`, and `get_my_workspace_context()`. RLS is enabled on all public tables. The only client-facing table policy allows authenticated users to read their own `user_profiles` row. The workspace context RPC returns only the caller's own non-sensitive role, unit, and manager context. Invitation, organization, project, and evaluation-cycle administration records remain default-deny to frontend clients. The conceptual complete data model is documented in `docs/DATA_MODEL.md`.

## Current Authentication Model

The frontend uses Supabase Auth through injectable typed service boundaries. Implemented client flows include email/password sign-in, password reset request, local-session sign-out, session-state observation, own-profile lookup, profile-state gating, own-workspace context display, and trusted Edge Function calls for project/cycle administration. Invitation issuance, invitation redemption, Microsoft Entra ID, tenant restrictions, and sensitive evaluation authorization checks are not implemented yet.

## Current Authorization Model

Authorization is not implemented. The intended model is scoped role-based access with database-enforced and server-side authorization. See `docs/AUTHORIZATION_MODEL.md`.

## Known Limitations

- Git is initialized and `main` tracks `origin/main` at `https://github.com/yusuffurkanaksar55/yanki.git`.
- Runtime authorization, encryption, anonymous credential, and reporting controls are not implemented.
- Invitation issuance/redemption Edge Functions do not exist yet.
- No Microsoft Entra ID, hierarchy write workflow, delegated project-manager update flow, scoped evaluation RLS policies, encrypted submission flow, or anonymity credential flow exists yet.
- Synthetic test users were created by running `npm run fixture:demo`, and at least one login was verified. The fixture command still requires a local `SUPABASE_SERVICE_ROLE_KEY` environment value and must not run in the browser.

## Recent Major Changes

- 2026-07-16: Created the initial persistent project memory foundation and documentation validation test.
- 2026-07-16: Scaffolded the React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application foundation.
- 2026-07-19: Linked Supabase project `daxaymcmtbmummrxdyjy` and applied the initial default-deny security foundation migration.
- 2026-07-19: Initialized Git, connected GitHub remote `yusuffurkanaksar55/yanki`, and pushed `main`.
- 2026-07-19: Added typed Supabase Auth client foundation and generated database types.
- 2026-07-19: Added user profile and invitation onboarding foundation.
- 2026-07-19: Added configurable organization hierarchy and demo fixture foundation.
- 2026-07-19: Added authenticated workspace context RPC and dashboard panel.
- 2026-07-19: Added protected administration shell and default-deny project/evaluation-cycle foundation.
- 2026-07-19: Added admin project/cycle Edge Function and frontend management panel.

## Current Development Priorities

1. Run authenticated smoke testing for `admin-project-cycles` with synthetic admin credentials.
2. Implement trusted Edge Functions for invitation, profile, role, hierarchy, and delegated project-manager update flows.
3. Add production member/project-manager selection UI.
4. Implement scoped authorization policies before sensitive evaluation workflows.
5. Implement anonymous credentials and encrypted submissions before reporting.
6. Add Playwright end-to-end tests after real navigation and authentication flows exist.

# Project Context

## Product Purpose

The product is a secure company-internal web platform for anonymous employee, team, project, manager, annual performance, project completion, and lessons learned evaluations.

## Current Architecture

The repository currently contains the documentation foundation and a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application scaffold. The target backend architecture remains Supabase PostgreSQL, Supabase Auth, Supabase Edge Functions, and Supabase Row Level Security.

## Current Implementation Status

- Application UI: initial Turkish dashboard shell implemented.
- Authentication: typed Supabase Auth client foundation implemented for email/password sign-in, password reset request, local-session sign-out, and session-state gating.
- User profile onboarding: Supabase Auth-backed invitation creation/revocation, atomic invitation acceptance, and authenticated profile gate implemented with Turkish pending, inactive, and error states.
- Organization hierarchy: configurable organizations, units, memberships, manager assignments, trusted existing-user administration, and demo fixture script implemented.
- Workspace context: authenticated own-context RPC and dashboard context panel implemented.
- Administration UI: protected hash-route administration shell implemented for admin-like roles, with system-admin invitation, role, unit, membership, direct-manager, project/cycle, project-member, and assignment management.
- Project and evaluation-cycle configuration: default-deny project, project membership, and time-bound evaluation-cycle foundation implemented.
- Evaluation assignment planning: default-deny assignment table and admin-only project assignment generation foundation implemented from active project memberships.
- Authenticated integration verification: synthetic admin, project-manager, and employee accounts have been exercised against the deployed Auth, project, onboarding, and organization-administration boundaries.
- Supabase schema: initial default-deny security, profile/invitation onboarding, organization hierarchy, atomic hierarchy administration, workspace context RPC, project, evaluation-cycle, and evaluation-assignment migrations applied.
- Edge Functions: `admin-project-cycles` handles project/cycle/member/assignment administration; `user-onboarding` handles scoped invitation options, creation, revocation, and authenticated acceptance; `organization-administration` handles existing-user roles and hierarchy.
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

The applied Supabase migrations create `app_roles`, `scope_types`, `user_role_assignments`, `audit_events`, `user_profiles`, `user_invitations`, `organizations`, `organization_units`, `organization_unit_memberships`, `manager_assignments`, `projects`, `project_memberships`, `evaluation_cycles`, `evaluation_assignments`, `get_my_workspace_context()`, service-role-only `accept_user_invitation()`, and service-role-only atomic organization-administration functions. RLS is enabled on all public tables. The only client-facing table policy allows authenticated users to read their own `user_profiles` row. The workspace context RPC returns only the caller's own non-sensitive role, unit, and manager context. Invitation, organization, project, evaluation-cycle, and evaluation-assignment administration records remain default-deny to frontend clients. The conceptual complete data model is documented in `docs/DATA_MODEL.md`.

## Current Authentication Model

The frontend uses Supabase Auth through injectable typed service boundaries. Implemented client flows include email/password sign-in, password reset request, local-session sign-out, session-state observation, own-profile lookup, profile-state gating, own-workspace context display, trusted project/cycle administration, system-admin invitation creation/revocation, authenticated invitation acceptance, and trusted existing-user role/hierarchy administration. Real invitation email delivery and acceptance still require an approved mailbox smoke test. Microsoft Entra ID, tenant restrictions, and sensitive evaluation authorization checks are not implemented yet.

## Current Authorization Model

Runtime evaluation authorization is not implemented. Current trusted administration actions use server-side scoped role checks through Edge Functions, while sensitive evaluation submission, reporting, and employee assignment-access policies remain future work. See `docs/AUTHORIZATION_MODEL.md`.

## Known Limitations

- Git is initialized and `main` tracks `origin/main` at `https://github.com/yusuffurkanaksar55/yanki.git`.
- Runtime authorization, encryption, anonymous credential, and reporting controls are not implemented.
- Real invitation email delivery and invited-user acceptance have not been smoke-tested with an approved mailbox and production SMTP configuration.
- No Microsoft Entra ID, delegated project-manager date update flow, employee assignment inbox, scoped evaluation RLS policies, encrypted submission flow, or anonymity credential flow exists yet.
- Synthetic test users were created by running `npm run fixture:demo`. Authenticated administration, project-manager visibility, employee denial, project membership, and assignment-generation smoke checks have been verified. The fixture command still requires a local `SUPABASE_SERVICE_ROLE_KEY` environment value and must not run in the browser.

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
- 2026-07-20: Extended admin project management with organization member lookup and project membership assignment through the Edge Function.
- 2026-07-20: Added default-deny evaluation assignment planning from project memberships through the Edge Function.
- 2026-07-20: Completed authenticated live smoke verification for admin project creation, membership management, assignment generation, project-manager visibility, and employee administration denial.
- 2026-07-20: Added Supabase Auth-backed invitation creation/revocation, service-role-only atomic acceptance, Turkish admin invitation management, and invited-profile acceptance UI.
- 2026-07-22: Added and deployed trusted existing-user role, organization-unit, primary-membership, and direct-manager administration with Turkish system-admin UI and live synthetic verification.

## Current Development Priorities

1. Configure or verify Supabase Auth email delivery and run invitation delivery/acceptance smoke testing with an approved test mailbox.
2. Implement delegated project-manager project-completion and evaluation-close-date update flows.
3. Implement employee-facing assignment access only after scoped authorization policies are designed.
4. Implement anonymous credentials and encrypted submissions before reporting.
5. Implement scoped reporting with threshold and self-access prevention, then add Playwright end-to-end coverage.

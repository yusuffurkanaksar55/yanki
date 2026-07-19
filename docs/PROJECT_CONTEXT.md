# Project Context

## Product Purpose

The product is a secure company-internal web platform for anonymous employee, team, project, manager, annual performance, project completion, and lessons learned evaluations.

## Current Architecture

The repository currently contains the documentation foundation and a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application scaffold. The target backend architecture remains Supabase PostgreSQL, Supabase Auth, Supabase Edge Functions, and Supabase Row Level Security.

## Current Implementation Status

- Application UI: initial Turkish dashboard shell implemented.
- Authentication: typed Supabase Auth client foundation implemented for email/password sign-in, password reset request, local-session sign-out, and session-state gating.
- User profile onboarding: authenticated profile gate implemented with Turkish pending, inactive, and error states.
- Supabase schema: initial default-deny security foundation and profile/invitation onboarding migrations applied.
- Edge Functions: not implemented.
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

## Security Constraints

- Never store evaluator identity with evaluation or lessons learned content.
- Never store plaintext scores, comments, or lessons learned payloads.
- Never expose encryption keys or Supabase service-role credentials to the browser.
- Never rely only on frontend route protection.
- Enforce self-access prevention in UI, Edge Functions, authorization checks, and database policies.
- Do not reveal result aggregates below the configured anonymity threshold.
- Do not log sensitive payloads, anonymous credentials, decrypted content, exact submission timestamps, or evaluator-to-response mappings.

## Current Database Structure

The applied Supabase migrations create `app_roles`, `scope_types`, `user_role_assignments`, `audit_events`, `user_profiles`, and `user_invitations`. RLS is enabled on all public tables. The only client-facing database policy allows authenticated users to read their own `user_profiles` row. Invitation records remain default-deny to frontend clients. The conceptual complete data model is documented in `docs/DATA_MODEL.md`.

## Current Authentication Model

The frontend uses Supabase Auth through an injectable typed service boundary. Implemented client flows include email/password sign-in, password reset request, local-session sign-out, session-state observation, own-profile lookup, and profile-state gating. Invitation issuance, invitation redemption, Microsoft Entra ID, tenant restrictions, and server-side authorization checks are not implemented yet.

## Current Authorization Model

Authorization is not implemented. The intended model is scoped role-based access with database-enforced and server-side authorization. See `docs/AUTHORIZATION_MODEL.md`.

## Known Limitations

- Git is initialized and `main` tracks `origin/main` at `https://github.com/yusuffurkanaksar55/yanki.git`.
- Runtime authorization, encryption, anonymous credential, and reporting controls are not implemented.
- No Edge Functions exist yet.
- No invitation issuance/redemption Edge Function, Microsoft Entra ID, scoped evaluation RLS policies, encrypted submission flow, or anonymity credential flow exists yet.

## Recent Major Changes

- 2026-07-16: Created the initial persistent project memory foundation and documentation validation test.
- 2026-07-16: Scaffolded the React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application foundation.
- 2026-07-19: Linked Supabase project `daxaymcmtbmummrxdyjy` and applied the initial default-deny security foundation migration.
- 2026-07-19: Initialized Git, connected GitHub remote `yusuffurkanaksar55/yanki`, and pushed `main`.
- 2026-07-19: Added typed Supabase Auth client foundation and generated database types.
- 2026-07-19: Added user profile and invitation onboarding foundation.

## Current Development Priorities

1. Implement invitation creation and redemption Edge Functions.
2. Implement scoped authorization policies before sensitive evaluation workflows.
3. Add protected administration screens for profile, invitation, role, and scope management.
4. Implement anonymous credentials and encrypted submissions before reporting.
5. Add Playwright end-to-end tests after real navigation and authentication flows exist.

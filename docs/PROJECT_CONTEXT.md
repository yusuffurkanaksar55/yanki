# Project Context

## Product Purpose

The product is a secure company-internal web platform for anonymous employee, team, project, manager, annual performance, project completion, and lessons learned evaluations.

## Current Architecture

The repository currently contains the documentation foundation and a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application scaffold. The target backend architecture remains Supabase PostgreSQL, Supabase Auth, Supabase Edge Functions, and Supabase Row Level Security.

## Current Implementation Status

- Application UI: initial Turkish dashboard shell implemented.
- Authentication: not implemented.
- Supabase schema: initial default-deny security foundation migration applied.
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

No database migrations exist yet. The conceptual data model is documented in `docs/DATA_MODEL.md`.

## Current Authentication Model

Authentication is not implemented. The intended model is Supabase Auth with email/password, invitation-based onboarding, password reset, and Microsoft Entra ID support with tenant restrictions where required.

## Current Authorization Model

Authorization is not implemented. The intended model is scoped role-based access with database-enforced and server-side authorization. See `docs/AUTHORIZATION_MODEL.md`.

## Known Limitations

- The repository is not yet initialized as a Git repository in the current workspace.
- Runtime security controls are not implemented.
- No generated database types or Edge Functions exist yet.
- No real authentication, authorization, encryption, or anonymity controls are implemented yet.

## Recent Major Changes

- 2026-07-16: Created the initial persistent project memory foundation and documentation validation test.
- 2026-07-16: Scaffolded the React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application foundation.
- 2026-07-19: Linked Supabase project `daxaymcmtbmummrxdyjy` and applied the initial default-deny security foundation migration.

## Current Development Priorities

1. Initialize version control if it is not already managed outside this workspace.
2. Generate database types from the linked Supabase project.
3. Implement authentication and invitation onboarding.
4. Implement scoped authorization policies and Edge Functions before sensitive evaluation workflows.
5. Implement anonymous credentials and encrypted submissions before reporting.
6. Add Playwright end-to-end tests after real navigation and authentication flows exist.

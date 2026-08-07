# Project Context

## Product Purpose

The product is a secure company-internal web platform for anonymous employee, team, project, manager, annual performance, project completion, and lessons learned evaluations.

## Current Architecture

The repository contains a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application, Supabase PostgreSQL/Auth/Edge Function foundations, and a portable Docker/Nginx frontend package. The product supports vendor-hosted shared SaaS and customer-managed dedicated Supabase deployments with the same application schema.

## Current Implementation Status

- Application UI: initial Turkish dashboard shell implemented.
- Authentication: typed Supabase Auth client foundation implemented for email/password sign-in, password reset request, local-session sign-out, and session-state gating.
- User profile onboarding: Supabase Auth-backed invitation creation/revocation, atomic invitation acceptance, and authenticated profile gate implemented with Turkish pending, inactive, and error states.
- Organization hierarchy: configurable organizations, units, memberships, manager assignments, trusted existing-user administration, and demo fixture script implemented.
- Workspace context: authenticated own-context RPC and dashboard context panel implemented.
- Administration UI: protected hash-route administration shell implemented for admin-like roles, with system-admin invitation, role, unit, membership, direct-manager, project/cycle, project-member, and assignment management.
- Project and evaluation-cycle configuration: default-deny project, project membership, and time-bound evaluation-cycle foundation implemented.
- Evaluation assignment planning: default-deny assignment table and admin-only project assignment generation foundation implemented from active project memberships.
- Employee assignment access: authenticated own-assignment RPC, typed frontend service, Turkish assignment inbox, server-derived availability states, and Docker-backed database authorization tests implemented.
- Evaluation templates: tenant-scoped logical templates, editable drafts, database-immutable published versions, ordered typed questions, trusted system-admin management, and exact cycle/assignment version binding implemented.
- Anonymous evaluation submission: authenticated one-time credential preparation, browser-memory-only raw credentials, identity-free anonymous redemption, atomic assignment completion, and a Turkish typed-question form implemented.
- Evaluation encryption: answers are validated and encrypted with AES-256-GCM inside a trusted Edge Function; only ciphertext, nonce, key version, date-only storage metadata, subject/reporting scope, and immutable template context are persisted.
- Delegated project date administration: system administrators and assigned project managers can atomically update project completion and evaluation close dates through a trusted boundary.
- Deployment portability: one frontend image can receive public Supabase runtime configuration at container startup and run against managed or self-hosted Supabase.
- Multi-tenant integrity: `organizations.id` is the company boundary; project memberships carry explicit organization scope and identity-bearing relationships require active matching organization membership.
- Bounded repository memory: development and test logs retain 5 entries, error logs retain 10 entries, and durable decisions remain in ADRs and focused context documents.
- Authenticated integration verification: synthetic admin, project-manager, and employee accounts have been exercised against the deployed Auth, project, onboarding, and organization-administration boundaries.
- Supabase schema: initial default-deny security, profile/invitation onboarding, organization hierarchy, atomic hierarchy administration, workspace context RPC, project, evaluation-cycle, and evaluation-assignment migrations applied.
- Edge Functions: `evaluation-submission-credentials` prepares one-time eligibility credentials for authenticated evaluators; `anonymous-evaluation-submissions` validates, encrypts, and atomically redeems identity-free submissions; existing functions retain template, project, onboarding, and hierarchy administration.
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
- Administrators, or delegated project managers, can configure project completion and evaluation close dates for authorized projects.

## Security Constraints

- Never store evaluator identity with evaluation or lessons learned content.
- Never store plaintext scores, comments, or lessons learned payloads.
- Never expose encryption keys or Supabase service-role credentials to the browser.
- Never rely only on frontend route protection.
- Enforce self-access prevention in UI, Edge Functions, authorization checks, and database policies.
- Do not reveal result aggregates below the configured anonymity threshold.
- Do not log sensitive payloads, anonymous credentials, decrypted content, exact submission timestamps, or evaluator-to-response mappings.

## Current Database Structure

The Supabase migrations additionally create immutable versioned templates, identity-domain `anonymous_submission_credentials`, and content-domain `encrypted_evaluation_submissions`. Service-role-only RPCs issue digested one-time credentials, return identity-free encryption context, and atomically persist ciphertext while completing the assignment. The content table has no evaluator, assignment, credential, plaintext answer, or exact submission timestamp column. RLS is enabled on all public tables and direct table privileges remain default-deny, including to `service_role` for sensitive submission tables.

## Current Authentication Model

The frontend uses Supabase Auth through injectable typed service boundaries. Implemented client flows include email/password sign-in, password reset request, local-session sign-out, session-state observation, own-profile lookup, profile-state gating, own-workspace context display, own-assignment display and encrypted anonymous submission, trusted immutable-template and project/cycle administration, system-admin invitation creation/revocation, authenticated invitation acceptance, and trusted existing-user role/hierarchy administration. Real invitation email delivery and acceptance still require an approved mailbox smoke test. Microsoft Entra ID and reporting authorization are not implemented yet.

## Current Authorization Model

Own-assignment read authorization derives the actor from `auth.uid()`. Submission preparation revalidates that same actor against a pending open assignment, while the separate anonymous endpoint can redeem only its one-time random credential. Credential replacement, redemption, ciphertext insertion, and completion transitions are database-atomic. Reporting authorization remains future work. See `docs/AUTHORIZATION_MODEL.md`.

## Known Limitations

- Git is initialized and `main` tracks `origin/main` at `https://github.com/yusuffurkanaksar55/yanki.git`.
- Thresholded reporting, trusted decryption/aggregation, production key rotation, and reviewer self-access prevention are not implemented.
- Real invitation email delivery and invited-user acceptance have not been smoke-tested with an approved mailbox and production SMTP configuration.
- Microsoft Entra ID is not implemented. The current anonymous credential model provides reviewed application-level unlinkability, not blind-signature cryptographic anonymity.
- The Docker delivery foundation exists, but production organization bootstrap, backup automation, release automation, and customer acceptance automation are not implemented.
- Docker Desktop is available and the local Supabase stack is verified; local migration reset, database lint, and pgTAP authorization tests pass.
- Synthetic test users were created by running `npm run fixture:demo`. Authenticated administration, project-manager visibility, employee denial, project membership, and assignment-generation smoke checks have been verified. The fixture command still requires a local `SUPABASE_SERVICE_ROLE_KEY` environment value and must not run in the browser.

## Recent Major Changes

- 2026-08-07: Added and deployed one-time anonymous credentials, AES-256-GCM encrypted evaluation persistence, atomic assignment completion, Turkish submission UI, and live replay-denial verification.
- 2026-08-06: Added and deployed immutable versioned evaluation templates with trusted management UI and exact cycle/assignment binding.
- 2026-08-06: Added authenticated employee assignment access, Turkish assignment inbox, database authorization tests, and live synthetic verification.
- 2026-08-06: Added portable managed/self-hosted deployment foundation, organization tenant hardening, and bounded repository-memory automation.
- 2026-07-22: Added and deployed atomic project completion/evaluation close date updates for scoped system administrators and assigned project managers.
- 2026-07-22: Added and deployed trusted existing-user role, organization-unit, primary-membership, and direct-manager administration.
- 2026-07-20: Added Supabase Auth-backed invitation onboarding and atomic acceptance.
- 2026-07-20: Added default-deny evaluation assignment planning and authenticated administration verification.

## Current Development Priorities

1. Implement trusted decryption, anonymity-thresholded aggregate reporting, reviewer scope checks, and self-access prevention.
2. Replace the development encryption key before production, add key rotation/recovery procedures, production tenant bootstrap, backup/restore automation, and customer deployment acceptance checks.
3. Configure email delivery when a provider is approved, then add broader Playwright end-to-end and abuse/rate-limit coverage.

# Project Context

## Product Purpose

The product is a secure company-internal web platform for anonymous employee, team, project, manager, annual performance, project completion, and lessons learned evaluations.

## Current Architecture

The repository contains a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application, Supabase PostgreSQL/Auth/Edge Function foundations, and a portable Docker/Nginx frontend package. The product supports vendor-hosted shared SaaS and customer-managed dedicated Supabase deployments with the same application schema.

## Current Implementation Status

- Application UI: initial Turkish dashboard shell implemented.
- Authentication: typed Supabase Auth client foundation implemented for email/password sign-in, password reset request, strong password setup after invitation/recovery, local-session sign-out, and session-state gating.
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
- Anonymous endpoint abuse protection: known credentials receive isolated 12-request/10-minute buckets, unknown credentials share a 120-request/minute invalid-only bucket, request bodies are bounded, and seven-day five-minute aggregate counters contain no identity, tenant, credential, request, or content data.
- Aggregate reporting: authorized team leaders, C-Level reviewers, and board reviewers can request closed-cycle subject reports through a trusted Edge Function. Database functions enforce scope, system-admin denial, self-access denial, and the configured anonymity threshold before releasing an identity-free ciphertext batch for server-side decryption and aggregation.
- Reporting UI: the Turkish dashboard lists authorized closed report targets without participation counts, shows a count-free withheld state below threshold, renders numeric/categorical aggregates above threshold, and never receives raw free-text responses.
- Evaluation content retention: each organization has a versioned 30-to-3650-day policy, disabled-by-default automatic purge, legal hold, scoped Turkish administration UI, and service-role-only live-database cleanup that returns no submission counts.
- Production tenant bootstrap: a service-role-only, fingerprinted, idempotent operator command creates an organization, initial unit, first administrator invitation, default retention policy, and content-free audit trail for shared SaaS or dedicated installations. Failed database creation compensates only the Auth identity created by that command, and an explicit recovery command can renew an incomplete initial invitation without printing an action link.
- Recovery acceptance: a Docker-backed disposable restore drill streams a compressed dump into a protected temporary database without a host dump file, verifies migration and security invariants, optionally decrypts identity-free synthetic canaries with independently recovered keys, and always removes the target.
- Key custody: a provider-neutral, credential-free manifest requires independent primary/recovery references and two custodian roles for every version. A service-role-only RPC stores encrypted random canaries; combined restore acceptance verifies every manifest key without reading evaluation content or logging key/version details.
- Delegated project date administration: system administrators and assigned project managers can atomically update project completion and evaluation close dates through a trusted boundary.
- Deployment portability: one frontend image can receive public Supabase runtime configuration at container startup and run against managed or self-hosted Supabase.
- Multi-tenant integrity: `organizations.id` is the company boundary; project memberships carry explicit organization scope and identity-bearing relationships require active matching organization membership.
- Bounded repository memory: development and test logs retain 5 entries, error logs retain 10 entries, and durable decisions remain in ADRs and focused context documents.
- Authenticated integration verification: synthetic admin, project-manager, and employee accounts have been exercised against the deployed Auth, project, onboarding, and organization-administration boundaries.
- Supabase schema: initial default-deny security, profile/invitation onboarding, organization hierarchy, atomic hierarchy administration, workspace context RPC, project, evaluation-cycle, and evaluation-assignment migrations applied.
- Edge Functions: `evaluation-submission-credentials` prepares one-time eligibility credentials for authenticated evaluators; `anonymous-evaluation-submissions` applies privacy-preserving quotas before context lookup, validates, encrypts, and atomically redeems identity-free submissions; `security-abuse-monitoring` returns aggregate counters only to active system administrators.
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

The Supabase migrations additionally create immutable versioned templates, identity-domain `anonymous_submission_credentials`, content-domain `encrypted_evaluation_submissions`, tenant-scoped `organization_evaluation_retention_policies`, content-free `tenant_bootstrap_operations`, short-lived `security_rate_limit_buckets`, and aggregate `security_abuse_event_counters`. Service-role-only RPCs issue credentials, make quota decisions, atomically persist or expire ciphertext, bootstrap tenants, expose safe abuse summaries, and release report batches only after authorization, closure, and threshold checks. Abuse, retention-policy, and bootstrap-operation tables store no evaluation content or evaluator linkage. RLS is enabled and direct table privileges remain default-deny, including to `service_role` for sensitive operational tables.

## Current Authentication Model

The frontend uses Supabase Auth through injectable typed service boundaries. Implemented client flows include email/password sign-in, password reset request, invitation/recovery password update, local-session sign-out, session-state observation, own-profile lookup, profile-state gating, own-workspace context display, own-assignment display and encrypted anonymous submission, thresholded aggregate reports for authorized reviewers, trusted immutable-template and project/cycle administration, system-admin invitation creation/revocation, authenticated invitation acceptance, and trusted existing-user role/hierarchy administration. Real invitation email delivery and acceptance still require an approved mailbox smoke test. Microsoft Entra ID is not implemented yet.

## Current Authorization Model

Own-assignment read authorization derives the actor from `auth.uid()`. Submission preparation revalidates that same actor against a pending open assignment, while the separate anonymous endpoint can redeem only its one-time random credential. Credential replacement, redemption, ciphertext insertion, and completion transitions are database-atomic. Reporting binds the authenticated actor in `evaluation-reports`; service-role-only database functions then revalidate closure, active membership, reviewer role and scope, manager relationship where required, system-admin denial, self denial, and threshold. See `docs/AUTHORIZATION_MODEL.md`.

## Known Limitations

- Git is initialized and `main` tracks `origin/main` at `https://github.com/yusuffurkanaksar55/yanki.git`.
- Additive key rotation, content-free key health, custody-manifest validation, encrypted recovery canaries, local database-plus-key recovery acceptance, anonymous endpoint quotas, aggregate abuse monitoring, tenant retention automation, and production tenant bootstrap are implemented. Real production custody-provider configuration, outer gateway/WAF limits and alert delivery, scheduled production backups, and environment-specific restore acceptance remain incomplete.
- Real invitation email delivery and invited-user acceptance have not been smoke-tested with an approved mailbox and production SMTP configuration.
- Microsoft Entra ID is not implemented. The current anonymous credential model provides reviewed application-level unlinkability, not blind-signature cryptographic anonymity.
- The Docker delivery, production tenant bootstrap, and disposable restore-test foundations exist, but scheduled encrypted off-host backups, release automation, and customer acceptance automation are not implemented.
- Docker Desktop is available and the local Supabase stack is verified; local migration reset, database lint, and pgTAP authorization tests pass.
- Synthetic test users were created by running `npm run fixture:demo`. Authenticated administration, project-manager visibility, employee denial, project membership, and assignment-generation smoke checks have been verified. The fixture command still requires a local `SUPABASE_SERVICE_ROLE_KEY` environment value and must not run in the browser.

## Recent Major Changes

- 2026-08-09: Added provider-neutral independent key custody validation, encrypted synthetic recovery canaries, and a content-free combined database/key restore acceptance drill.
- 2026-08-09: Added idempotent production tenant bootstrap, compensated Auth creation, initial-invitation recovery, and strong password setup for invitation/recovery sessions.
- 2026-08-08: Added tenant-scoped encrypted evaluation-content retention, legal hold, trusted scheduled cleanup, Turkish policy administration, and a disposable Docker backup/restore acceptance drill.
- 2026-08-07: Added and deployed privacy-preserving anonymous endpoint quotas, request-size limits, aggregate system-admin monitoring, Turkish feedback states, and live 413/429/authorization verification.
- 2026-08-07: Added and deployed additive encryption-key rotation, content-free system-admin health checks, safe rotation tooling, and live old/new-key compatibility verification.
- 2026-08-07: Added and deployed closed-cycle thresholded aggregate reporting, trusted AES-GCM decryption, reviewer scope checks, system-admin and self-access denial, Turkish reporting UI, and live synthetic verification.
- 2026-08-07: Added and deployed one-time anonymous credentials, AES-256-GCM encrypted evaluation persistence, atomic assignment completion, Turkish submission UI, and live replay-denial verification.
- 2026-08-06: Added and deployed immutable versioned evaluation templates with trusted management UI and exact cycle/assignment binding.

## Current Development Priorities

1. Configure a real production secret manager/offline escrow, then complete outer gateway/WAF limits and alert delivery, scheduled encrypted backups, environment-specific recovery acceptance, and customer acceptance checks.
2. Configure email delivery when a provider is approved and complete real invitation acceptance verification.
3. Add broader Playwright workflows and design a separately reviewed disclosure-resistant approach if raw-text themes are ever required.

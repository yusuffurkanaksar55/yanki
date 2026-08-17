# Project Context

## Product Purpose

The product is a secure company-internal web platform for anonymous employee, team, project, manager, annual performance, project completion, and lessons learned evaluations.

## Current Architecture

The repository contains a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library application, Supabase PostgreSQL/Auth/Edge Function foundations, and a portable Docker/Nginx frontend package. The product supports vendor-hosted shared SaaS and customer-managed dedicated Supabase deployments with the same application schema.

## Current Implementation Status

- Application UI: responsive public product site, dedicated authentication experience, and protected Turkish overview, assignment, reporting, and role-aware administration views implemented.
- Authentication: typed Supabase Auth client foundation implemented for email/password sign-in, password reset request, strong password setup after invitation/recovery, local-session sign-out, and session-state gating.
- Browser acceptance: isolated Playwright runners exercise local Supabase Auth, Mailpit invitation delivery, platform tenant onboarding, employee onboarding, template publication, project assignments, encrypted submission, immediate reporting, access denials, 1440/1024/390-pixel layout overflow, public/auth WCAG checks, and keyboard navigation against either a dedicated Vite port or the production Nginx container.
- User profile onboarding: Supabase Auth-backed invitation creation/revocation, atomic invitation acceptance, and authenticated profile gate implemented with Turkish pending, inactive, and error states.
- Organization hierarchy: configurable organization display names, units, memberships, manager assignments, trusted existing-user administration, and demo fixture script implemented. Name changes preserve the stable tenant slug and repeat system-administrator scope authorization in PostgreSQL.
- Workspace context: authenticated own-context RPC and dashboard context panel implemented.
- Administration UI: protected hash-route administration shell implemented for admin-like roles, with platform-only customer onboarding plus scoped system-admin invitation, role, unit, membership, direct-manager, project/cycle, project-member, and assignment management.
- Project and evaluation-cycle configuration: default-deny project, project membership, and time-bound evaluation-cycle foundation implemented.
- Evaluation assignment planning: default-deny assignment table and admin-only project assignment generation foundation implemented from active project memberships.
- Employee assignment access: authenticated own-assignment RPC, typed frontend service, Turkish assignment inbox, server-derived availability states, and Docker-backed database authorization tests implemented.
- Evaluation templates: tenant-scoped logical templates, editable drafts, database-immutable published versions, ordered typed questions, trusted system-admin management, and exact cycle/assignment version binding implemented.
- Anonymous evaluation submission: authenticated one-time credential preparation, browser-memory-only raw credentials, identity-free anonymous redemption, atomic assignment completion, and a Turkish typed-question form implemented.
- Evaluation encryption: answers are validated and encrypted with AES-256-GCM inside a trusted Edge Function; only ciphertext, nonce, key version, date-only storage metadata, subject/reporting scope, and immutable template context are persisted.
- AWS development key state: `AWS_DEV_20260817_01` is the server-only active key and passed a real credential-to-ciphertext-to-report round trip. Twenty imported records under `DEV_20260807_01` and `development-v1` remain preserved but unavailable until their original secrets are recovered.
- Anonymous endpoint abuse protection: known credentials receive isolated 12-request/10-minute buckets, unknown credentials share a 120-request/minute invalid-only bucket, request bodies are bounded, and seven-day five-minute aggregate counters contain no identity, tenant, credential, request, or content data.
- Outer gateway and alert delivery: the Docker Nginx runtime proxies same-origin `/supabase` traffic, applies content-free body/connection/request limits before sensitive Functions, injects a server-only direct-bypass token, disables sensitive endpoint logs, and a hardened five-minute operator timer delivers identifier-free alert/recovery transitions to an authenticated HTTPS webhook.
- Aggregate reporting: authorized team leaders, C-Level reviewers, and board reviewers can request active or completed subject reports through a trusted Edge Function. Database functions enforce scope, system-admin denial, and self-access denial before releasing an identity-free ciphertext batch after the first submission.
- Reporting UI: the dedicated Turkish reporting route lists authorized non-draft report targets without discovery-time participation counts, automatically opens the latest cycle after an explicit person selection, and offers a clearly marked synthetic example when the selected target is empty. Available reports include a normalized overall score, response/question/comment summaries, strongest and development-focus rating areas, percentage distributions, and question-grouped identity-separated comments without evaluator, timestamp, response-order, or cross-question linkage metadata.
- Evaluation content retention: each organization has a versioned 30-to-3650-day policy, disabled-by-default automatic purge, legal hold, scoped Turkish administration UI, service-role-only live-database cleanup that returns no submission counts, and a hardened persistent daily systemd scheduler package.
- Production tenant bootstrap: a service-role-only, fingerprinted, idempotent boundary creates an organization, initial unit, first administrator invitation, default retention policy, and content-free audit trail. Shared-SaaS platform operators can invoke the same boundary through the platform-only UI; the CLI remains required for the first platform operator and dedicated installations. Failed database creation compensates only the Auth identity created by that execution, and recovery renews an incomplete initial invitation without returning an action link.
- Recovery acceptance: a Docker-backed disposable restore drill streams a compressed dump into a protected temporary database without a host dump file, verifies migration and security invariants, optionally decrypts identity-free synthetic canaries with independently recovered keys, and always removes the target.
- Key custody: a provider-neutral, credential-free manifest requires independent primary/recovery references and two custodian roles for every version. A service-role-only RPC stores encrypted random canaries; combined restore acceptance verifies every manifest key without reading evaluation content or logging key/version details.
- Off-site backups: pinned Restic tooling runs `pg_dump` through fail-aware source-command mode, creates no plaintext host dump, rejects local production repositories, verifies encrypted repository data, applies exact-environment retention, and restores one full snapshot id into a guarded disposable database with key-canary acceptance.
- Delegated project date administration: system administrators and assigned project managers can atomically update project completion and evaluation close dates through a trusted boundary.
- Deployment portability: one frontend image can receive public Supabase runtime configuration at container startup and run against managed or self-hosted Supabase.
- Release integrity: exact SemVer tags publish a multi-platform GHCR image by immutable digest with pinned build inputs, BuildKit SBOM/provenance, Cosign keyless signatures, a signed artifact manifest, checksum inventory, no-build customer Compose, and disposable container acceptance.
- Multi-tenant integrity: `organizations.id` is the company boundary; project memberships carry explicit organization scope and identity-bearing relationships require active matching organization membership.
- Bounded repository memory: development and test logs retain 5 entries, error logs retain 10 entries, and durable decisions remain in ADRs and focused context documents.
- Authenticated integration verification: synthetic admin, project-manager, and employee accounts have been exercised against the deployed Auth, project, onboarding, and organization-administration boundaries.
- Supabase schema: the AWS self-hosted database contains the exact 30-entry repository migration history, including the applied ACL reconciliation. Direct API access is limited to own-profile selection, two own-context RPCs, and reviewed trusted service boundaries; sensitive tables remain direct-access denied.
- Edge Functions: `evaluation-submission-credentials` prepares one-time eligibility credentials for authenticated evaluators; `anonymous-evaluation-submissions` applies privacy-preserving quotas before context lookup, validates, encrypts, and atomically redeems identity-free submissions; `security-abuse-monitoring` returns deployment-global aggregate counters only to active platform-scoped system administrators.
- Development backend: AWS self-hosted Supabase is the canonical development and integration-test environment. Operator access remains through the loopback SSH tunnel, while the externally accepted development frontend uses same-origin `/supabase` behind Caddy/Nginx at `https://18-194-171-29.sslip.io`. Only TCP 80/443 are public; internal Supabase/PostgreSQL ports remain loopback-only. The former Supabase Cloud project is inactive and forbidden for development/testing.
- Production architecture: the shared-SaaS AWS/self-hosted Supabase target, environment separation, data-residency caveats, and prioritized production gates are recorded in `docs/PRODUCTION_READINESS_ASSESSMENT.md`.
- Staging infrastructure: a reviewed OpenTofu root stack now defines one AWS EC2 acceptance host in an existing VPC/subnet, with SSM-only administration, public web ports only, IMDSv2, KMS-encrypted storage, termination protection, checksum-pinned local tooling, and secret-free cloud-init. No AWS resource has been created yet.
- Quality checks: lint, typecheck, Vitest, React Testing Library, Playwright, automated WCAG analysis, keyboard acceptance, production-container gateway acceptance, production build, local schema lint, and Docker-backed pgTAP authorization tests are implemented.

## Important Business Rules

- Employees can submit assigned evaluations but cannot read submitted content.
- Employees cannot view evaluations about themselves or other employees.
- Team leaders can view only authorized identity-separated aggregate results and cannot view their own results.
- C-Level reviewers can view only authorized identity-separated aggregate results within assigned scopes.
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
- Do not claim group anonymity for one-person or sparse aggregates; communicate the contextual inference risk honestly.
- Do not log sensitive payloads, anonymous credentials, decrypted content, exact submission timestamps, or evaluator-to-response mappings.

## Current Database Structure

The Supabase migrations additionally create immutable versioned templates, identity-domain `anonymous_submission_credentials`, content-domain `encrypted_evaluation_submissions`, tenant-scoped `organization_evaluation_retention_policies`, content-free `tenant_bootstrap_operations`, short-lived `security_rate_limit_buckets`, and aggregate `security_abuse_event_counters`. Service-role-only RPCs issue credentials, make quota decisions, atomically persist or expire ciphertext, bootstrap tenants, expose safe abuse summaries, and release identity-free report batches only after authorization. Abuse, retention-policy, and bootstrap-operation tables store no evaluation content or evaluator linkage. RLS is enabled and direct table privileges remain default-deny, including to `service_role` for sensitive operational tables.

## Current Authentication Model

The frontend uses Supabase Auth through injectable typed service boundaries. Implemented client flows include email/password sign-in, password reset request, invitation/recovery password update, local-session sign-out, session-state observation, own-profile lookup, profile-state gating, own-workspace context display, own-assignment display and encrypted anonymous submission, immediate identity-separated aggregate reports for authorized reviewers, trusted immutable-template and project/cycle administration, system-admin invitation creation/revocation, authenticated invitation acceptance, and trusted existing-user role/hierarchy administration. Invitation delivery, callback routing, password setup, and acceptance pass against local Supabase Auth and Mailpit; production SMTP still requires an approved mailbox smoke test. Microsoft Entra ID is not implemented yet.

## Current Authorization Model

Own-assignment read authorization derives the actor from `auth.uid()`. Submission preparation revalidates that same actor against a pending open assignment, while the separate anonymous endpoint can redeem only its one-time random credential. Credential replacement, redemption, ciphertext insertion, and completion transitions are database-atomic. Reporting binds the authenticated actor in `evaluation-reports`; service-role-only database functions then revalidate closure, active membership, reviewer role and scope, manager relationship where required, system-admin denial, self denial, and threshold. See `docs/AUTHORIZATION_MODEL.md`.

## Known Limitations

- Git is initialized and `main` tracks `origin/main` at `https://github.com/yusuffurkanaksar55/yanki.git`.
- Additive key rotation, content-free key health, custody-manifest validation, encrypted recovery canaries, scheduled off-site backup tooling, exact-snapshot database-plus-key recovery automation, anonymous endpoint quotas, same-origin gateway limits with direct-bypass enforcement, transition-based alert delivery, aggregate abuse monitoring, tenant retention automation, and production tenant bootstrap are implemented. AWS development gateway-token activation/direct-denial passed internally. Real production custody/off-site provider configuration, production gateway activation, signed production-like recovery acceptance, real alert-receiver/capacity acceptance, and infrastructure availability monitoring remain incomplete.
- Twenty imported development ciphertext records cannot be decrypted because the original `DEV_20260807_01` and `development-v1` secrets are unavailable. The data and identifiers are preserved without mutation; see ISSUE-008.
- Invitation delivery and acceptance pass locally through Supabase Auth and Mailpit, but they have not been smoke-tested with an approved mailbox and production SMTP configuration.
- Microsoft Entra ID is not implemented. The current anonymous credential model provides reviewed application-level unlinkability, not blind-signature cryptographic anonymity.
- Docker delivery, signed digest-pinned release automation, production tenant bootstrap, scheduled encrypted off-site backup tooling, exact-snapshot restore-test foundations, the critical production-container application workflow acceptance, and the account-neutral AWS staging-host definition exist. The reviewed AWS plan/apply, first real version-tag workflow, real remote-provider/systemd acceptance, and production-like staging acceptance are not complete.
- Docker Desktop is available and the local Supabase stack is verified; local migration reset, database lint, and pgTAP authorization tests pass.
- Synthetic test users were created by running `npm run fixture:demo`. Authenticated administration, project-manager visibility, employee denial, project membership, and assignment-generation smoke checks have been verified. The fixture command still requires a local `SUPABASE_SERVICE_ROLE_KEY` environment value and must not run in the browser.

## Recent Major Changes

- 2026-08-17: Baselined 29 imported migration timestamps without replay, applied the ACL reconciliation as migration 30, verified live table/function/default privileges and HTTP authorization, activated a new server-only AWS development encryption key, and passed a synthetic anonymous encrypted-submission/report round trip.
- 2026-08-16: Removed redundant report-person search, added authorized organization-name administration, replaced raw template option text with explicit option rows, normalized admin geometry, and packaged daily evaluation-retention scheduling.
- 2026-08-16: Added a validated, account-neutral OpenTofu AWS staging-host foundation with SSM-only administration, encrypted storage, pinned tooling, secret-free bootstrap, and an explicitly reviewed plan/apply boundary.
- 2026-08-10: Added automatic latest-cycle loading, a clearly marked synthetic empty-state example, and detailed person-report summaries, insights, percentages, and question-level analysis.
- 2026-08-10: Added evaluated-person search and separate person/cycle report filters, with explicit subject labels in every written-comment group.
- 2026-08-10: Added corporate typography and public product detail, a readable workspace hierarchy, and authorized identity-separated comments with independent question-level shuffling.
- 2026-08-10: Added protected assignment/report routes, compact task filters, explicit report selection, collapsible project details, and simplified invitation administration after full desktop/mobile browser review.
- 2026-08-10: Added production-container browser acceptance, direct sensitive-endpoint bypass denial, automated WCAG/keyboard checks, corrected color contrast, and fail-safe local synthetic-fixture cleanup.
- 2026-08-09: Added isolated Docker-backed Playwright acceptance for the critical invitation-to-report lifecycle, explicit portable identity-domain API grants, and persistent-database-safe pgTAP assertions.
- 2026-08-09: Added digest-pinned multi-platform GHCR releases, pinned build dependencies, SBOM/provenance, keyless signatures, signed manifests, and standalone customer installation acceptance.
- 2026-08-09: Added same-origin Supabase gateway limits, sensitive endpoint log suppression, service-role-only aggregate alert summaries, authenticated webhook transitions, and hardened scheduling.
- 2026-08-09: Added pinned Restic encrypted off-site snapshots, integrity/retention scheduling, and full-id environment-scoped database-plus-key restore automation.
- 2026-08-09: Added provider-neutral independent key custody validation, encrypted synthetic recovery canaries, and a content-free combined database/key restore acceptance drill.
- 2026-08-09: Added idempotent production tenant bootstrap, compensated Auth creation, initial-invitation recovery, and strong password setup for invitation/recovery sessions.
- 2026-08-08: Added tenant-scoped encrypted evaluation-content retention, legal hold, trusted scheduled cleanup, Turkish policy administration, and a disposable Docker backup/restore acceptance drill.
- 2026-08-07: Added and deployed privacy-preserving anonymous endpoint quotas, request-size limits, aggregate system-admin monitoring, Turkish feedback states, and live 413/429/authorization verification.
- 2026-08-07: Added and deployed additive encryption-key rotation, content-free system-admin health checks, safe rotation tooling, and live old/new-key compatibility verification.
- 2026-08-07: Added and deployed closed-cycle thresholded aggregate reporting, trusted AES-GCM decryption, reviewer scope checks, system-admin and self-access denial, Turkish reporting UI, and live synthetic verification.
- 2026-08-07: Added and deployed one-time anonymous credentials, AES-256-GCM encrypted evaluation persistence, atomic assignment completion, Turkish submission UI, and live replay-denial verification.
- 2026-08-06: Added and deployed immutable versioned evaluation templates with trusted management UI and exact cycle/assignment binding.

## Current Development Priorities

1. Supply the reviewed staging AWS account/VPC/subnet/zone/AMI/KMS/domain values, review and apply the generated OpenTofu plan, then run the container workflow through real TLS/DNS, required gateway enforcement, isolated Supabase, and synthetic roles before creating a product release tag.
2. Exercise the first version-tag release, then configure real production custody/off-site providers, alert receiver, capacity thresholds, and infrastructure monitoring; complete environment-signed recovery and customer acceptance checks.
3. Configure email delivery when a provider is approved, complete approved-mailbox invitation verification, add route-level code splitting, and separately review any future disclosure-resistant raw-text theme design.

# Architecture

## Status

Foundation architecture is documented. The frontend application scaffold is implemented with React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library. The linked Supabase project now includes default-deny identity/configuration data, immutable templates, one-time anonymous eligibility credentials, and encrypted evaluation content persistence.

## Target System

The target system is a single-page web application with a trusted backend boundary:

- Browser: React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- Auth: Supabase Auth for email/password, invitation onboarding, password reset, and Microsoft Entra ID.
- Database: Supabase PostgreSQL with Row Level Security enabled for all exposed tables.
- Trusted server code: Supabase Edge Functions for sensitive validation, anonymous credential handling, encryption, decryption, aggregation, and reporting.
- Runtime delivery: one Docker image serving the static SPA through Nginx, configured at container startup with public Supabase values.
- Tests: Vitest and React Testing Library for frontend and documentation checks, Docker-backed Supabase pgTAP tests for database authorization, and Playwright for the critical browser lifecycle, automated WCAG analysis, keyboard operation, responsive overflow, and production-container gateway behavior. Daily `docker:acceptance` reuses the synthetic local Supabase stack; full self-hosted staging uses a hash-verified official Supabase commit on a separately sized host.

## Deployment Topologies

- Shared SaaS: one vendor-operated stack stores multiple companies with `organizations.id` as the tenant boundary.
- Dedicated: one customer-operated application container and one official self-hosted Supabase stack.

Both topologies use the same migrations, Edge Functions, and tenant authorization. Dedicated infrastructure is additional isolation and never disables organization scope checks. The official Supabase self-host Compose project remains an external dependency pinned by commit and reviewed-file hashes in `deploy/staging/supabase.lock.json`; this repository owns the application image, Compose overlay, and application-specific database/function artifacts. See `docs/DEPLOYMENT.md`, ADR-0016, and ADR-0034.

The first production-like staging host is defined in `deploy/staging/aws` as an account-neutral OpenTofu root stack. It consumes a reviewed existing VPC, public subnet, exact zone, pinned Ubuntu AMI, instance type, KMS key, and domain rather than creating an unreviewed network. The host exposes only TCP/443 and optional TCP/80, uses Systems Manager Session Manager instead of SSH, requires IMDSv2, encrypts its root volume, and receives no application secret through OpenTofu or cloud-init. Infrastructure `apply` is deliberately outside automated quality commands and requires encrypted remote state plus review of a saved plan. See ADR-0035.

## Runtime Configuration

`/app-config.js` is loaded before the Vite bundle. A container entrypoint writes only the public Supabase URL and anon or publishable key. Local Vite development falls back to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. A partial runtime configuration is rejected to prevent accidental mixing between customer and build-time environments.

## Local Browser Acceptance

`npm run e2e:local` accepts only loopback Supabase, PostgreSQL, Mailpit, and application URLs. It reads the running local Supabase status, creates a process-scoped random `LOCAL_E2E` AES key, starts Functions with an ignored temporary environment file, and serves Vite on isolated port `4173` so developer servers remain untouched. `npm run e2e:container:local` instead builds a process-named production image, starts Nginx on loopback port `4174`, generates a process-only gateway token, routes browser Supabase traffic through `/supabase`, and proves that direct sensitive-Function access without the token returns `403`.

Playwright provisions unique synthetic tenants and actors directly through the local database/Auth administration boundary, then uses visible browser workflows for invitation creation, real local email verification, password setup, invitation acceptance, template/project administration, evaluation submission, reporting, public/auth accessibility, and keyboard navigation. Traces and video are disabled because invitation callbacks contain short-lived Auth tokens; failure screenshots contain UI state only. The runner validates exact `yanki-e2e-*` organization and `example.test` user identities before deleting synthetic rows in dependency order. Only the two published-template deletion guards are transactionally bypassed for this loopback-only cleanup; rollback restores them on failure. Temporary secrets, Functions processes, ports, containers, images, and synthetic tenant records are removed in outer cleanup paths.

## Container Release Architecture

The application release is a multi-platform OCI index in GHCR. GitHub Actions runs only from an exact stable SemVer tag matching package metadata. Docker base images are pinned by registry digest and every external Action is pinned by full commit SHA. BuildKit attaches max-mode provenance and an SPDX SBOM; Cosign keyless signing binds both the image digest and release manifest to the exact repository, workflow, tag ref, and GitHub Actions OIDC issuer.

The signed manifest binds the full source commit, OCI digest, supported platforms, required source/revision/version labels, and SHA-256 digest of every customer file. The customer Compose package contains no build section and pins the image by digest. A standalone acceptance command verifies signatures and files before pulling the digest, then validates labels, generated Nginx configuration, public-only runtime configuration, and health in a disposable container. GitHub artifact attestations are an additional plan-dependent verification route; Cosign remains the portable required route.

## Module Boundaries

Planned source layout:

```text
src/
  app/
  components/
  features/
    authentication/
    organization/
    teams/
    projects/
    evaluations/
    lessons-learned/
    reporting/
    administration/
  hooks/
  lib/
  locales/
  services/
  types/
  validation/
supabase/
  functions/
  migrations/
tests/
```

## Sensitive Data Boundary

The browser must never receive encryption keys, service-role credentials, decrypted content outside authorized aggregated reporting, anonymous credential secrets after redemption, or sensitive operational logs.

Sensitive workflows must cross a trusted server-side boundary:

1. Browser authenticates with Supabase Auth.
2. Browser calls an Edge Function with a minimal request.
3. Edge Function validates auth, role, scope, assignment, and input schema.
4. Edge Function removes authenticated identity before persisting sensitive payloads.
5. Edge Function encrypts payloads server-side.
6. Database stores ciphertext and non-sensitive metadata only.

## Evaluation Submission Architecture

Assignments and submissions are separate domains.

- The authenticated `evaluation-submission-credentials` boundary validates the active evaluator, pending assignment, tenant memberships, cycle window, and immutable template. It generates a random 256-bit credential, stores only its SHA-256 digest in the identity domain, and returns the raw value only to browser memory.
- The browser calls `anonymous-evaluation-submissions` without an Authorization header or cookies. The trusted function hashes the credential, loads identity-free context, validates every answer against the immutable questions, and encrypts the payload with AES-256-GCM plus deterministic authenticated context.
- `redeem_anonymous_submission_credential()` atomically stores ciphertext, marks the credential redeemed, and completes the assignment. The content row contains no evaluator, assignment, credential, plaintext answer, or exact submission timestamp.
- This is application-level unlinkability. Exact assignment completion time remains in the identity domain while only `stored_on` date exists in the content domain. Immediate sparse-group aggregates can still permit contextual inference and must be governed by explicit customer policy and accurate product copy.

## Anonymous Abuse-Control Architecture

`anonymous-evaluation-submissions` enforces a 256 KiB body limit before JSON parsing and consumes a service-role-only quota decision before context resolution, validation, or encryption. A recognized credential uses an isolated bucket keyed by a SHA-256 hash of its internal random row id, limited to 12 requests per 10 minutes. Unknown credentials share a global invalid-only bucket limited to 120 requests per minute, so invalid traffic cannot exhaust a valid credential's application quota.

Rate buckets expire after one day. Invalid-credential and rate-limited events are stored only as five-minute aggregate counters retained for seven days. No abuse table contains IP, device, user, organization, assignment, credential digest, request body, or content. `security-abuse-monitoring` requires an exact active platform-scoped `SYSTEM_ADMIN` in both Edge and PostgreSQL and returns only 60-minute/24-hour aggregate counts plus configured limits. Organization-scoped administrators cannot read deployment-global diagnostics.

The Docker Nginx runtime is also a same-origin `/supabase` gateway. Exact anonymous-redemption and credential-preparation locations enforce matching 256 KiB/16 KiB body limits, bounded per-source connections, and combined per-source/deployment request zones before forwarding to Supabase. Nginx overwrites a server-only sensitive-gateway header; the two Edge Functions require its exact high-entropy token whenever configured and fail closed if production marks enforcement required without a valid token. This prevents direct managed-Supabase requests from bypassing the outer layer without exposing the token to browser runtime configuration. Sensitive endpoint access logs are disabled; limiter events are below the runtime log threshold. Source addresses exist only in Nginx shared memory for outer limiting and are not written to product storage. Runtime DNS resolution prevents an upstream outage from blocking the static frontend health endpoint.

Scheduled alert delivery calls `get_anonymous_submission_abuse_summary_for_operator()` with the server-only service role. The RPC returns the same global identifier-free counters without impersonating an administrator. Trusted Node code sends only alert, bounded reminder, and recovery transitions to an authenticated HTTPS webhook and stores only content-free transition state. A hardened five-minute systemd timer is shared by SaaS operations and dedicated installations.

## Reporting Architecture

Reporting uses the authenticated `evaluation-reports` Edge Function and service-role-only database functions. Report discovery returns authorized non-draft cycle-plus-subject targets independently of submission existence and contains no participation count. Batch preparation denies active system administrators, the subject, unapproved roles, missing team-leader manager relationships, and cross-scope access before counting content. With zero submissions it returns `EMPTY` without a count, question set, or ciphertext.

After the first submission, including while a cycle is active, the database releases an identity-free ciphertext batch plus immutable question configuration to the trusted function. AES-GCM decryption authenticates tenant, cycle, project, subject, assignment kind, template version, and context version. Every decrypted payload must contain the exact question set and valid answer types before aggregation. The browser receives the current sample size, rating averages/distributions, boolean counts, option counts, and question-grouped comments. Each text question is shuffled independently before response construction; evaluator, assignment, submission, timestamp, sequence, and cross-question row-linkage metadata are never returned.

Encryption key rotation is additive. Trusted Functions merge the legacy JSON keyring with immutable per-version environment secrets and use a separate active-version selector for new ciphertext. A service-role-only inventory releases only distinct referenced version identifiers to `encryption-key-health`; only the platform-system-administrator UI receives booleans and total version counts, never versions, keys, ciphertext, or content.

## Evaluation Content Retention Architecture

`organization_evaluation_retention_policies` stores tenant configuration only: retention days, automatic-purge state, legal hold, policy version, and content-free run metadata. The browser has no direct table access. `evaluation-retention-administration` authenticates an active system administrator, limits organizations by platform or exact tenant scope, and delegates updates to a service-role-only function that repeats authorization.

Destructive execution is not exposed to the browser. A portable operator command calls `execute_due_evaluation_content_retention()` with the server-only service role. The database serializes runs, skips disabled and legally held policies, and deletes only expired `encrypted_evaluation_submissions` rows. It returns the number of organization policies processed, never submission/deletion counts or content. `deploy/retention` supplies a hardened dedicated-user systemd service and persistent daily timer; activating that scheduler remains an environment operation. Live deletion does not erase existing backups; backup retention and key custody remain separate infrastructure controls.

The backup/restore acceptance command streams a compressed dump directly from the local Supabase database container into a guarded `_restore_acceptance` database. It records only stream size/hash and boolean checks, writes no dump file to host storage, verifies migrations plus content/retention/recovery-canary privilege boundaries, and removes the temporary database in a `finally` path.

## Encryption Key Custody And Recovery Architecture

Key custody is described by a provider-neutral schema-versioned manifest containing no key material or credentials. Every key version declares independent primary and recovery references, exactly one version is active, and at least two distinct custodian roles are required. Actual manifests remain outside version control, while key bytes continue to enter only the trusted operator/Functions environment through immutable per-version secrets.

`evaluation_encryption_recovery_canaries` stores one synthetic AES-256-GCM canary per environment and key version. The authenticated context binds purpose, environment, version, schema, and context version. PostgreSQL stores only ciphertext, nonce, a digest of random canary bytes, and content-free timestamps; the table has no tenant, user, evaluator, subject, assignment, credential, or evaluation content. Direct table privileges are revoked even from `service_role`, and a narrow service-role RPC can only refresh encrypted canaries.

The combined recovery command extends the disposable streaming restore. Before the target is removed, trusted operator code reads only synthetic canaries through the database recovery role, loads every key from the separately recovered secret environment, decrypts each canary, and checks its digest in memory. Missing, extra, duplicate, corrupt, or wrong-key records fail the drill. Command output contains counts and booleans only, never key versions, custody references, ciphertext, decrypted bytes, or credentials.

## Encrypted Off-Site Backup Architecture

The operator backup boundary uses pinned Restic `0.19.1`. `pg_dump` runs through Restic's source-command mode, so a failed database export prevents snapshot creation. PostgreSQL custom-format bytes flow directly into authenticated encrypted repository storage with no plaintext host file. Docker-local and native database-URL source modes share the same fixed dump arguments; the database URL is passed through `PGDATABASE`, not process arguments.

Every snapshot is scoped by stable environment hostname, product tag, environment tag, format tag, and deterministic dump filename. Production configuration accepts only recognized remote repository schemes; local paths require an exact acceptance-only override. Integrity checking reads a configured repository data subset, while retention is filtered to the exact host and combined tags before pruning.

Off-site recovery requires one full snapshot id. Restic metadata must match the expected environment, tags, and filename before a guarded disposable database is created. Decrypted archive bytes stream from `restic dump` into `pg_restore`; the shared restore verifier checks migrations, content/retention/canary privilege boundaries, and every separately recovered key canary. The archive and decrypted content are never materialized on host storage, and the disposable target is removed in `finally`.

The systemd unit runs snapshot creation, integrity checking, and retention in order. A failure stops later commands and produces a non-zero service state for external monitoring. Restic does not replace Supabase platform configuration, Edge Function deployment, SMTP/DNS configuration, storage-object copies, or release artifacts; those remain separately reproducible deployment assets.

## Production Tenant Bootstrap Architecture

`bootstrap-production-tenant.mjs` is a trusted operator boundary shared by SaaS and dedicated installations. A stable request UUID and SHA-256 fingerprint make an exact rerun idempotent. The script creates a Supabase Auth invitation, writes the request UUID into server-controlled Auth app metadata, and calls `bootstrap_organization_tenant()` with the service role. PostgreSQL serializes bootstrap operations, verifies the Auth id/email/marker, and atomically creates the organization, initial unit, invited profile, organization-admin invitation, default retention policy, content-free operation record, and audit metadata.

No membership or role exists until the exact email-verified Auth user accepts through `accept_user_invitation()`. A database failure causes the operator to delete only the Auth identity created by that execution. Existing identities without the exact server-controlled request marker are rejected. `tenant_bootstrap_operations` has RLS and no direct API privileges, including for `service_role`.

An explicit recovery command can renew an unaccepted, unrevoked initial invitation for the same request/fingerprint and ask Supabase Auth to deliver a password-recovery message. It never returns a raw action link. Invitation and `PASSWORD_RECOVERY` sessions are held at the Turkish password-setup gate until `auth.updateUser()` stores a password meeting the client policy and clears the non-authoritative setup metadata flag.

## Localization

User-facing Turkish strings must be centralized under a future localization module such as `src/locales/tr/`. Code identifiers, internal errors, tests, and technical artifacts remain English.

## Current Foundation Check

`tests/project-memory.test.mjs` validates required project memory files and key security documentation statements. `src/app/App.test.tsx` validates the Turkish dashboard shell and centralized UI messages.

## Current Frontend Scaffold

- Entry point: `src/main.tsx`
- Root app: `src/app/App.tsx`
- Protected hash routes: `#dashboard`, `#assignments`, `#reports`, and `#administration`; unknown public hashes remain on the marketing site, while an authenticated `#login` visit is normalized to `#dashboard`.
- Dashboard feature: `src/features/dashboard/DashboardPage.tsx`, with separate overview, assignment, and aggregate-report views rather than one stacked workspace page.
- Employee assignment service and inbox: `src/features/evaluations/evaluationAssignmentService.ts`, `src/features/evaluations/AssignmentInbox.tsx`
- Aggregate reporting service and panel: `src/features/reporting/evaluationReportService.ts`, `src/features/reporting/EvaluationReportsPanel.tsx`
- Administration feature: `src/features/administration/AdministrationPage.tsx`
- Administration project/cycle/member/assignment service and panel: `src/features/administration/projectCycleService.ts`, `src/features/administration/ProjectCycleManagementPanel.tsx`
- Administration evaluation-template service and panel: `src/features/administration/evaluationTemplateService.ts`, `src/features/administration/EvaluationTemplateManagementPanel.tsx`
- Administration role/hierarchy service and panel: `src/features/administration/hierarchyAdministrationService.ts`, `src/features/administration/RoleHierarchyManagementPanel.tsx`
- Turkish messages: `src/locales/tr/messages.ts`
- Authentication context and UI: `src/features/authentication/`
- Invitation/recovery password setup: `src/features/authentication/PasswordSetupPage.tsx`
- Profile onboarding gate and service: `src/features/profiles/`
- Workspace context gate and service: `src/features/workspace/`
- Typed Supabase client: `src/lib/supabase/client.ts`
- Generated database types: `src/types/supabase.ts`
- Global styles: `src/index.css`
- Vite and Vitest config: `vite.config.ts`
- ESLint config: `eslint.config.js`

## Current Supabase Scaffold

- CLI config: `supabase/config.toml`
- Seed file: `supabase/seed.sql`
- Admin project/cycle/member Edge Function: `supabase/functions/admin-project-cycles/index.ts`
- Evaluation-template Edge Function: `supabase/functions/evaluation-templates/index.ts`
- Authenticated submission preparation Edge Function: `supabase/functions/evaluation-submission-credentials/index.ts`
- Anonymous encryption and redemption Edge Function: `supabase/functions/anonymous-evaluation-submissions/index.ts`
- Identity-separated decryption and aggregate reporting Edge Function: `supabase/functions/evaluation-reports/index.ts`
- Content-free encryption key health Edge Function: `supabase/functions/encryption-key-health/index.ts`
- Aggregate anonymous abuse monitoring Edge Function: `supabase/functions/security-abuse-monitoring/index.ts`
- Evaluation retention administration Edge Function: `supabase/functions/evaluation-retention-administration/index.ts`
- User onboarding Edge Function: `supabase/functions/user-onboarding/index.ts`
- Platform tenant administration Edge Function: `supabase/functions/platform-tenant-administration/index.ts`
- Organization administration Edge Function: `supabase/functions/organization-administration/index.ts`
- Initial migration: `supabase/migrations/20260719132911_initial_security_foundation.sql`
- Profile/invitation migration: `supabase/migrations/20260719171413_user_profile_invitation_foundation.sql`
- Organization hierarchy migration: `supabase/migrations/20260719174459_organization_hierarchy_foundation.sql`
- Workspace context RPC migration: `supabase/migrations/20260719181013_workspace_context_rpc.sql`
- Project/evaluation-cycle migration: `supabase/migrations/20260719184052_project_evaluation_cycle_foundation.sql`
- Evaluation assignment migration: `supabase/migrations/20260720223000_evaluation_assignment_foundation.sql`
- Employee assignment access migration: `supabase/migrations/20260806233000_employee_assignment_access.sql`
- Versioned template migration: `supabase/migrations/20260806234500_versioned_evaluation_templates.sql`
- Template immutability hardening migration: `supabase/migrations/20260807001500_template_immutability_hardening.sql`
- Anonymous encrypted submission migration: `supabase/migrations/20260807013000_anonymous_encrypted_evaluation_submissions.sql`
- Reporting migrations: `supabase/migrations/20260807103000_thresholded_evaluation_reporting.sql`, `supabase/migrations/20260807111500_reporting_close_metadata_fix.sql`, `supabase/migrations/20260809210000_immediate_evaluation_reporting.sql`
- Encryption key lifecycle migration: `supabase/migrations/20260807143000_encryption_key_lifecycle.sql`
- Anonymous endpoint abuse-control migration: `supabase/migrations/20260807170000_anonymous_endpoint_abuse_protection.sql`
- Evaluation content retention migration: `supabase/migrations/20260808120000_evaluation_content_retention.sql`
- Production tenant bootstrap migration: `supabase/migrations/20260809120000_production_tenant_bootstrap.sql`
- Platform tenant administration migration: `supabase/migrations/20260816170000_platform_tenant_administration.sql`
- Database authorization tests: `supabase/tests/database/employee_assignment_access.test.sql`
- Anonymous submission database tests: `supabase/tests/database/anonymous_encrypted_submission.test.sql`
- Reporting authorization database tests: `supabase/tests/database/thresholded_evaluation_reporting.test.sql`
- Encryption key lifecycle database tests: `supabase/tests/database/encryption_key_lifecycle.test.sql`
- Production tenant bootstrap database tests: `supabase/tests/database/production_tenant_bootstrap.test.sql`
- Platform tenant administration database tests: `supabase/tests/database/platform_tenant_administration.test.sql`
- Invitation acceptance migration: `supabase/migrations/20260720232000_user_invitation_acceptance_flow.sql`
- Invitation acceptance revalidation migration: `supabase/migrations/20260720234500_invitation_acceptance_context_revalidation.sql`
- Organization administration migration: `supabase/migrations/20260722210000_hierarchy_administration_foundation.sql`
- Organization-name administration migration: `supabase/migrations/20260816130000_organization_name_administration.sql`
- Hierarchy context hardening migration: `supabase/migrations/20260722223000_hierarchy_context_integrity_hardening.sql`
- Setup notes: `docs/SUPABASE_SETUP.md`
- Demo fixture notes: `docs/TEST_FIXTURES.md`
- Demo fixture script: `scripts/create-demo-fixture.mjs`
- Production tenant bootstrap operator: `scripts/bootstrap-production-tenant.mjs`
- Linked remote project ref: `daxaymcmtbmummrxdyjy`

The versioned-template migrations add logical template roots, immutable version snapshots, ordered typed questions, service-role-only lifecycle functions, and exact template-version foreign keys on cycles and assignments. Question mutation guards validate both the source and destination parent so a published question cannot be moved into a draft. Existing cycles are backfilled to archived compatibility versions; new cycles require a published active template through the trusted project boundary. Template tables have RLS enabled and no client-facing policies.

## Current Authentication Scaffold

- Public environment validation: `src/config/environment.ts`
- Supabase auth service boundary: `src/features/authentication/authService.ts`
- Auth provider and gate: `src/features/authentication/AuthProvider.tsx`, `src/features/authentication/AuthGate.tsx`
- Turkish auth page: `src/features/authentication/AuthPage.tsx`
- Turkish password-setup page: `src/features/authentication/PasswordSetupPage.tsx`
- Own-profile service and gate: `src/features/profiles/profileService.ts`, `src/features/profiles/ProfileGate.tsx`
- Own-workspace context service and gate: `src/features/workspace/workspaceContextService.ts`, `src/features/workspace/WorkspaceContextGate.tsx`

The auth service is injectable so unit and component tests do not call the network. It observes Supabase password-recovery events and invitation metadata, updates the password through Supabase Auth, and prevents workspace rendering until password setup succeeds. Local development uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; container deployments inject equivalent public values through `/app-config.js` at startup.

The profile service is injectable and reads only the authenticated user's own profile row. A signed-in user without an active profile sees a Turkish invitation onboarding state instead of the dashboard.

The workspace context service is injectable and reads only the authenticated user's own non-sensitive role, unit, and manager context through `get_my_workspace_context()`.

The administration shell is reachable through `#administration` for admin-like workspace roles. It is a UI boundary only; production management writes must use future Edge Functions and RLS policies.

The project/cycle management panel calls `admin-project-cycles` through Supabase Functions. It does not query `projects`, `evaluation_cycles`, `evaluation_assignments`, `project_memberships`, `organization_unit_memberships`, or `user_profiles` directly from the browser.

The organization member selector and project membership form use the same Edge Function boundary. Organization member lookup returns active identity-domain profile metadata for administrators only. Project membership writes validate project organization scope and selected-user organization membership server-side before writing `project_memberships`.

The assignment planning control uses the same Edge Function boundary. It generates non-self evaluator-subject identity assignments from active project memberships for draft or open project-backed cycles, stores no scores or comments, and returns only aggregate assignment counts to the browser.

The project date control also uses `admin-project-cycles`. The Edge Function performs an early scope check, and service-role-only `admin_update_project_dates()` rechecks platform/matching-organization system-administrator scope or exact assigned-project-manager authority inside the transaction. Project completion and evaluation close dates are updated together; closed or archived cycles are rejected.

The user invitation panel calls `user-onboarding`. System administrators can list scoped organization/unit options, send Supabase Auth invitations, and revoke pending invitations. Invited users accept only through an authenticated, email-verified session. The Edge Function invokes service-role-only `accept_user_invitation()` so profile, role, unit membership, optional manager relationship, invitation state, and audit metadata change atomically. No raw custom invitation token is returned to the browser.

The platform-only customer panel calls `platform-tenant-administration`. An exact active platform system administrator can list content-free onboarding summaries, create an organization and its first administrator through the existing idempotent bootstrap, and renew a pending or expired first invitation. PostgreSQL repeats exact platform scope before every operation, browser roles have no direct execute grant, and no evaluation table is read. The CLI path remains the installation boundary for the first platform operator and dedicated deployments.

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
- Tests: Vitest and React Testing Library for frontend and documentation checks, plus Docker-backed Supabase pgTAP tests for database authorization. Playwright is planned for later workflow phases.

## Deployment Topologies

- Shared SaaS: one vendor-operated stack stores multiple companies with `organizations.id` as the tenant boundary.
- Dedicated: one customer-operated application container and one official self-hosted Supabase stack.

Both topologies use the same migrations, Edge Functions, and tenant authorization. Dedicated infrastructure is additional isolation and never disables organization scope checks. The official Supabase self-host Compose project remains an external pinned dependency; this repository owns the application image and application-specific database/function artifacts. See `docs/DEPLOYMENT.md` and ADR-0016.

## Runtime Configuration

`/app-config.js` is loaded before the Vite bundle. A container entrypoint writes only the public Supabase URL and anon or publishable key. Local Vite development falls back to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. A partial runtime configuration is rejected to prevent accidental mixing between customer and build-time environments.

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
- This is application-level unlinkability. Exact assignment completion time remains in the identity domain while only `stored_on` date exists in the content domain; sparse-group inference is handled later by thresholded reporting and operational policy.

## Anonymous Abuse-Control Architecture

`anonymous-evaluation-submissions` enforces a 256 KiB body limit before JSON parsing and consumes a service-role-only quota decision before context resolution, validation, or encryption. A recognized credential uses an isolated bucket keyed by a SHA-256 hash of its internal random row id, limited to 12 requests per 10 minutes. Unknown credentials share a global invalid-only bucket limited to 120 requests per minute, so invalid traffic cannot exhaust a valid credential's application quota.

Rate buckets expire after one day. Invalid-credential and rate-limited events are stored only as five-minute aggregate counters retained for seven days. No abuse table contains IP, device, user, organization, assignment, credential digest, request body, or content. `security-abuse-monitoring` repeats active `SYSTEM_ADMIN` authorization in Edge and PostgreSQL and returns only 60-minute/24-hour aggregate counts plus configured limits. External reverse-proxy/WAF rate limits and alert delivery remain deployment responsibilities for volumetric protection.

## Reporting Architecture

Reporting uses the authenticated `evaluation-reports` Edge Function and service-role-only database functions. Report discovery returns authorized closed cycle-plus-subject targets independently of submission existence and contains no participation count. Batch preparation denies active system administrators, the subject, unapproved roles, missing team-leader manager relationships, cross-scope access, and open cycles before counting content. Below threshold it returns no exact count, question set, or ciphertext.

At or above threshold, the database releases an identity-free ciphertext batch plus immutable question configuration to the trusted function. AES-GCM decryption authenticates tenant, cycle, project, subject, assignment kind, template version, and context version. Every decrypted payload must contain the exact question set and valid answer types before aggregation. The browser receives rating averages/distributions, boolean counts, option counts, and text response counts. Raw short- and long-text values are never returned.

Encryption key rotation is additive. Trusted Functions merge the legacy JSON keyring with immutable per-version environment secrets and use a separate active-version selector for new ciphertext. A service-role-only inventory releases only distinct referenced version identifiers to `encryption-key-health`; the system-administrator UI receives only booleans and total version counts, never versions, keys, ciphertext, or content.

## Evaluation Content Retention Architecture

`organization_evaluation_retention_policies` stores tenant configuration only: retention days, automatic-purge state, legal hold, policy version, and content-free run metadata. The browser has no direct table access. `evaluation-retention-administration` authenticates an active system administrator, limits organizations by platform or exact tenant scope, and delegates updates to a service-role-only function that repeats authorization.

Destructive execution is not exposed to the browser. A portable operator command calls `execute_due_evaluation_content_retention()` with the server-only service role. The database serializes runs, skips disabled and legally held policies, and deletes only expired `encrypted_evaluation_submissions` rows. It returns the number of organization policies processed, never submission/deletion counts or content. Live deletion does not erase existing backups; backup retention and key custody remain separate infrastructure controls.

The backup/restore acceptance command streams a compressed dump directly from the local Supabase database container into a guarded `_restore_acceptance` database. It records only stream size/hash and boolean checks, writes no dump file to host storage, verifies migrations plus content/retention privilege boundaries, and removes the temporary database in a `finally` path.

## Localization

User-facing Turkish strings must be centralized under a future localization module such as `src/locales/tr/`. Code identifiers, internal errors, tests, and technical artifacts remain English.

## Current Foundation Check

`tests/project-memory.test.mjs` validates required project memory files and key security documentation statements. `src/app/App.test.tsx` validates the Turkish dashboard shell and centralized UI messages.

## Current Frontend Scaffold

- Entry point: `src/main.tsx`
- Root app: `src/app/App.tsx`
- Dashboard feature: `src/features/dashboard/DashboardPage.tsx`
- Employee assignment service and inbox: `src/features/evaluations/evaluationAssignmentService.ts`, `src/features/evaluations/AssignmentInbox.tsx`
- Aggregate reporting service and panel: `src/features/reporting/evaluationReportService.ts`, `src/features/reporting/EvaluationReportsPanel.tsx`
- Administration feature: `src/features/administration/AdministrationPage.tsx`
- Administration project/cycle/member/assignment service and panel: `src/features/administration/projectCycleService.ts`, `src/features/administration/ProjectCycleManagementPanel.tsx`
- Administration evaluation-template service and panel: `src/features/administration/evaluationTemplateService.ts`, `src/features/administration/EvaluationTemplateManagementPanel.tsx`
- Administration role/hierarchy service and panel: `src/features/administration/hierarchyAdministrationService.ts`, `src/features/administration/RoleHierarchyManagementPanel.tsx`
- Turkish messages: `src/locales/tr/messages.ts`
- Authentication context and UI: `src/features/authentication/`
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
- Thresholded decryption and aggregate reporting Edge Function: `supabase/functions/evaluation-reports/index.ts`
- Content-free encryption key health Edge Function: `supabase/functions/encryption-key-health/index.ts`
- Aggregate anonymous abuse monitoring Edge Function: `supabase/functions/security-abuse-monitoring/index.ts`
- Evaluation retention administration Edge Function: `supabase/functions/evaluation-retention-administration/index.ts`
- User onboarding Edge Function: `supabase/functions/user-onboarding/index.ts`
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
- Thresholded reporting migrations: `supabase/migrations/20260807103000_thresholded_evaluation_reporting.sql`, `supabase/migrations/20260807111500_reporting_close_metadata_fix.sql`
- Encryption key lifecycle migration: `supabase/migrations/20260807143000_encryption_key_lifecycle.sql`
- Anonymous endpoint abuse-control migration: `supabase/migrations/20260807170000_anonymous_endpoint_abuse_protection.sql`
- Evaluation content retention migration: `supabase/migrations/20260808120000_evaluation_content_retention.sql`
- Database authorization tests: `supabase/tests/database/employee_assignment_access.test.sql`
- Anonymous submission database tests: `supabase/tests/database/anonymous_encrypted_submission.test.sql`
- Reporting authorization database tests: `supabase/tests/database/thresholded_evaluation_reporting.test.sql`
- Encryption key lifecycle database tests: `supabase/tests/database/encryption_key_lifecycle.test.sql`
- Invitation acceptance migration: `supabase/migrations/20260720232000_user_invitation_acceptance_flow.sql`
- Invitation acceptance revalidation migration: `supabase/migrations/20260720234500_invitation_acceptance_context_revalidation.sql`
- Organization administration migration: `supabase/migrations/20260722210000_hierarchy_administration_foundation.sql`
- Hierarchy context hardening migration: `supabase/migrations/20260722223000_hierarchy_context_integrity_hardening.sql`
- Setup notes: `docs/SUPABASE_SETUP.md`
- Demo fixture notes: `docs/TEST_FIXTURES.md`
- Demo fixture script: `scripts/create-demo-fixture.mjs`
- Linked remote project ref: `daxaymcmtbmummrxdyjy`

The versioned-template migrations add logical template roots, immutable version snapshots, ordered typed questions, service-role-only lifecycle functions, and exact template-version foreign keys on cycles and assignments. Question mutation guards validate both the source and destination parent so a published question cannot be moved into a draft. Existing cycles are backfilled to archived compatibility versions; new cycles require a published active template through the trusted project boundary. Template tables have RLS enabled and no client-facing policies.

## Current Authentication Scaffold

- Public environment validation: `src/config/environment.ts`
- Supabase auth service boundary: `src/features/authentication/authService.ts`
- Auth provider and gate: `src/features/authentication/AuthProvider.tsx`, `src/features/authentication/AuthGate.tsx`
- Turkish auth page: `src/features/authentication/AuthPage.tsx`
- Own-profile service and gate: `src/features/profiles/profileService.ts`, `src/features/profiles/ProfileGate.tsx`
- Own-workspace context service and gate: `src/features/workspace/workspaceContextService.ts`, `src/features/workspace/WorkspaceContextGate.tsx`

The auth service is injectable so unit and component tests do not call the network. Local development uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; container deployments inject equivalent public values through `/app-config.js` at startup.

The profile service is injectable and reads only the authenticated user's own profile row. A signed-in user without an active profile sees a Turkish invitation onboarding state instead of the dashboard.

The workspace context service is injectable and reads only the authenticated user's own non-sensitive role, unit, and manager context through `get_my_workspace_context()`.

The administration shell is reachable through `#administration` for admin-like workspace roles. It is a UI boundary only; production management writes must use future Edge Functions and RLS policies.

The project/cycle management panel calls `admin-project-cycles` through Supabase Functions. It does not query `projects`, `evaluation_cycles`, `evaluation_assignments`, `project_memberships`, `organization_unit_memberships`, or `user_profiles` directly from the browser.

The organization member selector and project membership form use the same Edge Function boundary. Organization member lookup returns active identity-domain profile metadata for administrators only. Project membership writes validate project organization scope and selected-user organization membership server-side before writing `project_memberships`.

The assignment planning control uses the same Edge Function boundary. It generates non-self evaluator-subject identity assignments from active project memberships for draft or open project-backed cycles, stores no scores or comments, and returns only aggregate assignment counts to the browser.

The project date control also uses `admin-project-cycles`. The Edge Function performs an early scope check, and service-role-only `admin_update_project_dates()` rechecks platform/matching-organization system-administrator scope or exact assigned-project-manager authority inside the transaction. Project completion and evaluation close dates are updated together; closed or archived cycles are rejected.

The user invitation panel calls `user-onboarding`. System administrators can list scoped organization/unit options, send Supabase Auth invitations, and revoke pending invitations. Invited users accept only through an authenticated, email-verified session. The Edge Function invokes service-role-only `accept_user_invitation()` so profile, role, unit membership, optional manager relationship, invitation state, and audit metadata change atomically. No raw custom invitation token is returned to the browser.

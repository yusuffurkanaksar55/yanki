# Development Log

## 2026-08-07 - Thresholded Trusted Aggregate Reporting

### Objective

Allow authorized reviewers to read useful closed-cycle aggregates without exposing individual responses, evaluator identities, below-threshold participation counts, administrative content access, or results about themselves.

### Changes

- Added service-role-only report-target and thresholded batch functions with fixed cycle-plus-subject grouping.
- Added reviewer scope and active membership checks, team-leader manager relationship enforcement, system-admin denial, self denial, closed-window enforcement, and count-free withholding below threshold.
- Added trusted AES-GCM decryption, exact immutable-question validation, numeric/categorical aggregation, and raw-text suppression in `evaluation-reports`.
- Added the Turkish report service/panel, reporting-role visibility controls, 34 pgTAP cases, aggregate/security/component tests, and a reusable live report smoke workflow.
- Added ADR-0021 and updated generated Supabase types and operational documentation.

### Database changes

Applied `20260807103000_thresholded_evaluation_reporting.sql` and forward-only `20260807111500_reporting_close_metadata_fix.sql` locally and to project `daxaymcmtbmummrxdyjy`. Direct ciphertext access remains revoked from `service_role`; only the thresholded function can release an identity-free encrypted batch.

### Security impact

Positive. Target discovery is participation-independent. Below threshold, no exact count, questions, ciphertext, or decrypted values leave PostgreSQL. System administrators and the subject are always denied. Raw text is discarded during aggregation and never enters the frontend report model.

### Tests performed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run check`.
- Clean local database reset and `npm run supabase:test:local`: 89 pgTAP cases across four suites.
- Remote migration dry-run/push/list, linked schema lint, type generation, function deployment/list.
- `npm run smoke:reports`: four encrypted submissions, `3.5` rating average, raw-text withholding, and premature/system-admin/self/employee/anonymous denial.

### Result

Both reporting migrations are current remotely. `evaluation-reports` is active as version 1, the redeployed anonymous submission function is active as version 4, and linked schema lint reports no errors. The first smoke run exposed missing close metadata; the forward-only fix was applied and the full rerun passed.

### Remaining work

- Replace the development key and implement production key rotation/recovery, rate limiting, retention, bootstrap, monitoring, and backup/restore acceptance.
- Complete approved invitation-email verification.
- Complete automated visual browser verification after the Codex browser runtime path issue is resolved.

## 2026-08-07 - Anonymous Encrypted Evaluation Submission

### Objective

Allow an eligible authenticated employee to submit an immutable evaluation exactly once without persisting evaluator identity beside content, while encrypting every answer before database persistence.

### Changes

- Added authenticated credential preparation and anonymous encrypted-submission Edge Functions.
- Added a Turkish typed-question modal connected to available employee assignments.
- Added memory-only raw credentials, anonymous no-cookie/no-Authorization fetch, answer validation, AES-256-GCM encryption, and stable operational error codes.
- Added a reusable live acceptance command and updated generated Supabase types.

### Database changes

Applied `20260807013000_anonymous_encrypted_evaluation_submissions.sql` locally and to project `daxaymcmtbmummrxdyjy`. It adds identity-domain digested credentials, content-domain ciphertext, immutable lifecycle guards, tenant foreign keys, and three service-role-only RPCs. Sensitive tables have no direct privileges, including for `service_role`.

### Security impact

Positive. Content rows contain no evaluator, assignment, credential, digest, plaintext answer, or exact submission timestamp. Raw credentials are transient, replay is terminal, assignment completion is atomic, and key material remains only in Supabase Secrets. The implementation provides application-level unlinkability, not blind-signature cryptographic anonymity.

### Tests performed

- `npm run lint`, `npm run typecheck`, `npm test`, and production build checks.
- `npm run supabase:test:local`: 55 pgTAP cases across three suites.
- Local and linked public schema lint plus final remote migration dry-run.
- `npm run smoke:submissions` with synthetic users: four encrypted answers accepted, assignment completed, replay denied.

### Result

The linked migration is current and both new Edge Functions are active. The live synthetic flow passes without creating additional fixture data. The linked schema lint reports no errors.

### Remaining work

- Implement trusted thresholded reporting, self-access denial, and scoped reviewer authorization.
- Replace the development key before live use and add rotation, recovery, rate limiting, retention, and backup acceptance.
- Complete visual browser verification when the Codex browser runtime path issue is resolved.

## 2026-08-06 - Immutable Versioned Evaluation Templates

### Objective

Allow organization-scoped administrators to define reusable evaluation questions while permanently preserving the exact published configuration used by every cycle and assignment.

### Changes

- Added tenant-scoped logical templates, version snapshots, ordered questions, all documented question types, editable drafts, and published-version mutation guards that validate both the old and new question parent.
- Added service-role-only atomic draft-save, publish, and clone functions with repeated system-admin scope checks and safe audit metadata.
- Added the authenticated `evaluation-templates` Edge Function, typed frontend service, and Turkish template management panel.
- Required project-cycle creation to select an active published version in the same organization and copied that exact id to every assignment.
- Backfilled existing cycles and assignments to archived compatibility versions without changing their identity-domain behavior.
- Added template metadata to project and employee assignment views, regenerated linked database types, and added ADR-0019.

### Database changes

Applied `20260806234500_versioned_evaluation_templates.sql` to Supabase project `daxaymcmtbmummrxdyjy`. The migration adds three default-deny tables, three service-role-only lifecycle functions, database immutability and scope triggers, and required version foreign keys on cycles and assignments. The follow-up `20260807001500_template_immutability_hardening.sql` prevents moving a question out of a published version by checking both sides of an update.

### Security impact

Positive. Browser clients have no template-table privileges. Published configuration cannot be updated or deleted in PostgreSQL. Cycles reject draft or cross-tenant versions, assignments reject version drift, and administration still cannot read evaluation response content.

### Tests performed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run check`.
- Clean local Supabase reset, local schema lint, and both pgTAP suites.
- Linked dry-run, migration push/list, generated types, linked lint, and sequential Edge Function deploys.
- `npm run smoke:templates` twice with a synthetic admin to verify creation, publication, legacy cycle metadata, anonymous denial, and idempotency.

### Result

Vitest passes 21 files and 91 tests. pgTAP passes 26 database cases. Local `public` schema lint and linked schema lint are clean. Live verification published the reusable four-question `Genel Proje Değerlendirmesi` v1 and the second run created no duplicate. The local UI remains available at `http://127.0.0.1:5173/`; browser visual inspection was blocked by the existing Codex runtime kernel-assets error.

### Remaining work

- Implement anonymous credentials and encrypted submissions before completion mutation or reporting.
- Complete invitation email delivery when an approved provider and mailbox are available.
- Add visual and end-to-end browser coverage when the Codex browser runtime is available.

## 2026-08-06 - Authenticated Employee Assignment Access

### Objective

Allow employees to see only evaluation assignments addressed to their authenticated identity while preserving default-deny table access, tenant isolation, and separation from future anonymous submission content.

### Changes

- Added authenticated `get_my_evaluation_assignments()` with `auth.uid()` ownership, active-profile and active-tenant membership revalidation, draft/cancelled filtering, and server-clock availability states.
- Kept evaluation, profile, organization, project, and cycle tables inaccessible to browser clients.
- Added a typed assignment service, Turkish assignment inbox, live dashboard counts, loading/empty/error/retry states, and assignment date/status presentation.
- Added source-boundary tests, component tests, Docker-backed pgTAP authorization tests, local database lint/test scripts, and a live synthetic employee smoke test.
- Added ADR-0018 and updated project context, architecture, security, authorization, data model, requirements, known issues, README, changelog, and release notes.
- Refreshed generated Supabase types and patched vulnerable development-only transitive dependencies.

### Files affected

- `supabase/migrations/20260806233000_employee_assignment_access.sql`
- `supabase/tests/database/employee_assignment_access.test.sql`
- `src/features/evaluations/*`
- `src/features/dashboard/DashboardPage.tsx`, `src/app/App.tsx`
- `src/locales/tr/messages.ts`, `src/types/supabase.ts`
- `scripts/smoke-employee-assignment-access.mjs`
- `tests/employee-assignment-access.test.mjs`
- `package.json`, `package-lock.json`
- `docs/*`, `README.md`, `CHANGELOG.md`

### Database changes

Applied `20260806233000_employee_assignment_access.sql` to Supabase project `daxaymcmtbmummrxdyjy`. It adds one authenticated metadata RPC and no table, column, direct table policy, evaluation content, or credential record. Local reset applied all migrations successfully and remote dry-run reports the database is up to date.

### Security impact

Positive. The caller cannot select a user or organization id; assignment ownership comes from `auth.uid()`. Evaluator and subject tenant membership is revalidated at read time. The response omits evaluator identity fields, scores, comments, payloads, and credentials. Production dependency audit reports zero vulnerabilities.

### Tests performed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run check`.
- `npm run supabase:test:local` and `npm run supabase:lint:local`.
- Linked migration dry-run, push, type generation, post-push lint, and final dry-run.
- `npm run smoke:assignments` with a synthetic employee and anonymous denial.
- Docker frontend image build, runtime configuration check, and `/healthz` check.
- Production and full `npm audit` checks.

### Result

Vitest passes 20 files and 89 tests. pgTAP passes 8 database authorization cases. Local and linked schema lint report no errors. The live employee received three own assignments, all correctly closed by the server clock, while anonymous access was denied. The frontend image built and ran healthy, `/healthz` returned `ok`, and runtime public configuration was generated. In-app visual verification could not run because the Codex browser runtime could not create its kernel assets.

### Remaining work

- Implement immutable versioned evaluation templates and bind assignments to template versions.
- Implement anonymous credentials and encrypted submission before completion mutation or reporting.
- Complete invitation email delivery when an approved provider and mailbox are available.
- Add Playwright visual/end-to-end coverage when browser automation is available.

## 2026-08-06 - Portable Deployment And Multi-Tenant Hardening

### Objective

Support vendor-hosted shared SaaS and customer-managed dedicated installation, strengthen company data isolation, and bound operational repository memory.

### Changes

- Added runtime public Supabase configuration so one Vite build can serve multiple environments without embedding customer-specific values.
- Added a multi-stage Dockerfile, Nginx SPA/health configuration, Compose package, deployment environment example, and self-host operations guide.
- Added ADR-0016 for shared/dedicated topology and ADR-0017 for the organization tenant boundary.
- Added explicit `organization_id` to project memberships and database tenant validation for project managers, project members, manager relationships, evaluators, and subjects.
- Scoped active direct-manager uniqueness by organization so one Auth identity can participate in multiple companies.
- Updated trusted project membership writes and the synthetic fixture for explicit tenant ids.
- Added bounded-memory automation: latest 5 development/test entries and latest 10 errors, while preserving ADRs and current source-of-truth documents.
- Updated architecture, security, authorization, data model, requirements, assumptions, setup, known issues, README, changelog, and release notes.

### Files affected

- `Dockerfile`, `compose.yaml`, `.dockerignore`, `deploy/*`, `public/app-config.js`
- `src/config/environment.ts`, `src/vite-env.d.ts`, `index.html`
- `supabase/migrations/20260806221500_multi_tenant_integrity_hardening.sql`
- `supabase/functions/admin-project-cycles/index.ts`
- `src/types/supabase.ts`, `scripts/create-demo-fixture.mjs`
- `scripts/trim-project-memory.mjs`, `package.json`, `AGENTS.md`
- `tests/deployment-foundation.test.mjs`, `tests/tenant-isolation.test.mjs`, `tests/project-memory-retention.test.mjs`
- `docs/*`, `README.md`, `CHANGELOG.md`

### Database changes

Applied `20260806221500_multi_tenant_integrity_hardening.sql` to Supabase project `daxaymcmtbmummrxdyjy`. The migration backfills and requires project membership tenant ids, adds composite tenant/project integrity, validates active tenant identities, and replaces global direct-manager uniqueness with organization-scoped uniqueness. Generated TypeScript database types were refreshed.

### Security impact

Positive. Cross-organization identity relationships receive additional database rejection, while browser configuration remains limited to public Supabase values. Dedicated infrastructure does not bypass tenant authorization. No evaluation content, anonymous credential, encryption key, service-role key, database password, or evaluator-to-response mapping was added to browser assets or tables.

### Tests performed

- Focused deployment, tenant, memory, project boundary, fixture, and environment tests.
- `npm run lint`, `npm run typecheck`, and `npm run check`.
- `npm run deployment:config`.
- Linked Supabase migration dry-run, push, post-migration lint, type generation, and `admin-project-cycles` deployment.
- Docker client/engine availability check.
- Local Vite browser verification at `http://127.0.0.1:5173/`.

### Result

The full check passed 18 test files and 81 tests, production build, and memory-retention validation. Compose configuration is valid. The remote migration applied, linked schema lint reports no errors, generated types include project membership organization scope, and `admin-project-cycles` deployed successfully. The local Turkish sign-in UI rendered without console errors or horizontal overflow. Docker Engine was not running, so a real image build and health check remain unverified.

### Remaining work

- Start Docker Desktop and verify the built image and local Supabase stack.
- Add a reviewed production organization/bootstrap boundary, release image publishing, backup/restore automation, and customer acceptance automation.
- Continue with employee assignment access, versioned templates, anonymous credentials, encrypted submissions, and scoped reporting before production use.

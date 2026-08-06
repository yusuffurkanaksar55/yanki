# Development Log

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

## 2026-07-22 - Delegated Project Date Administration

### Objective

Allow system administrators and exact assigned project managers to update project completion and evaluation close dates without exposing project tables or privileged credentials to the browser.

### Changes

- Added service-role-only `admin_update_project_dates()` for atomic project/cycle date updates and database-side authorization revalidation.
- Added project status, cycle status, date ordering, exact project-manager reference, active scoped-role, and active-profile checks.
- Extended `admin-project-cycles` with `update_project_dates` and retained system-admin-only project creation, membership, and assignment generation.
- Extended the typed browser service with `ProjectDateUpdateDraft` and `updateProjectDates()`.
- Added a Turkish project-date form for authorized projects and role-aware control visibility for project managers.
- Added targeted component and trusted-boundary tests plus a reusable authenticated live smoke script with restoration of the original test date.
- Added ADR-0015 and updated project context, architecture, security, authorization, data model, known issues, README, changelog, test report, and error log.

### Files affected

- `supabase/migrations/20260722234500_delegated_project_date_administration.sql`
- `supabase/functions/admin-project-cycles/index.ts`
- `src/features/administration/ProjectCycleManagementPanel.tsx`
- `src/features/administration/projectCycleService.ts`
- `src/locales/tr/messages.ts`
- `scripts/smoke-project-date-administration.mjs`
- `tests/admin-project-cycle-function.test.mjs`
- `src/features/administration/*test.tsx`
- `docs/*`
- `README.md`
- `CHANGELOG.md`
- `package.json`

### Database changes

Applied `20260722234500_delegated_project_date_administration.sql` to Supabase project `daxaymcmtbmummrxdyjy`. It adds no table or evaluation-content column. The new function updates existing configuration fields in `projects` and `evaluation_cycles`, emits safe audit metadata, and is executable only by `service_role`.

### Security impact

Positive foundation impact. The browser still has no direct project-table write path. Both the Edge Function and database transaction verify the actor. Delegated authority requires the actor to be both the project's current manager and the holder of an active matching project-scoped role. Closed/archived cycles, cross-project cycle ids, invalid date windows, employees, and unauthenticated requests are rejected. No scores, comments, lessons learned, submissions, anonymous credentials, or encryption material are accessed.

### Tests performed

- `npm run check`
- Targeted project panel and trusted-boundary Vitest runs.
- `npx supabase db push --linked --include-all --dry-run`
- `npx supabase db push --linked --include-all --yes`
- `npx supabase db lint --linked`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npx supabase functions list`
- `npm run smoke:project-dates` with synthetic HR administrator, team leader/project manager, and employee accounts.
- Authenticated desktop and 390-pixel mobile browser verification.
- `git diff --check`

### Result

The migration is applied and the remote database is up to date. Linked schema lint reports no errors. `admin-project-cycles` is `ACTIVE` as version `6` with gateway JWT verification disabled and internal bearer-token validation enabled. The live smoke test confirmed project-manager update, system-administrator restoration, employee denial, and unauthenticated denial. Desktop and mobile browser checks found no horizontal overflow or console errors. Application checks pass with 15 test files and 68 tests.

### Remaining work

- Keep invitation email delivery/acceptance open until an approved mailbox and provider decision are available.
- Implement employee-facing assignment access with scoped server-side authorization next.
- Implement versioned evaluation templates, anonymous credentials, encrypted submissions, and reporting in later security-reviewed phases.

## 2026-07-22 - Existing-User Role And Hierarchy Administration

### Objective

Provide trusted system-administrator workflows for existing-user roles, organization units, primary memberships, and direct-manager relationships while keeping identity tables default-deny and evaluation content outside the administration boundary.

### Changes

- Added service-role-only atomic database functions for unit create/update, user hierarchy context updates, role assignment, and role termination.
- Added database-side active-system-admin scope revalidation, manager-cycle detection, active-membership checks, unsafe unit-archive prevention, and final organization-admin protection.
- Added the `organization-administration` Edge Function for scoped hierarchy summaries and trusted mutations.
- Added an injectable typed browser service that calls only the Edge Function.
- Added a Turkish three-workflow administration panel for units, membership/manager context, and roles.
- Added component tests, trusted-boundary regression tests, and a reusable authenticated live smoke script.
- Added ADR-0014 and updated project memory, setup notes, release notes, and generated Supabase types.

### Files affected

- `supabase/migrations/20260722210000_hierarchy_administration_foundation.sql`
- `supabase/migrations/20260722223000_hierarchy_context_integrity_hardening.sql`
- `supabase/functions/organization-administration/index.ts`
- `src/features/administration/*`
- `src/app/App.tsx`
- `src/locales/tr/messages.ts`
- `src/types/supabase.ts`
- `scripts/smoke-hierarchy-administration.mjs`
- `tests/*`
- `docs/*`
- `README.md`
- `CHANGELOG.md`
- `package.json`

### Database changes

Applied `20260722210000_hierarchy_administration_foundation.sql` and follow-up `20260722223000_hierarchy_context_integrity_hardening.sql` to Supabase project `daxaymcmtbmummrxdyjy`. They add service-role-only identity-administration functions, strengthen direct-manager and parent-unit validation, expire stale unit roles after membership moves, and keep manager unit scope aligned. They create no evaluation-content table or column.

### Security impact

Positive foundation impact. The browser cannot read or write role, hierarchy, membership, manager, audit, or profile-directory tables directly. The Edge Function validates the authenticated active profile and database-backed system-admin scope. Database functions revalidate the actor transactionally and reject cross-organization context, manager cycles, invalid unit roles, unsafe archival, project-manager role mutation, and final organization-admin removal. Audit metadata contains identity/configuration references only.

### Tests performed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `npx supabase db push --dry-run`
- `npx supabase db push --linked --include-all --yes`
- `npx supabase db lint --linked`
- `npx supabase gen types typescript --linked`
- `npx supabase functions deploy organization-administration --no-verify-jwt`
- `npx supabase functions list --project-ref daxaymcmtbmummrxdyjy`
- `npm run smoke:hierarchy` with synthetic HR administrator and employee accounts.
- Authenticated desktop and 390-pixel mobile browser verification.
- `git diff --check`

### Result

Both migrations are applied, linked schema lint reports no errors, and the remote database is up to date. `organization-administration` is `ACTIVE` as version `2` with gateway JWT verification disabled and internal token validation enabled. The live smoke test returned one organization and six members, archived its temporary unit, ended its temporary role, rejected a manager cycle, denied an employee, and denied an unauthenticated request. Desktop and mobile browser checks found no horizontal overflow or console errors. Application checks pass with 15 test files and 66 tests.

### Remaining work

- Keep invitation email delivery/acceptance open until an approved mailbox and provider decision are available.
- Implement delegated project-manager project-completion and evaluation-close-date updates next.
- Implement employee assignment access, anonymous credentials, encrypted submissions, and reporting in later security-reviewed phases.

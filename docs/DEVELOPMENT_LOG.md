# Development Log

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

## 2026-07-20 - Supabase Auth-Backed Invitation Onboarding

### Objective

Provide a trusted system-administrator invitation workflow and atomic invited-user activation without exposing raw invitation secrets, service-role credentials, or identity-table writes to the browser.

### Changes

- Extended `user_invitations` with Auth-user, organization, unit, membership, display-name, and optional manager context.
- Added hierarchy validation for invitation organization, unit, role scope, and active manager membership.
- Added service-role-only `accept_user_invitation()` for atomic profile activation, scoped role assignment, unit membership, optional manager assignment, invitation acceptance, and safe audit metadata.
- Added `user-onboarding` with scoped administration listing, Supabase Auth invitation creation, invitation revocation, and authenticated acceptance actions.
- Added rollback cleanup for failed invitation creation and inactive invited-Auth-user cleanup during revocation.
- Added a Turkish system-administrator invitation form and invitation status list.
- Added invited-profile acceptance to the profile gate.
- Added focused component, boundary, migration, and security tests.
- Added the Supabase browser SDK `apikey` header to both administration Edge Function CORS preflight allowlists.
- Added ADR-0013 for Supabase Auth-backed invitation onboarding.

### Files affected

- `supabase/migrations/20260720232000_user_invitation_acceptance_flow.sql`
- `supabase/functions/user-onboarding/index.ts`
- `src/types/supabase.ts`
- `src/features/administration/*`
- `src/features/profiles/*`
- `src/app/*`
- `src/locales/tr/messages.ts`
- `tests/*`
- `docs/*`
- `README.md`
- `CHANGELOG.md`

### Database changes

Applied remote migrations `20260720232000_user_invitation_acceptance_flow.sql` and `20260720234500_invitation_acceptance_context_revalidation.sql` to Supabase project `daxaymcmtbmummrxdyjy`. They add identity-domain onboarding context, service-role-only atomic invitation acceptance, and acceptance-time active hierarchy revalidation. They do not add evaluation content.

### Security impact

Positive foundation impact. Invitation management requires a platform or matching-organization `SYSTEM_ADMIN` role. Acceptance requires the exact Supabase Auth user id, verified invitation email, active invitation window, valid terminal state, active organization/unit context, and active optional manager. The browser receives no custom raw invitation token and writes no invitation, role, membership, manager, or audit table directly.

### Tests performed

- `npm run check`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --linked --include-all --yes`
- `npx supabase migration list`
- `npx supabase gen types typescript --linked`
- `npx supabase functions deploy user-onboarding --no-verify-jwt`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npx supabase functions list --project-ref daxaymcmtbmummrxdyjy`
- Authenticated `list_user_administration` live smoke test.
- Authenticated nonexistent-invitation revocation live smoke test.
- Authenticated desktop and mobile browser smoke tests for invitation and project administration panels.
- Employee and unauthenticated denial live smoke tests.
- `git diff --check`

### Result

Invitation onboarding foundation was implemented and deployed. The linked database includes migrations `20260720232000` and `20260720234500`, linked lint reports no schema errors, and the remote database is up to date. `user-onboarding` is `ACTIVE` as version `3`, and the CORS-corrected `admin-project-cycles` is `ACTIVE` as version `5`. Authenticated system-admin listing returned one organization, three units, and six active members; a nonexistent invitation revocation returned `INVITATION_NOT_FOUND`. Employee and unauthenticated requests were denied with the expected codes. The authenticated browser loaded both administration panels without horizontal overflow. Application checks passed with 13 test files and 59 tests.

### Remaining work

- Configure or verify Supabase Auth email delivery and run delivery/acceptance smoke testing with an approved mailbox.
- Implement existing-user role changes and general hierarchy/membership/manager administration.
- Implement delegated project-manager date updates.
- Implement employee assignment access, anonymous credentials, encrypted submissions, and reporting in later security-reviewed phases.

## 2026-07-20 - Authenticated Administration Smoke Verification

### Objective

Verify the deployed Supabase Auth and `admin-project-cycles` authorization boundary end to end with synthetic users before starting the next administration feature.

### Changes

- Authenticated the synthetic HR administrator, team leader, CEO, and three employee accounts without persisting credentials in the repository.
- Verified the HR administrator has an active organization-scoped `SYSTEM_ADMIN` role.
- Created `Yanki Canli Test Projesi` and its time-bound evaluation cycle through the deployed Edge Function.
- Assigned the team leader as project manager, the CEO as sponsor, and three employees as project members.
- Generated 12 non-self assignment candidates across four evaluating project participants.
- Verified the project manager can list the assigned project.
- Verified an employee receives `ADMINISTRATION_SCOPE_DENIED` when requesting the organization member directory.
- Updated project memory and test-fixture notes without recording credentials or access tokens.

### Files affected

- `docs/PROJECT_CONTEXT.md`
- `docs/KNOWN_ISSUES.md`
- `docs/TEST_FIXTURES.md`
- `docs/DEVELOPMENT_LOG.md`
- `docs/TEST_REPORT.md`
- `docs/ERROR_LOG.md`

### Database changes

No schema changes. Synthetic project, evaluation-cycle, project-membership, scoped project-manager role, assignment, and safe audit records were created in linked Supabase project `daxaymcmtbmummrxdyjy` through the deployed administration Edge Function.

### Security impact

Positive verification impact. The smoke test confirmed server-side role recomputation, matching-organization administrator scope, project-manager project visibility, non-self assignment generation, and employee denial for an administration action. No evaluation response content, credentials, tokens, plaintext scores, comments, or encryption keys were stored in the repository or test documentation.

### Tests performed

- Authenticated Supabase password-grant requests for synthetic accounts.
- Authenticated `get_my_workspace_context()` checks for active profile, role, and membership context.
- Authenticated `admin-project-cycles` calls for project creation, member assignment, assignment generation, and scoped project listing.
- Negative employee authorization check for `list_organization_members`.
- `npx supabase functions list --project-ref daxaymcmtbmummrxdyjy`.
- `npm run check`.

### Result

The authenticated administration smoke path passed. One project with five project memberships was created; four evaluating participants produced 12 non-self pending assignments; the team leader could see the assigned project; and the employee administration request was denied with `ADMINISTRATION_SCOPE_DENIED`. The final application check passed with 11 test files and 49 tests.

### Remaining work

- Implement invitation issuance, redemption, profile activation, scoped role assignment, and hierarchy administration actions.
- Implement delegated project-manager date update actions.
- Add employee assignment access only after scoped authorization policies are designed.
- Add browser end-to-end coverage after stable authenticated browser automation is available.

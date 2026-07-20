# Development Log

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

## 2026-07-20 - Evaluation Assignment Planning Foundation

### Objective

Generate project-backed evaluation assignment planning records from active project memberships through the trusted administration Edge Function boundary.

### Changes

- Added `evaluation_assignments` as a default-deny identity-domain assignment table.
- Added assignment kind and status constraints, self-assignment prevention, duplicate active-assignment prevention, and project/cycle/organization scope validation.
- Extended `admin-project-cycles` with the `generate_project_assignments` action.
- Generated non-self evaluator-subject assignment candidates from active project memberships for draft or open project-backed cycles.
- Returned aggregate assignment counts to the browser without exposing direct assignment table access.
- Added assignment count display and a Turkish assignment generation control to the administration project panel.
- Added frontend service types and tests for assignment generation.
- Added ADR-0012 for default-deny evaluation assignment planning.

### Files affected

- `supabase/migrations/20260720223000_evaluation_assignment_foundation.sql`
- `supabase/functions/admin-project-cycles/index.ts`
- `src/types/supabase.ts`
- `src/features/administration/*`
- `src/app/App.test.tsx`
- `src/locales/tr/messages.ts`
- `tests/*`
- `docs/*`
- `docs/decisions/ADR-0012-use-default-deny-evaluation-assignment-planning.md`

### Database changes

Applied remote migration `20260720223000_evaluation_assignment_foundation.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. Assignment planning remains identity-domain only and stores no scores, comments, lessons learned content, encrypted payloads, anonymous credential secrets, or response content. The table is RLS-enabled with no client-facing policies. Generation runs through the Edge Function service-role boundary with server-side authentication, active-profile validation, role recomputation, organization-scope authorization, project-backed cycle validation, self-assignment prevention, and safe audit metadata.

### Tests performed

- `npm test`
- `npm run check`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase migration list`
- `npx supabase gen types typescript --linked`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npx supabase functions list`
- Unauthenticated live function smoke test with `Invoke-WebRequest`
- Secret scan with `rg`
- `git diff --check`

### Result

Evaluation assignment planning foundation was implemented and deployed. Application checks passed with 11 test files and 49 tests. The linked Supabase database includes migration `20260720223000`, linked database lint found no schema errors, the updated `admin-project-cycles` function is `ACTIVE` as version `4`, and an unauthenticated live smoke test returned `AUTHENTICATION_REQUIRED`.

### Remaining work

- Run authenticated live smoke testing with synthetic admin credentials.
- Implement employee-facing assignment access after scoped authorization design.
- Implement anonymous credential issuance and encrypted submission flows.
- Implement delegated project-manager date and assignment workflows.

## 2026-07-20 - Admin Project Membership Foundation

### Objective

Allow system administrators to select active organization members and add them to projects through the existing trusted administration Edge Function boundary.

### Changes

- Extended `supabase/functions/admin-project-cycles/index.ts` with `list_organization_members` and `add_project_member` actions.
- Added server-side selected-user validation against active `user_profiles` and active `organization_unit_memberships`.
- Added project membership writes through the service-role Edge Function client.
- Kept project-manager membership assignment tied to scoped `PROJECT_MANAGER` role assignment and the project manager reference.
- Added organization member and project member types to the frontend project cycle service.
- Added member selection, membership-kind selection, member list display, and Turkish feedback in the administration project panel.
- Added ADR-0011 for trusted project membership administration actions.

### Files affected

- `supabase/functions/admin-project-cycles/index.ts`
- `src/features/administration/*`
- `src/app/App.test.tsx`
- `src/locales/tr/messages.ts`
- `tests/*`
- `docs/*`
- `docs/decisions/ADR-0011-use-admin-project-membership-edge-function-actions.md`

### Database changes

None. This phase uses existing `project_memberships`, `user_profiles`, `organization_unit_memberships`, `projects`, `user_role_assignments`, and `audit_events` tables.

### Security impact

Positive foundation impact. Project membership management now remains behind the trusted Edge Function boundary. The browser service invokes `admin-project-cycles` and does not directly query or mutate `project_memberships`, `organization_unit_memberships`, or administrative `user_profiles` lists. The new flow stores only identity-domain membership metadata and safe audit metadata. No evaluation response content, plaintext scores, comments, lessons learned payloads, anonymous credential values, service-role values, or encryption keys were added.

### Tests performed

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run check`
- `npm run supabase:lint:linked`
- `npm run supabase:push:dry-run`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npx supabase functions list`
- Unauthenticated live function smoke test with `Invoke-WebRequest`

### Result

Admin project membership foundation was implemented and deployed. Application checks passed with 11 test files and 47 tests. The linked Supabase database is up to date, linked database lint found no schema errors, the updated `admin-project-cycles` function is `ACTIVE` as version `3`, and an unauthenticated live smoke test returned `AUTHENTICATION_REQUIRED`.

### Remaining work

- Run authenticated live smoke testing with synthetic admin credentials.
- Implement delegated project-manager date update actions.
- Implement invitation, profile, role, hierarchy, and evaluation assignment management flows.

## 2026-07-19 - Admin Project Cycle Edge Function Foundation

### Objective

Allow administrators to list project/evaluation-cycle configuration and create a project-completion evaluation cycle through a trusted Edge Function instead of direct browser table access.

### Changes

- Added `supabase/functions/admin-project-cycles/index.ts`.
- Implemented `list_project_cycles` and `create_project_cycle` function actions.
- Added server-side JWT validation, active-profile check, role recomputation, and organization-scope authorization.
- Added frontend project/cycle service that calls Supabase Functions and does not query project tables directly.
- Added project/cycle management panel to the protected administration shell.
- Added Turkish form, list, loading, success, and error states for project/cycle administration.
- Added tests for the Edge Function boundary, frontend service boundary, project/cycle panel, and administration route.
- Added ADR-0010 for the admin project/cycle Edge Function.

### Files affected

- `supabase/functions/admin-project-cycles/index.ts`
- `src/features/administration/*`
- `src/app/App.tsx`
- `src/locales/tr/messages.ts`
- `eslint.config.js`
- `tests/*`
- `docs/*`
- `docs/decisions/ADR-0010-use-admin-project-cycle-edge-function.md`

### Database changes

None. This phase uses the previously applied `projects`, `project_memberships`, and `evaluation_cycles` foundation tables.

### Security impact

Positive foundation impact. Project/cycle management now crosses a trusted Edge Function boundary. The browser service invokes `admin-project-cycles` and does not directly query or mutate default-deny project tables. Service-role credentials are referenced only in Edge Function code. No evaluation response content, plaintext scores, comments, lessons learned payloads, anonymous credential values, service-role values, or encryption keys were added.

### Tests performed

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run check`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- Unauthenticated live function smoke test with `Invoke-WebRequest`
- `npx supabase functions list`

### Result

Admin project/cycle Edge Function foundation and frontend management panel were implemented. Application checks passed with 11 test files and 46 tests. The function was deployed to Supabase project `daxaymcmtbmummrxdyjy`, listed as `ACTIVE`, and an unauthenticated live smoke test returned `401 AUTHENTICATION_REQUIRED`.

### Remaining work

- Run an authenticated live smoke test with synthetic admin credentials.
- Add member and project-manager selection UI.
- Implement delegated project-manager update actions.
- Implement invitation, profile, role, and hierarchy management Edge Functions.

## 2026-07-19 - Administration And Project Cycle Foundation

### Objective

Add a protected administration shell and a default-deny project/evaluation-cycle configuration foundation so admins and delegated project managers can later manage project completion and evaluation close dates through trusted flows.

### Changes

- Added `projects`, `project_memberships`, and `evaluation_cycles` with RLS enabled and no frontend policies.
- Added date-window constraints for projects and evaluation cycles.
- Added `validate_evaluation_cycle_project_scope()` to keep project-scoped cycles inside the same organization.
- Added hash-route handling for `#dashboard` and `#administration`.
- Added a protected Turkish administration shell for admin-like roles.
- Added shared workspace administration-role helpers.
- Updated the demo fixture to create `Yanki Demo Project`, project memberships, a scoped project-manager role, and a project-completion evaluation cycle closing on 2026-07-30.
- Regenerated linked Supabase database types.
- Added ADR-0009 for the default-deny project/evaluation-cycle foundation.

### Files affected

- `supabase/migrations/20260719184052_project_evaluation_cycle_foundation.sql`
- `src/types/supabase.ts`
- `src/app/App.tsx`
- `src/features/administration/*`
- `src/features/dashboard/DashboardPage.tsx`
- `src/features/workspace/workspaceAuthorization.ts`
- `src/locales/tr/messages.ts`
- `scripts/create-demo-fixture.mjs`
- `tests/*`
- `docs/*`
- `docs/decisions/ADR-0009-use-default-deny-project-evaluation-cycle-foundation.md`

### Database changes

Applied remote migration `20260719184052_project_evaluation_cycle_foundation.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. New tables are identity/configuration-domain records and remain default-deny to frontend clients. The administration shell is a UI boundary only and does not grant sensitive access. No evaluation response content, plaintext scores, comments, lessons learned payloads, anonymous credential values, service-role credentials, or encryption keys were added.

### Tests performed

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `node --check scripts/create-demo-fixture.mjs`
- `npx supabase db push --dry-run`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `npx supabase db lint --linked`
- `npm run check`

### Result

Administration shell and project/evaluation-cycle configuration foundation were implemented. Application checks passed with 9 test files and 42 tests. The linked Supabase project shows all five local migrations applied and the remote database is up to date.

### Remaining work

- Implement trusted Edge Functions for administration write actions.
- Add production forms for invitation, role, hierarchy, project, and evaluation-cycle management.
- Implement evaluation assignments and anonymous credential issuance.
- Implement encrypted submissions and thresholded reporting.

## 2026-07-19 - Authenticated Workspace Context Foundation

### Objective

Expose each signed-in user's own non-sensitive organization context after login, while preserving default-deny access to role, invitation, hierarchy, and evaluation-content data.

### Changes

- Added `get_my_workspace_context()` as a `security definer` Supabase RPC filtered by `auth.uid()`.
- Granted RPC execution only to authenticated users.
- Regenerated linked Supabase database types.
- Added injectable workspace context service and authenticated workspace context gate.
- Added a Turkish dashboard panel for the current user's roles, memberships, and managers.
- Added a Turkish administration entry point for admin-like roles without adding sensitive management actions yet.
- Recorded product decisions that roles are not singletons and evaluation cycles are time-bound without a fixed participant-count opening requirement.
- Added ADR-0008 for the authenticated workspace context RPC.

### Files affected

- `supabase/migrations/20260719181013_workspace_context_rpc.sql`
- `src/types/supabase.ts`
- `src/features/workspace/*`
- `src/features/dashboard/DashboardPage.tsx`
- `src/app/*`
- `src/locales/tr/messages.ts`
- `tests/*`
- `docs/*`
- `docs/decisions/ADR-0008-use-authenticated-workspace-context-rpc.md`

### Database changes

Applied remote migration `20260719181013_workspace_context_rpc.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. The RPC returns only the authenticated caller's own non-sensitive profile, role, membership, and manager context. It does not expose evaluation submissions, scores, comments, lessons learned payloads, anonymous credential values, decrypted content, service-role credentials, or encryption keys.

### Tests performed

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `npm run check`

### Result

Authenticated workspace context foundation was implemented. Application checks passed with 8 test files and 33 tests. The linked Supabase project shows all four local migrations applied and the remote database is up to date.

### Remaining work

- Implement invitation creation and redemption Edge Functions.
- Add protected administration screens for profile, invitation, role, hierarchy, project, and evaluation-date management.
- Implement project and time-bound evaluation cycle management.
- Implement scoped authorization policies before sensitive evaluation workflows.

## 2026-07-19 - Organization Hierarchy And Demo Fixture Foundation

### Objective

Implement a configurable organization hierarchy foundation and a safe synthetic test fixture path for the CEO, HR admin, team leader, and three-employee scenario without hard-coding that structure into the product.

### Changes

- Added `PLATFORM` as the null-id global scope type.
- Updated role assignment, invitation, and audit scope constraints so non-platform scopes require explicit `scope_id` values.
- Added `organizations`, `organization_units`, `organization_unit_memberships`, and `manager_assignments`.
- Added hierarchy validation triggers for organization-unit parent ownership, cycle prevention, and manager-assignment scope ownership.
- Kept new hierarchy tables RLS-enabled with no client-facing policies.
- Added `docs/TEST_FIXTURES.md` for the synthetic user scenario.
- Added `scripts/create-demo-fixture.mjs` and `npm run fixture:demo` for service-role-only demo fixture creation.
- Added tests for organization hierarchy safety, platform scope semantics, and fixture credential handling.
- Regenerated linked Supabase database types.
- Added ADR-0007 for the configurable organization hierarchy foundation.

### Files affected

- `supabase/migrations/20260719174459_organization_hierarchy_foundation.sql`
- `src/types/supabase.ts`
- `scripts/create-demo-fixture.mjs`
- `package.json`
- `docs/TEST_FIXTURES.md`
- `tests/demo-fixture-foundation.test.mjs`
- `tests/supabase-foundation.test.mjs`
- `tests/project-memory.test.mjs`
- `docs/*`
- `docs/decisions/ADR-0007-use-configurable-organization-hierarchy-foundation.md`

### Database changes

Applied remote migration `20260719174459_organization_hierarchy_foundation.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. Organization hierarchy records are identity-domain metadata and remain default-deny to frontend clients. The fixture script reads service-role credentials only from local environment variables and is not part of normal checks. No evaluation content, plaintext scores, comments, lessons learned payloads, anonymous credential values, service-role credentials, or encryption keys were added to the repository.

### Tests performed

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `node --check scripts/create-demo-fixture.mjs`
- `npm run check`

### Result

Organization hierarchy and demo fixture foundation were implemented. Application checks passed with 7 test files and 29 tests. The linked Supabase project shows all three local migrations applied and the remote database is up to date.

### Remaining work

- Run `npm run fixture:demo` with a local service-role key to create synthetic test users and hand off generated credentials.
- Implement invitation creation and redemption Edge Functions.
- Add protected administration screens for organization hierarchy management.
- Implement scoped authorization policies before sensitive evaluation workflows.

## 2026-07-19 - User Profile And Invitation Onboarding Foundation

### Objective

Implement the first safe user profile bootstrap and invitation onboarding foundation without exposing privileged invitation management or sensitive evaluation workflows to the browser.

### Changes

- Added `user_profiles` with RLS and a narrow authenticated own-profile select policy.
- Added `user_invitations` with hashed invitation secrets, scope/role metadata, lifecycle constraints, RLS, and no client-facing policies.
- Regenerated linked Supabase database types.
- Added injectable profile service and authenticated profile gate.
- Added Turkish profile loading, missing invitation, inactive profile, and profile-read error states.
- Updated the dashboard to display the active profile display name.
- Added component and migration tests for profile gating, invitation hash storage, RLS coverage, and no direct invitation client policies.
- Added ADR-0006 for the profile/invitation onboarding foundation.

### Files affected

- `supabase/migrations/20260719171413_user_profile_invitation_foundation.sql`
- `src/types/supabase.ts`
- `src/features/profiles/*`
- `src/features/authentication/AuthGate.tsx`
- `src/features/dashboard/DashboardPage.tsx`
- `src/app/*`
- `src/locales/tr/messages.ts`
- `tests/*`
- `docs/*`
- `docs/decisions/ADR-0006-use-profile-invitation-onboarding-foundation.md`

### Database changes

Applied remote migration `20260719171413_user_profile_invitation_foundation.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. The first client-readable database policy is limited to `auth.uid() = user_id` on `user_profiles`. Invitation records remain hidden from frontend clients and store only `token_hash`, not raw invitation secrets. No evaluation content, plaintext scores, comments, lessons learned payloads, anonymous credential values, service-role credentials, or encryption keys were added.

### Tests performed

- `npm test`
- `npm run typecheck`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `npm run check`

### Result

Profile and invitation onboarding foundation was implemented. Application checks passed with 6 test files and 21 tests. The linked Supabase project shows both local migrations applied and the remote database is up to date.

### Remaining work

- Implement trusted Edge Functions for invitation creation, redemption, profile activation, and scoped role assignment.
- Add protected administration screens for profile, invitation, role, and scope management.
- Implement scoped evaluation authorization policies before sensitive workflows.
- Add Playwright end-to-end coverage after a full invitation redemption flow exists.

## 2026-07-19 - Supabase Auth Typed Client Foundation

### Objective

Implement the first safe Supabase Auth frontend foundation with generated database types, runtime public environment validation, typed Supabase client creation, injectable auth service, Turkish auth UI, and focused tests.

### Changes

- Installed `@supabase/supabase-js`.
- Generated linked Supabase database types into `src/types/supabase.ts`.
- Added runtime public environment validation.
- Added lazy typed browser Supabase client.
- Added injectable Supabase Auth service boundary.
- Added auth provider, auth gate, sign-in UI, password reset request UI, and local-session sign-out integration.
- Added unit and component tests for environment validation, sign-in form behavior, password reset request, authenticated dashboard gating, and unauthenticated auth page rendering.
- Added ADR-0005 for the typed Supabase Auth client foundation.

### Files affected

- `package.json`
- `package-lock.json`
- `vitest.setup.ts`
- `src/config/*`
- `src/lib/supabase/*`
- `src/types/supabase.ts`
- `src/features/authentication/*`
- `src/features/dashboard/DashboardPage.tsx`
- `src/app/*`
- `src/locales/tr/messages.ts`
- `docs/*`
- `docs/decisions/ADR-0005-use-typed-supabase-auth-client.md`

### Database changes

None.

### Security impact

Positive frontend foundation impact. The browser client uses only public Supabase URL and anon key values. No service-role key, database password, encryption key, evaluation content, anonymous credential, or privileged authorization rule was added to the frontend.

### Tests performed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `npm run supabase:lint:linked`
- `npm run supabase:migrations`
- `npm run supabase:push:dry-run`

### Result

Auth client foundation was implemented. Application checks passed with 5 test files and 15 tests. Linked Supabase lint passed and the remote database was up to date.

### Remaining work

- Implement invitation onboarding and user profile bootstrap.
- Implement Microsoft Entra ID provider support.
- Design explicit scoped RLS policies and Edge Functions.
- Add Playwright end-to-end auth tests after stable browser automation setup.

## 2026-07-19 - Supabase And GitHub Project Connection

### Objective

Connect the local project to the user-created GitHub repository and linked Supabase project, then apply the first safe Supabase security foundation migration.

### Changes

- Installed Supabase CLI as a development dependency.
- Initialized `supabase/` project configuration.
- Added `.env.example` and local public Supabase environment values.
- Added `docs/SUPABASE_SETUP.md`.
- Added the initial default-deny Supabase migration.
- Added Supabase foundation tests.
- Added Supabase helper npm scripts.

### Files affected

- `package.json`
- `package-lock.json`
- `.env.example`
- `.gitignore`
- `supabase/config.toml`
- `supabase/seed.sql`
- `supabase/migrations/20260719132911_initial_security_foundation.sql`
- `docs/*`
- `tests/*`

### Database changes

Applied remote migration `20260719132911_initial_security_foundation.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. RLS is enabled on all public tables created by the migration and no client policies are added. No evaluation content, plaintext scores, comments, lessons learned payloads, or evaluator-to-submission linkage tables were created.

### Tests performed

- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase migration list`
- `npm run check`

### Result

Supabase remote project was linked and the initial migration was applied. GitHub remote `yusuffurkanaksar55/yanki` was connected and `main` was pushed. Application checks passed.

### Remaining work

- Install GitHub CLI if PR creation through CLI is required.
- Generate Supabase database types.
- Implement authentication and invitation onboarding.
- Design and implement explicit RLS policies and Edge Functions.

## 2026-07-16 - React Vite Application Scaffold

### Objective

Scaffold the React, TypeScript, Vite application foundation and expand quality commands to real frontend linting, type checking, testing, and production build.

### Changes

- Added Vite, React, TypeScript, Tailwind CSS, ESLint, Vitest, and React Testing Library configuration.
- Added a Turkish dashboard shell with centralized messages.
- Converted documentation foundation tests from Node test runner to Vitest.
- Added component coverage for the initial application shell.
- Added package lock and installed application dependencies.
- Started a local Vite dev server during command execution for manual verification.

### Files affected

- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `vite.config.ts`
- `vitest.setup.ts`
- `eslint.config.js`
- `tailwind.config.ts`
- `postcss.config.cjs`
- `src/*`
- `tests/project-memory.test.mjs`
- `docs/*`
- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`
- `.gitignore`

### Database changes

None.

### Security impact

No sensitive runtime flows were implemented. The UI contains no evaluation submission or reporting access. Turkish UI strings are centralized. Runtime authentication, authorization, RLS, anonymous credentials, and encryption remain future work.

### Tests performed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- Manual dev-server health check for `http://127.0.0.1:5173/`
- Follow-up dev-server persistence check

### Result

React/Vite scaffold and quality pipeline were completed. The combined check passed. The dev server returned HTTP 200 during startup but did not remain reachable after shell command cleanup.

### Remaining work

- Initialize or connect Git repository management.
- Add Supabase project structure and migrations.
- Implement authentication and invitation onboarding.
- Implement scoped authorization and RLS before sensitive workflows.
- Add Playwright end-to-end tests after real user flows exist.

## 2026-07-16 - Project Memory Foundation

### Objective

Create the initial persistent memory foundation for the anonymous evaluation platform and document the first safe implementation phase.

### Changes

- Added repository operating guide.
- Added README and changelog.
- Added core project memory documents.
- Added initial architecture decision records.
- Added a Node-based documentation foundation test.

### Files affected

- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`
- `package.json`
- `.gitignore`
- `docs/*`
- `docs/decisions/*`
- `tests/project-memory.test.mjs`

### Database changes

None.

### Security impact

Positive documentation impact only. Security architecture, anonymity boundaries, encryption requirements, and authorization rules are now documented. No runtime security controls are implemented yet.

### Tests performed

- `npm test`
- `npm run check`

### Result

Foundation files were created for reviewable future development. Documentation foundation checks passed.

### Remaining work

- Initialize or connect Git repository management.
- Scaffold the application stack.
- Implement authentication, authorization, Supabase migrations, anonymous credentials, encryption, and reporting in phased work.

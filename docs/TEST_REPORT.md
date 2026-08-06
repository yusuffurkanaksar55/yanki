# Test Report

## 2026-08-06 - Authenticated Employee Assignment Access

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- Supabase CLI: 2.109.1
- Docker Desktop: 4.82.0
- Docker Engine: 29.6.1, Linux containers
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check`
- `npx supabase start`, `npx supabase db reset --local`
- `npm run supabase:test:local`, `npm run supabase:lint:local`
- Linked migration dry-run, push, type generation, lint, and final dry-run
- `npm run smoke:assignments`
- `docker build --tag yanki-frontend:local .`
- Temporary frontend container health and runtime configuration checks
- `npm audit --omit=dev --audit-level=high`, `npm audit fix`, final `npm audit`

### Passed

- Vitest passed 20 files and 89 tests; TypeScript, ESLint, production build, and memory checks passed.
- Clean local database reset applied all migrations through `20260806233000_employee_assignment_access.sql`.
- pgTAP passed 8 authorization tests covering own-only access, draft/cancelled exclusion, authenticated-only execution, forbidden-field absence, membership expiry, and inactive-profile denial.
- Local and linked database lint reported no schema errors.
- Remote dry-run identified only the employee assignment migration before deployment and reported up to date afterward.
- Generated types include `get_my_evaluation_assignments()`.
- Live synthetic employee authentication returned three own assignments with `CLOSED` availability; anonymous RPC access was denied and forbidden fields were absent.
- Frontend Docker image built successfully, reported `healthy`, returned `ok` from `/healthz`, and wrote public runtime Supabase configuration.
- The local Supabase stack was stopped after verification with its Docker volume preserved.
- Production dependency audit found zero vulnerabilities; compatible development dependency patches reduced the full audit to zero.

### Failed

- Docker Desktop Linux Engine stopped during the first large local Supabase image bootstrap. Restarting Docker Desktop and cleanly stopping/starting the partial stack resolved it.
- The pgTAP runner image first failed DNS resolution against ECR, then Supabase CLI pulled the same image from GHCR and all tests passed.
- Remote migration application emitted a non-fatal experimental pg-delta cache warning for a missing temporary certificate file. The migration applied; type generation, linked lint, and final dry-run passed.
- The first smoke command expected `.env`; the project uses `.env.local`. After correcting the command, one transient Supabase DNS lookup failed and the retry passed after DNS resolution was confirmed.
- The first temporary frontend container mapped host port to container port 80 instead of the documented 8080. Recreating it with `18080:8080` passed both internal and external health checks.
- Codex in-app browser setup failed before navigation because its runtime could not write kernel assets.

### Skipped

- Desktop and mobile visual browser inspection was skipped because the browser runtime did not initialize. Component rendering and production image/build checks passed.
- Real invitation email delivery and acceptance remain deferred pending an approved provider and mailbox.

### Security checks

- Verified assignment ownership is derived only from `auth.uid()` and accepts no client-selected user or tenant id.
- Verified evaluator and subject active tenant membership at read time.
- Verified assignment and related identity tables remain default-deny to browser clients.
- Verified no evaluator identity field, response content, score, comment, payload, credential, service-role key, or encryption key is returned or logged.

### Remaining risks

- Assignment display does not authorize submission; templates, anonymous credentials, encryption, completion mutation, and reporting remain production blockers.
- Automated visual and full browser end-to-end coverage remain incomplete.

## 2026-08-06 - Portable Deployment And Multi-Tenant Hardening

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- Supabase CLI: 2.109.1
- Docker client: 29.6.1
- Docker Engine: not running
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- Focused Vitest runs for environment, deployment, tenant, memory, fixture, and trusted project boundaries.
- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `npm run deployment:config`
- `npm run supabase:push:dry-run`
- `npx supabase db push --linked --include-all --yes`
- `npm run supabase:types`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npm run supabase:lint:linked`
- `docker version --format ...`
- Local in-app browser verification at `http://127.0.0.1:5173/`.

### Passed

- Full quality check passed lint, typecheck, 18 Vitest files with 81 tests, production build, and memory-retention validation.
- Runtime configuration tests verify customer values override build values and partial runtime configuration is rejected.
- Deployment tests verify multi-stage container structure, public-only configuration, required files, both commercial topologies, and the live-data production gate.
- Tenant tests verify explicit project membership scope, composite tenant/project integrity, active tenant identity guards, and per-organization manager uniqueness.
- Compose configuration parsed successfully with the deployment example environment.
- Migration dry-run identified only `20260806221500_multi_tenant_integrity_hardening.sql`.
- The migration applied successfully and post-migration linked database lint reported no schema errors.
- Generated types contain required `project_memberships.organization_id` and its tenant foreign keys.
- Updated `admin-project-cycles` deployed successfully with internal bearer-token validation.
- The Turkish sign-in UI rendered at the local Vite URL with no browser warnings/errors and no horizontal overflow.

### Failed

- The first focused test rejected a service-role placeholder in the frontend `.env.example`; it was removed.
- The first lint run required an explicit browser-global declaration in copied `public/app-config.js`; it was added.
- The first sandboxed Supabase dry-run could not write user-profile telemetry; the narrowly elevated retry passed.
- Docker Engine connection failed because Docker Desktop was not running. Remote Supabase operations still completed with a non-fatal catalog-cache warning.
- PowerShell background start first hit the known duplicate `Path`/`PATH` environment issue; a detached process with a normalized environment started the server successfully.

### Skipped

- Docker image build and container health verification were skipped because Docker Engine was not running.
- Local Supabase reset and executable database tenant tests were skipped for the same reason.
- Real invitation delivery remains deferred until an email provider and approved mailbox are available.

### Security checks

- Verified frontend and Compose runtime sources contain no service-role, database, or encryption secret.
- Verified runtime configuration does not mix customer and build-time Supabase values.
- Verified database tenant guards cover identity-bearing project, hierarchy, and assignment relations.
- Verified all affected public tables remain RLS-enabled and trusted writes stay behind Edge Functions/service-role functions.
- Verified no evaluation content or evaluator-to-response linkage was introduced.

### Remaining risks

- Container runtime behavior and local database triggers still need executable Docker-backed verification.
- Production bootstrap, backup/restore automation, release publishing, and customer acceptance automation are incomplete.
- Sensitive evaluation submission, anonymous credentials, encryption, and reporting remain unimplemented production blockers.

## 2026-07-22 - Delegated Project Date Administration

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`
- Deployed Edge Function: `admin-project-cycles`, version `6`, `ACTIVE`, `verify_jwt=false`

### Commands executed

- `npm run check`
- `npm test -- --run src/features/administration/ProjectCycleManagementPanel.test.tsx tests/admin-project-cycle-function.test.mjs`
- `npm test -- --run src/features/administration/AdministrationPage.test.tsx`
- `npx supabase db push --linked --include-all --dry-run`
- `npx supabase db push --linked --include-all --yes`
- `npx supabase db lint --linked`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npx supabase functions list`
- `npm run smoke:project-dates`
- Authenticated browser verification at the default desktop viewport and a 390-pixel mobile viewport.

### Passed

- Final application checks passed lint, typecheck, 15 Vitest files with 68 tests, and production build.
- Initial dry-run showed only `20260722234500_delegated_project_date_administration.sql`; final dry-run reports the remote database is up to date.
- Linked database lint reports no schema errors.
- `admin-project-cycles` deployed as `ACTIVE`, version `6`, with internal bearer-token validation.
- The project manager updated an assigned project's evaluation close date and the system administrator restored the original value.
- The employee date update returned HTTP 403 with `ADMINISTRATION_SCOPE_DENIED`.
- The unauthenticated project request returned HTTP 401 with `AUTHENTICATION_REQUIRED`.
- Component tests verify system-administrator controls and project-manager date-only controls.
- Boundary tests verify service-role-only RPC execution, exact assigned-manager plus matching project-role checks, editable cycle rules, and safe auditing.
- Desktop and 390-pixel mobile browser verification found no horizontal overflow, no browser warnings/errors, and a usable single-column mobile date form.

### Failed

- Initial component/page tests used page-global selectors for repeated date labels and project headings; selectors were scoped to their semantic form/region.
- The first full check found smoke-script lint errors for an unused initial assignment and a throwing `finally`; restoration and error propagation were separated.
- The first live assertion compared equivalent `Z` and `+00:00` timestamp strings literally; it was corrected to compare epoch instants. The script restored the original date before failing.
- The first sandboxed linked lint could not write Supabase telemetry under the user profile; the same command passed with the required narrow filesystem permission.
- Migration/function deployment repeated the known warning that Docker Desktop was not running in the current shell; remote deployment still completed.

### Skipped

- Real invitation delivery and acceptance remain deferred because no approved mailbox/provider decision is available.
- Local Supabase reset remains skipped because the Docker Desktop engine is not running in this shell.
- Closed/archived live cycle mutation was not attempted against retained synthetic data; database and source-level tests cover that rejection.

### Security checks

- Verified delegated authorization requires both exact project-manager ownership and an active matching project scope.
- Verified organization/platform system administrators can restore configuration.
- Verified employee and unauthenticated denial.
- Verified project and evaluation-cycle dates update atomically through a service-role-only RPC.
- Verified browser code contains no service-role key and has no direct project-table mutation.
- Verified no evaluation content, evaluator-response linkage, anonymous credential, or encryption material was introduced.

### Remaining risks

- Employee assignment access and scoped evaluation authorization are not implemented.
- Versioned templates, sensitive evaluation submission, anonymous credentials, encryption, thresholded reporting, and self-access prevention runtimes remain unimplemented.

## 2026-07-22 - Existing-User Role And Hierarchy Administration

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`
- Deployed Edge Function: `organization-administration`, version `2`, `ACTIVE`, `verify_jwt=false`

### Commands executed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `npx vitest run src/features/administration/RoleHierarchyManagementPanel.test.tsx tests/organization-administration-function.test.mjs`
- `npx supabase db push --dry-run`
- `npx supabase db push --linked --include-all --yes`
- `npx supabase db lint --linked`
- `npx supabase gen types typescript --linked`
- `npx supabase functions deploy organization-administration --no-verify-jwt`
- `npx supabase functions list --project-ref daxaymcmtbmummrxdyjy`
- `npm run smoke:hierarchy`
- Authenticated local browser verification at 1440-pixel and 390-pixel viewport widths.

### Passed

- Final application checks passed lint, typecheck, 15 Vitest files with 66 tests, and production build.
- Initial migration dry-run showed only `20260722210000_hierarchy_administration_foundation.sql`.
- The foundation and follow-up hierarchy-integrity migrations applied successfully; final dry-run reports the remote database is up to date.
- Linked database lint reports no schema errors.
- Generated TypeScript types contain all four administration mutation functions and actor-scope validation helper.
- `organization-administration` deployed as `ACTIVE`, version `2`, with CORS-compatible internal bearer-token validation.
- System-admin live listing returned one organization and six active members.
- Temporary unit create/archive and temporary `BOARD_REVIEWER` assign/end paths succeeded.
- Idempotent existing-user hierarchy update succeeded without changing the effective reporting relationship.
- A manager-cycle attempt returned HTTP 400 with `MANAGER_ASSIGNMENT_CYCLE` and rolled back.
- An employee request returned HTTP 403 with `ADMINISTRATION_SCOPE_DENIED`.
- An unauthenticated request returned HTTP 401 with `AUTHENTICATION_REQUIRED`.
- Desktop and mobile browser verification showed the role/hierarchy panel with no horizontal overflow and no browser console errors.
- Boundary tests verify browser code uses only `organization-administration`, RPC execute grants are service-role-only, and no evaluation content fields were introduced.

### Failed

- The first final combined check found one unused smoke-script response assignment; the assignment was removed and the complete check passed.
- The first panel test used a global label query for two deliberately separate `Çalışan` selectors; it was corrected to scope each query to its form.
- The first sandboxed Supabase type-generation and linked-lint commands could not write the CLI telemetry file outside the workspace. They were rerun with the required filesystem permission and passed.
- Remote migration and function deployment succeeded but repeated the known warning that the Docker Desktop engine was not running for local catalog inspection.

### Skipped

- Real invitation delivery and acceptance remain deferred because no approved mailbox/provider decision is available.
- Local Supabase database reset/lint remains skipped because the Docker Desktop engine is not running in this shell.
- Destructive final-administrator removal was not attempted live; static, database-function, and transaction-path coverage protect that rule without risking the synthetic admin account.

### Security checks

- Verified platform or matching-organization system-admin authorization in both Edge Function and database functions.
- Verified manager cycles and cross-context role or membership mutations are rejected.
- Verified unit archival is blocked while active dependent identity records exist.
- Verified project-manager roles cannot be modified through the general hierarchy boundary.
- Verified the browser contains no service-role key and performs no direct administrative table query.
- Verified no score, comment, lessons learned, submission payload, anonymous credential, or encryption material was added.

### Remaining risks

- Delegated project-manager date updates and employee assignment access are not implemented.
- Sensitive evaluation submission, anonymous credential, encryption, thresholded reporting, and self-access prevention runtimes remain unimplemented.

## 2026-07-20 - Supabase Auth-Backed Invitation Onboarding

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`
- Deployed Edge Functions: `user-onboarding`, version `3`; `admin-project-cycles`, version `5`

### Commands executed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --linked --include-all --yes`
- `npx supabase migration list`
- `npx supabase gen types typescript --linked`
- `npx supabase functions deploy user-onboarding --no-verify-jwt`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npx supabase functions list --project-ref daxaymcmtbmummrxdyjy`
- Authenticated and negative live HTTP smoke tests for `user-onboarding`.
- `git diff --check`

### Passed

- Final `npm run check` passed lint, typecheck, Vitest with 13 test files and 59 tests, and production build.
- Migration dry-runs showed only `20260720232000_user_invitation_acceptance_flow.sql` and then only follow-up `20260720234500_invitation_acceptance_context_revalidation.sql` before their respective deployments.
- Linked database lint found no schema errors before and after migration deployment.
- Both invitation migrations applied to the linked project and appear in local and remote migration history.
- Post-deployment dry-run reported the remote database is up to date.
- Generated TypeScript database types include invitation context columns and `accept_user_invitation()`.
- `user-onboarding` deployed as `ACTIVE`, version `3`, and `admin-project-cycles` deployed as `ACTIVE`, version `5`, with browser-compatible CORS preflight headers.
- Authenticated system-admin listing returned one manageable organization, three active units, six active organization members, and no existing invitations.
- A synthetic employee administration request returned HTTP 403 with `ADMINISTRATION_SCOPE_DENIED`.
- An unauthenticated request returned HTTP 401 with `AUTHENTICATION_REQUIRED`.
- An authenticated system-admin revocation request for a nonexistent invitation returned HTTP 400 with `INVITATION_NOT_FOUND` without changing persisted data.
- Authenticated browser verification loaded the invitation form, one organization, three units, six manager candidates, the existing project, five project members, and 12 assignment summaries.
- Desktop and 390-pixel mobile viewport checks found no horizontal document overflow or out-of-bounds elements.
- Component tests cover invitation creation, revocation, system-admin visibility, and invited-profile acceptance.
- Boundary tests verify no browser service directly queries `user_invitations` and no raw custom invitation token is returned.

### Failed

- The first new component test read the form before asynchronous option loading completed; it was changed to await the labeled control.
- The first migration content test treated SQL `comment on` metadata as a sensitive comment column; it was narrowed to actual `add column` declarations.
- The first remote dry-run attempt received a transient Supabase login-role HTTP 503 connection timeout; the retry succeeded.
- Both migration deployments succeeded but emitted the known Docker migration-catalog cache warning.
- Function deployment succeeded but emitted `WARNING: Docker is not running`.
- The first authenticated browser check exposed missing CORS permission for the Supabase SDK `apikey` header; both administration functions were corrected, redeployed, and reverified.

### Skipped

- Real invitation email delivery was not tested because no approved test mailbox was provided and arbitrary/invalid-address delivery should not be triggered.
- Invited-user link handling and final acceptance were not live-tested for the same reason.
- A reusable Playwright end-to-end suite remains unimplemented; this change received a targeted authenticated browser smoke test instead.

### Manual tests

- Verified the administration service uses only the `user-onboarding` Edge Function boundary.
- Verified the profile service uses the same boundary for invitation acceptance.
- Verified generated database types contain the new migration shape.

### Security checks

- Verified invitation management requires system-admin scope and active profile state.
- Verified acceptance binds the exact Auth user id and normalized email.
- Verified acceptance rechecks expiration, terminal state, active organization/unit, and optional active manager.
- Verified `accept_user_invitation()` execute permission is granted only to `service_role`.
- Verified activation writes profile, role, unit membership, manager relationship, invitation state, and safe audit metadata atomically.
- Verified no evaluation content, service-role credential, access token, raw invitation secret, score, comment, or submission payload was added.

### Remaining risks

- SMTP delivery and invited-user acceptance require an approved mailbox smoke test.
- Existing-user role edits and general hierarchy administration remain incomplete.
- Sensitive evaluation submission, anonymous credentials, encryption, and reporting remain unimplemented.

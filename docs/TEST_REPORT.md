# Test Report

## 2026-07-19 - Admin Project Cycle Edge Function Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run check`
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- Unauthenticated live function smoke test with `Invoke-WebRequest`
- `npx supabase functions list`

### Passed

- Final `npm test` passed with 11 test files and 46 tests.
- `npm run typecheck` passed.
- Final `npm run lint` passed after adjusting the form effect and ESLint function-file override.
- `npm run check` passed lint, typecheck, Vitest with 11 test files and 46 tests, and production build.
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt` deployed the function to project `daxaymcmtbmummrxdyjy`.
- Unauthenticated live smoke test returned `401` with `AUTHENTICATION_REQUIRED`.
- `npx supabase functions list` showed `admin-project-cycles` as `ACTIVE` with `verify_jwt` set to `false`.

### Failed

- Initial `npm test` failed because the word `Projeler` appears in both the project list and workflow section; the assertion was narrowed.
- Initial `npm run lint` failed because the project form updated state synchronously in an effect and because Supabase function files were not in the frontend TypeScript project; both were fixed.
- `npx supabase functions deploy admin-project-cycles --no-verify-jwt` completed successfully but emitted `WARNING: Docker is not running`.

### Skipped

- Authenticated live smoke testing was skipped because current synthetic admin credentials were not available in this shell.
- Playwright end-to-end tests skipped because Playwright is not installed and authenticated browser workflow coverage has not been added yet.

### Manual tests

- Verified the browser project/cycle service source invokes `admin-project-cycles`.
- Verified the browser project/cycle service source does not query `projects` or `evaluation_cycles` directly.

### Security checks

- Verified the Edge Function reads `SUPABASE_SERVICE_ROLE_KEY` only in server-side function code.
- Verified the Edge Function calls `auth.getUser()`, checks active profile state, and recomputes role scope from `user_role_assignments`.
- Verified project/cycle creation requires `SYSTEM_ADMIN` scope.

### Remaining risks

- The Edge Function still needs authenticated live smoke testing.
- The initial create flow supports system-admin project/cycle creation; delegated project-manager date update actions are still future work.
- Evaluation assignments, anonymous credentials, encrypted submissions, and reporting remain unimplemented.

## 2026-07-19 - Administration And Project Cycle Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `node --check scripts/create-demo-fixture.mjs`
- `npx supabase db push --dry-run`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npm run check`

### Passed

- Final `npm test` passed with 9 test files and 42 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `node --check scripts/create-demo-fixture.mjs` passed.
- Initial `npx supabase db push --dry-run` showed only `20260719184052_project_evaluation_cycle_foundation.sql` would be applied.
- `npx supabase db push --yes` applied `20260719184052_project_evaluation_cycle_foundation.sql` to the linked remote project.
- Linked Supabase database types were regenerated and include `projects`, `project_memberships`, and `evaluation_cycles`.
- `npx supabase migration list` showed local and remote timestamps `20260719132911`, `20260719171413`, `20260719174459`, `20260719181013`, and `20260719184052`.
- Final `npx supabase db push --dry-run` reported the remote database is up to date.
- `npx supabase db lint --linked` found no schema errors after applying the migration.
- `npm run check` passed lint, typecheck, Vitest with 9 test files and 42 tests, and production build.

### Failed

- The first `npm test` run failed because `Proje bitiş tarihi` intentionally appears in both a workflow list and date policy field; the test was updated to allow multiple matches.
- `npx supabase db push --yes` applied the migration successfully but emitted the known Docker migration-catalog cache warning.

### Skipped

- Local `supabase db reset` and local DB lint were skipped because the local Supabase Docker stack remains unverified in this shell.
- Playwright end-to-end tests skipped because Playwright is not installed and production administration write flows are not implemented yet.
- `npm run fixture:demo` was not rerun after this migration because it rotates synthetic passwords and should be run only when the tester is ready to receive fresh credentials.

### Manual tests

- Verified generated `src/types/supabase.ts` contains the new project and evaluation-cycle tables.
- Verified Supabase remote migration list contains all local migration timestamps.

### Security checks

- Verified RLS is enabled on `projects`, `project_memberships`, and `evaluation_cycles`.
- Verified no client-facing policies were added to the project/evaluation-cycle configuration tables.
- Verified evaluation cycles are time-bound with `opens_at`, `closes_at`, and `closes_at > opens_at`.
- Verified no fixed participant-count opening rule was added.
- Verified no evaluator-linked submission content, score, comment, plaintext, service-role credential, or encryption key was added.

### Remaining risks

- The administration shell is not a sensitive authorization boundary.
- Production administration writes still require trusted Edge Functions and scoped RLS policies.
- Evaluation assignments, anonymous credentials, encrypted submissions, and reporting remain unimplemented.

## 2026-07-19 - Authenticated Workspace Context Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `npm run check`

### Passed

- Final `npm test` passed with 8 test files and 33 tests.
- `npm run lint` passed.
- `npm run typecheck` passed after regenerating Supabase database types.
- Initial `npx supabase db push --dry-run` showed only `20260719181013_workspace_context_rpc.sql` would be applied.
- `npx supabase db lint --linked` found no schema errors before and after applying the migration.
- `npx supabase db push --yes` applied `20260719181013_workspace_context_rpc.sql` to the linked remote project.
- Linked Supabase database types were regenerated and include `get_my_workspace_context`.
- `npx supabase migration list` showed local and remote timestamps `20260719132911`, `20260719171413`, `20260719174459`, and `20260719181013`.
- Final `npx supabase db push --dry-run` reported the remote database is up to date.
- `npm run check` passed lint, typecheck, Vitest with 8 test files and 33 tests, and production build.

### Failed

- The first `npm test` run failed because a component assertion expected exact `Product Team` text while the rendered section also included adjacent role and manager text; the assertion was narrowed before the final passing run.
- `npx supabase db push --yes` applied the migration successfully but emitted the known Docker migration-catalog cache warning.

### Skipped

- Local `supabase db reset` and local DB lint were skipped because the local Supabase Docker stack remains unverified in this shell.
- Playwright end-to-end tests skipped because Playwright is not installed and full invitation redemption/browser workflow coverage has not been added yet.

### Manual tests

- Verified generated `src/types/supabase.ts` contains `get_my_workspace_context`.
- Verified Supabase remote migration list contains all local migration timestamps.
- The user confirmed that a synthetic fixture account could sign in before this workspace-context phase.

### Security checks

- Verified the workspace context RPC is `security definer`, has `set search_path = public`, filters profile, roles, memberships, and manager relationships by `auth.uid()`, and grants execute only to authenticated users.
- Verified the RPC migration does not introduce score, comment, submission, evaluator, or plaintext evaluation-content fields.
- Verified frontend tests inject the workspace context service and do not call the network.

### Remaining risks

- Administration screens and sensitive management actions are not implemented yet.
- Project completion dates and evaluation close dates are documented but not implemented in schema or UI yet.
- Sensitive evaluation workflows, anonymous credentials, encrypted submissions, and reporting remain unimplemented.

## 2026-07-19 - Organization Hierarchy And Demo Fixture Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

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

### Passed

- `npm test` passed with 7 test files and 29 tests.
- `npm run lint` passed.
- `npm run typecheck` passed.
- Initial `npx supabase db push --dry-run` showed only `20260719174459_organization_hierarchy_foundation.sql` would be applied.
- `npx supabase db lint --linked` found no schema errors before and after applying the migration.
- `npx supabase db push --yes` applied `20260719174459_organization_hierarchy_foundation.sql` to the linked remote project.
- Linked Supabase database types were regenerated and include organization hierarchy tables.
- `npx supabase migration list` showed local and remote timestamps `20260719132911`, `20260719171413`, and `20260719174459`.
- Final `npx supabase db push --dry-run` reported the remote database is up to date.
- `node --check scripts/create-demo-fixture.mjs` passed.
- `npm run check` passed lint, typecheck, Vitest with 7 test files and 29 tests, and production build.

### Failed

- `npx supabase db push --yes` applied the migration successfully but emitted the known Docker migration-catalog cache warning.

### Skipped

- `npm run fixture:demo` was not run because no `SUPABASE_SERVICE_ROLE_KEY` was provided in the local environment.
- Local `supabase db reset` and local DB lint were skipped because the local Supabase Docker stack remains unverified in this shell.
- Playwright end-to-end tests skipped because Playwright is not installed and full invitation redemption/login fixture flow has not been run yet.

### Manual tests

- Verified generated `src/types/supabase.ts` contains `organizations`, `organization_units`, `organization_unit_memberships`, and `manager_assignments`.
- Verified Supabase remote migration list contains all local migration timestamps.

### Security checks

- Verified RLS is enabled on organization hierarchy tables.
- Verified no client-facing policies were added to organization hierarchy tables.
- Verified fixture script reads `SUPABASE_SERVICE_ROLE_KEY` only from local environment variables.
- Verified `.env.example` does not contain service-role configuration.
- Verified fixture passwords are generated at runtime and not stored in source.
- Verified no evaluator-linked submission content columns were introduced.

### Remaining risks

- Synthetic test users are not created yet.
- The fixture script requires a service-role key and must be run only in a safe local/server-side context.
- Administrative hierarchy UI and Edge Functions are not implemented yet.
- Sensitive evaluation workflows, anonymous credentials, encrypted submissions, and reporting remain unimplemented.

## 2026-07-19 - User Profile And Invitation Onboarding Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm test`
- `npm run typecheck`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `npm run check`

### Passed

- `npm test` passed with 6 test files and 21 tests.
- `npm run typecheck` passed after regenerating Supabase database types.
- Initial `npx supabase db push --dry-run` showed only `20260719171413_user_profile_invitation_foundation.sql` would be applied.
- `npx supabase db lint --linked` found no schema errors before and after applying the migration.
- `npx supabase db push --yes` applied `20260719171413_user_profile_invitation_foundation.sql` to the linked remote project.
- Linked Supabase database types were regenerated and include `user_profiles` and `user_invitations`.
- `npx supabase migration list` showed both local migrations applied remotely.
- Final `npx supabase db push --dry-run` reported the remote database is up to date.
- `npm run check` passed lint, typecheck, Vitest, and production build.

### Failed

- The first `npm test` run failed because a test stub had a missing closing parenthesis and a SQL policy regex was too broad; both were fixed before the final passing run.
- `npx supabase db push --yes` applied the migration successfully but emitted a Docker migration-catalog cache warning.

### Skipped

- Local `supabase db reset` and local DB lint were skipped because the local Supabase Docker stack remains unverified in this shell.
- Playwright end-to-end tests skipped because Playwright is not installed and invitation redemption is not implemented yet.

### Manual tests

- Verified generated `src/types/supabase.ts` contains `user_profiles`, `user_invitations`, `onboarding_status`, and `token_hash`.
- Verified Supabase remote migration list contains local and remote timestamps `20260719132911` and `20260719171413`.

### Security checks

- Verified RLS is enabled on all public tables created by migrations.
- Verified `user_profiles` exposes only authenticated own-profile select access.
- Verified `user_invitations` has RLS and no client-facing policy.
- Verified invitation records use `token_hash` and do not add raw token columns.
- Verified no evaluator-linked submission content columns were introduced.

### Remaining risks

- Invitation creation, invitation redemption, profile activation, and role assignment still require trusted Edge Functions.
- UI auth/profile gates are not sensitive authorization boundaries.
- Sensitive evaluation workflows, anonymous credentials, encrypted submissions, and reporting remain unimplemented.

## 2026-07-19 - Supabase Auth Typed Client Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Supabase JS: installed from npm as `@supabase/supabase-js`
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm install @supabase/supabase-js`
- `npx supabase gen types typescript --linked`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `npm run supabase:lint:linked`
- `npm run supabase:migrations`
- `npm run supabase:push:dry-run`
- Docker binary check at `C:\Program Files\Docker\Docker\resources\bin\docker.exe`

### Passed

- `@supabase/supabase-js` installed with npm audit reporting 0 vulnerabilities.
- Linked Supabase database types were generated.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed with 5 test files and 15 tests.
- `npm run build` passed.
- `npm run check` passed.
- `npm run supabase:lint:linked` found no schema errors.
- `npm run supabase:migrations` showed local and remote migration `20260719132911`.
- `npm run supabase:push:dry-run` reported the remote database is up to date.

### Failed

- Initial `npm install @supabase/supabase-js` failed inside the sandbox with an `EACCES` registry/cache error; rerun with approved escalation succeeded.
- Initial linked type generation inside the sandbox hit Supabase telemetry write permission issues; rerun with approved escalation produced a clean generated file.
- Initial typecheck failed after splitting auth context because `SignInCredentials` import was missing; fixed.
- Initial auth page tests failed because DOM cleanup was not configured; fixed in `vitest.setup.ts`.

### Skipped

- Local `supabase db reset` and local DB lint were skipped because Docker is installed but not available on PATH in this shell, and Docker config access emitted a user-profile permission warning.
- Playwright end-to-end tests skipped because Playwright is not installed and auth flows are not yet covered by browser automation.

### Manual tests

- Verified Docker binary exists at the default Docker Desktop path.
- Verified linked Supabase remote state through migration list and dry-run.

### Security checks

- Verified auth UI tests do not call the network.
- Verified browser client uses only public Supabase URL and anon key values.
- Verified no service-role key, database URL, encryption key, evaluation content, or anonymous credential value was added.

### Remaining risks

- UI auth gate is not a sensitive authorization boundary.
- Invitation onboarding, Microsoft Entra ID, scoped RLS policies, Edge Functions, encrypted submission flow, and anonymous credential flow remain unimplemented.

## 2026-07-19 - Supabase And GitHub Project Connection

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm install -D supabase`
- `npx supabase init`
- `npx supabase link --project-ref daxaymcmtbmummrxdyjy`
- `npx supabase db push --dry-run`
- `npx supabase db lint`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase migration list`
- `npm run check`
- `git init`
- `git remote add origin https://github.com/yusuffurkanaksar55/yanki.git`
- `git commit -m "chore: scaffold app and supabase foundation"`
- `git fetch origin main`
- `git merge origin/main --allow-unrelated-histories`
- `git commit -m "chore: merge yanki remote baseline"`
- `git push -u origin main`

### Passed

- Supabase CLI installed with npm audit reporting 0 vulnerabilities.
- Supabase project initialized locally.
- Supabase remote project linked.
- Remote push dry-run showed only `20260719132911_initial_security_foundation.sql`.
- Remote linked lint found no schema errors.
- Remote migration list shows local and remote timestamp `20260719132911`.
- `npm run check` passed with 3 test files and 8 tests.
- Git repository initialized and remote `origin` configured.
- GitHub authentication succeeded through Git Credential Manager.
- Local `main` pushed to `yusuffurkanaksar55/yanki`.

### Failed

- Initial `npm install -D supabase` failed inside the sandbox with an `EACCES` registry/cache error; rerun with approved escalation succeeded.
- `npx supabase db lint` without `--linked` failed because no local Supabase/Postgres stack was running.
- Git metadata writes required escalation in this sandbox.
- Initial GitHub push failed before credentials were available; Git Credential Manager account was used.
- Push was rejected once because remote `main` already contained an initial README commit; resolved with a non-destructive merge.
- Supabase npm scripts attempted to write telemetry under the user profile and required escalation in this sandbox.

### Skipped

- Local `supabase db reset` skipped because Docker/local Supabase stack is not running.
- Local database lint skipped; linked remote lint was used instead.

### Manual tests

- Verified remote migration plan with dry-run before applying.
- Verified remote migration state after applying.

### Security checks

- Added test coverage that RLS is enabled on all foundation tables.
- Added test coverage that no evaluator-linked submission content columns are introduced.
- Verified remote lint reports no schema errors.

### Remaining risks

- No runtime authentication, authorization policies, Edge Functions, anonymous credential flow, encryption flow, or reporting flow exists yet.
- Local Supabase stack requires Docker before local DB reset/lint can run.

## 2026-07-16 - React Vite Application Scaffold

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Frontend: React 19.2.7, Vite 8.1.5, TypeScript 6.0.3, Vitest 4.1.10
- Database: not configured.
- Supabase: not configured.

### Commands executed

- `npm install react react-dom`
- `npm install -D @vitejs/plugin-react vite typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals tailwindcss@3.4.17 postcss autoprefixer @types/react @types/react-dom @types/node`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- Manual health check for `http://127.0.0.1:5173/`
- Follow-up health check for `http://127.0.0.1:5173/`

### Passed

- Dependency install completed with npm audit reporting 0 vulnerabilities.
- `npm run lint` passed.
- `npm run typecheck` passed after fixing `vite.config.ts`.
- `npm test` passed with 2 test files and 5 tests.
- `npm run build` passed and generated production assets under `dist/`.
- `npm run check` passed the full lint, typecheck, test, and build pipeline.
- Dev server responded with HTTP 200 during the start command at `http://127.0.0.1:5173/`.

### Failed

- Initial `npm run typecheck` failed because Vitest config used Vite's `defineConfig`; fixed by importing from `vitest/config`.
- Initial dev-server background start failed because the Windows process environment had duplicate `Path` and `PATH` keys; fixed by normalizing the process environment before `Start-Process`.
- Follow-up dev-server health checks failed after shell command cleanup, so the dev server should be started manually with `npm run dev` when actively testing.

### Skipped

- Supabase database checks skipped because no Supabase project exists yet.
- End-to-end tests skipped because no real authenticated user flow exists yet.

### Manual tests

- Started Vite dev server on `http://127.0.0.1:5173/` during command execution.
- Verified the root URL returned HTTP 200 during startup.
- Verified a later independent health check did not remain connected after shell cleanup.

### Security checks

- Verified no evaluation submission or reporting runtime flow was introduced.
- Verified Turkish UI text is centralized in `src/locales/tr/messages.ts`.
- Existing documentation tests still verify identity separation, encrypted payload storage, thresholded access, and self-access prevention documentation.

### Remaining risks

- No runtime authentication, authorization, RLS, encryption, anonymous credential, or reporting controls exist yet.
- Dev-server verification is local only and not a production deployment.
- Long-lived dev server processes may need to be run manually in an active terminal in this environment.

## 2026-07-16 - Project Memory Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Database: not configured.
- Supabase: not configured.

### Commands executed

- `npm test`
- `npm run check`

### Passed

- `npm test`: 1 suite, 4 tests passed, 0 failed.
- `npm run check`: executed `npm test`; 1 suite, 4 tests passed, 0 failed.

### Failed

None.

### Skipped

- Application linting skipped because the application stack is not installed.
- Type checking skipped because TypeScript is not installed.
- Build skipped because no application exists yet.
- Supabase database checks skipped because no Supabase project exists yet.
- End-to-end tests skipped because no UI exists yet.

### Manual tests

None yet.

### Security checks

- Verified required documentation files exist.
- Verified evaluator identity separation is documented.
- Verified server-side encrypted payload storage is documented.
- Verified thresholded and scoped result access is documented.

### Remaining risks

- No runtime security controls exist yet.
- No RLS policies exist yet.
- No encryption implementation exists yet.
- No anonymous credential implementation exists yet.

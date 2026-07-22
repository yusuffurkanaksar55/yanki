# Error Log

## ERR-20260722-019 - Live smoke test compared equivalent timestamps as text

### Context

The delegated project-date live smoke test updated and restored an existing synthetic project's evaluation close date.

### Symptoms

The update succeeded, but the first assertion rejected the returned value because PostgreSQL serialized UTC with `+00:00` while the request used `Z`.

### Root cause

The smoke script compared timestamp strings rather than instants.

### Correct solution

Compare parsed epoch values and always restore the original date before propagating a smoke-test failure.

### Prevention

Normalize or parse database timestamps in integration assertions when multiple valid ISO 8601 encodings are possible.

### Related files

- `scripts/smoke-project-date-administration.mjs`

### Related tests

- `npm run smoke:project-dates`

## ERR-20260722-018 - Project administration tests used page-global repeated selectors

### Context

The project date form introduced labels and headings that legitimately repeat elsewhere in the administration page.

### Symptoms

The first targeted test matched both project-completion fields, and the first full-page test matched both `Projects` headings.

### Root cause

Queries were not scoped to the project-creation form or project-management region.

### Correct solution

Resolve the semantic form/region first and query its controls or headings with `within(...)`.

### Prevention

Scope tests whenever independent workflows share domain-appropriate labels or headings.

### Related files

- `src/features/administration/ProjectCycleManagementPanel.test.tsx`
- `src/features/administration/AdministrationPage.test.tsx`

### Related tests

- `npm run check`

## ERR-20260722-017 - Smoke restoration used a throwing finally block

### Context

The reusable project-date smoke script must restore the original synthetic project date even when an assertion fails.

### Symptoms

ESLint reported `no-unsafe-finally` and `no-useless-assignment` during the first combined check.

### Root cause

The initial restoration implementation could throw from `finally` and initialized a state variable whose first value could never be observed.

### Correct solution

Capture the test failure, restore and validate the original state outside `finally`, then rethrow the captured failure.

### Prevention

Keep test cleanup unconditional without throwing from `finally`; separate cleanup verification from primary failure propagation.

### Related files

- `scripts/smoke-project-date-administration.mjs`

### Related tests

- `npm run check`

## ERR-20260722-016 - Hierarchy smoke script retained an unused response assignment

### Context

The final combined application check linted the reusable hierarchy smoke script.

### Symptoms

ESLint reported `no-useless-assignment` for the idempotent hierarchy-update response.

### Root cause

The call was intentionally checked for success, but its refreshed data was not needed until a later independent mutation.

### Correct solution

Await the function call without assigning its response.

### Prevention

Keep smoke-script responses only when a subsequent assertion or mutation consumes them.

### Related files

- `scripts/smoke-hierarchy-administration.mjs`

### Related tests

- `npm run check`

## ERR-20260722-014 - Supabase CLI telemetry write failed inside the workspace sandbox

### Context

Generated database types and linked database lint were run after deploying the organization-administration migration.

### Symptoms

The CLI completed remote work but then returned `EPERM` while writing a telemetry temporary file under the user profile. Shell redirection also left `src/types/supabase.ts` empty after the failed generation attempt.

### Root cause

The workspace sandbox allowed repository writes but not Supabase CLI telemetry writes under `C:\Users\Yusuf_Furkan\.supabase`.

### Incorrect approach

Running a command with output redirection before accounting for the CLI's additional profile-directory write requirement.

### Correct solution

Rerun type generation and linked lint with the narrowly required filesystem permission. The generated file was restored from the live schema and linked lint returned no errors.

### Prevention

Check generated-file size immediately after redirected CLI commands and use the approved Supabase command permission when the CLI must update its own profile metadata.

### Related files

- `src/types/supabase.ts`

### Related tests

- `npm run supabase:types`
- `npm run supabase:lint:linked`

## ERR-20260722-015 - Hierarchy component test used an ambiguous global label

### Context

The hierarchy panel intentionally has separate employee selectors for membership/manager context and role assignment.

### Symptoms

Two component tests failed because a global `getByLabelText("Çalışan")` query matched both controls.

### Root cause

The tests ignored the form-level semantic grouping visible in the interface.

### Incorrect approach

Using a page-global label query for a repeated, domain-appropriate field label.

### Correct solution

Scope each query to the form identified by its `Üyelik ve yönetici` or `Rol atamaları` heading.

### Prevention

When labels repeat across independent workflows, locate the semantic region first and query within that region.

### Related files

- `src/features/administration/RoleHierarchyManagementPanel.test.tsx`

### Related tests

- `npx vitest run src/features/administration/RoleHierarchyManagementPanel.test.tsx`

## ERR-20260720-012 - Administration Edge Functions rejected browser CORS preflight

### Context

The invitation and project administration panels were checked in the local application with an authenticated system-administrator session.

### Symptoms

Direct authenticated HTTP smoke tests passed, while both browser panels displayed data-loading errors.

### Root cause

Supabase browser function invocation includes the `apikey` request header, but both Edge Functions omitted `apikey` from `Access-Control-Allow-Headers`.

### Incorrect approach

Treating direct HTTP success as sufficient evidence that the browser integration was usable.

### Correct solution

Add `apikey` to both CORS preflight allowlists, add boundary regression tests, redeploy both Edge Functions, and repeat the authenticated browser smoke test.

### Prevention

Keep CORS allowlists aligned with Supabase browser SDK headers and include authenticated browser verification for every browser-facing Edge Function.

### Related files

- `supabase/functions/user-onboarding/index.ts`
- `supabase/functions/admin-project-cycles/index.ts`
- `tests/user-onboarding-function.test.mjs`
- `tests/admin-project-cycle-function.test.mjs`

### Related tests

- `npm run check`
- Authenticated local browser smoke test

## ERR-20260720-009 - User onboarding tests used broad synchronous assumptions

### Context

Component and migration safety tests were added for invitation onboarding.

### Symptoms

The component test queried an organization selector while options were still loading, and the migration test matched SQL `comment on` metadata as though it were a sensitive comment column.

### Root cause

The component assertion waited only for the static heading, while the migration regex searched the complete SQL text instead of column declarations.

### Incorrect approach

Using a static heading as proof that asynchronous data loading completed and scanning all SQL prose for a generic word.

### Correct solution

Await the labeled form control and constrain the sensitive-field regex to `add column` declarations.

### Prevention

Wait on the actual asynchronous UI boundary and scope schema assertions to syntactic structures that represent database fields.

### Related files

- `src/features/administration/UserInvitationManagementPanel.test.tsx`
- `tests/user-onboarding-function.test.mjs`

### Related tests

- `npm test`

## ERR-20260720-010 - Supabase migration dry-run received a transient login-role timeout

### Context

The invitation acceptance migration was checked against the linked Supabase project before deployment.

### Symptoms

The first `npx supabase db push --dry-run` returned HTTP 503 with an upstream connection timeout while initializing the login role.

### Root cause

The linked Supabase connection layer temporarily failed before migration planning began.

### Incorrect approach

Treating the connection-layer response as a migration syntax or compatibility failure.

### Correct solution

Retry the same non-mutating dry-run. The retry connected successfully and showed only the expected migration.

### Prevention

Separate transient connection errors from SQL validation results and retry safe read-only planning commands once before escalating.

### Related files

- `supabase/migrations/20260720232000_user_invitation_acceptance_flow.sql`

### Related tests

- `npx supabase db push --dry-run`

## ERR-20260720-011 - Invitation migration catalog cache warning repeated

### Context

The invitation acceptance and acceptance-context revalidation migrations were applied to the linked Supabase project.

### Symptoms

Both migrations applied successfully but the CLI could not cache the migration catalog because the Docker Desktop Linux engine pipe was unavailable.

### Root cause

Remote migration deployment succeeded; the follow-up local Docker image inspection could not run in this shell.

### Incorrect approach

Treating the Docker cache warning as a remote migration failure.

### Correct solution

Verify remote migration history, post-deployment dry-run, and linked database lint independently.

### Prevention

Continue separating remote Supabase state from optional local Docker catalog caching until Docker CLI/API access is verified.

### Related files

- `supabase/migrations/20260720232000_user_invitation_acceptance_flow.sql`
- `supabase/migrations/20260720234500_invitation_acceptance_context_revalidation.sql`

### Related tests

- `npx supabase migration list`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`

## ERR-20260720-007 - In-app browser runtime could not resolve the user profile path

### Context

The local application was started for an authenticated browser smoke test.

### Symptoms

The browser runtime exited with `EPERM` while resolving the local short-form user-profile path under `AppData`.

### Root cause

The browser-control runtime could not read the required user-profile path within the current filesystem permission boundary.

### Incorrect approach

Treating the browser runtime failure as an application startup or authentication failure.

### Correct solution

Keep the Vite application check separate and run the authenticated Supabase Auth and Edge Function smoke test directly against their HTTP APIs.

### Prevention

Use browser automation only after its user-profile path is readable in this environment. Continue to keep API-level authorization smoke checks available independently of visual testing.

### Related files

- `docs/TEST_REPORT.md`

### Related tests

- Authenticated Supabase Auth and `admin-project-cycles` HTTP smoke test

## ERR-20260720-008 - Synthetic credentials predated project fixture records

### Context

The deployed administration function was tested with the synthetic HR administrator credentials supplied by the tester.

### Symptoms

Authentication, active profile, organization membership, and `SYSTEM_ADMIN` role checks succeeded, but `list_project_cycles` returned an empty project list.

### Root cause

The credentials were generated before `scripts/create-demo-fixture.mjs` was extended to create project and evaluation-cycle records.

### Incorrect approach

Assuming that valid current fixture accounts necessarily included records added by later fixture-script versions.

### Correct solution

Inspect the authenticated workspace context, confirm the administrator scope, and create the synthetic smoke project through `admin-project-cycles`. Do not rerun the fixture unexpectedly because it rotates all synthetic passwords.

### Prevention

Record fixture-version expectations with handed-off credentials. Before rerunning a credential-rotating fixture, confirm that the tester is ready to receive new passwords.

### Related files

- `scripts/create-demo-fixture.mjs`
- `docs/TEST_FIXTURES.md`

### Related tests

- Authenticated `get_my_workspace_context()` request
- Authenticated `list_project_cycles` request
- Authenticated `create_project_cycle` request

## ERR-20260720-004 - Assignment metric test matched duplicate count text

### Context

Evaluation assignment planning UI tests were added to verify that administrators can generate project-backed assignment records through the service boundary.

### Symptoms

`npm test` failed because the generated assignment total and pending assignment count both rendered the text `6`.

### Root cause

The assertion used `getByText("6")`, which assumes the generated count appears once even though the UI intentionally shows the same number in more than one assignment metric.

### Incorrect approach

Asserting a globally unique numeric text value for a metric display.

### Correct solution

Assert the expected number of matching metric values with `getAllByText("6")`.

### Prevention

When metric values can repeat, scope the assertion to a labeled metric or assert the expected number of repeated values explicitly.

### Related files

- `src/features/administration/ProjectCycleManagementPanel.test.tsx`

### Related tests

- `npm test`

## ERR-20260720-005 - Assignment migration catalog cache warning repeated

### Context

The evaluation assignment foundation migration was applied to the linked Supabase project.

### Symptoms

`npx supabase db push --yes` applied the migration successfully but emitted `failed to cache migrations catalog` with a Docker Desktop pipe connection error while inspecting the Supabase Edge Runtime image.

### Root cause

The remote migration succeeded, but the Supabase CLI attempted a Docker-backed local catalog cache operation and Docker Desktop was not available through the current shell pipe.

### Incorrect approach

Treating the Docker cache warning as a failed remote migration.

### Correct solution

Verify the remote migration state with `npx supabase migration list`, rerun `npx supabase db push --dry-run`, and run linked lint.

### Prevention

Continue to verify remote migration status separately from local Docker cache warnings. Resolve Docker Desktop CLI/API access before relying on local Supabase reset or local database lint.

### Related files

- `supabase/migrations/20260720223000_evaluation_assignment_foundation.sql`

### Related tests

- `npx supabase db push --yes`
- `npx supabase migration list`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`

## ERR-20260720-006 - Generated Supabase types had PowerShell line ending noise

### Context

Linked Supabase database types were regenerated after applying the evaluation assignment migration.

### Symptoms

`git diff --check` reported trailing whitespace on every changed line in `src/types/supabase.ts`.

### Root cause

The type generation output was piped through PowerShell `Set-Content`, which rewrote the generated file with Windows line ending and encoding noise relative to the repository's existing file style.

### Incorrect approach

Assuming `Set-Content -Encoding utf8` would preserve the repository's existing LF and UTF-8 without BOM format.

### Correct solution

Normalize `src/types/supabase.ts` mechanically to LF and UTF-8 without BOM after generation.

### Prevention

When using PowerShell to capture generated CLI output, run `git diff --check` and normalize generated files before committing.

### Related files

- `src/types/supabase.ts`

### Related tests

- `git diff --check`

## ERR-20260720-001 - Project member test matched select option and list item

### Context

Project member management UI tests were added to verify that administrators can add a project member through the service boundary.

### Symptoms

`npm test` failed because `Demo Member (member@example.com)` appeared both in a user selector `<option>` and in the rendered project member list.

### Root cause

The assertion used a broad `getByText` query against the whole rendered document instead of narrowing the query to the project member list.

### Incorrect approach

Assuming a person label would appear only once after adding a member, even though the same label is intentionally reused in selectors.

### Correct solution

Scope the assertion to the project member list with React Testing Library `within()`.

### Prevention

When UI text appears in both controls and display regions, scope tests to the relevant accessible region or element.

### Related files

- `src/features/administration/ProjectCycleManagementPanel.test.tsx`

### Related tests

- `npm test`

## ERR-20260720-002 - Supabase function redeploy warned Docker is not running

### Context

The updated `admin-project-cycles` Edge Function was redeployed after adding organization member lookup and project member assignment actions.

### Symptoms

`npx supabase functions deploy admin-project-cycles --no-verify-jwt` completed successfully but emitted `WARNING: Docker is not running`.

### Root cause

The Supabase CLI can deploy this remote function path without local Docker, but local Docker-backed function workflows remain unavailable from this shell.

### Incorrect approach

Treating the Docker warning as a failed remote function deployment.

### Correct solution

Verify deployment with `npx supabase functions list` and run a live HTTP smoke test against the deployed function URL.

### Prevention

Continue separating remote deployment status from local Docker availability. Verify Docker Desktop CLI/API access before relying on local function serving or local Supabase stack workflows.

### Related files

- `supabase/functions/admin-project-cycles/index.ts`

### Related tests

- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npx supabase functions list`
- Unauthenticated live function smoke test with `Invoke-WebRequest`

## ERR-20260720-003 - PowerShell smoke test used unsupported SkipHttpErrorCheck parameter

### Context

The deployed Edge Function was smoke-tested from the local PowerShell shell.

### Symptoms

The first `Invoke-WebRequest` smoke command failed because the current PowerShell version does not support `-SkipHttpErrorCheck`.

### Root cause

`-SkipHttpErrorCheck` is available in newer PowerShell versions, but this shell uses a version where the parameter is not defined.

### Incorrect approach

Assuming the local shell supported the newer `Invoke-WebRequest` parameter.

### Correct solution

Use `try/catch` and read the response stream from the caught web exception.

### Prevention

Use PowerShell 5-compatible HTTP smoke-test snippets in this repository environment.

### Related files

- `docs/TEST_REPORT.md`

### Related tests

- Unauthenticated live function smoke test with `Invoke-WebRequest`

## ERR-20260719-013 - Supabase function deploy warned Docker is not running

### Context

The `admin-project-cycles` Edge Function was deployed to the linked Supabase project.

### Symptoms

`npx supabase functions deploy admin-project-cycles --no-verify-jwt` completed successfully but emitted `WARNING: Docker is not running`.

### Root cause

The Supabase CLI can deploy the function without local Docker in this path, but Docker-backed local build and function-serving workflows remain unavailable from this shell.

### Incorrect approach

Treating the Docker warning as a failed remote function deployment.

### Correct solution

Verify deployment with `npx supabase functions list` and run a live HTTP smoke test against the deployed function URL.

### Prevention

Continue separating remote deployment success from local Docker availability. Use Docker only after the local Supabase stack is verified.

### Related files

- `supabase/functions/admin-project-cycles/index.ts`

### Related tests

- `npx supabase functions deploy admin-project-cycles --no-verify-jwt`
- `npx supabase functions list`
- Unauthenticated live function smoke test with `Invoke-WebRequest`

## ERR-20260719-012 - Supabase migration catalog cache warning repeated for project cycle migration

### Context

The project and evaluation-cycle foundation migration was applied to the linked Supabase project.

### Symptoms

`npx supabase db push --yes` applied the migration successfully but again emitted `failed to cache migrations catalog` with a Docker Desktop API 500 response while inspecting the Supabase Edge Runtime image.

### Root cause

The remote migration succeeded, but the Supabase CLI attempted a Docker-backed local catalog cache operation and Docker Desktop did not satisfy that image-inspection request from this shell.

### Incorrect approach

Treating the Docker cache warning as a remote migration failure.

### Correct solution

Verify the remote migration state with `npx supabase migration list`, rerun `npx supabase db push --dry-run`, and run linked lint.

### Prevention

Continue to verify remote migration status separately from local Docker cache warnings. Resolve Docker Desktop CLI/API access before relying on local Supabase reset or local database lint.

### Related files

- `supabase/migrations/20260719184052_project_evaluation_cycle_foundation.sql`

### Related tests

- `npx supabase db push --yes`
- `npx supabase migration list`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`

## ERR-20260719-011 - Supabase migration catalog cache warning repeated for workspace context RPC

### Context

The authenticated workspace context RPC migration was applied to the linked Supabase project.

### Symptoms

`npx supabase db push --yes` applied the migration successfully but again emitted `failed to cache migrations catalog` with a Docker Desktop API 500 response while inspecting the Supabase Edge Runtime image.

### Root cause

The remote migration succeeded, but the Supabase CLI attempted a Docker-backed local catalog cache operation and Docker Desktop did not satisfy that image-inspection request from this shell.

### Incorrect approach

Treating the Docker cache warning as a remote migration failure.

### Correct solution

Verify the remote migration state with `npx supabase migration list`, rerun `npx supabase db push --dry-run`, and run linked lint.

### Prevention

Continue to verify remote migration status separately from local Docker cache warnings. Resolve Docker Desktop CLI/API access before relying on local Supabase reset or local database lint.

### Related files

- `supabase/migrations/20260719181013_workspace_context_rpc.sql`

### Related tests

- `npx supabase db push --yes`
- `npx supabase migration list`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`

## ERR-20260719-010 - Supabase migration catalog cache warning repeated for organization migration

### Context

The organization hierarchy foundation migration was applied to the linked Supabase project.

### Symptoms

`npx supabase db push --yes` applied the migration successfully but again emitted `failed to cache migrations catalog` with a Docker Desktop API 500 response while inspecting the Supabase Edge Runtime image.

### Root cause

The remote migration succeeded, but the Supabase CLI attempted a Docker-backed local catalog cache operation and Docker Desktop did not satisfy that image-inspection request from this shell.

### Incorrect approach

Treating the Docker cache warning as a remote migration failure.

### Correct solution

Verify the remote migration state with `npx supabase migration list`, rerun `npx supabase db push --dry-run`, and run linked lint.

### Prevention

Continue to verify remote migration status separately from local Docker cache warnings. Resolve Docker Desktop CLI/API access before relying on local Supabase reset or local database lint.

### Related files

- `supabase/migrations/20260719174459_organization_hierarchy_foundation.sql`

### Related tests

- `npx supabase db push --yes`
- `npx supabase migration list`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`

## ERR-20260719-009 - Supabase migration catalog cache warning with Docker API

### Context

The profile/invitation onboarding migration was applied to the linked Supabase project.

### Symptoms

`npx supabase db push --yes` applied the migration successfully but emitted `failed to cache migrations catalog` with a Docker Desktop API 500 response while inspecting the Supabase Edge Runtime image.

### Root cause

The remote migration succeeded, but the Supabase CLI attempted a Docker-backed local catalog cache operation and Docker Desktop did not satisfy that image-inspection request from this shell.

### Incorrect approach

Treating the Docker cache warning as a remote migration failure.

### Correct solution

Verify the remote migration state with `npx supabase migration list`, rerun `npx supabase db push --dry-run`, and run linked lint.

### Prevention

Continue to verify remote migration status separately from local Docker cache warnings. Resolve Docker Desktop CLI/API access before relying on local Supabase reset or local database lint.

### Related files

- `supabase/migrations/20260719171413_user_profile_invitation_foundation.sql`

### Related tests

- `npx supabase db push --yes`
- `npx supabase migration list`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`

## ERR-20260719-006 - Supabase JS install failed inside sandbox

### Context

`@supabase/supabase-js` was added for the typed browser Auth client foundation.

### Symptoms

`npm install @supabase/supabase-js` failed with an `EACCES` fetch/cache error.

### Root cause

The sandboxed command could not complete npm registry/cache access.

### Incorrect approach

Assuming dependency installation would succeed inside the restricted sandbox.

### Correct solution

Rerun the install command with approved escalation.

### Prevention

When npm registry access fails with sandbox-like network/cache errors, rerun with explicit escalation and record the result.

### Related files

- `package.json`
- `package-lock.json`

### Related tests

- `npm run check`

## ERR-20260719-007 - Generated Supabase types were attempted without telemetry write permission

### Context

Linked Supabase database types were generated with `npx supabase gen types typescript --linked`.

### Symptoms

The first sandboxed command emitted Supabase telemetry write errors for `C:\Users\Yusuf_Furkan\.supabase\telemetry.json.tmp...`.

### Root cause

The Supabase CLI writes telemetry/cache files under the user profile, which the sandbox cannot write.

### Incorrect approach

Capturing generated CLI output inside the sandbox without first accounting for telemetry write failures.

### Correct solution

Rerun type generation with approved escalation and overwrite `src/types/supabase.ts` with clean CLI output.

### Prevention

Run Supabase CLI generation commands with approved escalation in this environment, or run them from a normal terminal.

### Related files

- `src/types/supabase.ts`

### Related tests

- `npm run typecheck`
- `npm test`

## ERR-20260719-008 - Auth tests retained DOM between cases

### Context

React Testing Library tests were added for the authentication page.

### Symptoms

Tests found multiple inputs with the same label after prior test renders remained in the document.

### Root cause

Automatic cleanup was not configured for Vitest.

### Incorrect approach

Assuming React Testing Library cleanup was automatic in the current Vitest setup.

### Correct solution

Add `afterEach(cleanup)` in `vitest.setup.ts`.

### Prevention

Keep cleanup in the global Vitest setup file and prefer isolated render helpers in component tests.

### Related files

- `vitest.setup.ts`
- `src/features/authentication/AuthPage.test.tsx`

### Related tests

- `npm test`

## ERR-20260719-001 - Supabase CLI install failed inside sandbox

### Context

Supabase CLI was added as a development dependency.

### Symptoms

`npm install -D supabase` failed with an `EACCES` fetch/cache error.

### Root cause

The sandboxed command could not complete npm registry/cache access.

### Incorrect approach

Assuming dependency installation would succeed inside the restricted sandbox.

### Correct solution

Rerun the same install command with approved escalation.

### Prevention

When npm registry access fails with sandbox-like network/cache errors, rerun with explicit escalation and record the result.

### Related files

- `package.json`
- `package-lock.json`

### Related tests

- `npm run check`

## ERR-20260719-002 - Local Supabase lint failed without local database

### Context

Supabase schema lint was run after creating the initial migration.

### Symptoms

`npx supabase db lint` failed with `failed to connect to postgres` while connecting to the local database.

### Root cause

The local Supabase/Postgres stack was not running.

### Incorrect approach

Running local database lint before starting the local Supabase stack.

### Correct solution

Run `npx supabase db lint --linked` for the linked remote project, or start Docker and the local Supabase stack before local linting.

### Prevention

Use explicit `--linked` or `--local` flags in Supabase database checks.

### Related files

- `supabase/config.toml`

### Related tests

- `npx supabase db lint --linked`

## ERR-20260719-003 - Supabase migration cache warning requires Docker

### Context

The initial migration was pushed to the linked Supabase project.

### Symptoms

`npx supabase db push --yes` applied the migration successfully but warned that it failed to cache the migrations catalog because Docker was unavailable.

### Root cause

Supabase CLI attempted to inspect a Docker image for local catalog caching, but Docker Desktop was not available to the current environment.

### Incorrect approach

Treating Docker-dependent cache warnings as equivalent to remote migration failure.

### Correct solution

Verify migration state with `npx supabase migration list` and linked lint. Install/start Docker before local Supabase workflows.

### Prevention

Record Docker availability separately from remote migration status.

### Related files

- `supabase/migrations/20260719132911_initial_security_foundation.sql`

### Related tests

- `npx supabase migration list`
- `npx supabase db lint --linked`

## ERR-20260719-004 - Supabase npm scripts require telemetry write permission

### Context

Supabase helper npm scripts were added after installing the CLI as a project dependency.

### Symptoms

`npm run supabase:lint:linked` and `npm run supabase:migrations` failed inside the sandbox with `EPERM` while writing `C:\Users\Yusuf_Furkan\.supabase\telemetry.json.tmp...`.

### Root cause

The sandbox cannot write Supabase CLI telemetry/cache files in the user profile directory.

### Incorrect approach

Assuming Supabase npm scripts would have the same filesystem permissions as previously escalated direct CLI commands.

### Correct solution

Run Supabase CLI commands with approved escalation in this environment, or run them from a normal user terminal outside the sandbox.

### Prevention

Document Supabase CLI user-profile writes as an environment limitation and do not include Supabase remote checks in `npm run check` until the environment supports them reliably.

### Related files

- `package.json`

### Related tests

- `npm run supabase:lint:linked`
- `npm run supabase:migrations`

## ERR-20260719-005 - GitHub push required credential and remote baseline handling

### Context

The local repository was initialized and connected to GitHub repository `yusuffurkanaksar55/yanki`.

### Symptoms

The first push failed without network access, the next push failed because Git credentials could not be read from a non-interactive prompt, and the authenticated push was rejected because remote `main` already contained an initial commit.

### Root cause

The sandbox restricts network access by default, Git Credential Manager was not configured as the local credential helper, and the remote repository had a pre-existing README commit.

### Incorrect approach

Assuming the remote repository was empty and that HTTPS Git credentials would be available without configuring the credential helper.

### Correct solution

Enable Git Credential Manager for the repo, fetch remote `main`, merge the unrelated remote baseline without force pushing, resolve the README conflict, and push the merged history.

### Prevention

Always fetch and inspect remote history before pushing to a user-created repository. Do not force push over remote work unless the user explicitly requests it.

### Related files

- `README.md`

### Related tests

- `git fetch origin main`
- `git push -u origin main`

## ERR-20260716-001 - Vitest config type mismatch

### Context

React, TypeScript, Vite, and Vitest were added to the application scaffold.

### Symptoms

`npm run typecheck` failed with `Object literal may only specify known properties, and 'test' does not exist in type 'UserConfigExport'`.

### Root cause

`vite.config.ts` imported `defineConfig` from `vite`, which does not expose Vitest's `test` configuration property in the TypeScript type.

### Incorrect approach

Using Vite's `defineConfig` for a config file that also contains Vitest settings.

### Correct solution

Import `defineConfig` from `vitest/config`.

### Prevention

Keep `npm run typecheck` in the required `npm run check` pipeline so config typing regressions are caught.

### Related files

- `vite.config.ts`

### Related tests

- `npm run typecheck`
- `npm run check`

## ERR-20260716-002 - Windows Path environment duplication blocked dev server start

### Context

The Vite development server was started as a background process for local verification.

### Symptoms

PowerShell `Start-Process` failed with a duplicate environment key error for `Path` and `PATH`.

### Root cause

The current process environment contained both `Path` and `PATH`, and PowerShell could not enumerate the duplicate keys for process creation.

### Incorrect approach

Starting the background process without normalizing the process-level environment first.

### Correct solution

Normalize the current PowerShell process environment to a single `Path` key before calling `Start-Process`.

### Prevention

For local dev-server starts in this environment, clean the process-level `PATH` duplicate before `Start-Process` or fix the parent shell environment.

### Related files

- `vite-dev-server.log`
- `vite-dev-server.err.log`

### Related tests

- Manual health check with `Invoke-WebRequest http://127.0.0.1:5173/`

## ERR-20260716-003 - Background Vite server did not persist after command cleanup

### Context

The Vite development server was started for local manual verification after the React scaffold was added.

### Symptoms

The server returned HTTP 200 during the start command, but a later independent health check could not connect to `http://127.0.0.1:5173/`.

### Root cause

The Codex shell execution environment appears to clean up child processes after the command finishes, even when the process is started in the background.

### Incorrect approach

Assuming a background dev server process would remain alive after the shell command completed.

### Correct solution

Use `npm run dev` in an active terminal when manual browser testing is needed in this environment.

### Prevention

Report dev-server persistence separately from build/test success. Do not claim that the local server remains running unless a later independent health check confirms it.

### Related files

- `package.json`

### Related tests

- Manual health check with `Invoke-WebRequest http://127.0.0.1:5173/`

Future entries must use this format:

```md
## ERR-YYYYMMDD-XXX - Short error title

### Context

### Symptoms

### Root cause

### Incorrect approach

### Correct solution

### Prevention

### Related files

### Related tests
```

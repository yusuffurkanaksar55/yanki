# Error Log

## ERR-20260806-024 - Duplicate Windows Path keys blocked background Vite startup

### Context

The final browser verification required a long-lived local Vite process.

### Symptoms

PowerShell `Start-Process` rejected the inherited environment because it contained both `Path` and `PATH`.

### Root cause

The Codex desktop process environment contains duplicate case variants that PowerShell cannot place in its child-process dictionary.

### Correct solution

Start the detached process with a normalized environment containing only one path key. The server then returned HTTP 200 and passed browser verification.

### Prevention

Normalize the environment before every background process start in this Windows workspace.

### Related files

- `vite.config.ts`

### Related tests

- Browser verification at `http://127.0.0.1:5173/`

## ERR-20260806-023 - Docker Engine was unavailable for container verification

### Context

The new customer-managed deployment package required Docker image and health-check verification.

### Symptoms

The Docker client reported version 29.6.1, but could not connect to the Windows Docker Engine pipe. Supabase migration caching repeated the same engine warning.

### Root cause

Docker Desktop was installed but its engine was not running in the current session. The sandbox also could not read the user Docker config file.

### Correct solution

Keep static and Compose validation in CI now; start Docker Desktop before image build, health, and local Supabase verification.

### Prevention

Add a release check that verifies Docker Engine health before container tests and reports a clear skip outside Docker-capable environments.

### Related files

- `Dockerfile`
- `compose.yaml`
- `docs/DEPLOYMENT.md`

### Related tests

- `npm run deployment:config`

## ERR-20260806-022 - Supabase CLI telemetry write was blocked in the sandbox

### Context

The pending multi-tenant migration was checked with the linked database dry-run command.

### Symptoms

The first command failed while writing `telemetry.json` under the user Supabase directory before connecting to the database.

### Root cause

The workspace sandbox allows repository writes but not the Supabase CLI user-profile telemetry path.

### Correct solution

Rerun only the required Supabase command with the existing narrow permission. The dry-run then completed successfully.

### Prevention

Treat linked Supabase CLI commands as requiring their approved user-profile access in this desktop environment.

### Related files

- `package.json`

### Related tests

- `npm run supabase:push:dry-run`

## ERR-20260806-021 - Public runtime configuration stub lacked an ESLint browser declaration

### Context

Vite copies `public/app-config.js` directly while ESLint scans the repository source.

### Symptoms

The first lint run reported `window is not defined` for the runtime configuration stub.

### Root cause

The copied plain JavaScript file did not declare its browser global environment.

### Correct solution

Add a file-scoped `/* global window */` declaration. The container-generated replacement remains plain browser JavaScript.

### Prevention

Keep public copied scripts covered by the full lint command and declare their runtime globals explicitly.

### Related files

- `public/app-config.js`

### Related tests

- `npm run lint`

## ERR-20260806-020 - Frontend environment example included a server credential placeholder

### Context

The deployment change initially documented `SUPABASE_SERVICE_ROLE_KEY` in the root frontend environment example.

### Symptoms

The fixture security test rejected the environment file because the frontend configuration contract forbids service-role material.

### Root cause

Server-only setup documentation was mixed into the browser-oriented `.env.example` file.

### Correct solution

Remove the server credential placeholder. Document server secrets only in trusted deployment and Functions configuration guidance.

### Prevention

Retain the regression test that rejects service-role names from the frontend environment example.

### Related files

- `.env.example`
- `docs/DEPLOYMENT.md`

### Related tests

- `tests/demo-fixture-foundation.test.mjs`

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

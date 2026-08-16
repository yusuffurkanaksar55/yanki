# Error Log

## ERR-20260816-074 - First focused npx test wrapper did not return a final result

### Context

The newly added staging-infrastructure and existing deployment-foundation Vitest suites were first launched through the `npx vitest` wrapper on Windows.

### Symptoms

The command printed the Vitest start banner but reached the 30-second execution window without test results or a reusable session id. No Node process remained afterward.

### Root cause

No deterministic test or product failure was reproduced. The evidence is limited to wrapper/process startup behavior in this execution environment; the unchanged suites completed normally through the repository-local Vitest entry point.

### Correct solution

Invoke the already installed local entry point directly with one worker for the focused diagnostic, then run the ordinary complete project test command as the authoritative result.

### Prevention

Use direct repository-local Node entry points for narrow diagnostics when an `npx` wrapper fails before producing a test result. Do not weaken tests or extend assertions for a wrapper-only event.

### Related files

- `tests/staging-infrastructure.test.mjs`
- `tests/deployment-foundation.test.mjs`

### Related tests

- `node node_modules/vitest/vitest.mjs run tests/staging-infrastructure.test.mjs tests/deployment-foundation.test.mjs --maxWorkers=1 --reporter=verbose`
- `npm test`

## ERR-20260812-073 - One full-suite profile assertion timed out after Docker acceptance

### Context

The full application quality gate ran immediately after image build, Playwright, pgTAP, and restore acceptance on the constrained workstation.

### Symptoms

One `App.test.tsx` case remained on the profile-loading screen until Testing Library's wait expired. The other 242 tests passed in that run. The unchanged focused file then passed the same case in 275 ms, and the unchanged complete quality gate passed all 243 tests.

### Root cause

No deterministic application defect was reproduced. The evidence indicates a transient test-scheduling delay under concurrent Vitest and recently completed Docker workload rather than an incorrect profile result or changed application behavior.

### Correct solution

Run the focused test unchanged to distinguish a deterministic failure, then repeat the complete quality gate. Do not weaken assertions or increase timeouts for a single non-reproducible event.

### Prevention

Keep the production-container lifecycle as an independent behavioral signal and monitor recurrence. If the same assertion repeats across clean runs, capture service mock timing and worker load before changing the test budget.

### Related files

- `src/app/App.test.tsx`

### Related tests

- `npx vitest run src/app/App.test.tsx --reporter=verbose`
- `npm run check`

## ERR-20260812-072 - Duplicate self-hosted image set exhausted workstation Docker headroom

### Context

The first clean self-hosted acceptance attempted to run the exact official Supabase Compose image set beside the already running Supabase CLI development stack on Docker Desktop.

### Symptoms

Before service creation completed, system-drive free space fell from approximately 13.9 GB to 6.5 GB and later reported 4.76 GB because the WSL virtual disk expanded. Stopping the parent command left one unstarted staging Mailpit container. Removing unused images reclaimed space inside Docker but did not immediately shrink the host VHD file.

### Root cause

The workstation acceptance duplicated multiple 1-1.7 GB Supabase images with different official tags. The runner had no explicit full-run confirmation or host storage policy, and terminating the outer shell prevented its normal `finally` cleanup while the Compose child briefly continued.

### Correct solution

Reserve the exact full stack for a properly sized isolated staging host and require explicit confirmation plus at least 20 GB of verified free Docker storage. For daily local evidence, hash-validate the official configuration but reuse the existing synthetic Supabase stack for migrations, pgTAP, production-container E2E, gateway denial, and restore. Remove only exact unused staging images/container remnants; never prune active project data.

### Prevention

Do not start a duplicate full Supabase stack on constrained Docker Desktop storage. Keep the full/local evidence distinction explicit, run the configuration-only preflight first, and allow the runner to complete its own cleanup instead of terminating its parent process.

### Related files

- `scripts/run-self-hosted-staging-acceptance.mjs`
- `scripts/run-docker-acceptance.mjs`
- `deploy/staging/supabase.lock.json`
- `docs/decisions/ADR-0034-pin-self-hosted-supabase-and-separate-local-from-full-staging-acceptance.md`

### Related tests

- `npm run staging:self-hosted:config`
- `npm run docker:acceptance`

## ERR-20260812-071 - Nested npm command could not start in Docker acceptance orchestrator

### Context

The initial daily Docker acceptance runner invoked existing package scripts as nested `npm.cmd` child processes on Windows.

### Symptoms

The first check stopped before Docker configuration validation with `spawnSync npm.cmd EINVAL`.

### Root cause

The Node.js child-process boundary in this Windows environment could not start the command shim with the selected synchronous invocation. No application container, database operation, or test had run.

### Correct solution

Invoke the already reviewed Node entry points directly with `process.execPath`, including the Supabase CLI JavaScript entry, local E2E runner, Compose validator, and restore acceptance script.

### Prevention

Orchestration scripts should call stable executable entry points directly instead of recursively invoking the package manager. Retain package scripts as human-facing aliases only.

### Related files

- `scripts/run-docker-acceptance.mjs`

### Related tests

- `npm run docker:acceptance`

## ERR-20260812-070 - Tenant administrators could read platform-wide security diagnostics

### Context

The administration security module exposed encryption-key health and anonymous-endpoint abuse summaries. Both summaries describe the entire deployment rather than one customer organization.

### Symptoms

Any active `SYSTEM_ADMIN` assignment passed the UI and Edge Function checks, including an `ORGANIZATION`-scoped customer administrator. The abuse-summary database function repeated only the role-code check and therefore did not close the scope gap.

### Root cause

The initial implementation treated the role code as sufficient and did not distinguish platform operations from tenant configuration. Existing scope semantics already represented the distinction but were not applied to these two global endpoints.

### Correct solution

Require an exact active `SYSTEM_ADMIN` assignment with `scope_type = 'PLATFORM'` and null scope id in the UI, both Edge Functions, and the abuse-summary database function. Keep organization administrators' existing tenant configuration modules unchanged.

### Prevention

Every deployment-global operation must state whether it is platform-only or tenant-filtered, enforce the decision outside the UI, and include both platform-positive and organization-admin-negative regression tests.

### Related files

- `supabase/migrations/20260812120000_platform_security_operations_scope.sql`
- `supabase/functions/encryption-key-health/index.ts`
- `supabase/functions/security-abuse-monitoring/index.ts`
- `src/features/administration/AdministrationPage.tsx`
- `docs/decisions/ADR-0033-separate-platform-operations-from-tenant-administration.md`

### Related tests

- `supabase/tests/database/anonymous_encrypted_submission.test.sql`
- `tests/encryption-key-health-boundary.test.mjs`
- `tests/anonymous-abuse-protection-boundary.test.mjs`
- `src/features/administration/AdministrationPage.test.tsx`

## ERR-20260810-069 - Combined report target obscured who comments were about

### Context

Authorized reviewers selected one combined person-and-cycle value before opening a report.

### Symptoms

The evaluated person was technically present in the selector and report header, but reviewers could not naturally search for a person such as Ahmet or retain that context while reading comment cards farther down the page.

### Root cause

The interface modeled the backend's composite cycle-plus-subject key directly instead of presenting the user's person-first reporting task. Comment groups used a generic identity-separated label and did not repeat their subject.

### Correct solution

Add client-side ad/e-mail search over the already authorized target set, select the evaluated person first, then list only that person's cycles. Repeat the evaluated person's name in the report summary and every written-comment group.

### Prevention

Keep backend composite identifiers inside service/UI state. User-facing report controls and acceptance tests must express the business sequence: person, cycle, report, subject-labelled result.

### Related files

- `src/features/reporting/EvaluationReportsPanel.tsx`
- `src/locales/tr/messages.ts`
- `tests/e2e/critical-lifecycle.e2e.ts`

### Related tests

- `src/features/reporting/EvaluationReportsPanel.test.tsx`
- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260810-068 - Partial local Supabase restart left the API unavailable

### Context

The local PostgreSQL container had exited with code `137` before the qualitative-report E2E run.

### Symptoms

Starting only `supabase_db_anonim_degerlendirme` made PostgreSQL healthy, but `supabase status` returned only `DB_URL`; the E2E harness then failed because `API_URL` was missing.

### Root cause

The database was restarted independently while Kong, Auth, REST, Functions, and the other local Supabase services remained stopped. The CLI correctly detected a partially running stack but did not reconstruct it during the first status call.

### Correct solution

Run a data-preserving `npx supabase stop` followed by `npx supabase start` so the saved local volume is reused and the full dependency set is recreated. Then rerun the unchanged E2E command.

### Prevention

After exit `137`, inspect the database health and Docker pressure, then prefer one data-preserving full-stack restart over manually starting a single service. Do not reset or delete local volumes unless corruption is independently proven.

### Related files

- `scripts/run-local-e2e.mjs`

### Related tests

- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260810-067 - Dashboard test assumed profile identity appeared once

### Context

The personal organization hierarchy began showing the signed-in person's display name and email in addition to the persistent account summary.

### Symptoms

The first full Vitest run failed because `getByText()` found two valid occurrences of the same profile name and email.

### Root cause

The old test encoded a uniqueness assumption that was no longer true after the hierarchy became a complete organization-to-person path.

### Correct solution

Assert both semantic occurrences with `getAllByText()` while retaining the hierarchy heading and membership assertions.

### Prevention

When identity data is intentionally repeated in separate accessible regions, scope queries to a region or assert the expected count rather than relying on global uniqueness.

### Related files

- `src/app/App.test.tsx`
- `src/features/dashboard/DashboardPage.tsx`

### Related tests

- `npm test`

## ERR-20260810-066 - Assignment and report hashes fell through to the public site

### Context

Authenticated users selected the assignment or report item from the application navigation.

### Symptoms

Both `#assignments` and `#reports` displayed the public Yankı product page instead of the requested protected workspace view. The old dashboard also stacked every assignment and report target into one long page, making existing aggregate results difficult to find.

### Root cause

The application navigation emitted both hashes, but the root hash parser recognized only `#dashboard`, `#administration`, and `#login`. Every unknown hash intentionally resolved to the marketing route.

### Correct solution

Add explicit protected routes for assignments and reports, pass the active view into the authenticated dashboard shell, render each workflow as a dedicated page, and add route regression tests. Keep the public fallback for genuinely unknown marketing hashes.

### Prevention

Every application navigation destination must have an App-level route test that asserts the protected heading, active navigation state, and absence of marketing fallback behavior. The critical Playwright lifecycle must enter assignment and report workflows through their real hashes.

### Related files

- `src/app/App.tsx`
- `src/features/dashboard/DashboardPage.tsx`
- `tests/e2e/critical-lifecycle.e2e.ts`

### Related tests

- `src/app/App.test.tsx`
- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260810-065 - Supabase CLI telemetry write was blocked by the workspace sandbox

### Context

The first post-cleanup `npm run e2e:local` invocation started Supabase CLI from the restricted workspace execution boundary.

### Symptoms

`supabase status` stopped before tests with `EPERM` while creating a temporary telemetry file under the user's `.supabase` directory outside the writable workspace.

### Root cause

The CLI writes its own telemetry state in the user profile even though the requested status operation is read-only for the project. The repository sandbox intentionally cannot write there.

### Correct solution

Rerun the unchanged repository command in the approved local Supabase execution boundary. Do not broaden application filesystem permissions or redirect telemetry into source.

### Prevention

Treat this exact user-profile telemetry error as an execution-boundary issue, keep E2E service URLs loopback-only, and request the narrow `npm run e2e:local` approval when required.

### Related files

- `scripts/run-local-e2e.mjs`

### Related tests

- `npm run e2e:local`

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

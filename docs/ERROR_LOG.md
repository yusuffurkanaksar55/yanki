# Error Log

## ERR-20260816-080 - Linked migration cache warning recurred after successful apply

### Context

The platform tenant-administration migration was pushed to the linked synthetic development project after a clean dry-run.

### Symptoms

The migration command reported successful application, then the optional pg-delta catalog cache could not read its generated target CA certificate.

### Root cause

The local CLI's post-apply catalog cache environment did not contain the temporary certificate path. PostgreSQL did not report a migration failure.

### Correct solution

Verify the exact local/remote migration pair with linked migration history, run linked schema lint, and deploy the dependent Edge Function only after both checks pass. All three validations succeeded.

### Prevention

Upgrade and retest the Supabase CLI before production rollout. Until then, treat this post-apply warning as unresolved tooling behavior and always require migration-history plus schema-lint evidence.

### Related files

- `supabase/migrations/20260816170000_platform_tenant_administration.sql`

### Related tests

- `npx supabase migration list --linked`
- `npm run supabase:lint:linked`

## ERR-20260816-079 - Browser lifecycle retained single-tenant assumptions after customer creation

### Context

The critical lifecycle was extended to create a second organization through the platform customer-onboarding UI before exercising organization-scoped administration.

### Symptoms

The first run renamed the newly created customer instead of the original fixture and strict cleanup refused the unexpected name. A later run also found an ambiguous organization label and no expected manager option because invitation administration defaulted to the newest customer.

### Root cause

The existing test relied on first-option defaults and a partial label that were valid only while one organization existed. The product correctly returned both authorized tenants to the platform operator.

### Correct solution

Select the intended organization id explicitly in hierarchy and invitation workflows, use an exact combobox role selector, recognize the separate `yanki-e2e-customer-<run-id>` fixture convention, and retain strict name/email checks before cleanup. Restore and remove the one interrupted synthetic fixture by exact id.

### Prevention

Every platform-operator E2E action that mutates tenant-scoped configuration must select its organization explicitly. Cleanup may support additional synthetic tenant kinds only through exact run-correlated names, slugs, and email patterns.

### Related files

- `tests/e2e/critical-lifecycle.e2e.ts`
- `scripts/lib/local-e2e-cleanup.mjs`
- `tests/local-e2e-cleanup.test.mjs`

### Related tests

- `npm run e2e:local`
- `npx vitest run tests/local-e2e-cleanup.test.mjs`

## ERR-20260816-078 - Report search removal left an unused reset helper

### Context

The redundant person-search field and its related state were removed from the reporting panel.

### Symptoms

ESLint rejected the panel because the old `resetReportSelection` helper was no longer referenced.

### Root cause

The helper previously served the search-change handler; all remaining report-selection handlers already perform their own explicit state reset.

### Correct solution

Remove the obsolete helper and retain the existing explicit reset behavior in person and cycle selection handlers.

### Prevention

Run lint immediately after deleting a UI interaction and its state so now-unreachable helpers are found before the full quality gate.

### Related files

- `src/features/reporting/EvaluationReportsPanel.tsx`

### Related tests

- `npm run lint`
- `npm run check`

## ERR-20260816-077 - Supabase CLI telemetry write was blocked by the workspace sandbox

### Context

Local and linked Supabase validation commands were run from the restricted workspace environment.

### Symptoms

The CLI stopped while trying to create telemetry state under the user profile, outside the writable repository roots.

### Root cause

The command required a non-product write to the Supabase CLI telemetry directory; the database, migration, and application paths were not failing.

### Correct solution

Repeat the unchanged reviewed Supabase CLI command with the existing scoped execution approval. Local lint, pgTAP, linked migration push, migration history, and function deployment then completed normally.

### Prevention

Treat user-profile telemetry writes as a tooling boundary and keep escalation scoped to exact Supabase commands. Do not broaden repository or credential permissions.

### Related files

- `supabase/config.toml`

### Related tests

- `npm run supabase:lint:local`
- `npm run supabase:test:local`
- `npx supabase db push --linked --include-all --yes`

## ERR-20260816-076 - Linked migration push reported a pg-delta cache certificate warning

### Context

The organization-name migration was applied to the linked synthetic development project.

### Symptoms

After applying the migration successfully, the CLI warned that a pg-delta catalog cache certificate file was unavailable.

### Root cause

The optional local pg-delta catalog cache could not read its generated target certificate. The migration command exited successfully and did not report a PostgreSQL migration failure.

### Correct solution

Confirm the exact migration in linked migration history. Both local and remote histories contain `20260816130000`, and the dependent Edge Function deployed successfully.

### Prevention

Always verify linked migration history after a successful push that emits a post-apply cache warning, and update the Supabase CLI before production rollout if the warning persists.

### Related files

- `supabase/migrations/20260816130000_organization_name_administration.sql`

### Related tests

- `npx supabase migration list --linked`

## ERR-20260816-075 - E2E cleanup rejected an intentionally renamed synthetic tenant

### Context

The critical lifecycle changed its synthetic organization name to test the new administration workflow.

### Symptoms

The product workflow passed, but strict cleanup refused to remove the fixture because its name no longer exactly matched the recognized `Yanki E2E <run-id>` format.

### Root cause

The cleanup fail-safe correctly protects any organization whose identity changes from the exact synthetic fixture convention.

### Correct solution

Restore the exact original synthetic name through the tested UI before cleanup. Restore the one pre-fix local fixture by exact id/name and rerun the lifecycle; cleanup then removed all synthetic tenant and user data.

### Prevention

Tests that exercise mutable fixture identity must restore the exact synthetic convention before invoking destructive cleanup. Keep the cleanup predicate strict.

### Related files

- `tests/e2e/critical-lifecycle.e2e.ts`

### Related tests

- `npm run e2e:local`

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

# Error Log

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

## ERR-20260810-064 - Synthetic tenant cleanup was blocked by published-template deletion guards

### Context

The first real E2E run with automatic database cleanup tried to remove a completed fixture containing a published evaluation-template version.

### Symptoms

All three Playwright tests passed, but cleanup rolled back with `PUBLISHED_TEMPLATE_VERSION_IMMUTABLE` while cascading organization deletion into template versions/questions.

### Root cause

Template immutability triggers correctly reject published version and question deletion, including cascades. Normal dependency-ordered tenant deletion therefore cannot remove this local synthetic fixture.

### Correct solution

After loopback URL, exact `yanki-e2e-*` organization, and matching `example.test` user validation, transactionally disable only the two template deletion guards, delete the fixture in dependency order, restore both guards, and commit. Any error rolls back both data and trigger state.

### Prevention

Keep the cleanup helper local-only and fail closed on every identity mismatch. Test both trigger disable/enable declarations and the complete E2E cleanup against a fixture with a published template.

### Related files

- `scripts/lib/local-e2e-cleanup.mjs`
- `scripts/run-local-e2e.mjs`
- `tests/local-e2e-cleanup.test.mjs`

### Related tests

- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260810-063 - Public accent text missed WCAG contrast on light surfaces

### Context

Automated Axe checks were added for public desktop/mobile and authentication surfaces.

### Symptoms

Six nodes using the coral accent failed WCAG AA contrast. White text on the coral call-to-action measured about 4.43:1, while coral text on mist/light-red surfaces was lower.

### Root cause

The original `#c55448` token was visually close to the 4.5:1 threshold but did not leave enough contrast across every actual background combination.

### Correct solution

Darken the shared coral token to `#b94a40` and rerun the real page scans. The final ratios pass on white, mist, and light-red surfaces without component-specific overrides.

### Prevention

Keep automated WCAG scans in both Vite and production-container browser acceptance whenever shared color tokens or public/auth surfaces change.

### Related files

- `tailwind.config.ts`
- `tests/e2e/public-accessibility.e2e.ts`

### Related tests

- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260809-062 - Project creation UI test timed out only under the full suite

### Context

The final 51-file Vitest quality gate ran after Playwright and privilege-regression coverage were added.

### Symptoms

The project-cycle creation interaction passed alone in about three seconds but exceeded Vitest's five-second default twice under the fully parallel suite; all assertions and the other 223 tests passed.

### Root cause

The scenario performs many realistic `userEvent` interactions and async rerenders. Shared jsdom CPU load pushed its valid runtime slightly beyond a global timeout intended for smaller unit tests.

### Correct solution

Set a 10-second timeout only on this long interaction test. Do not change production behavior or increase the global test timeout.

### Prevention

Keep expensive interaction workflows focused, use per-test budgets for known long scenarios, and require both focused and full-suite passes before treating a timeout as resolved.

### Related files

- `src/features/administration/ProjectCycleManagementPanel.test.tsx`

### Related tests

- `npm test -- --run src/features/administration/ProjectCycleManagementPanel.test.tsx`
- `npm run check`

## ERR-20260809-061 - Fresh Supabase stacks lacked required API table privileges

### Context

The first clean local Playwright lifecycle provisioned a tenant and then exercised the real profile and administration APIs.

### Symptoms

Authenticated own-profile reads and service-role identity/configuration table operations failed before their RLS or trusted authorization logic could run, while the older linked project continued to work.

### Root cause

Historical Supabase projects had implicit API table grants that were not present in the fresh local stack. RLS policies and a service-role JWT do not themselves create table-level privileges.

### Correct solution

Add a versioned migration granting authenticated users only profile `SELECT` subject to own-row RLS, and granting the service role CRUD only on the reviewed identity/configuration tables required by trusted Edge Functions. Keep every sensitive content and operational table excluded.

### Prevention

Treat table privileges as source-controlled capabilities, test required positive grants and sensitive negative exclusions, and validate every migration from a clean Supabase stack.

### Related files

- `supabase/migrations/20260809223000_explicit_identity_domain_privileges.sql`
- `tests/identity-domain-privileges.test.mjs`
- `docs/decisions/ADR-0031-use-explicit-api-table-privileges.md`

### Related tests

- `npm run e2e:local`
- `npm run supabase:lint:local`
- `npm run supabase:lint:linked`

## ERR-20260809-060 - Persistent E2E data broke global-empty pgTAP assumptions

### Context

The database authorization suite ran after successful browser acceptance had retained synthetic encrypted submissions for inspection.

### Symptoms

Two pgTAP assertions expected exactly one submission globally and no referenced key versions globally, so they failed even though the tested fixture and key inventory behavior were correct.

### Root cause

The tests assumed a freshly reset database instead of isolating assertions to their own tenant/cycle or comparing inventory to the actual stored distinct versions.

### Correct solution

Scope the submission count and payload-type assertions to the fixed fixture organization/cycle, and compare the key inventory function with the exact distinct versions currently referenced by ciphertext.

### Prevention

Database tests must remain deterministic on a persistent local stack containing demo and prior E2E tenants; global counts are allowed only when emptiness is itself established inside the transaction.

### Related files

- `supabase/tests/database/anonymous_encrypted_submission.test.sql`
- `supabase/tests/database/encryption_key_lifecycle.test.sql`

### Related tests

- `npm run supabase:test:local`

## ERR-20260809-059 - Supabase callback cleanup returned invited users to the public site

### Context

Playwright redeemed a real local Supabase Auth invitation and opened the callback in the application.

### Symptoms

The password-setup screen appeared briefly, then Supabase removed the token hash and the root hash router rendered the public product page.

### Root cause

The route parser recognized only application hashes. It did not treat Auth callback parameters as an authentication route or preserve that route through the one-time SDK hash cleanup.

### Correct solution

Recognize implicit and PKCE invitation/recovery/error callback parameters, remember the pending callback for one cleanup transition, and normalize the cleared URL to `#login` without retaining tokens.

### Prevention

Exercise real Auth callback URLs in browser acceptance and retain focused route tests for both initial callback recognition and post-consumption hash cleanup.

### Related files

- `src/app/App.tsx`
- `src/app/App.test.tsx`
- `tests/e2e/critical-lifecycle.e2e.ts`

### Related tests

- `npm test -- --run src/app/App.test.tsx`
- `npm run e2e:local`

## ERR-20260809-058 - Windows Node runner could not spawn command shims reliably

### Context

The first local E2E orchestrator launched Supabase and Playwright through Windows `npx.cmd` child processes under Node.js 24.

### Symptoms

Direct shim spawning returned `EINVAL`; shell mode introduced deprecation/no-output behavior, and generic termination could leave the Function process alive.

### Root cause

The runner depended on platform command shims and process-tree behavior instead of invoking installed JavaScript CLI entrypoints directly and owning the child tree explicitly.

### Correct solution

Invoke the installed Supabase and Playwright CLI modules with `process.execPath`, and on Windows terminate only the tracked child process tree with `taskkill` during cleanup.

### Prevention

Keep local orchestration shell-free, use repository-pinned CLI entrypoints, track child PIDs, and test cleanup without touching unrelated developer servers.

### Related files

- `scripts/run-local-e2e.mjs`
- `scripts/lib/local-e2e-environment.mjs`

### Related tests

- `tests/local-e2e-environment.test.mjs`
- `npm run e2e:local`

## ERR-20260809-057 - Reporting smoke lacked local account aliases

### Context

The first linked immediate-reporting acceptance invocation expected reusable `REPORT_*` account variables.

### Symptoms

The script stopped before authentication or remote mutation with `REPORT_ADMIN_EMAIL is required`.

### Root cause

Synthetic account credentials had been supplied for interactive testing but were intentionally not persisted in `.env.local` under the smoke script's aliases.

### Correct solution

Run the acceptance once with the previously approved synthetic values supplied only to the command process. Do not write them into source, documentation, or a committed environment file.

### Prevention

Keep smoke scripts fail-fast on missing variables and document their required aliases without values. Production and CI credentials must come from an approved secret manager.

### Related files

- `scripts/smoke-thresholded-evaluation-reporting.mjs`
- `docs/TEST_FIXTURES.md`

### Related tests

- `npm run smoke:reports`

## ERR-20260809-056 - Supabase pg-delta catalog cache missed its temporary certificate

### Context

The immediate-reporting migration was pushed to the linked synthetic Supabase project with CLI 2.109.1.

### Symptoms

The migration applied, but the CLI warned that post-apply pg-delta catalog caching could not read a temporary `pgdelta-target-ca.crt` file.

### Root cause

The CLI's optional post-apply catalog export outlived or could not resolve its temporary certificate path. The database migration transaction itself had already completed.

### Correct solution

Do not replay or repair the applied migration blindly. Verify local/remote migration parity and run linked schema lint; both checks confirmed `20260809210000` is active and the schema is clean.

### Prevention

Treat post-apply CLI warnings separately from database transaction failures and require migration-list plus linked-lint evidence before deciding whether a forward repair is needed. Reassess after the planned CLI update.

### Related files

- `supabase/migrations/20260809210000_immediate_evaluation_reporting.sql`

### Related tests

- `npx supabase migration list`
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

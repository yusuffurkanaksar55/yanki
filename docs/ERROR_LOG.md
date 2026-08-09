# Error Log

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

## ERR-20260809-055 - Checksum test sorted hash-prefixed lines instead of file names

### Context

The release package test verified that `SHA256SUMS` is emitted in a deterministic order across environments.

### Symptoms

The checksum generator produced the intended file-name order, but the first assertion failed by sorting entire lines beginning with unrelated hash values. A second assertion used default case ordering, which placed the upper-case installation file differently from the generator's locale ordering.

### Root cause

The test compared a property of checksum text that the release contract does not define instead of comparing extracted file names with the generator's documented ordering function.

### Correct solution

Extract the file-name suffix from every checksum line and compare it with a copy sorted through the same `localeCompare` contract used by the generator.

### Prevention

Keep deterministic-output assertions focused on the semantic sort key rather than hash bytes or runtime-default string ordering.

### Related files

- `tests/container-release.test.mjs`
- `scripts/create-release-checksums.mjs`

### Related tests

- `npx vitest run tests/container-release.test.mjs`

## ERR-20260809-054 - Initial release lint found a stale import and ambiguous separator regex

### Context

The first focused quality pass inspected the standalone release verifier and its package tests.

### Symptoms

ESLint rejected an unused `copyFileSync` import and a regular expression containing two visually countable literal spaces.

### Root cause

The test import remained after fixture construction changed, and the checksum parser expressed its required two-space delimiter as literal whitespace instead of an explicit quantifier.

### Correct solution

Remove the stale import and express the checksum delimiter as ` {2}` while preserving the standard SHA-256 inventory format.

### Prevention

Run focused lint immediately after adding standalone operator scripts and keep machine-significant whitespace explicit in parsers.

### Related files

- `scripts/verify-release-installation.mjs`
- `tests/container-release.test.mjs`

### Related tests

- `npm run lint`

## ERR-20260809-053 - Sensitive-route map exceeded the default Nginx hash bucket

### Context

The final gateway-token review moved header selection into a URI map so location-specific token injection would not disable inherited proxy headers.

### Symptoms

Static tests passed, but the rebuilt runtime image failed `nginx -t` with `could not build map_hash` because the exact sensitive endpoint names exceeded the default 64-byte map bucket.

### Root cause

Nginx sizes map hash buckets independently from rate-limit zones, and the two long fixed URI keys require a larger cache-line bucket than the image default.

### Correct solution

Set `map_hash_bucket_size 128` in the HTTP configuration while retaining the URI map and server-level proxy headers.

### Prevention

Run `nginx -t` inside the rebuilt runtime image after every map, hostname, or generated-template change; static directive checks cannot validate hash sizing.

### Related files

- `deploy/nginx.conf`

### Related tests

- `docker compose --env-file deploy/compose.env.example run --rm --no-deps web nginx -t`

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

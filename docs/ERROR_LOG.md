# Error Log

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

## ERR-20260809-052 - Node typecheck imported a Deno-only test dependency

### Context

The first direct-bypass token test imported the Edge Function TypeScript helper from a TypeScript Vitest file.

### Symptoms

Vitest and ESLint passed, but the application `tsc` project reported unknown `Deno` globals and rejected the explicit `.ts` import extension.

### Root cause

The TypeScript test pulled a Deno runtime module into the Node/browser application type graph even though the production Edge Function source is intentionally outside that graph.

### Correct solution

Keep the behavior test in JavaScript, let Vitest transform the imported Edge module at runtime, and stub the Deno environment only for each test. The application type graph remains unchanged.

### Prevention

Test cross-runtime Edge helpers through JavaScript runtime tests or a dedicated Deno typecheck configuration; do not merge Deno globals into the browser application project.

### Related files

- `supabase/functions/_shared/sensitiveGateway.ts`
- `tests/sensitive-gateway.test.mjs`

### Related tests

- `npm run typecheck`
- `npx vitest run tests/sensitive-gateway.test.mjs`

## ERR-20260809-051 - Static gateway upstream blocked Nginx startup

### Context

The first real Docker image acceptance ran `nginx -t` after Compose and the application image build succeeded.

### Symptoms

Nginx rejected the generated configuration because the documentation-only upstream hostname did not resolve at container startup.

### Root cause

A static hostname in `proxy_pass` is resolved while Nginx loads its configuration. A temporary Supabase DNS outage would therefore prevent the frontend and health endpoint from starting even though no API request had been made.

### Correct solution

Enable the official image's local resolver discovery, inject those resolver addresses into the template, and use a variable-backed upstream so DNS is resolved at request time and refreshed with a bounded validity period.

### Prevention

Run the generated Nginx configuration inside the exact runtime image and test startup with a deliberately unresolved documentation hostname.

### Related files

- `Dockerfile`
- `deploy/nginx.conf`

### Related tests

- `docker compose --env-file deploy/compose.env.example run --rm --no-deps web nginx -t`

## ERR-20260809-050 - Alert state read error dropped its internal cause

### Context

The first focused gateway and alert quality run passed all tests and type checking, then ESLint inspected the new state-file boundary.

### Symptoms

The `preserve-caught-error` rule rejected a generic state-read error because the caught filesystem error was not attached as its internal cause.

### Root cause

The public error text was intentionally generic to avoid exposing a sensitive operator path, but the implementation also discarded the original error object needed for trusted diagnostics.

### Correct solution

Keep the generic outward message and attach the caught filesystem error through the standard `Error` `cause` option.

### Prevention

At trusted operator boundaries, redact outward messages without discarding structured internal error chains.

### Related files

- `scripts/lib/security-alerting.mjs`

### Related tests

- `npm run lint`

## ERR-20260809-049 - Restic stdin snapshot path differed on Windows

### Context

The first full encrypted off-site restore acceptance selected the exact newly created Restic snapshot after snapshot creation, integrity checking, and retention passed.

### Symptoms

The restore command stopped before creating the disposable database because snapshot metadata did not match the expected root-relative stdin filename.

### Root cause

Restic records `--stdin-filename` under the current Windows drive path, while the validator assumed Unix-style root-relative or bare paths. Snapshot id, hostname, and all tags were correct.

### Correct solution

Normalize Windows and Unix path separators and compare the final filename, while continuing to require one full snapshot id, the exact environment hostname, and every purpose/environment/format tag.

### Prevention

Treat backup-tool metadata as a cross-platform contract and test it with the real pinned binary on every supported operator OS. Keep identity checks independent of harmless platform path prefixes.

### Related files

- `scripts/lib/offsite-backup.mjs`
- `scripts/verify-offsite-backup-restore-acceptance.mjs`

### Related tests

- `tests/offsite-backup.test.ts`
- `npm run backup:offsite:restore:acceptance`

## ERR-20260809-048 - RLS migration form did not match the repository guard

### Context

The full Vitest suite scanned every `create table public...` migration and required a corresponding machine-detectable RLS statement.

### Symptoms

The new recovery-canary table had RLS enabled in PostgreSQL and passed pgTAP, but `tests/supabase-foundation.test.mjs` failed to recognize the statement.

### Root cause

The migration split `alter table public.evaluation_encryption_recovery_canaries enable row level security;` across two lines, while the existing static guard intentionally matches the canonical one-line form.

### Correct solution

Keep the reviewed RLS behavior unchanged and express the statement in the repository's canonical single-line migration form.

### Prevention

Run the full repository suite, not only database tests, after adding a public table. Follow machine-checked migration conventions for RLS and privilege statements.

### Related files

- `supabase/migrations/20260809153000_encryption_recovery_canaries.sql`
- `tests/supabase-foundation.test.mjs`

### Related tests

- `npm test`
- `npm run check`

## ERR-20260809-047 - Local recovery helper used an unavailable RNG API

### Context

The first executable combined database/key recovery drill generated a process-only disposable AES key from PowerShell.

### Symptoms

Windows PowerShell reported that the static `RandomNumberGenerator.Fill` method was unavailable. Because later commands succeeded, the compound helper also returned exit code zero after using the still zero-filled test buffer.

### Root cause

The helper assumed a newer .NET cryptography API and did not stop immediately after a PowerShell method error.

### Correct solution

Use the compatible `RandomNumberGenerator.Create().GetBytes()` API, dispose the generator, refresh the encrypted canary, and explicitly propagate every child process exit code. The corrected drill used a real random 32-byte key and passed.

### Prevention

Keep production keys in the approved secret manager rather than generating them in shell helpers. For disposable Windows verification, use APIs supported by Windows PowerShell and make compound acceptance helpers fail fast.

### Related files

- `scripts/provision-encryption-recovery-canaries.mjs`
- `scripts/verify-key-database-recovery-acceptance.mjs`

### Related tests

- `npm run encryption:recovery:acceptance`

## ERR-20260809-046 - Recovery-event test mutated a readonly service contract

### Context

The first full check after adding password-recovery gating compiled the new React test.

### Symptoms

TypeScript rejected assignment to the readonly `onAuthStateChange` field on an `AuthService` stub.

### Root cause

The test attempted to mutate an already constructed typed service object in order to capture the Supabase Auth listener.

### Correct solution

Construct a new immutable `AuthService` value with the desired listener override and preserve the remaining stub methods through object spread.

### Prevention

Treat injectable service contracts as immutable in tests and configure scenario-specific behavior during stub construction.

### Related files

- `src/features/authentication/PasswordSetupPage.test.tsx`

### Related tests

- `npm run typecheck`
- `npm run check`

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

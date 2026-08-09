# Error Log

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

## ERR-20260809-045 - Local Supabase status parsing assumed a clean output stream

### Context

A side-effect-free bootstrap readiness check needed local URL and service-role values without writing them to disk or command output.

### Symptoms

The first helper read no service key from `status -o env`; a JSON retry then encountered CLI diagnostics and sandbox telemetry mixed into the captured stream.

### Root cause

The local verification helper treated Supabase CLI status output as a clean machine-only stdout contract. On this Windows runtime, service diagnostics and telemetry failures can use the same captured process stream.

### Correct solution

Run the local-only status command with approved CLI profile access, isolate the JSON object in process, and pass values only through child-process environment variables. The production bootstrap command itself reads approved environment variables directly and never parses CLI status.

### Prevention

Do not derive production secrets from human/status command output. Inject operator secrets from the approved secret manager and keep local status parsing confined to disposable verification helpers.

### Related files

- `scripts/bootstrap-production-tenant.mjs`
- `.env.operator.example`

### Related tests

- `npm run tenant:bootstrap:check`

## ERR-20260808-044 - Disposable full restore used a non-superuser role

### Context

The first executable backup/restore acceptance drill dumped the complete local Supabase database and restored it into a guarded disposable database.

### Symptoms

`pg_restore` stopped at `realtime.list_changes` because the local `postgres` role could not set the protected `log_min_messages` function parameter.

### Root cause

Supabase's local `postgres` role can create databases but is intentionally not a superuser. A full Supabase schema contains platform-owned functions whose settings require the local `supabase_admin` management role during restore.

### Correct solution

Make the restore user explicit and default the local drill to `supabase_admin`. Keep `--no-owner`, preserve grants, stream directly into a protected `_restore_acceptance` target without a host dump file, verify application security invariants, and always remove the target.

### Prevention

Run the disposable restore drill after schema/security changes and before release. Production restores must use the deployment's approved Supabase recovery role and isolated infrastructure rather than assuming a role named `postgres` is privileged.

### Related files

- `scripts/verify-backup-restore-acceptance.mjs`
- `.env.operator.example`
- `docs/DEPLOYMENT.md`

### Related tests

- `tests/backup-restore-acceptance.test.mjs`
- `npm run backup:restore:acceptance`

## ERR-20260807-043 - Hosted oversized request reached gateway timeout

### Context

The first live abuse smoke sent a body just above the original 1.1 MB anonymous application limit.

### Symptoms

The hosted endpoint returned an empty HTTP 503 after roughly two minutes instead of the Edge Function's controlled 413 response.

### Root cause

The original application threshold allowed the request to reach the linked hosted gateway's practical timeout path before the application could provide a stable rejection contract.

### Correct solution

Set the anonymous application body limit to 256 KiB, retain streaming byte checks, map 413 to a dedicated Turkish form message, redeploy, and verify a 270,000-character request returns a fast controlled 413.

### Prevention

Keep request-size limits below infrastructure timeout paths and include live oversized-body verification in `smoke:abuse` for managed and dedicated release environments.

### Related files

- `supabase/functions/_shared/requestBody.ts`
- `supabase/functions/anonymous-evaluation-submissions/index.ts`
- `src/features/evaluations/evaluationAssignmentService.ts`
- `scripts/smoke-anonymous-evaluation-submission.mjs`

### Related tests

- `tests/request-body-limit.test.ts`
- `npm run smoke:abuse`

## ERR-20260807-042 - Remote migration catalog cache missed temporary CA file

### Context

The anonymous abuse-control migration was pushed to the linked Supabase project with experimental `pg-delta` enabled.

### Symptoms

The migration applied, but the CLI warned that catalog caching failed because `.temp/pgdelta/pgdelta-target-ca.crt` did not exist.

### Root cause

Supabase CLI 2.109.1 destroyed the experimental catalog-export worker after its temporary certificate file was unavailable. The database migration transaction itself had already completed.

### Correct solution

Verify application independently with `npx supabase migration list` and linked schema lint. Both confirmed matching local/remote migration history and no schema errors.

### Prevention

Treat post-push cache warnings separately from migration status, retain independent list/lint verification, and reassess after a reviewed Supabase CLI upgrade.

### Related files

- `supabase/migrations/20260807170000_anonymous_endpoint_abuse_protection.sql`
- `supabase/config.toml`

### Related tests

- `npx supabase migration list`
- `npm run supabase:lint:linked`

## ERR-20260807-041 - Shared keyring dependent was not redeployed before rotation smoke

### Context

The linked synthetic environment had received the additive keyring readers and a new active per-version secret.

### Symptoms

The first post-rotation report smoke stopped at `evaluation-submission-credentials` with HTTP 502 before a new encrypted submission was written.

### Root cause

The credential function imports the shared evaluation module but was omitted from the initial dependent-function deployment set.

### Correct solution

Redeploy every Edge Function that imports the changed shared module before changing the active key, then rerun the complete submission/report flow.

### Prevention

Keep the deployment runbook's dependent-function list complete and treat shared Edge Function code changes as multi-function releases.

### Related files

- `supabase/functions/_shared/encryptionKeyring.ts`
- `supabase/functions/evaluation-submission-credentials/index.ts`
- `docs/DEPLOYMENT.md`

### Related tests

- `npm run smoke:reports`
- `npm run smoke:key-health`

## ERR-20260807-040 - Retained local database lacked the pending lifecycle migration

### Context

Docker Desktop restored the local Supabase database from retained volumes after the new lifecycle migration was created.

### Symptoms

The key lifecycle pgTAP suite could not find `list_referenced_evaluation_encryption_key_versions()`.

### Root cause

Starting a retained local stack did not apply the newly added migration automatically.

### Correct solution

Run `npx supabase migration up --local` before the local pgTAP suite when reusing retained volumes.

### Prevention

Check local migration state after startup and apply pending migrations before tests; use a full reset only when an empty-schema verification is required.

### Related files

- `supabase/migrations/20260807143000_encryption_key_lifecycle.sql`
- `supabase/tests/database/encryption_key_lifecycle.test.sql`

### Related tests

- `npm run supabase:test:local`

## ERR-20260807-039 - Static keyring boundary test inspected the previous module

### Context

Keyring parsing moved from the submission helper into a dedicated pure module for rotation and health tests.

### Symptoms

One Vitest assertion reported that `EVALUATION_ENCRYPTION_KEYRING` was absent from the old helper source.

### Root cause

The static boundary test asserted the previous file location instead of the key custody invariant.

### Correct solution

Read the dedicated keyring module and assert legacy compatibility, additive per-version secrets, active selection, and server-side nonce/encryption behavior across the two relevant sources.

### Prevention

Keep static security tests bound to ownership boundaries and invariants rather than one implementation file.

### Related files

- `tests/anonymous-submission-boundary.test.mjs`
- `supabase/functions/_shared/encryptionKeyring.ts`

### Related tests

- `npm test`

## ERR-20260807-038 - Trusted report batch omitted cycle close metadata

### Context

The first live thresholded reporting smoke test successfully passed database authorization and decryption preparation.

### Symptoms

`evaluation-reports` stopped with `REPORT_CLOSE_MISSING` before returning an aggregate.

### Root cause

The applied thresholded batch function returned report identity, threshold, questions, and ciphertext but omitted the non-sensitive cycle close timestamp required by the typed report response.

### Correct solution

Add a forward-only compatibility migration that keeps the reviewed threshold/authorization implementation owner-only, delegates through the public service-role boundary, and appends the database-derived close timestamp.

### Prevention

Assert every required safe report metadata field in pgTAP and run the complete live encrypted submission-to-report path after deployment.

### Related files

- `supabase/migrations/20260807111500_reporting_close_metadata_fix.sql`
- `supabase/tests/database/thresholded_evaluation_reporting.test.sql`

### Related tests

- `npm run supabase:test:local`
- `npm run smoke:reports`

## ERR-20260807-037 - User-scoped Docker installation was absent from PATH

### Context

The final deployment configuration check used `docker compose` through the npm quality command.

### Symptoms

The command reported that `docker` was not recognized even though Docker Desktop and the local Supabase stack were running.

### Root cause

Docker Desktop was installed under the current user's local application directory, and its CLI directory was not present in this PowerShell process PATH.

### Correct solution

Resolve the user-scoped and standard Windows Docker CLI locations in a Node validation wrapper, then invoke Compose without shell quoting.

### Prevention

Keep deployment checks independent of interactive shell PATH when Docker Desktop uses a supported non-default install location.

### Related files

- `package.json`
- `scripts/validate-compose-config.mjs`

### Related tests

- `npm run deployment:config`

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

# Error Log

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

## ERR-20260807-036 - Deployment contract test expected the previous production-gate wording

### Context

The deployment guide was updated after encrypted submission became implemented.

### Symptoms

The full Vitest run expected the exact phrase `not approved for live evaluation content` while the guide now says `not approved for live employee data`.

### Root cause

The static contract asserted prose from the previous foundation state instead of the current production safety invariant.

### Correct solution

Bind the test to the current explicit live-employee-data prohibition.

### Prevention

Keep documentation contract tests focused on durable security meaning and update them with reviewed lifecycle changes.

### Related files

- `docs/DEPLOYMENT.md`
- `tests/deployment-foundation.test.mjs`

### Related tests

- `npm test`

## ERR-20260807-035 - Migration security test scanned explanatory prose as schema

### Context

The encrypted submission migration documents that plaintext must never be persisted.

### Symptoms

The full Vitest run failed because the word `plaintext` appeared in comments even though no plaintext column existed.

### Root cause

The old test searched all migration text instead of the anonymous content table definition.

### Correct solution

Extract the `encrypted_evaluation_submissions` definition and reject evaluator, assignment, credential, score, comment, plaintext, and digest column names there.

### Prevention

Test parsed structural boundaries instead of forbidding security vocabulary in comments.

### Related files

- `tests/supabase-foundation.test.mjs`

### Related tests

- `npm test -- --run tests/supabase-foundation.test.mjs`

## ERR-20260807-034 - Inline PowerShell secret transfer removed keyring JSON quotes

### Context

The anonymous encryption function required a versioned JSON keyring in Supabase Secrets.

### Symptoms

The first live submission returned `EVALUATION_ENCRYPTION_KEYRING_INVALID`.

### Root cause

PowerShell/CLI argument parsing removed the inner JSON quote characters from the inline value.

### Correct solution

Upload both values through a uniquely named temporary env file under the verified system temp directory and delete it immediately after success.

### Prevention

Use env-file secret transfer for structured values and retain safe configuration error codes that never reveal secret contents.

### Related files

- `supabase/functions/anonymous-evaluation-submissions/index.ts`

### Related tests

- `npm run smoke:submissions`

## ERR-20260807-033 - Legacy PowerShell random Fill call failed before secret upload

### Context

A development-only 32-byte encryption key was generated for the linked synthetic environment.

### Symptoms

Windows PowerShell reported that `RandomNumberGenerator.Fill` was unavailable, but the remaining command still uploaded the initialized byte array.

### Root cause

The installed .NET runtime lacks the newer static `Fill` API and PowerShell did not stop the compound command on the method error.

### Correct solution

Replace the secret immediately with bytes produced by `RandomNumberGenerator.Create().GetBytes()` before function deployment or encryption.

### Prevention

Use runtime-compatible cryptographic APIs and make secret-generation commands fail closed before upload.

### Related files

- `docs/DEPLOYMENT.md`

### Related tests

- `npm run smoke:submissions`

## ERR-20260807-032 - Evaluation cycle lacked a composite tenant key

### Context

The anonymous content table uses composite tenant foreign keys for every reporting dimension.

### Symptoms

Local Supabase startup rejected the encrypted submission table because `evaluation_cycles (organization_id, id)` was not unique.

### Root cause

Projects and template versions already had composite tenant keys, but evaluation cycles did not.

### Correct solution

Add `evaluation_cycles_organization_id_id_unique_idx` before creating the composite foreign key and rerun the full local migration chain.

### Prevention

Require executable empty-database migration verification for every new composite tenant relationship.

### Related files

- `supabase/migrations/20260807013000_anonymous_encrypted_evaluation_submissions.sql`

### Related tests

- `npm run supabase:test:local`

## ERR-20260806-031 - Full system drive mounted Docker data read-only

### Context

The local Supabase stack was restarted to verify the template immutability hardening migration from a clean database.

### Symptoms

Docker Desktop stopped, WSL reported that its virtual disk was already attached, and Docker logs showed that the distribution disk had been mounted read-only.

### Root cause

The Windows system drive had no free space, which interrupted Docker's WSL filesystem journal and forced a read-only fallback mount.

### Correct solution

Stop Docker and WSL, remove only completed temporary installers and crash dumps, mount the Docker data VHD in bare mode, repair its ext4 filesystem with `e2fsck`, unmount it, and restart Docker. A clean Supabase reset and all database tests then passed.

### Prevention

Keep several gigabytes free on the system drive and check host disk capacity before image-heavy Docker or local Supabase operations.

### Related files

- `supabase/config.toml`

### Related tests

- `npx supabase db reset --local`
- `npx supabase test db`

## ERR-20260806-030 - Parallel Edge Function deploy lost one registration

### Context

The updated project function and new template function were deployed concurrently after the migration.

### Symptoms

Both commands reported success, but the live template endpoint returned 404 and `supabase functions list` contained only the updated project function.

### Root cause

Concurrent project-level function deployments raced while updating remote function registration state.

### Correct solution

Redeploy `evaluation-templates` sequentially, confirm it appears in the remote list, and rerun the authenticated smoke test.

### Prevention

Deploy Supabase Edge Functions sequentially for the same project and verify the remote function list before smoke testing.

### Related files

- `supabase/functions/evaluation-templates/index.ts`
- `supabase/functions/admin-project-cycles/index.ts`

### Related tests

- `npm run smoke:templates`

## ERR-20260806-029 - Template version insert trigger fell through to update checks

### Context

The first Docker-backed pgTAP run exercised creation of a new draft version.

### Symptoms

`admin_save_evaluation_template_draft()` raised `TEMPLATE_VERSION_IDENTITY_IMMUTABLE` during the initial insert.

### Root cause

The trigger validated that inserted versions start as drafts but did not return immediately, so it continued into update-only identity comparisons against `OLD`.

### Correct solution

Return `NEW` immediately after successful insert validation and rerun a clean local database reset and all pgTAP suites.

### Prevention

Keep explicit operation branches in multi-operation triggers and retain executable create, update, publish, clone, and immutability tests.

### Related files

- `supabase/migrations/20260806234500_versioned_evaluation_templates.sql`

### Related tests

- `supabase/tests/database/versioned_evaluation_templates.test.sql`

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

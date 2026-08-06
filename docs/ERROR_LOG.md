# Error Log

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

## ERR-20260806-028 - Codex browser runtime could not initialize

### Context

The Turkish assignment inbox required desktop and mobile visual verification.

### Symptoms

The browser control runtime failed before navigation with `failed to write kernel assets` and a Windows path-not-found error.

### Root cause

The Codex browser runtime could not create its own kernel asset path. Windows `TEMP` and `TMP` existed, and the Vite server was healthy, so this was outside the application.

### Correct solution

Retain component, build, and Docker image verification now; rerun visual checks when the Codex browser runtime is available.

### Prevention

Keep visual verification as an explicit release check and do not treat component tests as a permanent replacement.

### Related files

- `src/features/evaluations/AssignmentInbox.tsx`

### Related tests

- `src/features/evaluations/AssignmentInbox.test.tsx`

## ERR-20260806-027 - Assignment smoke setup used the wrong env filename and hit transient DNS

### Context

The live employee assignment RPC smoke test needed public Supabase configuration and synthetic credentials.

### Symptoms

The first command reported `.env: not found`; after switching to `.env.local`, the first network attempt returned `EAI_AGAIN` for the Supabase hostname.

### Root cause

The smoke script assumed the wrong ignored local env filename, followed by a transient Windows DNS failure.

### Correct solution

Use `.env.local`, keep credentials in process-only environment variables, confirm DNS resolution, and retry. The test then returned three assignments and denied anonymous access.

### Prevention

Keep the smoke package command aligned with the repository's documented local env convention and report network failures separately from authorization failures.

### Related files

- `package.json`
- `scripts/smoke-employee-assignment-access.mjs`

### Related tests

- `npm run smoke:assignments`

## ERR-20260806-026 - Remote migration catalog cache missed a temporary certificate

### Context

The employee assignment RPC migration was pushed to the linked Supabase project.

### Symptoms

The migration applied, but the experimental pg-delta catalog cache reported that `pgdelta-target-ca.crt` did not exist in the temporary workspace.

### Root cause

Supabase CLI 2.109.1 lost its temporary pg-delta certificate path after migration application.

### Correct solution

Regenerate linked types, run linked database lint, and run a second migration dry-run. All passed and the remote database reported up to date.

### Prevention

Treat catalog-cache warnings as unverified until linked lint and a final dry-run pass; update the CLI in a separate reviewed tooling change.

### Related files

- `supabase/migrations/20260806233000_employee_assignment_access.sql`

### Related tests

- `npx supabase db lint --linked`
- `npx supabase db push --linked --include-all --dry-run`

## ERR-20260806-025 - Docker Engine stopped during local Supabase bootstrap

### Context

The first Docker-backed local Supabase verification downloaded the complete service image set.

### Symptoms

The database started, then the Docker Desktop Linux Engine named pipe disappeared and the `docker-desktop` WSL distribution was stopped.

### Root cause

Docker Desktop stopped during the initial high-volume image bootstrap. The downloaded layers and local database volume remained available.

### Correct solution

Restart Docker Desktop, stop the partial Supabase stack, and start it cleanly. All services then started and local reset, lint, and pgTAP tests passed.

### Prevention

Verify Docker Engine health before local stack startup and recover partial Supabase starts with a clean stop/start sequence.

### Related files

- `supabase/config.toml`

### Related tests

- `npm run supabase:test:local`
- `npm run supabase:lint:local`

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

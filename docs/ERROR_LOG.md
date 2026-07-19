# Error Log

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

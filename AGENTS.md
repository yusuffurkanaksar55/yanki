# Repository Operating Guide

This repository is the persistent memory for the Anonymous Employee and Project Evaluation Platform.

## Core Rules

- Source code, database identifiers, technical documentation, tests, commit messages, and internal logs are written in English.
- User-facing application text is Turkish and must be centralized for future localization.
- Evaluation content must never be stored in plaintext.
- Evaluator identity must never be stored with submission content.
- Supabase service-role credentials and encryption keys must never be exposed to the browser.
- Every sensitive authorization rule must be enforced outside the UI, preferably in Edge Functions and Row Level Security.
- System administrators manage configuration but must not read evaluation content.
- Reviewers must not see results below the configured anonymity threshold.
- Users must not access results about themselves.

## Required Reading Before Development

Read these files before making meaningful changes:

- `docs/PROJECT_CONTEXT.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY_MODEL.md`
- `docs/AUTHORIZATION_MODEL.md`
- `docs/DATA_MODEL.md`
- `docs/DEPLOYMENT.md`
- `docs/ERROR_LOG.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DEVELOPMENT_LOG.md`
- Relevant ADRs in `docs/decisions/`

## Quality Commands

Current application checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check
npm run deployment:config
npm run supabase:lint:local
npm run supabase:lint:linked
npm run supabase:push:dry-run
npm run supabase:test:local
```

When new Supabase and end-to-end workflows are added, extend the command set with relevant database tests, Edge Function checks, Playwright end-to-end tests, and security regression tests.

## Documentation Updates

For each meaningful change:

- Add the newest development log and test report entries at the top.
- Keep only the latest 5 entries in `docs/DEVELOPMENT_LOG.md` and `docs/TEST_REPORT.md`.
- Keep only the latest 10 real entries in `docs/ERROR_LOG.md`; preserve its template.
- Run `npm run memory:trim` after updating these operational logs.
- Update architecture, security, data model, authorization, assumptions, known issues, or ADR files when decisions or behavior change.
- Record discovered errors in `docs/ERROR_LOG.md`.

Durable decisions and current truth belong in ADRs, `CHANGELOG.md`, and the focused context documents. Operational logs are intentionally bounded so repository memory remains concise.

## Mandatory Self-Hosted Supabase Development and Test Policy

Apply this policy to all future development, integration tests, smoke tests, end-to-end tests, database checks, RPC tests, and Edge Function tests in this repository unless the user explicitly changes it.

### Canonical Backend

- The canonical development and test backend is the self-hosted Supabase environment running on AWS EC2.
- Local access uses `SUPABASE_URL=http://localhost:8080`, which reaches the Supabase gateway on AWS EC2 through an SSH tunnel.
- Frontend development uses `VITE_SUPABASE_URL=http://localhost:8080`.
- Use the existing self-hosted publishable key from `.env.local` for `VITE_SUPABASE_ANON_KEY`.
- Never hard-code the publishable key or copy it into source-controlled files.

### No Supabase Cloud Fallback

- The former Supabase Cloud project is not a development or test environment.
- Do not use the former `*.supabase.co` project URL, project ref, database pooler, service-role key, anon key, or stale Supabase CLI Cloud link information for development or testing.
- Treat `supabase/.temp-cloud-backup` only as a backup of the former Cloud connection, never as active environment configuration.
- Do not interpret example `*.supabase.co` URLs in documentation or fixtures as live endpoints.
- Never silently fall back to Supabase Cloud when the AWS self-hosted environment is unavailable. Stop and report: `AWS self-hosted Supabase connection is unavailable.`
- Do not make changes to the former Supabase Cloud project.

### Connection Verification and MCP

- Before backend-dependent development or tests, verify the self-hosted connection when practical by checking `http://localhost:8080` or an appropriate health/API endpoint.
- When MCP is needed, use only the self-hosted MCP endpoint at `http://localhost:8080/mcp` and verify that it is connected to the self-hosted environment.
- Do not use Supabase Cloud MCP tools for this repository.
- If `localhost:8080` is unavailable, first check whether the SSH tunnel is active.

### Database Changes

- AWS self-hosted PostgreSQL is the active development and test database.
- For every persistent database change:
  1. Create a migration file first.
  2. Commit the SQL or schema change under repository migrations as the source-controlled definition.
  3. Apply the migration to the development environment.
  4. Verify the result against the actual AWS self-hosted database.
  5. Run the relevant tests.
- Do not leave persistent schema changes applied only through MCP `execute_sql` without a corresponding migration.
- MCP `execute_sql` may have powerful PostgreSQL privileges. Exercise extra care with `DROP`, `TRUNCATE`, bulk `DELETE`, destructive `ALTER`, and operations that could remove production-like data.
- Repository migration files are the source of truth for persistent database schema changes.
- MCP may be used for read-only inspection.

### Test Data Protection

- Do not randomly delete or modify existing migrated data in the AWS environment for testing.
- For destructive or integration tests, use synthetic fixtures with unique identifiers and clean up only records created by that test.
- Never use existing real or migrated records as destructive test fixtures.
- In particular, preserve existing data in `auth.users`, `organizations`, `projects`, `evaluation_*`, and `user_*` tables.

### Authentication

- Run authentication tests against self-hosted Supabase Auth at `http://localhost:8080/auth/v1/...`.
- Do not use the former Cloud Auth endpoint.
- Migrated users' email/password login has been verified in the self-hosted environment.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, PostgreSQL passwords, or AWS credentials to the frontend.
- The frontend may use only a public publishable/anon key.

### Edge Functions

- `supabase/functions/` is the repository source of truth for Edge Functions.
- Current function areas include `admin-project-cycles`, `anonymous-evaluation-submissions`, `encryption-key-health`, `evaluation-reports`, `evaluation-retention-administration`, `evaluation-submission-credentials`, `evaluation-templates`, `organization-administration`, `platform-tenant-administration`, `security-abuse-monitoring`, `user-onboarding`, and `_shared`.
- In the AWS self-hosted deployment, functions run from `/home/ubuntu/yanki-supabase/volumes/functions/`.
- When changing an Edge Function:
  1. Change the repository source first.
  2. Run its tests.
  3. Deploy or copy it to the AWS self-hosted functions environment.
  4. Restart or recreate the functions service as required.
  5. Smoke-test the real endpoint at `http://localhost:8080/functions/v1/<function-name>`.
- Do not use Cloud Edge Function endpoints.

### RPC and REST Verification

- Run RPC and PostgREST tests against the AWS self-hosted environment at `http://localhost:8080/rest/v1/...`.
- `get_my_evaluation_assignments` is an example of an existing working RPC.
- A `200` response alone is not sufficient when stronger verification is practical; also verify the response content and relevant database state.

### Test Strategy

- Unit tests that do not require a network or backend may use mocks or stubs.
- Integration, smoke, and end-to-end tests that require a backend must use AWS self-hosted Supabase.
- Do not present a backend-dependent test as fully verified using only mocks while skipping integration validation.
- State explicitly when a test was not run against the AWS self-hosted environment.

### Backup and Recovery

- The AWS self-hosted environment has an automated backup system.
- The primary disaster-recovery method is PostgreSQL physical `pg_basebackup`; logical `pg_dumpall` backups are also retained.
- Backups are stored in S3 under `daily/` with retention, and a golden backup is retained separately.
- Do not unnecessarily modify or delete backup configuration or backup files during development.

### Network Safety

- Local development reaches Supabase through an SSH tunnel; do not expose Supabase database or gateway ports directly to the public internet.
- If the connection is unavailable, do not expose port `5432`, expose port `8000`, set a Security Group to `0.0.0.0/0`, or fall back to Supabase Cloud.

### Sources of Truth

- Application source: this Git repository.
- Database schema: repository migration files.
- Edge Functions: `supabase/functions/`.
- Development and integration backend: AWS self-hosted Supabase.
- Backups: AWS S3.
- The former Supabase Cloud project remains only as a legacy source/reference until migration is complete and its removal is explicitly approved. Do not perform new development there.

### Required Workflow and Reporting

For every task involving Supabase, Auth, PostgreSQL, RPC, Edge Functions, or backend data:

1. Account for the current AWS self-hosted architecture first.
2. Make required source changes in the repository.
3. Create a migration when the change affects persistent database state.
4. Test against the AWS self-hosted environment when backend access is required.
5. Verify success through the real endpoint or database.
6. Report which files changed, whether a migration was created, whether it was applied to AWS self-hosted Supabase, which tests ran, and whether those tests targeted the AWS self-hosted backend.

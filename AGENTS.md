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

### Accepted AWS Development Baseline

- The accepted synthetic development web origin is `https://18-194-171-29.sslip.io`.
- The public request path is Internet -> TCP/443 -> Caddy -> production Nginx frontend -> same-origin `/supabase` -> self-hosted Supabase gateway. TCP/80 exists only for the `308` HTTPS redirect.
- Public ingress is limited to TCP/80 and TCP/443. Supabase gateway `8000`, PostgreSQL `5432`, transaction pooler `6543`, MCP, Studio, and every other internal service must remain non-public.
- Valid TLS, HSTS, CSP, security headers, same-origin Auth/gateway routing, sensitive-Function direct-denial, browser E2E, accessibility, responsive-layout, and repository quality acceptance passed on 2026-08-18.
- This origin is development-only. Never place new real employee or customer data in it.
- Preserve all migrated data. The accepted inventory includes 6 Auth users, 20 legacy encrypted submissions, existing organization/project/evaluation data, and 30 migration-history rows.
- The 20 legacy encrypted submissions reference unavailable historical development keys. Never delete, modify, re-encrypt, or rename the key identifiers on those rows for testing or repair.
- `AWS_DEV_20260817_01` is the active key identifier for new synthetic development submissions. Its secret value must never appear in Git, frontend configuration, `.env.local`, logs, test output, or reports.
- The accepted migration history ends at `20260817174207_reconcile_self_hosted_security_acl.sql`. Do not replay the first 29 migrations and do not repeat migration baseline repair.

### Canonical Backend

- The canonical development and test backend is the self-hosted Supabase environment running on AWS EC2.
- Public browser and production-frontend acceptance use `https://18-194-171-29.sslip.io` and its same-origin `/supabase` route.
- Local access uses `SUPABASE_URL=http://localhost:8080`, which reaches the Supabase gateway on AWS EC2 through an SSH tunnel.
- Local frontend development may use `VITE_SUPABASE_URL=http://localhost:8080`; public browser acceptance must use the accepted HTTPS origin.
- Load the exact AWS self-hosted public anon/publishable key only from protected ignored configuration or a temporary process environment. Do not assume an unrelated local-stack key matches AWS.
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
- Every new persistent database change requires a new timestamped migration. Do not edit or replay already applied migration history as the normal development workflow.
- The normal routine is feature -> new migration -> AWS DEV apply -> relevant tests -> commit -> GitHub push. Routine additive development migrations may be completed without asking for per-step approval.
- For breaking changes, prefer expand -> deploy -> migrate -> contract. Do not remove an actively used table, column, function, or contract in the same release without a reviewed backward-compatible transition.

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
- Choose the relevant combination of unit, integration, pgTAP, RLS/ACL negative security, Edge Function, Auth, browser E2E, accessibility, responsive-layout, lint, typecheck, build, and memory checks.
- When a routine development test fails, analyze it, fix the source or test as appropriate, and rerun it without pausing for user approval.

### Routine Development Autonomy

- Routine DEV work may add, change, or remove repository files; create and apply migrations; deploy or restart Edge Functions; deploy the frontend; create uniquely named synthetic fixtures; clean only fixtures created by that test; add tests; fix failures; and retest end to end.
- Do not request approval for each routine DEV step. Preserve repository source-of-truth, migrated data, secret boundaries, backup protection, and the accepted network perimeter.
- Split meaningful work into intentional commits, push tested changes to GitHub, and keep the AWS DEV checkout aligned with the repository. Every manual AWS runtime change must have a repository counterpart.

### Backup and Recovery

- The AWS self-hosted environment has an automated backup system.
- The primary disaster-recovery method is PostgreSQL physical `pg_basebackup`; logical `pg_dumpall` backups are also retained.
- Backups are stored in S3 under `daily/` with retention, and a golden backup is retained separately.
- Do not unnecessarily modify or delete backup configuration or backup files during development.

### Network Safety

- Local development reaches Supabase through an SSH tunnel; do not expose Supabase database or gateway ports directly to the public internet.
- Preserve Caddy, Nginx, CSP, HSTS, security headers, the same-origin gateway, and the server-token protection on sensitive Functions.
- If the connection is unavailable, do not expose `5432`, `6543`, `8000`, MCP, or Studio; do not add public Security Group rules for internal services; and do not fall back to Supabase Cloud.

### Environment Promotion And Production Boundary

- The target release path is Codex -> feature branch -> DEV -> tests -> GitHub -> STAGING -> acceptance tests -> backup -> controlled PRODUCTION deployment.
- DEV is the active Codex development environment and contains synthetic data only. STAGING is an isolated production-release rehearsal. PRODUCTION serves approved real users and data.
- Do not convert the `sslip.io` DEV origin directly into production or describe it as a production/customer domain. Future product domains are expected to use reviewed names such as `app.<domain>` and `api.<domain>`.
- Production migrations must be the exact migration files already tested in DEV and STAGING. Do not maintain separate ad hoc DEV and PROD SQL definitions.
- Do not perform interactive feature development or routine direct `execute_sql` against production. Prefer reviewed CI/CD promotion, independently controlled production secrets, pre-deployment backup, and rollback/recovery evidence.
- Production secrets must not be provided to or stored in the ordinary Codex development workspace.

### Mandatory Stop Conditions

Stop and report before proceeding when a task requires any of the following:

- bulk deletion or destructive mutation of existing migrated/real data;
- `DROP TABLE`, `DROP SCHEMA`, or another difficult-to-reverse destructive database change;
- any deletion, modification, re-encryption, or key-id change involving the 20 legacy encrypted submissions;
- a production secret or direct destructive production-database operation;
- public exposure of PostgreSQL, Supabase internal gateway, MCP, Studio, or another internal port;
- a change that would disable or weaken the backup system;
- any mutation of the former Supabase Cloud project.

Outside these conditions, complete routine development end to end.

### Sources of Truth

- Application source: this Git repository.
- Database schema: repository migration files.
- Edge Functions: `supabase/functions/`.
- Development and integration backend: AWS self-hosted Supabase.
- Backups: AWS S3.
- The former Supabase Cloud material remains historical backup/reference only. Do not perform development, tests, reads, or mutations there; remove it only through a separately explicit approved task.

### Required Workflow and Reporting

For every task involving Supabase, Auth, PostgreSQL, RPC, Edge Functions, or backend data:

1. Account for the current AWS self-hosted architecture first.
2. Make required source changes in the repository.
3. Create a migration when the change affects persistent database state.
4. Test against the AWS self-hosted environment when backend access is required.
5. Verify success through the real endpoint or database.
6. Commit and push tested changes, then keep the AWS DEV checkout/runtime aligned when deployment is part of the task.
7. Report what changed, which files changed, whether a migration was created and applied, whether Edge Functions/frontend were deployed, which tests ran, whether AWS DEV was used, whether GitHub was pushed, and any remaining risk.

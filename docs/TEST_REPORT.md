# Test Report

## 2026-08-18 - AWS Development Web And Internal Gateway Acceptance

### Environment

- Windows 11 operator workspace, Node.js 24, Docker Desktop, AWS EC2 Ubuntu 24.04, Docker Engine 29.7.2, Compose 5.4.0, self-hosted Supabase, production Nginx frontend, and digest-pinned Caddy 2.10.2.

### Commands executed

- `npm run check`
- `npm run deployment:config`
- `npm run staging:self-hosted:config`
- Focused AWS deployment/gateway Vitest suite
- Guarded `deploy/aws-development/configure.sh` after `yanki-backup.service`
- Content-free internal HTTP, container, listener, gateway, and read-only PostgreSQL acceptance over SSH
- External HTTP/HTTPS reachability and Caddy certificate-log inspection

### Passed

- Lint, typecheck, 60 Vitest files/275 tests, production build, and memory check passed; the existing roughly 628 kB chunk warning remains.
- Both Docker Compose validation paths passed, including the pinned self-hosted Supabase package.
- The pre-deployment encrypted backup passed and a mode-`0600` pre-change environment snapshot was retained outside Git.
- Supabase API/DB/pooler listeners bind only to `127.0.0.1`; Caddy alone listens on host TCP 80/443.
- Frontend health, CSP, public-only runtime configuration, same-origin Auth, gateway forwarding, direct sensitive-Function `403`, outer `413`, required-token configuration, and all container health checks passed internally.
- Read-only preservation inventory remained 6 Auth users, 20 encrypted submissions, 20 legacy-key submissions, and 30 migrations.

### Failed And Corrected

- Docker Compose validation initially received workspace `docker.exe EPERM`; the unchanged command passed with scoped Docker permission.
- The first AWS checkout status command was quoted incorrectly by PowerShell; an immediate read-only Git/status and shell-syntax check proved the new checkout clean.
- Public certificate issuance failed because AWS TCP 80/443 ingress is closed, not because of Caddy, DNS, frontend, or container health. Caddy received ACME connection timeouts while both local web ports listened correctly.

### Security checks

- No service-role, database, encryption, or gateway secret was printed, committed, or written into browser configuration.
- No migration ran and no existing user, ciphertext, or migration-history row changed.
- The former Supabase Cloud project received no request.

### Remaining risks

- External HTTPS and Playwright acceptance cannot pass until AWS Security Group `sg-02b31e6c73820cc33` allows only inbound TCP 80/443 for the public web path.
- The temporary `sslip.io` name and development key remain forbidden for live employee data.

## 2026-08-17 - AWS Baseline, Security And Encryption Runtime Acceptance

### Environment

- Windows 11 operator workspace, Node.js 24, Supabase CLI 2.109.1, SSH tunnels to AWS EC2, self-hosted Supabase/PostgreSQL 17/Auth/PostgREST/Edge Runtime, and the server's IAM-scoped S3 backup mechanism.

### Commands executed

- Verified `yanki-backup.service` runs before baseline/apply, before encryption change, and after key activation
- Supabase CLI migration repair/list/push dry-run through the loopback PostgreSQL tunnel with SSL disabled for the trusted tunnel
- Read-only PostgreSQL ACL, function, default privilege, RLS, policy, migration-history, key-version, and fixture-residue assertions
- `npm run security:self-hosted:acceptance`
- `npm run smoke:self-hosted:edge`
- `npm run smoke:self-hosted:submission`
- Repository lint, typecheck, Vitest, build, deployment-configuration, and bounded-memory gates

### Passed

- Backup markers `20260817T151150Z`, `20260817T154405Z`, and `20260817T155214Z` reported success. The final set passed all ten SHA-256 checks, contains 11 S3 objects, and includes the server-only active-key entry without printing its value.
- Direct migration-history SQL and CLI inventory match the exact 29 baseline timestamps plus real migration `20260817174207`; the final dry-run reports no pending migration.
- The exact table ACL matrix passed for all 24 tables: no `PUBLIC`/`anon` privilege, authenticated own-profile SELECT only, reviewed service CRUD on 17 tables, and no direct service access to seven sensitive tables.
- All 40 application SECURITY DEFINER functions deny `PUBLIC` and `anon`; authenticated execution is limited to two own-context RPCs. Default ACLs for the verified migration creator no longer recreate broad API grants.
- AWS public-schema lint returned no errors. All ten pgTAP files passed all 210 assertions inside rollback-protected transactions against the persistent database.
- Live HTTP checks passed 24 anonymous table denials, 23 authenticated direct-table denials, own-profile RLS success, two own-context RPC successes, seven sensitive-table denials, service-only RPC denial, and authenticated login.
- Repository and AWS hashes match for all 12 required Edge Functions and five shared modules. The sample `hello` route is absent and the required `main` route remains.
- The synthetic end-to-end flow completed an authenticated one-time credential, anonymous redemption, 544-byte encrypted payload persistence under `AWS_DEV_20260817_01`, replay denial, authorized report decryption, and strict fixture cleanup.
- Post-cleanup residue counts are zero for every synthetic project/cycle/assignment/submission/platform-user fixture created by acceptance.
- `npm run check` passed lint, typecheck, all 59 Vitest files and 270 tests, the production build, and bounded-memory verification. `npm run deployment:config` and `npm run staging:self-hosted:config` passed against Docker Engine.

### Failed And Corrected

- The CLI initially required explicit `PGSSLMODE=disable` because the database connection already ran inside a trusted SSH tunnel; the corrected mode was used for all migration operations.
- Docker-backed configuration checks initially received workspace `docker.exe EPERM`; rerunning the same read-only validation with explicit Docker permission passed.
- Supabase CLI's pgTAP helper could not reach a loopback-only SSH tunnel from its Docker test container. Tests were instead streamed without credentials into `psql` inside the AWS database container, and every TAP plan/result was checked.
- The anonymous abuse test initially assumed empty global counters. It now captures a transaction-local pre-test baseline and verifies the exact test delta without deleting or changing existing rows; all 54 assertions in that suite then passed.
- The first S3 key-entry verification command was interrupted after a quoting-related hang. Its temporary file was securely removed, and the result was proved instead by local backup checksum, key-name-only inspection, S3 object metadata, and object count.

### Security checks

- No secret value appeared in Git, frontend configuration, fixtures, logs, terminal evidence, or this report. The AWS `.env` and pre-change secret snapshot are root-controlled mode `0600`.
- Existing ciphertext and key identifiers were never updated, re-encrypted, or deleted. Read-only inventory remains exactly 20 legacy records: 11 under `DEV_20260807_01` and 9 under `development-v1`.
- Read-only recovery search found neither legacy secret. The new key was not reused as a substitute and only the Functions service was recreated.
- No operation targeted the former Supabase Cloud project.

### Remaining risks

- `encryption-key-health` correctly reports active configuration valid but global historical coverage incomplete until the two missing development keys are recovered or every referencing record expires under an approved policy.
- The production JavaScript build retains the known large-chunk warning.

## 2026-08-17 - Self-Hosted ACL Reconciliation Static Acceptance

### Environment

- Windows 11, Node.js 24, Vitest 4, Vite 8, repository source, and the AWS self-hosted PostgreSQL metadata exposed through the `supabase-self-hosted` MCP over the local SSH tunnel.

### Commands executed

- Read-only `SELECT` inventory through `supabase-self-hosted/execute_sql`
- `npx vitest run tests/self-hosted-security-reconciliation.test.mjs`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

### Passed

- Read-only inventory confirmed 24 application tables, 58 public functions, 40 SECURITY DEFINER functions, explicit search paths on every SECURITY DEFINER function, no untrusted public-schema CREATE privilege, and the imported broad API-role ACL drift.
- `pg_default_acl` proved that both `postgres.public` and `supabase_admin.public` currently default new tables, sequences, and functions to broad API-role grants. All current public application objects and the migration connection are `postgres`; no current public object is owned by `supabase_admin`.
- The focused suite passed all 9 tests. Its ACL interpreter simulated every migration GRANT/REVOKE from the observed broad starting state and proved the exact 24-table and 40-function target matrices plus the three schema-scoped future-object default revocations.
- Static caller coverage proved all seven sensitive tables have no direct frontend/Edge/runtime-script `.from(...)` caller, all 32 service-role RPCs stay outside frontend database calls, the two authenticated own-context RPCs remain available, and the anonymous flow reaches tables only through trusted RPCs.
- Static coverage also proved frontend source contains no service-role credential, invitation context checks precede identity writes, `rls_auto_enable()` and `supabase_admin` defaults are excluded, and no unreviewed top-level destructive statement exists.
- `npm run lint` and `npm run typecheck` passed.
- `npm test` passed all 59 files and 270 tests.
- `npm run build` passed.

### Failed And Corrected

- The first focused run passed five security checks but the frontend-source scanner returned nested file contents as parent file paths. The test-only recursive reader was corrected and all six checks passed.
- After adding default-privilege statements, the ACL parser initially crossed a semicolon from plural `ON TABLES` into the next singular `ON TABLE` statement. The parser was constrained to one SQL statement and all nine focused checks passed.

### Security checks

- AWS reads used only the self-hosted MCP and SELECT statements.
- No migration, SQL mutation, migration-history repair, database push, Edge Function deployment, or old Supabase Cloud request occurred.
- The proposed ACL leaves no table grant for `PUBLIC` or `anon`, grants authenticated users only own-profile SELECT plus two own-context RPCs, and preserves only reviewed service-role table/RPC boundaries.
- Future defaults are changed only for `postgres` in `public`; Supabase platform creator roles, platform schemas, and existing platform objects remain untouched.

### Skipped

- The new migration was not parsed or executed by PostgreSQL because the requested phase is static design only.
- Baseline repair, reconciliation apply, advisor rerun, and live authorization/anonymous-flow acceptance were intentionally not performed pending explicit approval.

### Remaining risks

- Static migration intent does not prove runtime behavior until baseline and apply are separately approved and the post-apply AWS acceptance plan passes.
- The production build retains the known roughly 628 kB JavaScript chunk warning.

## 2026-08-16 - Responsive UI And Platform Tenant Acceptance

### Environment

- Windows 11, Node.js 24, React 19, Vite 8, Vitest, Playwright Chromium, Docker Desktop, Supabase CLI 2.109.1, local synthetic Supabase, Edge Functions, and Mailpit.

### Commands executed

- Focused administration, service, route, cleanup, and trusted-boundary Vitest suites
- `npm run lint`
- `npm run typecheck`
- `npm run supabase:test:local`
- `npm run e2e:local`
- `npm run supabase:push:dry-run`
- Linked migration push/list, linked schema lint, and Edge Function deployment
- `npm run check`

### Passed

- Platform customer component/service tests covered Turkish slug normalization, first-administrator payloads, content-free parsing, pending-invitation renewal, and platform-only module visibility.
- All 210 pgTAP assertions across ten suites passed. The new suite proves exact platform authorization, organization-admin denial, authenticated browser execute denial, idempotent tenant creation, onboarding-only listing, and content-free actor audit events.
- All three Playwright tests passed against real local Auth, PostgreSQL, Edge Functions, and Mailpit. The lifecycle created a customer tenant, checked every administration module at 1440/1024/390 pixels, completed a 1-to-10 mobile evaluation, displayed its detailed report, enforced access denials, and removed two tenants plus five users.
- Public/auth WCAG checks and keyboard operation remained clean. No tested page produced horizontal document overflow or a clipped visible interactive control.
- `npm run check` passed lint, typecheck, all 58 Vitest files and 261 tests, the production build, and bounded-memory verification.
- Linked schema lint returned no errors, local and remote migration histories contain `20260816170000`, and the new Edge Function deployed successfully.

### Failed And Corrected

- The first multi-tenant lifecycle renamed the newest customer because the old test assumed only one organization; strict cleanup refused the changed fixture. The test now selects the intended organization explicitly, recognizes the customer fixture separately, and retained fail-closed cleanup.
- An exact organization selector initially matched both the organization dropdown and organization-name input, and invitation setup initially inherited the newest customer. Role-based exact selectors and explicit organization selection corrected both assumptions.
- Supabase CLI telemetry could not write through the workspace sandbox; the unchanged pgTAP command passed under its existing scoped approval.
- The linked migration completed but its optional pg-delta catalog cache emitted the known missing-certificate warning. Exact migration history and linked schema lint confirmed the database change.

### Security checks

- The browser contains no service-role key or fingerprint and calls only the authenticated Edge Function.
- Exact active platform scope is checked in both Edge and PostgreSQL; organization administrators cannot list or create tenants.
- Tenant onboarding summaries and audit metadata contain no evaluation content, ciphertext, invitation token, raw action link, password, or service-role credential.

### Skipped

- No existing linked organization administrator was silently elevated to platform scope; first-platform-operator provisioning remains a separate trusted operation.
- Real SMTP, public DNS/TLS, AWS staging, and live customer onboarding were not used.

### Remaining risks

- Production invitation behavior still depends on approved Supabase Auth Site URL, redirect allow-list, SMTP, and password-policy configuration.
- The production build retains the known roughly 628 kB JavaScript chunk warning.

## 2026-08-16 - Administration And Retention Acceptance

### Environment

- Windows 11, Node.js 24, React 19, Vite 8, Vitest, Playwright Chromium, Docker Desktop, Supabase CLI 2.109.1, local synthetic Supabase, and the linked synthetic development project.

### Commands executed

- Focused administration/reporting/static Vitest suites
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run supabase:lint:local`
- `npm run supabase:lint:linked`
- `npm run supabase:test:local`
- `npm run e2e:local`
- `npm run supabase:push:dry-run`
- Linked migration push/list and organization-administration Edge Function deployment
- `npm run check`

### Passed

- Focused coverage passed 7 files and 25 tests; the complete suite passed 55 files and 251 tests.
- Local and linked database lint returned no schema errors, and all 194 pgTAP assertions across nine suites passed.
- Retention tests proved expired evaluation content is removed, in-window content is retained, disabled automation performs no deletion, legal holds prevent deletion, and browser/authenticated roles cannot execute the retention function.
- All three Playwright tests passed organization rename, equal administration-tab geometry, aligned hierarchy content, row-based choice editing, encrypted submission, detailed reports, access denials, WCAG checks, keyboard operation, desktop/mobile overflow checks, and strict fixture cleanup.
- The new migration is present in both local and linked histories, and the updated Edge Function deployed successfully.

### Failed And Corrected

- The first E2E cleanup rejected the intentionally renamed synthetic organization because its exact fail-safe fixture name had changed. The test now restores the original synthetic name before cleanup, and the leftover fixture was removed.
- Lint detected one obsolete report-reset helper after search removal. The unused helper was removed and lint passed unchanged afterward.
- Supabase CLI telemetry could not write to the sandboxed user profile; the same approved commands passed outside that write restriction.

### Security checks

- Organization renames require an active tenant-scoped system administrator at the Edge Function and database boundaries; the stable slug is preserved and the audit event contains no submitted name.
- Choice editing changes only immutable template-draft structure and does not alter anonymous evaluator separation.
- The retention timer loads credentials from an operator-owned environment file and includes no secret in source control or browser configuration.

### Skipped

- The systemd timer was not installed on the Windows development workstation; its unit contract is statically verified and is intended for Linux production/dedicated hosts.
- No live employee content, production SMTP provider, public DNS/TLS environment, or customer server was used.

### Remaining risks

- Automatic retention is not active on a deployment until an operator installs and enables the included timer with valid server-only credentials.
- The production build retains the known roughly 610 kB JavaScript chunk warning.

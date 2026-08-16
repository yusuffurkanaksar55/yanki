# Test Report

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

## 2026-08-16 - AWS Staging Infrastructure Definition Acceptance

### Environment

- Windows 11, Node.js 24, OpenTofu 1.12.1, locked AWS provider 6.60.0, existing repository dependencies, and no AWS credentials or cloud resources.

### Commands executed

- `npm run staging:infra:tool:install`
- `npm run staging:infra:check`
- Focused staging-infrastructure and deployment-foundation Vitest suites through the local Vitest entry point with one worker
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

### Passed

- The local OpenTofu executable matched both the pinned version and derived executable SHA-256; the installer retains the official archive SHA-256 pin.
- OpenTofu format, locked-provider initialization with no backend, and configuration validation passed.
- The infrastructure regression proved required files and locks, SSM administration, absence of SSH/RDP ingress, public web ports only, KMS-encrypted storage, IMDSv2, monitoring, termination protection, minimum host capacity, encrypted remote-state guidance, secret-free user data, and absence of automated plan/apply behavior.
- Focused tests passed 2 files and 11 tests. The full suite passed 55 files and 249 tests; lint, typecheck, and the production build passed.

### Failed And Corrected

- The first focused `npx vitest` wrapper call reached the 30-second command window without returning a final result and left no process. The unchanged suites passed in 3.9 seconds when invoked through the local Vitest entry point with one worker; no application or infrastructure defect was reproduced.

### Security checks

- No AWS credential, application secret, database password, JWT value, SMTP credential, gateway token, backup credential, or evaluation key is present in OpenTofu inputs or cloud-init.
- The EC2 security group contains no TCP/22, TCP/3389, database, Studio, or internal Supabase ingress rule.
- Validation did not initialize a state backend, contact an AWS account, run a plan, apply resources, or create cloud cost.

### Skipped

- AWS account authentication, remote-state initialization, saved plan, second-person plan review, and resource apply were intentionally not performed because reviewed environment identifiers and operator approval are not available.
- DNS/TLS, full pinned-stack runtime, SMTP, monitoring, capacity, remote backup, and isolated recovery acceptance remain assigned to the resulting staging environment.

### Remaining risks

- A valid infrastructure definition does not prove AWS service availability in the selected zone, routing, KMS/IAM permissions, cloud-init completion, public TLS, or runtime capacity.
- The production build retains the known roughly 610 kB JavaScript chunk warning.

## 2026-08-12 - Docker And Pinned Self-Hosted Configuration Acceptance

### Environment

- Windows 11, Node.js 24, Docker Desktop 4.85.0 / Engine 29.6.2, Supabase CLI 2.109.1, existing synthetic local Supabase/PostgreSQL, production Nginx container, Mailpit, Playwright Chromium, and the pinned official Supabase Docker source at commit `b5462a96090949a4a39b2e8e10b3baedc8a10781`.

### Commands executed

- `npm run docker:acceptance`
- Focused `src/app/App.test.tsx` Vitest retry
- `npm run check`
- Official self-hosted configuration-only acceptance through the Docker gate

### Passed

- Application Compose and the hash-verified official self-hosted Compose overlay both validated.
- Local schema lint returned no errors and all 186 pgTAP assertions across eight database suites passed.
- All three production-container Playwright tests passed: invitation/password/acceptance, immutable template and project assignment, encrypted anonymous submission, immediate subject-labelled reporting, system-admin/self denials, direct sensitive-endpoint denial, WCAG, keyboard use, and mobile overflow.
- Synthetic cleanup removed one tenant and four users.
- The compressed 702,350-byte database stream restored into a disposable target; all nine migration, table, function, and privilege invariants passed; the target and temporary frontend image/container were removed.
- Browser runtime configuration contained only the same-origin public URL and anon key, never the service-role, gateway, database, or evaluation-encryption secret.
- Final application checks passed 54 Vitest files and 243 tests, lint, typecheck, the production build, and bounded-memory verification.

### Failed And Corrected

- Starting a second complete Supabase image set expanded the Docker Desktop WSL disk and reduced system-drive headroom. The run was stopped before database creation, its unused images and one unstarted Mailpit container were removed, and the daily gate was changed to reuse the existing synthetic stack.
- The first Docker orchestrator used nested `npm.cmd` processes and hit Windows `spawnSync EINVAL`. It now invokes each reviewed Node CLI directly.
- The first full Vitest pass after Docker acceptance timed out once in the authenticated profile-loading assertion under concurrent test load. The unchanged focused file passed in 275 ms and the unchanged full quality gate then passed all 243 tests; no product defect or code change was indicated.

### Security checks

- Verified direct anonymous sensitive-endpoint access without the Nginx gateway token returns `403`.
- Verified evaluated users and system administrators cannot read subject reports, while the scoped reviewer can read aggregate scores and identity-separated subject-labelled comments.
- Verified browser and service roles retain no restored ciphertext, retention executor, or recovery-canary access.

### Skipped

- The duplicate full official stack was not retained on this storage-constrained workstation. Its configuration, source commit, and hashes passed; runtime acceptance remains assigned to a properly sized isolated staging host.
- No production TLS/DNS, SMTP provider, live employee data, production key custody, alert receiver, capacity load, or remote backup provider was used.

### Remaining risks

- Full pinned-stack, real-network, and provider evidence remains a critical production gate.
- Docker Desktop's WSL virtual disk may retain physical size after internal image deletion; local acceptance must continue reusing one Supabase stack.
- The production build retains the known roughly 609 kB JavaScript chunk warning.

## 2026-08-12 - SaaS Production Readiness And Platform Scope Regression

### Environment

- Windows 11, Node.js 24, React 19, Vite 8, Vitest, Docker Desktop, Supabase CLI 2.109.1, local Supabase/PostgreSQL, and the linked synthetic development project.

### Commands executed

- Focused administration, key-health, abuse-boundary, database-inventory, and deployment-foundation Vitest suites
- `npm run check`
- `npm run supabase:test:local`
- `npm run supabase:lint:local`
- `npm run supabase:lint:linked`
- `npm run supabase:push:dry-run`
- `npm run deployment:config`
- `npx supabase db push --linked --include-all --yes`
- Linked deployment of `encryption-key-health` and `security-abuse-monitoring`
- `npx supabase migration list --linked`

### Passed

- Focused coverage passed 5 files and 22 tests.
- Full application checks passed 54 Vitest files and 243 tests, lint, typecheck, the production build, and bounded-memory verification.
- All 186 pgTAP assertions across eight database suites passed, including platform-scope positive access and organization-scope denial for global abuse monitoring.
- Local and linked database lint found no schema errors, Compose configuration validation passed, and the linked dry-run selected only `20260812120000_platform_security_operations_scope.sql`.
- The migration inventory confirmed RLS is enabled for every application table created in source-controlled migrations.
- The linked project recorded migration `20260812120000` and both affected Edge Functions deployed successfully.

### Failed And Corrected

- The local database container was already stopped with the documented exit `137` condition. A data-preserving Supabase stop/start restored the full stack.
- The first pgTAP command could not write the Supabase CLI telemetry file outside the workspace sandbox. The unchanged command passed in the approved local Supabase execution boundary.
- The first Compose validation could not spawn Docker from the workspace sandbox. The unchanged command passed in the approved Docker execution boundary.
- The remote push applied successfully but Supabase CLI 2.109.1 could not refresh its optional pg-delta catalog cache because a temporary CA file was missing. A separate linked migration-list query confirmed exact local/remote migration parity.

### Security checks

- Verified organization-scoped system administrators cannot see or invoke platform-global key-health and abuse diagnostics.
- Verified platform-scoped system administrators retain content-free diagnostics without receiving keys, versions, identities, tenant identifiers, credentials, ciphertext, or evaluation content.
- Verified no privileged secret or linked development project identifier remains in the checked-in browser environment example.

### Skipped

- No production employee data, AWS production account, public TLS/DNS environment, approved SMTP relay, production encryption key, or customer server was used.

### Remaining risks

- The production build passes with a roughly 610 kB JavaScript chunk warning; route-level code splitting remains planned.
- Production approval still requires the critical staging, data-residency, secret custody, monitoring, backup/recovery, SMTP, and capacity evidence recorded in the readiness assessment.

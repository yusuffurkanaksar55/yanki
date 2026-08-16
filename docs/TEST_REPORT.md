# Test Report

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

## 2026-08-10 - Detailed Person Report Regression

### Environment

- Windows 11, Node.js 24, React 19, Vite 8, Vitest, Playwright Chromium, Docker Desktop, and local Supabase/Functions/Mailpit.

### Commands executed

- Focused `EvaluationReportsPanel` Vitest suite
- `npm run check`
- `npm run e2e:local`
- Desktop 1440x1000 and mobile 390x844 report screenshot inspection

### Passed

- Full application checks passed 53 Vitest files and 238 tests, lint, typecheck, production build, and bounded-memory verification.
- All three Playwright tests passed, including invitation, immutable template, assignment, encrypted submission, automatic person-report loading, detailed summary visibility, identity-separated comments, administrator/self denial, WCAG, keyboard, mobile overflow, and cleanup.
- The empty-report component test opened a clearly marked six-question synthetic example without issuing another backend request.
- Desktop and mobile report captures showed readable metrics, insights, percentage distributions, comments, and no horizontal overflow.

### Failed And Corrected

- The first lint run found one unused aggregation parameter; the redundant parameter was removed and the full quality gate passed.
- The first sandboxed E2E attempt hit the known Supabase telemetry write boundary, and the approved retry found the local database container stopped. A data-preserving full Supabase stop/start restored the stack; unchanged E2E retries passed twice.
- Screenshot review found desktop filter labels vertically offset by the cycle context line. The grid now aligns labels at the top and places the action button on the input row.

### Security checks

- Verified no evaluator-level field, answer slice, or cross-question linkage was added to the report contract.
- Verified the example is frontend-only, visibly marked as synthetic, and does not replace actual empty/report authorization states.
- Existing active system-administrator and evaluated-person report requests remained denied in the critical lifecycle.

### Skipped

- No production employee data, approved SMTP mailbox, public TLS/DNS staging environment, or customer server was used.
- Production-container E2E was not rerun because the reporting change is frontend-only and the same production-container boundary passed in the immediately preceding report regression.

### Remaining risks

- One or a few real responses can still permit contextual inference; the report retains the warning.
- The production build passes with a 609.46 kB JavaScript chunk warning; route-level code splitting remains planned.

## 2026-08-10 - Person-First Report Selection Regression

### Environment

- Windows 11, Node.js 24, React 19, Vite 8, Vitest, Playwright Chromium, Docker Desktop, local Supabase/Functions/Mailpit, linked synthetic Supabase, and the Codex in-app browser.

### Commands executed

- Focused report-panel Vitest suite
- `npm run check`
- `npm run e2e:local`
- `npm run e2e:container:local`
- Manual 1440x1000 and 390x844 report-filter browser review

### Passed

- Full application checks passed 53 Vitest files and 238 tests, lint, typecheck, production build, and bounded-memory verification.
- Vite and production-container modes each passed all three Playwright tests, including person selection, dependent cycle selection, encrypted submission, visible identity-separated comments, administrator/self denial, WCAG, keyboard, mobile overflow, and cleanup.
- Manual linked-data review filtered the person list to one team leader, listed only that person's cycles, and rendered the subject in the report header plus both comment-group headings.
- Desktop and mobile report views had no horizontal overflow.

### Failed And Corrected

- None.

### Security checks

- The UI exposes only the evaluated person already present in the authorized report target; no evaluator identity or new backend field was added.
- Existing system-administrator, self-access, scope, and manager-relationship boundaries remained covered by the critical lifecycle.

### Skipped

- No production employee data, customer server, approved SMTP mailbox, or public TLS/DNS staging environment was used.

### Remaining risks

- Large organizations may eventually benefit from a server-paginated accessible combobox; the current client-side search is appropriate for the already authorized target set.
- The production build passes with a roughly 598 kB JavaScript chunk warning.

# Development Log

## 2026-08-18 - Canonical AWS Development And Gated Promotion Policy

### Objective

Make the accepted AWS self-hosted environment and the DEV-to-STAGING-to-PRODUCTION delivery model the permanent operating contract for future repository work.

### Changes

- Expanded `AGENTS.md` with the accepted HTTPS/network/security baseline, synthetic-only data rule, protected migrated-data inventory, active development key identifier boundary, exact migration baseline, routine DEV autonomy, test strategy, stop conditions, and required completion report.
- Corrected the development environment model so canonical AWS self-hosted Supabase replaces the obsolete managed/local-backend option while preserving the trusted loopback operator tunnel.
- Added ADR-0037 for forward migrations, repository/AWS synchronization, exact artifact promotion, production secret isolation, non-interactive production development, and expand/deploy/migrate/contract schema evolution.
- Updated architecture, deployment, readiness, project priorities, changelog, and project-memory regression coverage to enforce the policy as current truth.

### Database changes

None. No migration, SQL, Edge Function, frontend runtime, AWS configuration, or data mutation was required.

### Security impact

Positive. The policy permanently forbids public internal ports, Supabase Cloud fallback, legacy-ciphertext intervention, destructive migrated-data testing, production secrets in the development workspace, and interactive production feature development while retaining routine autonomy inside synthetic DEV.

### Tests performed

- Focused project-memory acceptance passed 1 file and 6 tests.
- `npm run check` passed lint, typecheck, 60 files/276 tests, production build, and bounded-memory verification.
- The canonical AWS DEV HTTPS health endpoint passed; public TCP 8000/5432/6543 remained closed.

### Result

Future work now follows one durable contract: routine end-to-end development in canonical AWS DEV, real test barriers, GitHub source-of-truth, isolated staging rehearsal, and controlled production promotion.

### Remaining work

- Provision and accept the isolated OpenTofu staging environment before the first production release.
- Complete production DNS, independent secret custody, SMTP, monitoring, capacity, backup/recovery, and controlled CI/CD evidence before live employee data.

## 2026-08-18 - AWS Development Web Ingress And Gateway Activation

### Objective

Deploy the production frontend shape to the canonical AWS self-hosted development host, enforce same-origin browser access and direct sensitive-Function denial, and preserve all imported data while preparing real HTTPS acceptance.

### Changes

- Added a pinned Caddy TLS proxy, production Nginx frontend container, AWS Compose override, guarded configuration script, and repeatable HTTPS/browser acceptance commands.
- Changed published Supabase API, PostgreSQL, and transaction-pooler ports to loopback-only bindings; only web TCP 80/443 remain host-public.
- Activated one generated server-only sensitive-gateway token in Nginx and Functions, enabled fail-closed enforcement, and updated self-hosted Auth/public URLs for same-origin `/supabase` routing.
- Added a restrictive frontend Content Security Policy and documented the temporary synthetic-development hostname and production limitations.
- Required a successful encrypted `yanki-backup.service` run plus a protected pre-change environment snapshot before applying runtime configuration.

### Database changes

None. No migration or application-data mutation was performed. Read-only post-deployment inventory remained 6 Auth users, 20 encrypted submissions, 20 preserved legacy-key submissions, and 30 migration-history rows.

### Security impact

Positive. Internal and external acceptance proved public-only runtime configuration, same-origin Auth, gateway token injection, `403 SENSITIVE_GATEWAY_REQUIRED` for direct sensitive-Function access, `413` outer body rejection, valid public TLS, HSTS/CSP, HTTP-to-HTTPS redirect, and closed public Supabase/PostgreSQL ports. AWS Security Group `sg-02b31e6c73820cc33` allows only the required public TCP 80/443 web ingress.

### Tests performed

- `npm run check` passed 60 files and 275 tests plus lint, typecheck, build, and bounded-memory verification.
- `npm run deployment:config` and `npm run staging:self-hosted:config` passed with Docker Engine.
- AWS internal frontend, runtime-config, Auth, gateway-forwarding, direct-denial, body-limit, container-health, port-binding, backup, and read-only data-preservation checks passed.
- External HTTPS smoke acceptance passed every header, runtime-config, Auth, gateway, direct-denial, and request-size assertion after the reviewed web-ingress rule was added.
- Chromium public/authentication WCAG, mobile/desktop overflow, clipped-control, and keyboard E2E acceptance passed 2/2 tests against the real HTTPS origin.
- A valid Let's Encrypt certificate was issued for the temporary development hostname; all six required runtime containers are healthy.

### Result

The AWS development web and same-origin gateway layers are deployed and externally accepted at revision `d1aa91a535f1dd2dd2fe692e02da5cd574c933b1` through `https://18-194-171-29.sslip.io`. This is synthetic development evidence, not production approval.

### Remaining work

- Replace the temporary `sslip.io` hostname with reviewed product DNS and production controls before live data.
- Complete approved SMTP, infrastructure monitoring, alert receiver, capacity, and production key/custody acceptance before live employee use.

## 2026-08-17 - AWS Self-Hosted Baseline, ACL And Encryption Acceptance

### Objective

Complete the explicitly approved AWS self-hosted development acceptance without replaying imported migrations or changing existing evaluation content, then establish a new recoverable development encryption key for future synthetic submissions.

### Changes

- Ran and verified physical PostgreSQL, logical PostgreSQL, configuration, Functions, image-manifest, and checksum backups before baseline/apply and before key activation; created a separate mode-`0600` pre-change server environment snapshot.
- Marked the 29 repository migrations already present in the imported schema as applied without executing their SQL, independently verified the history, and applied only `20260817174207_reconcile_self_hosted_security_acl.sql` as migration 30.
- Reconciled all 24 table ACLs, 40 application SECURITY DEFINER ACLs, the orphaned `rls_auto_enable()` API exposure, and future `postgres.public` table/sequence/function defaults while retaining only reviewed browser and trusted-service access.
- Added repeatable live acceptance scripts for table/RPC denial, authenticated own-context success, trusted Edge Function routes, and the complete anonymous encrypted-submission flow.
- Generated one cryptographically secure 32-byte base64 key as `AWS_DEV_20260817_01`, stored it only in the AWS Functions server environment, preserved additive keyring compatibility, recreated only the Functions service, and captured the active configuration in the verified encrypted S3 backup set.
- Reclassified the former Supabase Cloud endpoint as inactive across current setup, environment, architecture, fixture, and readiness documentation.

### Database changes

Migration `20260817174207_reconcile_self_hosted_security_acl.sql` is applied. It changes function definitions/ACLs and existing/future privileges only; it performs no application data mutation. Direct SQL history contains the exact 30 repository timestamps.

### Security impact

Positive. Anonymous users have no direct table or application-function access; authenticated users retain only own-profile SELECT and two own-context RPCs; service-role direct table access is limited to 17 reviewed identity/configuration tables. The new key remains server-only and new ciphertext uses its unique version. The 20 imported records under `DEV_20260807_01` and `development-v1` remain unchanged and unavailable because their original secrets could not be found; no fake key or re-encryption was attempted.

### Tests performed

- Live HTTP authorization acceptance passed all anonymous/authenticated table and RPC denial/success checks plus real Auth login.
- All required Edge Function administration, diagnostics, retention, template, bootstrap, reporting, and abuse-monitoring smoke calls passed against AWS.
- The synthetic authenticated credential, anonymous redemption, AES-256-GCM persistence, replay denial, authorized reporting/decryption, and strict fixture cleanup flow passed under `AWS_DEV_20260817_01`.
- AWS public-schema lint reported no errors, and all 210 pgTAP assertions across ten transaction-rollback suites passed against the persistent database after making the global abuse-counter test baseline-aware.
- `npm run check` passed lint, typecheck, all 59 Vitest files and 270 tests, production build, and bounded-memory verification. Compose and pinned self-hosted staging configuration checks also passed.
- Backup `20260817T155214Z` passed all ten checksum checks and uploaded 11 objects to S3; its `.env` object contains the active key entry without exposing the value.

### Result

AWS self-hosted development is the canonical accepted backend with exact migration history, least-privilege ACLs, matching Edge Function source, and working encryption for new synthetic submissions. Imported legacy ciphertext remains preserved as `OLD_KEY_UNAVAILABLE`.

### Remaining work

- Recover the two historical development keys only from a verified custody source or retain/expire those records under an approved development-data decision.
- Move production keys into an approved independent secret manager and offline recovery escrow, then complete isolated database-plus-key restore acceptance before live employee data.
- Complete production DNS/TLS, SMTP, monitoring, capacity, and customer-facing operational acceptance.

## 2026-08-17 - Self-Hosted Security ACL Reconciliation Design

### Objective

Prepare one reviewable, data-preserving migration that reconciles the imported AWS self-hosted table and function ACLs with the repository's trusted-boundary design, without changing AWS schema, data, migration history, or Edge Functions.

### Changes

- Completed a read-only effective-privilege inventory for all 24 public tables and all 58 public functions, including explicit `PUBLIC` execution, owners, security mode, and `pg_proc.proconfig` search paths.
- Confirmed through `pg_default_acl` that `postgres.public` and `supabase_admin.public` defaults recreate broad API grants; verified that `postgres` is the active migration role and owns every current public application object.
- Added one unapplied reconciliation migration that converges table ACLs, converges 40 proven application function ACLs, and records the hardened AWS invitation-acceptance checks as the forward source of truth.
- Scoped future-object default revocation to `FOR ROLE postgres IN SCHEMA public`, including PostgreSQL 17 table `MAINTAIN` and sequence privileges, while leaving every Supabase platform creator role and schema unchanged.
- Added a behavioral ACL simulator and repository-wide caller scanner that verify the exact 24-table, 40-function, 32 service-role RPC, two authenticated RPC, and anonymous-submission boundaries instead of relying only on SQL string matches.
- Documented the complete SECURITY DEFINER risk matrix, 24-table caller matrix, 32-RPC caller map, anonymous flow, platform-specific `rls_auto_enable()` exclusion, 29-timestamp baseline plan, post-apply acceptance sequence, and recovery approach.

### Database changes

Migration `20260817174207_reconcile_self_hosted_security_acl.sql` was created but deliberately not applied. It contains schema-scoped default-privilege hardening for the verified `postgres` application creator, but no top-level data mutation, destructive table/schema operation, migration-history change, or platform-role/function change.

### Security impact

Positive when approved and applied. The design removes direct broad API execution from sensitive functions, prevents the same grants from recurring on future `postgres.public` objects, preserves only the two authenticated own-context RPCs, keeps anonymous submission behind service-role Edge Function calls, limits trusted direct table access to reviewed CRUD tables, and preserves active organization/unit/manager invitation checks before identity writes.

### Tests performed

- The focused reconciliation suite passed 9 tests.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed all 59 files and 270 tests.
- `npm run build` passed with the existing large-chunk warning.

### Result

The repository now contains a reviewable reconciliation artifact and acceptance plan. AWS remains unchanged pending explicit approval for the separate baseline and apply operations.

### Remaining work

- Review and explicitly approve the 29-timestamp baseline operation.
- Verify the baseline history independently, then explicitly approve applying only migration `20260817174207`.
- Repeat ACL, RLS, advisor, unauthorized, authenticated, anonymous, and trusted-boundary acceptance against AWS after apply.

## 2026-08-16 - Responsive Surface Audit And Platform Customer Onboarding

### Objective

Eliminate remaining layout drift across every primary application surface and implement the next real SaaS operation: creating a customer organization and its first administrator without exposing privileged bootstrap credentials to the browser.

### Changes

- Unified protected dashboard and administration page widths, exposed every administration module in a responsive mobile grid, normalized panel spacing, aligned report actions, reset hash-route scroll position, and made 1-to-10 rating controls fit mobile screens.
- Added automatic 1440, 1024, and 390-pixel overflow plus interactive-control clipping checks across all administration modules, public/auth pages, dashboards, assignments, the evaluation dialog, and reports.
- Added a platform-only customer onboarding module with company/slug/initial-unit/first-administrator creation, onboarding metrics, content-free tenant summaries, and pending-invitation renewal.
- Reused the existing idempotent bootstrap and Supabase Auth delivery instead of introducing a second provisioning model; retained the CLI for first-platform-operator and dedicated installation use.
- Extended strict synthetic fixture cleanup to recognize and remove both the primary E2E organization and the platform-created customer tenant.

### Database changes

Migration `20260816170000_platform_tenant_administration.sql` adds exact platform-system-administrator authorization plus service-role-only tenant list, bootstrap wrapper, and initial-invitation renewal functions. Browser roles have no execute grant and every operation repeats authorization in PostgreSQL.

### Security impact

Positive. Service-role credentials remain in the Edge Function, organization administrators cannot discover or create other tenants, the new list contains only identity-domain onboarding metadata, Auth failures compensate only the newly created identity, and no evaluation table or content is read.

### Tests performed

- Focused component, service, static-boundary, app-route, and cleanup suites passed.
- All 210 pgTAP assertions across ten suites passed, including platform success, organization-admin denial, direct browser denial, content-free listing, audit metadata, and invitation renewal.
- The complete local Playwright lifecycle passed all three tests, created and removed two synthetic tenants and five users, exercised a real customer opening through the new Edge Function, and checked every supported viewport without horizontal overflow or clipped controls.
- `npm run check` passed lint, typecheck, all 58 Vitest files and 261 tests, the production build, and bounded-memory verification.
- The migration was applied to the linked synthetic development project, linked schema lint passed, migration history matched, and `platform-tenant-administration` deployed successfully.

### Result

The main frontend surfaces now share stable responsive constraints and are protected by a broader visual regression contract. An authorized Yankı platform operator can onboard a sold SaaS customer from the UI while dedicated installations retain the reviewed CLI path.

### Remaining work

- Provision or designate the first exact platform operator through the reviewed trusted process before using the new linked-project UI; do not elevate an organization administrator implicitly.
- Complete approved production SMTP, domain/TLS, AWS staging, monitoring, capacity, backup, and recovery acceptance before onboarding a real customer.
- Add route-level code splitting for the known production JavaScript chunk warning.

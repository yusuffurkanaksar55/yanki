# Development Log

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

Positive. Internal acceptance proved public-only runtime configuration, same-origin Auth, gateway token injection, `403 SENSITIVE_GATEWAY_REQUIRED` for direct sensitive-Function access, and `413` outer body rejection. Public certificate issuance remains blocked until AWS Security Group `sg-02b31e6c73820cc33` allows inbound TCP 80/443; the endpoint is not accepted for external use before that gate passes.

### Tests performed

- `npm run check` passed 60 files and 275 tests plus lint, typecheck, build, and bounded-memory verification.
- `npm run deployment:config` and `npm run staging:self-hosted:config` passed with Docker Engine.
- AWS internal frontend, runtime-config, Auth, gateway-forwarding, direct-denial, body-limit, container-health, port-binding, backup, and read-only data-preservation checks passed.
- External HTTP/HTTPS and certificate acceptance correctly failed while AWS ingress remains closed.

### Result

The AWS development web and same-origin gateway layers are deployed at revision `d1aa91a535f1dd2dd2fe692e02da5cd574c933b1`. The final public HTTPS and Playwright gates are pending only the reviewed AWS Security Group web-ingress change.

### Remaining work

- Allow inbound TCP 80/443 only on the web Security Group, then rerun public HTTPS, header, Auth, gateway, direct-denial, accessibility, and responsive-browser acceptance.
- Replace the temporary `sslip.io` hostname with reviewed product DNS and production controls before live data.

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

## 2026-08-16 - Clearer Administration And Operational Retention

### Objective

Remove unnecessary report filtering, make organization and template configuration understandable from the UI, correct administration layout drift, and prove that evaluation-retention settings have an executable production path.

### Changes

- Removed the redundant person-search input from reporting while preserving the authorized evaluated-person selector and automatic detailed-report loading.
- Added a dedicated company-information section where organization administrators can rename an active organization without changing its stable slug.
- Replaced comma/newline-based template choices with numbered option rows, explicit add/remove controls, and minimum-option guidance.
- Standardized administration module-tab dimensions and corrected hierarchy/retention panel borders, spacing, and responsive stacking.
- Added a hardened daily systemd service/timer and operator environment example for automatic evaluation-retention execution.

### Database changes

Migration `20260816130000_organization_name_administration.sql` adds a service-role-only organization-name update function with active-tenant, active-system-administrator, length, normalization, and content-free audit enforcement.

### Security impact

Positive. Organization renames are authorized outside the UI, retain the immutable tenant slug, and write no organization name to the audit metadata. Retention execution continues through the existing service-role boundary; neither the browser nor the timer definition contains a service-role credential.

### Tests performed

- Focused component/static coverage passed 7 files and 25 tests; the complete Vitest suite passed 55 files and 251 tests.
- Local schema lint passed and all 194 pgTAP assertions across nine database suites passed, including expiry, legal-hold, authorization, and organization-rename cases.
- The complete local Playwright lifecycle passed all three tests, including desktop/mobile administration geometry, row-based template choices, secure rename, reports, access denials, accessibility, keyboard use, and synthetic cleanup.
- The linked migration was applied and confirmed in migration history; the organization-administration Edge Function was deployed.

### Result

The administration workflow now explains where organization names and template choices are managed, the reported layout defects are corrected across desktop and mobile, and production operators have an explicit daily retention runner. The local development site remains available for review.

### Remaining work

- Install and enable the included systemd timer on each production or dedicated customer host; saving the policy in the UI intentionally does not create host-level scheduling.
- Complete the existing production-like staging, DNS/TLS, SMTP, monitoring, capacity, backup, and recovery acceptance gates before live employee data.
- Add route-level code splitting for the known production JavaScript chunk warning.

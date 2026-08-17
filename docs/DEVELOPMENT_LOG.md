# Development Log

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

## 2026-08-16 - Reviewed AWS Staging Host Foundation

### Objective

Complete the next account-independent production-readiness step by defining a reproducible, reviewable AWS host for the full production-like staging acceptance without creating cloud resources or storing credentials.

### Changes

- Added an OpenTofu root stack for one EC2 staging host in a reviewed existing VPC/subnet, with a stable Elastic IPv4 address, public web ports only, SSM-only administration, IMDSv2, detailed monitoring, termination protection, and a customer-KMS-encrypted gp3 root volume.
- Added secret-free Ubuntu cloud-init that installs Docker/Compose, enables unattended updates, applies conservative host sysctls, checks minimum memory/disk/tool/service state, and writes content-free readiness evidence.
- Pinned OpenTofu `1.12.1`, the official Windows archive checksum, the extracted binary checksum, and AWS provider `6.60.0`; added account-free format/provider-lock/configuration validation.
- Added ignored operator examples for encrypted S3 remote state and environment inputs, an explicit saved-plan/two-person-review procedure, static infrastructure regression tests, and ADR-0035.
- Updated architecture, deployment, readiness, context, and known-issue documents to distinguish a validated infrastructure definition from an applied and accepted staging environment.

### Database changes

None.

### Security impact

Positive. No SSH/RDP ingress or key pair is created; application/database/Auth/SMTP/gateway/backup/evaluation secrets remain outside OpenTofu, user data, browser configuration, and Git. Infrastructure creation is not automated and requires short-lived AWS identity, encrypted remote state, a saved plan, and explicit review.

### Tests performed

- `npm run staging:infra:tool:install` verified the pinned local OpenTofu executable.
- `npm run staging:infra:check` passed format, read-only provider-lock initialization, and configuration validation without backend initialization, plan, apply, AWS credentials, or resource creation.
- Focused infrastructure/deployment regression passed 2 files and 11 tests.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed; Vitest reported 55 files and 249 tests. The existing roughly 610 kB production JavaScript chunk warning remains.

### Result

The repository can now generate a deterministic AWS staging-host plan once reviewed account values are available. No AWS resource, DNS record, certificate, secret, customer data, or cloud cost was created by this change.

### Remaining work

- Provide and review the dedicated staging account, region/zone, VPC/subnet, AMI, instance type, KMS, state backend, domain, cost owner, and operator identities; review and apply the exact saved plan.
- Deploy DNS/TLS, the pinned Supabase set and signed Yanki image, then run the full migration/browser/gateway/SMTP/monitoring/capacity/backup/recovery acceptance with synthetic data.

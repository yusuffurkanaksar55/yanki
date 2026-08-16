# Development Log

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

## 2026-08-12 - Resource-Aware Docker And Self-Hosted Staging Acceptance

### Objective

Verify the complete application through Docker without duplicating the workstation's active Supabase image set, and make the future clean self-hosted staging boundary reproducible.

### Changes

- Pinned the official Supabase repository to an exact commit and critical file hashes, then added a Yanki Compose overlay for loopback-only ports, digest-pinned Mailpit, production Nginx, generated secrets, and the Edge Function gateway/encryption boundary.
- Added an explicit full-stack acceptance runner that prepares an ignored official checkout, applies migrations, verifies container isolation, runs pgTAP/Playwright/restore checks, records content-free evidence, and removes disposable data.
- Required explicit confirmation and verified Docker storage headroom for full-stack use; added a configuration-only mode that downloads no images.
- Added `docker:acceptance` as the daily gate. It reuses the synthetic local Supabase stack while checking both Compose definitions, database lint, all pgTAP suites, the production frontend container, gateway denial, accessibility, responsive behavior, and streamed restore.
- Extended E2E URL handling so browser and Auth traffic can use the production same-origin `/supabase` path while a separate loopback origin verifies direct sensitive-endpoint denial.

### Database changes

None. The local acceptance reused the migrated synthetic development database and removed the strictly recognized E2E tenant/users. The full runner applies existing migrations only to a disposable isolated database.

### Security impact

Positive. Official self-hosted inputs are reproducibly pinned, generated secrets remain under ignored temporary storage, direct sensitive endpoint bypass remains denied, published full-stack ports are required to bind only to loopback during acceptance, and the service-role/gateway/encryption secrets remain absent from browser runtime configuration.

### Tests performed

- `npm run docker:acceptance` passed both Compose validations, local database lint, 186 pgTAP assertions across eight suites, three production-container Playwright tests, direct gateway bypass denial, WCAG and keyboard checks, desktop/mobile overflow checks, and streamed backup/restore security verification.
- Final `npm run check` passed lint, typecheck, 54 Vitest files and 243 tests, the production build, and bounded-memory verification.
- The official full-stack configuration passed commit/hash and generated-secret Compose validation without downloading duplicate images.

### Result

Daily Docker acceptance now provides one repeatable command on the constrained workstation, while full clean self-hosted acceptance is reserved for a properly sized isolated staging host. No live employee data, production secret, or existing local database content was used or removed.

### Remaining work

- Run `staging:self-hosted:acceptance` on an isolated host with sufficient Docker storage and retain its report.
- Complete real TLS/DNS, approved SMTP, alert receiver, capacity, secret custody, and remote recovery evidence before production approval.

## 2026-08-12 - Multi-Tenant SaaS Production Readiness And Platform Operations Scope

### Objective

Audit the existing product for a central multi-tenant SaaS deployment on AWS EC2 with Docker Compose and self-hosted Supabase, preserve the current product behavior, and implement only defects that must be corrected before production.

### Changes

- Confirmed `organizations.id` and existing memberships are the canonical tenant model; no duplicate company tables were introduced.
- Added a durable production-readiness assessment covering current controls, the target AWS topology, Istanbul Local Zone limitations, data-residency inventory, environment separation, self-hosted Supabase compatibility, and prioritized production work.
- Separated deployment-global security operations from tenant administration. Organization-scoped system administrators retain users, hierarchy, templates, projects, cycles, and retention but no longer see the platform security module.
- Required exact active `PLATFORM` scope in both global-diagnostics Edge Functions and added a database migration that repeats the abuse-summary scope check.
- Updated global-diagnostics smoke clients to require a separate platform-operator identity instead of reusing a customer organization administrator.
- Replaced the linked development URL in `.env.example` with a portable placeholder and added RLS/browser-environment inventory regression coverage.

### Database changes

Migration `20260812120000_platform_security_operations_scope.sql` replaces the abuse-summary authorization function so only an active platform-scoped system administrator can request deployment-global counters. Function execution remains service-role-only, and backing operational tables remain inaccessible.

### Security impact

Positive. A customer organization administrator can no longer inspect deployment-global key-health or abuse-monitoring aggregates. The authorization is enforced independently in the UI, Edge Functions, and PostgreSQL; no evaluation data model, report behavior, tenant workflow, or content boundary changed.

### Tests performed

- Focused Vitest coverage passed 5 files and 22 tests.
- Full `npm run check` passed lint, typecheck, 54 Vitest files and 243 tests, production build, and bounded-memory verification.
- Local pgTAP passed 186 tests across eight suites, including platform-admin success and organization-admin denial.
- Local and linked database lint returned no schema errors; deployment Compose validation passed; linked migration dry-run listed only the new scope migration.

### Result

The current application architecture remains portable across shared SaaS and dedicated installations. The identified cross-scope operational visibility defect is closed locally and in the linked synthetic development project; both affected Edge Functions were redeployed. The remaining production work is explicitly classified without adding speculative infrastructure or changing product behavior.

### Remaining work

- Complete the Critical Before Production evidence in `docs/PRODUCTION_READINESS_ASSESSMENT.md` before live employee data.
- Add production-like AWS staging, approved SMTP, infrastructure monitoring, independent secret/key custody, and validated remote recovery.
- Evaluate EBS snapshots and WAL/PITR in addition to the existing encrypted logical backup workflow.

## 2026-08-10 - Detailed Person Reports And Guided Example

### Objective

Open a useful report as soon as an authorized reviewer selects a person, provide a realistic example when that person has no responses, and turn the existing question list into a detailed management report.

### Changes

- Automatically selected and loaded the evaluated person's latest authorized cycle while retaining manual cycle switching and report refresh.
- Added request sequencing so a slower prior report response cannot replace the newest person/cycle selection.
- Added a clearly marked synthetic report example to the no-response state; every example label and content string is centralized in the Turkish locale.
- Added a normalized 100-point overall score, evaluation/question/comment totals, strongest and development-focus rating areas, percentage distributions, rating scales, and full-width qualitative comment analysis.
- Added desktop/mobile report screenshots and automatic-selection assertions to the critical Playwright lifecycle.

### Database changes

None. The example report exists only in frontend memory and is never persisted. Real reports continue to use the existing trusted cycle-plus-subject reporting boundary.

### Security impact

Neutral. No evaluator identity, answer linkage, new backend field, or client-selected subgroup was introduced. The synthetic example is visibly identified as non-real data, and actual comments retain the existing identity-separated delivery and contextual-inference warning.

### Tests performed

- Focused report-panel Vitest suite passed all three tests.
- Full `npm run check` passed lint, typecheck, 53 Vitest files and 238 tests, the production build, and bounded-memory verification.
- `npm run e2e:local` passed all three Playwright tests, including automatic latest-cycle loading, detailed report summary visibility, encrypted submission, access denials, WCAG, keyboard use, responsive overflow, and fixture cleanup.
- Desktop 1440x1000 and mobile 390x844 report screenshots were inspected; a misaligned desktop filter row was corrected.

### Result

Selecting a person now opens their latest available report directly. If no evaluation has arrived, the reviewer can inspect a clearly labelled example; real results provide an at-a-glance summary, actionable comparison, distributions, and comments in one report.

### Remaining work

- Replace technical local E2E labels with a persistent curated customer-demo tenant when operator credentials are available.
- Add route-level code splitting for the known production JavaScript chunk warning.
- Complete production-like staging, SMTP, monitoring, recovery, and signed-release gates.

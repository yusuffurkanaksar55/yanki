# Development Log

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

## 2026-08-10 - Person-First Report Filtering And Comment Context

### Objective

Make it immediately clear who a written comment is about and let authorized reviewers narrow reports by person before choosing an evaluation cycle.

### Changes

- Replaced the combined person/cycle report selector with an ad-or-email search field, an evaluated-person selector, and a dependent evaluation-cycle selector.
- Kept the cycle selector disabled until a person is selected and reset stale reports whenever the search, person, or cycle changes.
- Added an explicit evaluated-person label above the report subject and repeated `{subject} için yazılan yorumlar` in every text-question result.
- Added focused component and critical Playwright coverage for the person-first selection flow.

### Database changes

None. Existing report targets already identify the evaluated subject and remain filtered by the trusted authorization boundary.

### Security impact

Neutral. The evaluated person is required report context and was already returned in authorized target/report responses. Evaluator identity remains hidden; administrator denial, self-access denial, tenant scope, reviewer role scope, and manager relationship checks are unchanged.

### Tests performed

- Full `npm run check`: 53 Vitest files and 238 tests, lint, typecheck, production build, and bounded-memory verification passed.
- `npm run e2e:local`: all three Playwright tests passed through Vite.
- `npm run e2e:container:local`: all three Playwright tests passed through production Nginx, including direct sensitive-endpoint denial.
- Manual in-app browser review verified name/email search, dependent cycle selection, explicit comment subject context, and no horizontal overflow at 1440x1000 and 390x844.

### Result

An authorized reviewer can now search for Ahmet, select Ahmet, see only Ahmet's available evaluation cycles, and read comment groups that explicitly state they were written about Ahmet.

### Remaining work

- Replace technical smoke-fixture names with curated customer-demo people, projects, and cycles.
- Add route-level code splitting for the known production JavaScript chunk warning.
- Complete production-like staging, SMTP, monitoring, recovery, and signed-release gates.

## 2026-08-10 - Corporate Product UI, Visual Hierarchy, And Identity-Separated Comments

### Objective

Make the public and authenticated interfaces more corporate and readable, replace the flat workspace context dump with a clear hierarchy, and expose written feedback to authorized reviewers without weakening the established content and identity boundaries.

### Changes

- Replaced the Inter-first stack with Aptos/Segoe UI corporate system typography and removed the descriptive logo subtitle from public, authentication, password, profile, and application-shell branding.
- Expanded the public site into a six-stage evaluation lifecycle, role/access operating model, security boundary overview, and detailed SaaS/dedicated installation comparison.
- Replaced the three-column workspace dump with an organization-to-unit-to-manager-to-person reporting path and grouped repeated roles by role/scope with assignment counts.
- Changed text report aggregation from withheld counts to independently shuffled question-level comment arrays, then rendered escaped comments with explicit sparse-context inference guidance.
- Added ADR-0032 and updated the product, architecture, security, authorization, data-model, and project-context contracts.

### Database changes

None. Existing server-side report authorization and identity-free encrypted batch functions are unchanged.

### Security impact

Qualitative content now reaches an authorized reviewer after trusted decryption. Comments remain encrypted at rest and are returned without evaluator, assignment, submission, timestamp, stable sequence, or cross-question linkage metadata. Active system-administrator denial, self-access denial, tenant scope, role scope, and team-leader manager checks remain mandatory. Sparse-group and writing-style inference risk is stated in the UI and ADR.

### Tests performed

- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed; 53 Vitest files and 237 tests completed.
- `npm run e2e:local` and `npm run e2e:container:local` each passed all three Playwright tests, including visible comments for the authorized reviewer and `403` denials for the administrator and evaluated person.
- Production-container acceptance also passed direct sensitive-endpoint bypass denial, WCAG, keyboard, mobile overflow, and synthetic cleanup checks.
- All 185 local pgTAP cases, local and linked schema lint, deployment Compose validation, and linked migration dry-run passed; the remote database is current.
- Manual in-app browser review covered the public page and authenticated hierarchy at 1440x1000 and 390x844 with no horizontal overflow.

### Result

Yankı now presents a more complete corporate product story, shows a readable personal reporting path instead of repeated role rows, and gives authorized leaders the qualitative feedback needed to interpret aggregate results.

### Remaining work

- Complete production-like staging through real TLS/DNS, approved SMTP, monitoring, recovery, and signed release gates.
- Add route-level code splitting for the known production JavaScript chunk warning.
- Curate customer-facing demo tenants and content before external demonstrations.

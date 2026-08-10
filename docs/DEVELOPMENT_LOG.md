# Development Log

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

## 2026-08-10 - Protected Workspace Routes And Interface Simplification

### Objective

Fix assignment/report navigation falling back to the public site, make an existing aggregate report discoverable, and simplify the desktop/mobile workspace layouts found during full-page browser review.

### Changes

- Added protected `#assignments` and `#reports` routes with route-aware application navigation and authenticated `#login` normalization.
- Split the former stacked dashboard into overview, assignment, and reporting views; added compact assignment filters, six-item progressive rendering, and explicit report person/cycle selection.
- Reworked invitation administration into a balanced vertical form/list flow and collapsed project administration details until the operator requests them.
- Updated critical Playwright navigation to exercise the real assignment/report routes and added focused routing, selection, disclosure, and active-navigation regression coverage.

### Database changes

None. Existing encrypted synthetic submissions and authorization boundaries were reused for browser verification.

### Security impact

Neutral to positive. Route protection remains an interface concern while all sensitive authorization stays in Edge Functions/RLS. Explicit report selection performs no discovery-time participation query, raw text remains withheld, and administrator/self report denials still pass.

### Tests performed

- Full `npm run check`: 53 Vitest files and 237 tests, lint, typecheck, production build, and bounded-memory verification passed.
- `npm run e2e:local`: three Playwright tests passed through Vite, including encrypted submission/reporting, access denial, WCAG, keyboard, and mobile overflow checks.
- `npm run e2e:container:local`: the same three tests passed through production Nginx, including direct sensitive-endpoint `403` enforcement.
- Manual in-app Chromium review covered public sections, authentication, overview, assignments, reports, and all six administration modules at 1440x900 and 390x844 without horizontal overflow; an existing four-submission aggregate report rendered successfully.

### Result

Assignment and report navigation now stays inside the authenticated application. Dense historical content is bounded or collapsed, the invitation layout no longer leaves an awkward empty column, and authorized users can intentionally select and view aggregate results.

### Remaining work

- Add route-level code splitting for the known 588 kB production JavaScript chunk warning.
- Replace technical smoke fixture names with a curated product-demo tenant before customer demonstrations.
- Complete approved SMTP, staging TLS/DNS, monitoring, recovery, and first signed-release gates before live employee use.

## 2026-08-10 - Production-Container Accessibility And Cleanup Acceptance

### Objective

Extend the critical browser lifecycle into the production Nginx runtime, prove required gateway enforcement and public/auth accessibility, and leave no test-owned Docker or database artifacts behind.

### Changes

- Added `e2e:container:local`, which builds a process-named production image, runs it on isolated loopback port `4174`, injects a process-only gateway token, and directs Playwright through same-origin `/supabase`.
- Added a direct sensitive-endpoint denial assertion, automated WCAG A/AA analysis across public/auth desktop and mobile states, and keyboard-only public-to-sign-in navigation coverage.
- Corrected the coral design token after real Axe analysis found marginal and failing text contrast on light surfaces.
- Added strict loopback-only cleanup for `yanki-e2e-*` organizations and matching `example.test` users. It deletes dependencies transactionally, bypasses only two published-template deletion guards, and refuses unrecognized tenant/user identities.
- Extended outer cleanup to remove the Function secret/process, temporary container/image, listeners, and synthetic tenant records after successful or failed runs.

### Database changes

None. The local test cleaner uses the PostgreSQL superuser only against a loopback database and does not alter migrations or production authorization behavior.

### Security impact

Positive. The production container now proves direct sensitive-Function bypass denial before completing the browser workflow through the gateway. Generated gateway/encryption secrets are not printed or passed as Docker argument values, accessibility checks retain no callback traces/video, and test cleanup cannot target non-loopback databases or identities outside the exact synthetic naming contract.

### Tests performed

- `npm run e2e:local`: three Playwright tests passed; 18 stale synthetic tenants and 64 users were removed, followed by an independent zero-fixture check.
- `npm run e2e:container:local`: three Playwright tests passed through Nginx, including direct `403`, encrypted lifecycle, WCAG, keyboard, responsive, and cleanup assertions.
- Full `npm run check`: 53 Vitest files and 234 tests, lint, typecheck, production build, and bounded-memory verification passed.
- `npm run supabase:test:local`: 185 pgTAP cases across eight suites passed; local schema lint and deployment configuration validation also passed.
- Post-run inspection found zero `yanki-e2e-*` containers/images, zero listeners on ports `4173`/`4174`, no temporary Function secret, and zero synthetic E2E organizations/users.

### Result

The critical product workflow, public/auth accessibility, and required gateway boundary now have repeatable local acceptance against both Vite and the production container. Test-owned Docker and tenant artifacts are removed without resetting the persistent local development stack.

### Remaining work

- Repeat the container workflow in production-like staging through real TLS/DNS and isolated Supabase.
- Add route-level code splitting for the known 582 kB production JavaScript chunk warning.
- Complete approved SMTP, first signed release, real provider, monitoring, and recovery gates before live employee use.

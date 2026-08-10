# Development Log

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

## 2026-08-09 - Critical Browser Lifecycle Acceptance

### Objective

Add a repeatable browser-level acceptance gate for the highest-risk invitation-to-report workflow while preserving local developer servers, secret boundaries, tenant isolation, and the direct sensitive-table deny model.

### Changes

- Added an isolated Playwright runner for local Supabase, Mailpit, Edge Functions, PostgreSQL, and Vite port `4173`, with strict loopback guards and a process-scoped random E2E encryption key.
- Covered administrator invitation, real local Auth email verification, password setup, atomic onboarding, immutable template publication, project/member/assignment creation, employee submission, immediate reviewer aggregation, administrator/self denial, raw-text withholding, and mobile overflow.
- Preserved the authentication route while Supabase clears invitation/recovery callback parameters and added focused routing regression tests.
- Made pgTAP ciphertext/key-inventory assertions fixture scoped so persistent local demo and E2E data cannot make database tests order-dependent.
- Added ADR-0031 and explicit portable API privileges for own-profile browser reads plus reviewed service-role identity/configuration access.

### Database changes

Applied `20260809223000_explicit_identity_domain_privileges.sql` locally and to linked project `daxaymcmtbmummrxdyjy`. The browser receives only own-profile `SELECT` subject to RLS; trusted service code receives the reviewed identity/configuration table capabilities. Sensitive content and operational tables remain excluded.

### Security impact

Positive. Clean and dedicated installations no longer depend on historical Supabase grants, invitation callback tokens are not retained in Playwright traces/video, the E2E harness rejects non-loopback services, and sensitive-table direct access remains denied. Synthetic local records contain no real employee data.

### Tests performed

- `npm run e2e:local`: one critical Playwright workflow passed end to end, including mobile screenshots and access denials.
- Full `npm run check`: 51 Vitest files and 224 tests, lint, typecheck, production build, and bounded-memory verification.
- `npm run deployment:config`, local/linked schema lint, migration dry-run/list parity, and 185 pgTAP cases across eight suites passed.
- Linked migration `20260809223000` applied successfully; local and remote migration histories match.

### Result

The critical synthetic user journey now has one-command browser acceptance on the local Docker stack, and fresh Supabase deployments receive the same explicit authorization capabilities as the linked project.

### Remaining work

- Run the same synthetic acceptance against a production-like staging deployment with approved SMTP and gateway enforcement.
- Add keyboard/accessibility and deployed-container Playwright coverage.
- Complete the remaining production provider, recovery, monitoring, and first signed-release gates before live employee use.

## 2026-08-09 - Public Product Site And Immediate Aggregate Reporting

### Objective

Introduce a polished public Yankı product experience, improve authentication and responsive navigation, and make authorized aggregate results available after the first evaluation without weakening identity/content separation or server-side authorization.

### Changes

- Added a public Turkish product site at the root route with generated project-owned artwork, workflow, security, deployment, and authenticated workspace entry sections.
- Redesigned the dedicated sign-in route, collapsed password recovery until requested, and added an explicit return path to the public site.
- Replaced clipped mobile workspace navigation with stable equal-width targets and added global horizontal-overflow safeguards.
- Replaced the four-submission/closed-cycle reporting rule with `EMPTY` before participation and `AVAILABLE` after the first encrypted submission, including during active cycles.
- Updated the reporting UI, synthetic fixture/smoke workflow, public claims, focused documentation, ADR-0030, and all relevant security tests.

### Database changes

Applied `20260809210000_immediate_evaluation_reporting.sql` locally and to linked project `daxaymcmtbmummrxdyjy`. Existing cycle compatibility thresholds were normalized to `1`; authorized target discovery now includes every non-draft cycle; trusted batch access preserves system-admin, self, tenant, role, scope, and manager-relationship checks.

### Security impact

Mixed but explicit. Authorization, encryption, evaluator-link separation, direct-table denial, and raw-text withholding remain intact. Removing the group-size threshold creates contextual inference risk for one-person and sparse aggregates, so product and security documentation no longer claims group anonymity from sample size.

### Tests performed

- Full `npm run check`: 49 Vitest files and 216 tests, lint, typecheck, production build, and bounded-memory verification.
- Local migration application, clean local schema lint, and 185 pgTAP cases across eight database suites.
- Linked migration/list verification, clean linked schema lint, and deployments of `evaluation-reports` and `admin-project-cycles`.
- Linked synthetic report acceptance verified active-target discovery, `EMPTY`, first-submission availability, four identity-free submissions, a `3.5` aggregate average, raw-text withholding, and administrator/self/employee/anonymous denial.
- In-app browser verification at 1280x720 and 390x844 covered public, authentication, dashboard, and administration views with no page-level horizontal overflow.

### Result

The root URL now introduces Yankı publicly, `#login` provides a dedicated sign-in experience, and authenticated workspaces remain protected. Authorized reviewers can see active aggregate results after the first encrypted submission, with the remaining sparse-group privacy limitation documented honestly.

### Remaining work

- Add route-level code splitting to remove the current production bundle-size warning.
- Add persistent Playwright visual, keyboard, and authenticated routing regression coverage.
- Complete production provider, invitation-mail, recovery, and environment-specific security acceptance before live employee use.

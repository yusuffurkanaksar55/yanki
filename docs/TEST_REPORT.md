# Test Report

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

## 2026-08-10 - Corporate UI And Qualitative Reporting Regression

### Environment

- Windows 11, Node.js 24, React 19, Vite 8, Vitest, Playwright Chromium, Docker Desktop, local Supabase/PostgreSQL/Functions/Mailpit, linked synthetic Supabase, and the Codex in-app browser.

### Commands executed

- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
- `npm run e2e:local`
- `npm run e2e:container:local`
- `npm run supabase:test:local`, `npm run supabase:lint:local`, `npm run supabase:lint:linked`, `npm run supabase:push:dry-run`, and `npm run deployment:config`
- Manual 1440x1000 and 390x844 public/dashboard browser review with overflow measurements

### Passed

- All 53 Vitest files and 237 tests passed; lint, typecheck, and the production build passed.
- Vite and production Nginx modes each passed three Playwright tests covering invitation, onboarding, immutable templates, project assignments, encrypted submission, immediate aggregate reporting, and identity-separated written comments.
- Authorized reviewer comments rendered while active system-administrator and evaluated-person report requests remained `403`.
- Container mode denied direct sensitive-endpoint bypass and passed automated WCAG, keyboard navigation, responsive overflow, and synthetic cleanup checks.
- All 185 pgTAP cases passed, local/linked schema lint returned no findings, deployment Compose validation passed, and the linked migration dry-run reported the remote database current.
- Manual review found no horizontal overflow in desktop/mobile public and authenticated hierarchy layouts; removed marketing and logo phrases were absent.

### Failed And Corrected

- The first unit run found that the existing dashboard test expected the profile name/email only once. The visual hierarchy intentionally adds a second semantic occurrence, so the assertion now verifies both contexts.
- The first local E2E attempt found the PostgreSQL container stopped with exit `137`; manually starting only the database left the API unavailable. A data-preserving full Supabase stop/start restored the complete stack and both E2E modes then passed.
- The first sandboxed Compose validation could not spawn Docker and the first linked lint call timed out. Unchanged retries in the approved Docker/network boundary passed.

### Security checks

- Verified text comments remain encrypted in persistence and appear only after the existing trusted report authorization boundary.
- Verified the frontend contract contains no evaluator, assignment, submission, ciphertext, timestamp, stable sequence, or cross-question grouping fields.
- Verified report discovery remains participation-independent and administrator/self-access denials remain active.

### Skipped

- No production employee data, approved production mailbox, customer server, or public TLS/DNS staging environment was used.

### Remaining risks

- One or a few comments may still permit contextual or writing-style inference; the UI and ADR state this limitation explicitly.
- The production build passes with a roughly 596 kB JavaScript chunk warning; route-level code splitting remains planned.

## 2026-08-10 - Workspace Routing And Responsive Interface Regression

### Environment

- Windows 11, Node.js 24, React 19, Vite 8, Vitest, Playwright Chromium, Docker Desktop, local Supabase/PostgreSQL/Functions/Mailpit, linked synthetic Supabase, and the Codex in-app browser.

### Commands executed

- Focused App, assignment, report, invitation, template, and project administration Vitest suites
- `npm run check`
- `npm run e2e:local`
- `npm run e2e:container:local`
- Manual 1440x900 and 390x844 in-app browser review across public, auth, overview, assignment, report, and six administration-module views

### Passed

- Full application checks passed 53 Vitest files and 237 tests, lint, typecheck, the production build, and bounded-memory verification.
- Both Vite and production-container modes passed all three Playwright tests, including the encrypted lifecycle, immediate aggregate reporting, direct endpoint denial, administrator/self denial, WCAG, keyboard, mobile overflow, and synthetic cleanup assertions.
- Direct assignment/report hashes rendered protected H1 content and active navigation state; authenticated sign-in hashes normalized to the dashboard.
- Manual review found no horizontal overflow, confirmed the corrected invitation form proportions and compact project disclosures, and displayed a four-submission report with numeric distributions and withheld free text.

### Failed And Corrected

- The first full suite exposed two interaction-heavy form tests crossing the five-second default only under parallel jsdom load. Focused runs passed; both received scoped 10-second budgets without changing the global timeout.
- The first sandboxed E2E run hit the already documented Supabase telemetry write boundary. The approved retry then found the local database container externally stopped with exit `137`; logs showed healthy checkpoints and no disk/database corruption. A data-preserving Supabase stop/start restored the complete stack before both E2E modes passed.

### Security checks

- Verified route changes do not replace server-side authorization, raw text never reaches the report UI, and administrators/users still cannot obtain prohibited reports.
- Verified production Nginx denies direct sensitive-function bypass and synthetic E2E records are removed after each run.

### Skipped

- No production employee data, approved production mailbox, real production key, customer server, or public TLS/DNS staging environment was used.

### Remaining risks

- The production build passes but retains a 587.91 kB JavaScript chunk warning; route-level code splitting remains planned.
- Current linked demo report names include technical smoke labels and should be replaced with a curated demo fixture before customer-facing use.

## 2026-08-10 - Container Gateway, Accessibility, And Artifact Cleanup

### Environment

- Windows 11, Node.js 24, Vite 8, React 19, Playwright Chromium, Axe, Docker Desktop, Supabase CLI 2.109.1, and local Supabase/PostgreSQL/Functions/Mailpit.

### Commands executed

- Focused local E2E environment, container-boundary, and cleanup safety Vitest suites
- `npm run e2e:local`
- `npm run e2e:container:local`
- `npm run check`
- `npm run supabase:lint:local`, `npm run supabase:test:local`, and `npm run deployment:config`
- Post-run Docker image/container, listener, temporary-secret, and synthetic-database fixture inspection

### Passed

- Both Vite and production-container modes passed all three Playwright tests: the critical encrypted lifecycle, automated public/auth WCAG analysis, and keyboard-only public-to-sign-in navigation.
- Container mode denied direct sensitive-Function access with `403`, then completed the same workflow through the Nginx same-origin gateway with a generated required token.
- Full application checks passed 53 Vitest files and 234 tests, lint, typecheck, production build, and bounded-memory verification.
- Local schema lint was clean, 185 pgTAP cases passed across eight suites, and Docker Compose configuration validation passed.
- Cleanup removed 18 stale tenants/64 users from prior runs and the current fixture. Independent checks then found zero synthetic tenants/users, temporary E2E containers/images, listeners on `4173`/`4174`, or `.supabase/e2e-functions.env` file.

### Failed And Corrected

- Axe found six coral text contrast violations, including a 4.43:1 white-surface ratio. The coral token changed from `#c55448` to `#b94a40`, producing passing contrast on every affected surface.
- The keyboard test retained the button's old "open menu" accessible name after Enter correctly changed it to "close menu". The assertion now reacquires the state-correct button and verifies focus plus `aria-expanded`.
- Initial fixture cleanup reached published-template deletion guards during organization cascade. Cleanup now transactionally disables only the two template deletion guards after exact local fixture validation, restores them before commit, and rolls back their state on failure.
- The first sandboxed E2E retry could not write Supabase CLI telemetry under the user profile. The unchanged command passed in the approved local Supabase execution boundary.

### Security checks

- Verified browser success requires the same-origin gateway while direct sensitive access is denied; the generated gateway token is absent from Docker command values and browser runtime configuration.
- Verified raw evaluation text remains withheld, administrator/self result access remains denied, and synthetic deletion refuses remote databases, mismatched organizations, and non-test users.
- Verified outer cleanup leaves the persistent local Supabase development stack and shared Docker build cache intact while removing only process/test-owned resources.

### Skipped

- No production employee data, production encryption key, approved SMTP mailbox, real TLS/DNS staging environment, customer server, or hosted signed release was used.

### Remaining risks

- Local production-container acceptance does not prove provider logging, TLS, secret custody, SMTP delivery, capacity, or infrastructure monitoring in a real environment.
- The production build passes but retains the known 582.47 kB JavaScript chunk warning; route-level code splitting is the next frontend performance task.

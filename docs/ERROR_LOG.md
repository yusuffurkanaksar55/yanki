# Error Log

## ERR-20260812-070 - Tenant administrators could read platform-wide security diagnostics

### Context

The administration security module exposed encryption-key health and anonymous-endpoint abuse summaries. Both summaries describe the entire deployment rather than one customer organization.

### Symptoms

Any active `SYSTEM_ADMIN` assignment passed the UI and Edge Function checks, including an `ORGANIZATION`-scoped customer administrator. The abuse-summary database function repeated only the role-code check and therefore did not close the scope gap.

### Root cause

The initial implementation treated the role code as sufficient and did not distinguish platform operations from tenant configuration. Existing scope semantics already represented the distinction but were not applied to these two global endpoints.

### Correct solution

Require an exact active `SYSTEM_ADMIN` assignment with `scope_type = 'PLATFORM'` and null scope id in the UI, both Edge Functions, and the abuse-summary database function. Keep organization administrators' existing tenant configuration modules unchanged.

### Prevention

Every deployment-global operation must state whether it is platform-only or tenant-filtered, enforce the decision outside the UI, and include both platform-positive and organization-admin-negative regression tests.

### Related files

- `supabase/migrations/20260812120000_platform_security_operations_scope.sql`
- `supabase/functions/encryption-key-health/index.ts`
- `supabase/functions/security-abuse-monitoring/index.ts`
- `src/features/administration/AdministrationPage.tsx`
- `docs/decisions/ADR-0033-separate-platform-operations-from-tenant-administration.md`

### Related tests

- `supabase/tests/database/anonymous_encrypted_submission.test.sql`
- `tests/encryption-key-health-boundary.test.mjs`
- `tests/anonymous-abuse-protection-boundary.test.mjs`
- `src/features/administration/AdministrationPage.test.tsx`

## ERR-20260810-069 - Combined report target obscured who comments were about

### Context

Authorized reviewers selected one combined person-and-cycle value before opening a report.

### Symptoms

The evaluated person was technically present in the selector and report header, but reviewers could not naturally search for a person such as Ahmet or retain that context while reading comment cards farther down the page.

### Root cause

The interface modeled the backend's composite cycle-plus-subject key directly instead of presenting the user's person-first reporting task. Comment groups used a generic identity-separated label and did not repeat their subject.

### Correct solution

Add client-side ad/e-mail search over the already authorized target set, select the evaluated person first, then list only that person's cycles. Repeat the evaluated person's name in the report summary and every written-comment group.

### Prevention

Keep backend composite identifiers inside service/UI state. User-facing report controls and acceptance tests must express the business sequence: person, cycle, report, subject-labelled result.

### Related files

- `src/features/reporting/EvaluationReportsPanel.tsx`
- `src/locales/tr/messages.ts`
- `tests/e2e/critical-lifecycle.e2e.ts`

### Related tests

- `src/features/reporting/EvaluationReportsPanel.test.tsx`
- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260810-068 - Partial local Supabase restart left the API unavailable

### Context

The local PostgreSQL container had exited with code `137` before the qualitative-report E2E run.

### Symptoms

Starting only `supabase_db_anonim_degerlendirme` made PostgreSQL healthy, but `supabase status` returned only `DB_URL`; the E2E harness then failed because `API_URL` was missing.

### Root cause

The database was restarted independently while Kong, Auth, REST, Functions, and the other local Supabase services remained stopped. The CLI correctly detected a partially running stack but did not reconstruct it during the first status call.

### Correct solution

Run a data-preserving `npx supabase stop` followed by `npx supabase start` so the saved local volume is reused and the full dependency set is recreated. Then rerun the unchanged E2E command.

### Prevention

After exit `137`, inspect the database health and Docker pressure, then prefer one data-preserving full-stack restart over manually starting a single service. Do not reset or delete local volumes unless corruption is independently proven.

### Related files

- `scripts/run-local-e2e.mjs`

### Related tests

- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260810-067 - Dashboard test assumed profile identity appeared once

### Context

The personal organization hierarchy began showing the signed-in person's display name and email in addition to the persistent account summary.

### Symptoms

The first full Vitest run failed because `getByText()` found two valid occurrences of the same profile name and email.

### Root cause

The old test encoded a uniqueness assumption that was no longer true after the hierarchy became a complete organization-to-person path.

### Correct solution

Assert both semantic occurrences with `getAllByText()` while retaining the hierarchy heading and membership assertions.

### Prevention

When identity data is intentionally repeated in separate accessible regions, scope queries to a region or assert the expected count rather than relying on global uniqueness.

### Related files

- `src/app/App.test.tsx`
- `src/features/dashboard/DashboardPage.tsx`

### Related tests

- `npm test`

## ERR-20260810-066 - Assignment and report hashes fell through to the public site

### Context

Authenticated users selected the assignment or report item from the application navigation.

### Symptoms

Both `#assignments` and `#reports` displayed the public Yankı product page instead of the requested protected workspace view. The old dashboard also stacked every assignment and report target into one long page, making existing aggregate results difficult to find.

### Root cause

The application navigation emitted both hashes, but the root hash parser recognized only `#dashboard`, `#administration`, and `#login`. Every unknown hash intentionally resolved to the marketing route.

### Correct solution

Add explicit protected routes for assignments and reports, pass the active view into the authenticated dashboard shell, render each workflow as a dedicated page, and add route regression tests. Keep the public fallback for genuinely unknown marketing hashes.

### Prevention

Every application navigation destination must have an App-level route test that asserts the protected heading, active navigation state, and absence of marketing fallback behavior. The critical Playwright lifecycle must enter assignment and report workflows through their real hashes.

### Related files

- `src/app/App.tsx`
- `src/features/dashboard/DashboardPage.tsx`
- `tests/e2e/critical-lifecycle.e2e.ts`

### Related tests

- `src/app/App.test.tsx`
- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260810-065 - Supabase CLI telemetry write was blocked by the workspace sandbox

### Context

The first post-cleanup `npm run e2e:local` invocation started Supabase CLI from the restricted workspace execution boundary.

### Symptoms

`supabase status` stopped before tests with `EPERM` while creating a temporary telemetry file under the user's `.supabase` directory outside the writable workspace.

### Root cause

The CLI writes its own telemetry state in the user profile even though the requested status operation is read-only for the project. The repository sandbox intentionally cannot write there.

### Correct solution

Rerun the unchanged repository command in the approved local Supabase execution boundary. Do not broaden application filesystem permissions or redirect telemetry into source.

### Prevention

Treat this exact user-profile telemetry error as an execution-boundary issue, keep E2E service URLs loopback-only, and request the narrow `npm run e2e:local` approval when required.

### Related files

- `scripts/run-local-e2e.mjs`

### Related tests

- `npm run e2e:local`

## ERR-20260810-064 - Synthetic tenant cleanup was blocked by published-template deletion guards

### Context

The first real E2E run with automatic database cleanup tried to remove a completed fixture containing a published evaluation-template version.

### Symptoms

All three Playwright tests passed, but cleanup rolled back with `PUBLISHED_TEMPLATE_VERSION_IMMUTABLE` while cascading organization deletion into template versions/questions.

### Root cause

Template immutability triggers correctly reject published version and question deletion, including cascades. Normal dependency-ordered tenant deletion therefore cannot remove this local synthetic fixture.

### Correct solution

After loopback URL, exact `yanki-e2e-*` organization, and matching `example.test` user validation, transactionally disable only the two template deletion guards, delete the fixture in dependency order, restore both guards, and commit. Any error rolls back both data and trigger state.

### Prevention

Keep the cleanup helper local-only and fail closed on every identity mismatch. Test both trigger disable/enable declarations and the complete E2E cleanup against a fixture with a published template.

### Related files

- `scripts/lib/local-e2e-cleanup.mjs`
- `scripts/run-local-e2e.mjs`
- `tests/local-e2e-cleanup.test.mjs`

### Related tests

- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260810-063 - Public accent text missed WCAG contrast on light surfaces

### Context

Automated Axe checks were added for public desktop/mobile and authentication surfaces.

### Symptoms

Six nodes using the coral accent failed WCAG AA contrast. White text on the coral call-to-action measured about 4.43:1, while coral text on mist/light-red surfaces was lower.

### Root cause

The original `#c55448` token was visually close to the 4.5:1 threshold but did not leave enough contrast across every actual background combination.

### Correct solution

Darken the shared coral token to `#b94a40` and rerun the real page scans. The final ratios pass on white, mist, and light-red surfaces without component-specific overrides.

### Prevention

Keep automated WCAG scans in both Vite and production-container browser acceptance whenever shared color tokens or public/auth surfaces change.

### Related files

- `tailwind.config.ts`
- `tests/e2e/public-accessibility.e2e.ts`

### Related tests

- `npm run e2e:local`
- `npm run e2e:container:local`

## ERR-20260809-062 - Project creation UI test timed out only under the full suite

### Context

The final 51-file Vitest quality gate ran after Playwright and privilege-regression coverage were added.

### Symptoms

The project-cycle creation interaction passed alone in about three seconds but exceeded Vitest's five-second default twice under the fully parallel suite; all assertions and the other 223 tests passed.

### Root cause

The scenario performs many realistic `userEvent` interactions and async rerenders. Shared jsdom CPU load pushed its valid runtime slightly beyond a global timeout intended for smaller unit tests.

### Correct solution

Set a 10-second timeout only on this long interaction test. Do not change production behavior or increase the global test timeout.

### Prevention

Keep expensive interaction workflows focused, use per-test budgets for known long scenarios, and require both focused and full-suite passes before treating a timeout as resolved.

### Related files

- `src/features/administration/ProjectCycleManagementPanel.test.tsx`

### Related tests

- `npm test -- --run src/features/administration/ProjectCycleManagementPanel.test.tsx`
- `npm run check`

## ERR-20260809-061 - Fresh Supabase stacks lacked required API table privileges

### Context

The first clean local Playwright lifecycle provisioned a tenant and then exercised the real profile and administration APIs.

### Symptoms

Authenticated own-profile reads and service-role identity/configuration table operations failed before their RLS or trusted authorization logic could run, while the older linked project continued to work.

### Root cause

Historical Supabase projects had implicit API table grants that were not present in the fresh local stack. RLS policies and a service-role JWT do not themselves create table-level privileges.

### Correct solution

Add a versioned migration granting authenticated users only profile `SELECT` subject to own-row RLS, and granting the service role CRUD only on the reviewed identity/configuration tables required by trusted Edge Functions. Keep every sensitive content and operational table excluded.

### Prevention

Treat table privileges as source-controlled capabilities, test required positive grants and sensitive negative exclusions, and validate every migration from a clean Supabase stack.

### Related files

- `supabase/migrations/20260809223000_explicit_identity_domain_privileges.sql`
- `tests/identity-domain-privileges.test.mjs`
- `docs/decisions/ADR-0031-use-explicit-api-table-privileges.md`

### Related tests

- `npm run e2e:local`
- `npm run supabase:lint:local`
- `npm run supabase:lint:linked`

## ERR-YYYYMMDD-XXX - Short error title

### Context

### Symptoms

### Root cause

### Incorrect approach

### Correct solution

### Prevention

### Related files

### Related tests
```

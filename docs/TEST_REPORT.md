# Test Report

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

## 2026-08-09 - Critical Local Browser Lifecycle And Portable Privileges

### Environment

- Windows 11, Node.js 24, Vite 8, React 19, Playwright Chromium, Docker Desktop, Supabase CLI 2.109.1, local Supabase/PostgreSQL/Functions/Mailpit, and linked synthetic Supabase.

### Commands executed

- `npm run e2e:local`
- `npm run check`
- `npm run deployment:config`
- `npm run supabase:lint:local` and `npm run supabase:test:local`
- `npm run supabase:push:dry-run`, linked migration push/list, and `npm run supabase:lint:linked`

### Passed

- Playwright completed one critical browser workflow: invitation creation, local email verification, password setup, acceptance, template publication, project assignments, encrypted submission, immediate aggregate reporting, administrator/self denial, raw-text withholding, and mobile overflow.
- Full application checks passed 51 Vitest files and 224 tests, lint, typecheck, production build, and bounded-memory verification.
- Local and linked schema lint reported no errors; all 185 pgTAP cases passed across eight suites on a persistent database containing prior E2E ciphertext.
- Migration dry-run identified only `20260809223000`; it applied to the linked project and local/remote histories now match.
- Docker Compose configuration validation passed.

### Failed And Corrected

- The project-cycle creation UI test passed alone but exceeded the five-second default twice under full parallel load; a 10-second timeout is now scoped only to that interaction-heavy test.
- Hash-only navigation kept the already-mounted assignment inbox stale after an administrator generated assignments; the acceptance flow now performs the same full refresh a returning employee uses.
- Submission success closes its modal and renders feedback in the inbox; the test now asserts the real page-level behavior.
- The first mobile assertion required equality even when document width was safely smaller than viewport width; it now rejects only actual overflow.
- Persistent E2E ciphertext exposed two global-empty pgTAP assumptions; both assertions are now fixture/inventory scoped and pass with existing local data.

### Security checks

- Verified invitation callback tokens are not captured in Playwright traces/video and every E2E service URL is loopback-only.
- Verified raw text never reaches the reviewer UI, administrators cannot obtain reports, and users cannot access reports about themselves.
- Verified browser own-profile capability remains RLS constrained and sensitive content/operational tables are excluded from the explicit service-role table grant.

### Skipped

- No production employee data, production encryption key, approved SMTP mailbox, production gateway token, or customer server was used.

### Remaining risks

- Local Mailpit proves application callback behavior, not production email deliverability.
- The production build passes but retains the known large JavaScript chunk warning.

## 2026-08-09 - Public Site, Responsive Navigation, And Immediate Reporting

### Environment

- Windows 11, Node.js 24, Vite 8, React 19, Vitest, Docker Desktop, Supabase CLI 2.109.1, local Supabase, linked synthetic Supabase, and the Codex in-app Chromium browser.

### Commands executed

- `npm run check`
- `npx supabase migration up --local`
- `npm run supabase:lint:local` and `npm run supabase:test:local`
- `npm run supabase:push:dry-run`, linked migration push/list, and `npm run supabase:lint:linked`
- Deployments of `evaluation-reports` and `admin-project-cycles`
- `npm run smoke:reports` with process-only synthetic credentials
- Browser inspection at 1280x720 and 390x844

### Passed

- Full application checks passed 49 Vitest files and 216 tests, lint, typecheck, production build, and bounded-memory verification.
- Local schema lint reported no errors and 185 pgTAP cases passed across eight suites, including the updated reporting authorization suite.
- Linked migration `20260809210000` matches local history, linked schema lint is clean, and both updated Edge Functions deployed successfully.
- Live synthetic reporting returned `EMPTY` before participation, became `AVAILABLE` after the first encrypted submission while active, retained four identity-free submissions with a `3.5` aggregate average, and withheld raw text.
- Live system-admin, self, employee, and anonymous result access remained denied.
- Public, sign-in, dashboard, and administration pages stayed within the tested desktop and mobile document widths; all mobile workspace destinations are visible without horizontal navigation scrolling.

### Failed And Corrected

- The first live smoke invocation lacked `REPORT_*` aliases and stopped before any remote mutation. The rerun used previously approved synthetic credentials in process memory only and passed.
- Supabase reported a post-apply pg-delta catalog cache certificate warning. Migration list parity and clean linked lint independently confirmed that the migration applied successfully.
- Desktop sign-in copy initially sat over the lower artwork ribbons; the final layout anchors copy at the visual center.
- Mobile workspace navigation initially hid the fourth item beyond a horizontal scroller; stable equal-width targets now fit without page overflow.

### Security checks

- Verified evaluator identity never enters report batches or frontend result models, raw free text remains withheld, and direct ciphertext-table access is unchanged.
- Verified public copy distinguishes identity separation from guaranteed group anonymity and states sparse-group inference risk.
- Verified no test credentials were written to a repository file.

### Skipped

- No production employee data, production encryption key, real SMTP flow, customer server, or permanent screenshot baseline was used.

### Remaining risks

- One-person and sparse aggregates permit contextual inference by design under ADR-0030. Customer policy and onboarding must reflect this limitation.
- The production build passes but reports a 581.93 kB JavaScript chunk; route-level code splitting remains required before material frontend growth.

## 2026-08-09 - Product UI And Responsive Layout Verification

### Environment

- Windows 11, Node.js 24, Vite 8, React 19, Vitest, and the Codex in-app Chromium browser.
- Local Vite server with the linked synthetic Supabase project and the synthetic HR administrator account.

### Commands executed

- Focused App, AuthPage, and AdministrationPage Vitest suites
- `npm run lint`, `npm run typecheck`, and `npm run check`
- In-app browser inspection at 1440x900 and 390x844

### Passed

- Full application checks passed 49 Vitest files and 215 tests, lint, typecheck, production build, and bounded-memory verification.
- Authentication, dashboard, project administration, and every system-administration module rendered under the intended permissions.
- The generated authentication image loaded at both breakpoints; current page reload and module navigation produced no new browser warning or error.
- Dashboard and administration document widths stayed within the tested mobile viewport after the grid minimum-width correction.

### Failed And Corrected

- Initial responsive inspection found the administration tab row expanding the mobile grid to 751 pixels; `min-width: 0` and bounded overflow now keep the page within the viewport.
- Initial desktop inspection found project assignment metrics compressed and overlapping; the split project layout now starts only at the 2XL breakpoint.
- Project status and date fields initially exposed raw API values; they now use centralized Turkish labels and locale formatting.
- Transitional hot-reload errors occurred while dependent locale/component edits were incomplete; a clean reload and complete module pass produced no current console errors.

### Security checks

- Project managers receive only the project module; platform-only user, hierarchy, template, security, and retention modules remain absent.
- Removed visible implementation notes without weakening server-side authorization or changing sensitive data flows.

### Skipped

- No permanent screenshot-baseline suite or automated keyboard-only browser workflow was added in this change.

### Remaining risks

- The production build remains valid but reports a bundle-size warning; route-level code splitting should be added before the administration surface grows materially.

## 2026-08-09 - Signed Container Release And Customer Acceptance

### Environment

- Windows 11, Node.js 24, npm, Docker Desktop, and the repository's pinned Node 22/Nginx 1.28 Alpine image manifests.
- Synthetic source commit, release version, public runtime URL/key, and gateway token only; no Supabase, signing, database, or customer secret was used.

### Commands executed

- Focused container-release, deployment-foundation, and project-memory Vitest suites
- `npm run lint`, `npm run check`, and `npm run deployment:config`
- Real Docker build with release OCI build arguments
- Real temporary container label, health, `nginx -t`, `/healthz`, and `/app-config.js` inspection

### Passed

- Full application checks passed 49 Vitest files and 214 tests, lint, typecheck, production build, and bounded-memory verification.
- Seven release-contract tests covered exact package-version tags, digest-only references, trusted workflow identity, two-platform metadata, manifest tampering, standalone metadata validation, complete package generation, deterministic checksum inventory, pinned bases/Actions, SBOM/provenance configuration, signatures, and existing-release mutation denial.
- Docker Compose configuration validation passed.
- The real image resolved the exact pinned base manifests and built successfully. OCI source, full revision, and version labels matched expected values; the temporary container reported `healthy`; Nginx syntax and health endpoint passed; browser runtime output contained the synthetic public URL/key and no server-only value.
- Test container and image tag cleanup succeeded, limiting local Docker disk use.

### Failed And Corrected

- The first lint run found one unused test import and requested the explicit `{2}` form for the checksum separator regex; both were corrected without changing behavior.
- The first checksum-order assertion sorted complete hash-prefixed lines, then used default lexical case ordering. It now compares extracted file names with the same locale ordering as the generator.

### Security checks

- Verified the workflow publishes no `latest` tag, deploys by `image@sha256`, pins every external Action/full base-image manifest, and exposes no application secret.
- Verified the signed manifest requires the exact repository/workflow/tag/OIDC identity and binds every customer artifact hash plus required OCI source labels.
- Verified customer instructions independently validate the manifest signature and verifier hash before executing downloaded code.
- Verified the release Compose file has no build section and the standalone acceptance command has no production signature bypass; `--metadata-only` is explicitly non-production.

### Skipped

- No real product tag, GHCR image, Sigstore certificate, GitHub Release, or GitHub artifact attestation was created. Those actions intentionally wait for the first approved release version.

### Remaining risks

- Repository settings must enable immutable Releases and tag protection. The first hosted run must prove package visibility, OIDC/Cosign, optional private-repository attestation plan support, and clean-machine customer acceptance.

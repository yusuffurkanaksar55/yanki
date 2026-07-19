# Development Log

## 2026-07-19 - Organization Hierarchy And Demo Fixture Foundation

### Objective

Implement a configurable organization hierarchy foundation and a safe synthetic test fixture path for the CEO, HR admin, team leader, and three-employee scenario without hard-coding that structure into the product.

### Changes

- Added `PLATFORM` as the null-id global scope type.
- Updated role assignment, invitation, and audit scope constraints so non-platform scopes require explicit `scope_id` values.
- Added `organizations`, `organization_units`, `organization_unit_memberships`, and `manager_assignments`.
- Added hierarchy validation triggers for organization-unit parent ownership, cycle prevention, and manager-assignment scope ownership.
- Kept new hierarchy tables RLS-enabled with no client-facing policies.
- Added `docs/TEST_FIXTURES.md` for the synthetic user scenario.
- Added `scripts/create-demo-fixture.mjs` and `npm run fixture:demo` for service-role-only demo fixture creation.
- Added tests for organization hierarchy safety, platform scope semantics, and fixture credential handling.
- Regenerated linked Supabase database types.
- Added ADR-0007 for the configurable organization hierarchy foundation.

### Files affected

- `supabase/migrations/20260719174459_organization_hierarchy_foundation.sql`
- `src/types/supabase.ts`
- `scripts/create-demo-fixture.mjs`
- `package.json`
- `docs/TEST_FIXTURES.md`
- `tests/demo-fixture-foundation.test.mjs`
- `tests/supabase-foundation.test.mjs`
- `tests/project-memory.test.mjs`
- `docs/*`
- `docs/decisions/ADR-0007-use-configurable-organization-hierarchy-foundation.md`

### Database changes

Applied remote migration `20260719174459_organization_hierarchy_foundation.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. Organization hierarchy records are identity-domain metadata and remain default-deny to frontend clients. The fixture script reads service-role credentials only from local environment variables and is not part of normal checks. No evaluation content, plaintext scores, comments, lessons learned payloads, anonymous credential values, service-role credentials, or encryption keys were added to the repository.

### Tests performed

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `node --check scripts/create-demo-fixture.mjs`
- `npm run check`

### Result

Organization hierarchy and demo fixture foundation were implemented. Application checks passed with 7 test files and 29 tests. The linked Supabase project shows all three local migrations applied and the remote database is up to date.

### Remaining work

- Run `npm run fixture:demo` with a local service-role key to create synthetic test users and hand off generated credentials.
- Implement invitation creation and redemption Edge Functions.
- Add protected administration screens for organization hierarchy management.
- Implement scoped authorization policies before sensitive evaluation workflows.

## 2026-07-19 - User Profile And Invitation Onboarding Foundation

### Objective

Implement the first safe user profile bootstrap and invitation onboarding foundation without exposing privileged invitation management or sensitive evaluation workflows to the browser.

### Changes

- Added `user_profiles` with RLS and a narrow authenticated own-profile select policy.
- Added `user_invitations` with hashed invitation secrets, scope/role metadata, lifecycle constraints, RLS, and no client-facing policies.
- Regenerated linked Supabase database types.
- Added injectable profile service and authenticated profile gate.
- Added Turkish profile loading, missing invitation, inactive profile, and profile-read error states.
- Updated the dashboard to display the active profile display name.
- Added component and migration tests for profile gating, invitation hash storage, RLS coverage, and no direct invitation client policies.
- Added ADR-0006 for the profile/invitation onboarding foundation.

### Files affected

- `supabase/migrations/20260719171413_user_profile_invitation_foundation.sql`
- `src/types/supabase.ts`
- `src/features/profiles/*`
- `src/features/authentication/AuthGate.tsx`
- `src/features/dashboard/DashboardPage.tsx`
- `src/app/*`
- `src/locales/tr/messages.ts`
- `tests/*`
- `docs/*`
- `docs/decisions/ADR-0006-use-profile-invitation-onboarding-foundation.md`

### Database changes

Applied remote migration `20260719171413_user_profile_invitation_foundation.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. The first client-readable database policy is limited to `auth.uid() = user_id` on `user_profiles`. Invitation records remain hidden from frontend clients and store only `token_hash`, not raw invitation secrets. No evaluation content, plaintext scores, comments, lessons learned payloads, anonymous credential values, service-role credentials, or encryption keys were added.

### Tests performed

- `npm test`
- `npm run typecheck`
- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase gen types typescript --linked`
- `npx supabase migration list`
- `npm run check`

### Result

Profile and invitation onboarding foundation was implemented. Application checks passed with 6 test files and 21 tests. The linked Supabase project shows both local migrations applied and the remote database is up to date.

### Remaining work

- Implement trusted Edge Functions for invitation creation, redemption, profile activation, and scoped role assignment.
- Add protected administration screens for profile, invitation, role, and scope management.
- Implement scoped evaluation authorization policies before sensitive workflows.
- Add Playwright end-to-end coverage after a full invitation redemption flow exists.

## 2026-07-19 - Supabase Auth Typed Client Foundation

### Objective

Implement the first safe Supabase Auth frontend foundation with generated database types, runtime public environment validation, typed Supabase client creation, injectable auth service, Turkish auth UI, and focused tests.

### Changes

- Installed `@supabase/supabase-js`.
- Generated linked Supabase database types into `src/types/supabase.ts`.
- Added runtime public environment validation.
- Added lazy typed browser Supabase client.
- Added injectable Supabase Auth service boundary.
- Added auth provider, auth gate, sign-in UI, password reset request UI, and local-session sign-out integration.
- Added unit and component tests for environment validation, sign-in form behavior, password reset request, authenticated dashboard gating, and unauthenticated auth page rendering.
- Added ADR-0005 for the typed Supabase Auth client foundation.

### Files affected

- `package.json`
- `package-lock.json`
- `vitest.setup.ts`
- `src/config/*`
- `src/lib/supabase/*`
- `src/types/supabase.ts`
- `src/features/authentication/*`
- `src/features/dashboard/DashboardPage.tsx`
- `src/app/*`
- `src/locales/tr/messages.ts`
- `docs/*`
- `docs/decisions/ADR-0005-use-typed-supabase-auth-client.md`

### Database changes

None.

### Security impact

Positive frontend foundation impact. The browser client uses only public Supabase URL and anon key values. No service-role key, database password, encryption key, evaluation content, anonymous credential, or privileged authorization rule was added to the frontend.

### Tests performed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `npm run supabase:lint:linked`
- `npm run supabase:migrations`
- `npm run supabase:push:dry-run`

### Result

Auth client foundation was implemented. Application checks passed with 5 test files and 15 tests. Linked Supabase lint passed and the remote database was up to date.

### Remaining work

- Implement invitation onboarding and user profile bootstrap.
- Implement Microsoft Entra ID provider support.
- Design explicit scoped RLS policies and Edge Functions.
- Add Playwright end-to-end auth tests after stable browser automation setup.

## 2026-07-19 - Supabase And GitHub Project Connection

### Objective

Connect the local project to the user-created GitHub repository and linked Supabase project, then apply the first safe Supabase security foundation migration.

### Changes

- Installed Supabase CLI as a development dependency.
- Initialized `supabase/` project configuration.
- Added `.env.example` and local public Supabase environment values.
- Added `docs/SUPABASE_SETUP.md`.
- Added the initial default-deny Supabase migration.
- Added Supabase foundation tests.
- Added Supabase helper npm scripts.

### Files affected

- `package.json`
- `package-lock.json`
- `.env.example`
- `.gitignore`
- `supabase/config.toml`
- `supabase/seed.sql`
- `supabase/migrations/20260719132911_initial_security_foundation.sql`
- `docs/*`
- `tests/*`

### Database changes

Applied remote migration `20260719132911_initial_security_foundation.sql` to Supabase project `daxaymcmtbmummrxdyjy`.

### Security impact

Positive foundation impact. RLS is enabled on all public tables created by the migration and no client policies are added. No evaluation content, plaintext scores, comments, lessons learned payloads, or evaluator-to-submission linkage tables were created.

### Tests performed

- `npx supabase db push --dry-run`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase migration list`
- `npm run check`

### Result

Supabase remote project was linked and the initial migration was applied. GitHub remote `yusuffurkanaksar55/yanki` was connected and `main` was pushed. Application checks passed.

### Remaining work

- Install GitHub CLI if PR creation through CLI is required.
- Generate Supabase database types.
- Implement authentication and invitation onboarding.
- Design and implement explicit RLS policies and Edge Functions.

## 2026-07-16 - React Vite Application Scaffold

### Objective

Scaffold the React, TypeScript, Vite application foundation and expand quality commands to real frontend linting, type checking, testing, and production build.

### Changes

- Added Vite, React, TypeScript, Tailwind CSS, ESLint, Vitest, and React Testing Library configuration.
- Added a Turkish dashboard shell with centralized messages.
- Converted documentation foundation tests from Node test runner to Vitest.
- Added component coverage for the initial application shell.
- Added package lock and installed application dependencies.
- Started a local Vite dev server during command execution for manual verification.

### Files affected

- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `vite.config.ts`
- `vitest.setup.ts`
- `eslint.config.js`
- `tailwind.config.ts`
- `postcss.config.cjs`
- `src/*`
- `tests/project-memory.test.mjs`
- `docs/*`
- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`
- `.gitignore`

### Database changes

None.

### Security impact

No sensitive runtime flows were implemented. The UI contains no evaluation submission or reporting access. Turkish UI strings are centralized. Runtime authentication, authorization, RLS, anonymous credentials, and encryption remain future work.

### Tests performed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- Manual dev-server health check for `http://127.0.0.1:5173/`
- Follow-up dev-server persistence check

### Result

React/Vite scaffold and quality pipeline were completed. The combined check passed. The dev server returned HTTP 200 during startup but did not remain reachable after shell command cleanup.

### Remaining work

- Initialize or connect Git repository management.
- Add Supabase project structure and migrations.
- Implement authentication and invitation onboarding.
- Implement scoped authorization and RLS before sensitive workflows.
- Add Playwright end-to-end tests after real user flows exist.

## 2026-07-16 - Project Memory Foundation

### Objective

Create the initial persistent memory foundation for the anonymous evaluation platform and document the first safe implementation phase.

### Changes

- Added repository operating guide.
- Added README and changelog.
- Added core project memory documents.
- Added initial architecture decision records.
- Added a Node-based documentation foundation test.

### Files affected

- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`
- `package.json`
- `.gitignore`
- `docs/*`
- `docs/decisions/*`
- `tests/project-memory.test.mjs`

### Database changes

None.

### Security impact

Positive documentation impact only. Security architecture, anonymity boundaries, encryption requirements, and authorization rules are now documented. No runtime security controls are implemented yet.

### Tests performed

- `npm test`
- `npm run check`

### Result

Foundation files were created for reviewable future development. Documentation foundation checks passed.

### Remaining work

- Initialize or connect Git repository management.
- Scaffold the application stack.
- Implement authentication, authorization, Supabase migrations, anonymous credentials, encryption, and reporting in phased work.

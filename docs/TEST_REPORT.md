# Test Report

## 2026-07-19 - Supabase Auth Typed Client Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Supabase JS: installed from npm as `@supabase/supabase-js`
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm install @supabase/supabase-js`
- `npx supabase gen types typescript --linked`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `npm run supabase:lint:linked`
- `npm run supabase:migrations`
- `npm run supabase:push:dry-run`
- Docker binary check at `C:\Program Files\Docker\Docker\resources\bin\docker.exe`

### Passed

- `@supabase/supabase-js` installed with npm audit reporting 0 vulnerabilities.
- Linked Supabase database types were generated.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed with 5 test files and 15 tests.
- `npm run build` passed.
- `npm run check` passed.
- `npm run supabase:lint:linked` found no schema errors.
- `npm run supabase:migrations` showed local and remote migration `20260719132911`.
- `npm run supabase:push:dry-run` reported the remote database is up to date.

### Failed

- Initial `npm install @supabase/supabase-js` failed inside the sandbox with an `EACCES` registry/cache error; rerun with approved escalation succeeded.
- Initial linked type generation inside the sandbox hit Supabase telemetry write permission issues; rerun with approved escalation produced a clean generated file.
- Initial typecheck failed after splitting auth context because `SignInCredentials` import was missing; fixed.
- Initial auth page tests failed because DOM cleanup was not configured; fixed in `vitest.setup.ts`.

### Skipped

- Local `supabase db reset` and local DB lint were skipped because Docker is installed but not available on PATH in this shell, and Docker config access emitted a user-profile permission warning.
- Playwright end-to-end tests skipped because Playwright is not installed and auth flows are not yet covered by browser automation.

### Manual tests

- Verified Docker binary exists at the default Docker Desktop path.
- Verified linked Supabase remote state through migration list and dry-run.

### Security checks

- Verified auth UI tests do not call the network.
- Verified browser client uses only public Supabase URL and anon key values.
- Verified no service-role key, database URL, encryption key, evaluation content, or anonymous credential value was added.

### Remaining risks

- UI auth gate is not a sensitive authorization boundary.
- Invitation onboarding, Microsoft Entra ID, scoped RLS policies, Edge Functions, encrypted submission flow, and anonymous credential flow remain unimplemented.

## 2026-07-19 - Supabase And GitHub Project Connection

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Supabase CLI: 2.109.1
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm install -D supabase`
- `npx supabase init`
- `npx supabase link --project-ref daxaymcmtbmummrxdyjy`
- `npx supabase db push --dry-run`
- `npx supabase db lint`
- `npx supabase db lint --linked`
- `npx supabase db push --yes`
- `npx supabase migration list`
- `npm run check`
- `git init`
- `git remote add origin https://github.com/yusuffurkanaksar55/yanki.git`
- `git commit -m "chore: scaffold app and supabase foundation"`
- `git fetch origin main`
- `git merge origin/main --allow-unrelated-histories`
- `git commit -m "chore: merge yanki remote baseline"`
- `git push -u origin main`

### Passed

- Supabase CLI installed with npm audit reporting 0 vulnerabilities.
- Supabase project initialized locally.
- Supabase remote project linked.
- Remote push dry-run showed only `20260719132911_initial_security_foundation.sql`.
- Remote linked lint found no schema errors.
- Remote migration list shows local and remote timestamp `20260719132911`.
- `npm run check` passed with 3 test files and 8 tests.
- Git repository initialized and remote `origin` configured.
- GitHub authentication succeeded through Git Credential Manager.
- Local `main` pushed to `yusuffurkanaksar55/yanki`.

### Failed

- Initial `npm install -D supabase` failed inside the sandbox with an `EACCES` registry/cache error; rerun with approved escalation succeeded.
- `npx supabase db lint` without `--linked` failed because no local Supabase/Postgres stack was running.
- Git metadata writes required escalation in this sandbox.
- Initial GitHub push failed before credentials were available; Git Credential Manager account was used.
- Push was rejected once because remote `main` already contained an initial README commit; resolved with a non-destructive merge.
- Supabase npm scripts attempted to write telemetry under the user profile and required escalation in this sandbox.

### Skipped

- Local `supabase db reset` skipped because Docker/local Supabase stack is not running.
- Local database lint skipped; linked remote lint was used instead.

### Manual tests

- Verified remote migration plan with dry-run before applying.
- Verified remote migration state after applying.

### Security checks

- Added test coverage that RLS is enabled on all foundation tables.
- Added test coverage that no evaluator-linked submission content columns are introduced.
- Verified remote lint reports no schema errors.

### Remaining risks

- No runtime authentication, authorization policies, Edge Functions, anonymous credential flow, encryption flow, or reporting flow exists yet.
- Local Supabase stack requires Docker before local DB reset/lint can run.

## 2026-07-16 - React Vite Application Scaffold

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Frontend: React 19.2.7, Vite 8.1.5, TypeScript 6.0.3, Vitest 4.1.10
- Database: not configured.
- Supabase: not configured.

### Commands executed

- `npm install react react-dom`
- `npm install -D @vitejs/plugin-react vite typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals tailwindcss@3.4.17 postcss autoprefixer @types/react @types/react-dom @types/node`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- Manual health check for `http://127.0.0.1:5173/`
- Follow-up health check for `http://127.0.0.1:5173/`

### Passed

- Dependency install completed with npm audit reporting 0 vulnerabilities.
- `npm run lint` passed.
- `npm run typecheck` passed after fixing `vite.config.ts`.
- `npm test` passed with 2 test files and 5 tests.
- `npm run build` passed and generated production assets under `dist/`.
- `npm run check` passed the full lint, typecheck, test, and build pipeline.
- Dev server responded with HTTP 200 during the start command at `http://127.0.0.1:5173/`.

### Failed

- Initial `npm run typecheck` failed because Vitest config used Vite's `defineConfig`; fixed by importing from `vitest/config`.
- Initial dev-server background start failed because the Windows process environment had duplicate `Path` and `PATH` keys; fixed by normalizing the process environment before `Start-Process`.
- Follow-up dev-server health checks failed after shell command cleanup, so the dev server should be started manually with `npm run dev` when actively testing.

### Skipped

- Supabase database checks skipped because no Supabase project exists yet.
- End-to-end tests skipped because no real authenticated user flow exists yet.

### Manual tests

- Started Vite dev server on `http://127.0.0.1:5173/` during command execution.
- Verified the root URL returned HTTP 200 during startup.
- Verified a later independent health check did not remain connected after shell cleanup.

### Security checks

- Verified no evaluation submission or reporting runtime flow was introduced.
- Verified Turkish UI text is centralized in `src/locales/tr/messages.ts`.
- Existing documentation tests still verify identity separation, encrypted payload storage, thresholded access, and self-access prevention documentation.

### Remaining risks

- No runtime authentication, authorization, RLS, encryption, anonymous credential, or reporting controls exist yet.
- Dev-server verification is local only and not a production deployment.
- Long-lived dev server processes may need to be run manually in an active terminal in this environment.

## 2026-07-16 - Project Memory Foundation

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- npm: 11.9.0
- Database: not configured.
- Supabase: not configured.

### Commands executed

- `npm test`
- `npm run check`

### Passed

- `npm test`: 1 suite, 4 tests passed, 0 failed.
- `npm run check`: executed `npm test`; 1 suite, 4 tests passed, 0 failed.

### Failed

None.

### Skipped

- Application linting skipped because the application stack is not installed.
- Type checking skipped because TypeScript is not installed.
- Build skipped because no application exists yet.
- Supabase database checks skipped because no Supabase project exists yet.
- End-to-end tests skipped because no UI exists yet.

### Manual tests

None yet.

### Security checks

- Verified required documentation files exist.
- Verified evaluator identity separation is documented.
- Verified server-side encrypted payload storage is documented.
- Verified thresholded and scoped result access is documented.

### Remaining risks

- No runtime security controls exist yet.
- No RLS policies exist yet.
- No encryption implementation exists yet.
- No anonymous credential implementation exists yet.

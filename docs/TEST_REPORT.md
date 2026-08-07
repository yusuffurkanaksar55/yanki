# Test Report

## 2026-08-07 - Additive Encryption Key Rotation And Health

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1.
- Docker Desktop local Supabase stack with retained local volumes.
- Linked Supabase project `daxaymcmtbmummrxdyjy` with synthetic users and development-only keys.

### Commands executed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check`
- `npx supabase migration up --local`, `npm run supabase:test:local`, `npm run supabase:lint:local`
- Remote migration dry-run/push/list, `npm run supabase:lint:linked`, `npm run supabase:types`
- Edge Function deploy/list, `npm run encryption:key:prepare -- DEV_20260807_01`
- `npm run smoke:key-health` before/after rotation and `npm run smoke:reports` under the new active key

### Passed

- Vitest passed 32 files and 125 tests.
- pgTAP passed 94 cases across five suites, including service-only key inventory grants and browser-role denials.
- Local and linked schema lint reported no errors; local and remote migration histories include `20260807143000`.
- Pre-rotation health was healthy with one configured and one referenced version; post-rotation health was healthy with two configured versions.
- Four new encrypted evaluations produced the expected `3.5` aggregate under the new active key. The final health check was healthy with two configured and two referenced versions, proving historical and new ciphertext coverage.
- A synthetic employee was denied key health with `403`; no key value or version name appeared in API or browser models.

### Failed And Corrected

- The retained local database had not applied the new migration after startup; migration-up applied it without resetting local data, and all pgTAP suites passed.
- The first static submission boundary test still inspected the old helper file for keyring environment names; it now inspects the dedicated keyring module.
- The first post-rotation report smoke received `502` from the credential function because that shared-module dependent had not been redeployed; redeploying every dependent function restored the complete flow.
- Supabase CLI again could not cache its experimental `pg-delta` catalog after the remote push because the temporary CA file was absent. Migration list and linked lint confirmed successful application.

### Security checks

- Verified additive rotation never overwrote or deleted the historical secret.
- Verified the generated key was written only to ignored `.secrets/`, never printed, uploaded through an env file, and deleted immediately after success.
- Verified key-health output contains only aggregate configuration state and version counts.
- Verified both historical and new ciphertext remain decryptable only through the thresholded trusted reporting boundary.

### Skipped

- Automated visual browser verification could not start because the Codex browser runtime still could not create its kernel asset path. Component tests, production build, database checks, and live API verification passed.

### Remaining risks

- Production key custody/escrow/recovery acceptance, anonymous endpoint rate limiting, retention, production bootstrap, monitoring, backup acceptance, and invitation email remain release blockers.

## 2026-08-07 - Thresholded Trusted Aggregate Reporting

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1.
- Docker Desktop local Supabase stack reset from all migrations.
- Linked Supabase project `daxaymcmtbmummrxdyjy` with synthetic users only.

### Commands executed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check`
- `npx supabase db reset --local --no-seed`
- `npm run supabase:test:local`
- `npm run supabase:push:dry-run`, remote migration push/list, `npm run supabase:lint:linked`
- `npm run supabase:types`, Edge Function deploy/list
- `npm run smoke:reports`

### Passed

- Vitest passed 27 files and 111 tests before the final documentation check.
- pgTAP passed 89 cases across employee access, template lifecycle, encrypted submission, and thresholded reporting suites.
- The 34 reporting cases cover grants, owner-only compatibility implementation, closed-window enforcement, role/scope checks, active team-leader relationship, system-admin/dual-role/self/cross-tenant denial, count-free withholding, audit minimization, threshold release, identity-free batch shape, and close metadata.
- Live smoke submitted four encrypted evaluations, produced a `3.5` rating average, withheld all synthetic raw-text markers, and denied premature, system-admin, self, employee, and anonymous access.
- Remote migrations match local history, `evaluation-reports` is active, and linked schema lint reports no errors.

### Failed And Corrected

- The first database test fixture generated odd-length hex for single-digit bytes; two-digit padding corrected the fixture.
- The first live report stopped with `REPORT_CLOSE_MISSING`; an applied migration had omitted non-sensitive close metadata. A forward-only compatibility migration added it and the complete live scenario passed.
- Supabase CLI applied both migrations but could not cache its local experimental `pg-delta` catalog because a temporary CA file was missing. Migration list and linked lint independently confirmed the remote schema.

### Skipped

- Automated visual browser verification could not start because the Codex browser runtime could not create its kernel asset path. Component, build, database, and live API verification passed.
- Real invitation email remains deferred until an approved mailbox/provider is available.

### Security checks

- Verified no ciphertext is released below threshold and no exact below-threshold count is returned or audited.
- Verified report discovery is independent of submission existence.
- Verified active system administrators, dual-role admins, report subjects, employees, cross-tenant reviewers, and anonymous callers are denied.
- Verified raw text and ciphertext are absent from trusted report output and the frontend report model.

### Remaining risks

- Production key rotation/recovery, anonymous endpoint rate limiting, retention, production bootstrap, monitoring, backup acceptance, and invitation email remain release blockers.

## 2026-08-07 - Anonymous Encrypted Evaluation Submission

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1.
- Docker Desktop local Supabase stack.
- Linked Supabase project `daxaymcmtbmummrxdyjy` with synthetic users only.

### Commands executed

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run supabase:test:local`
- `npm run supabase:lint:local`
- `npm run supabase:lint:linked`
- `npm run supabase:push:dry-run`
- `npm run smoke:submissions`

### Passed

- Local Supabase applied every migration from an empty schema.
- pgTAP passed 55 cases across employee access, template lifecycle, and anonymous encrypted submission suites.
- The 29 new database cases cover table/RPC grants, forbidden linkage columns, credential replacement, context minimization, atomic redemption, replay denial, ciphertext storage, completion, and immutability.
- Focused component, service, and boundary tests validate required answers, anonymous request headers, no browser credential persistence, and successful inbox refresh.
- Both new Edge Functions bundled and are active remotely.
- Live synthetic acceptance encrypted four answers, atomically completed the assignment, and rejected credential replay with 409.
- Linked public schema lint is clean and final remote dry-run reports up to date.

### Failed And Corrected

- The first migration lacked a composite tenant key on evaluation cycles; it was added before remote deployment.
- Legacy Windows PowerShell did not support static random `Fill`; the development key was replaced before any encryption.
- PowerShell stripped JSON quotes from an inline keyring secret; a temporary env-file transfer corrected it and was immediately deleted.
- Two static documentation/security assertions described the previous foundation state; both now inspect the exact current invariant.

### Skipped

- Visual browser verification could not start because the Codex browser runtime still cannot create its kernel asset path. Component, build, and live API verification passed.
- Real invitation email remains deferred until an approved mailbox/provider is available.

### Security checks

- Verified no raw credential, answer, encryption key, service-role key, or evaluator-to-response mapping is stored in browser persistence or repository files.
- Verified the anonymous browser request omits user Authorization and cookies.
- Verified the content table has no evaluator, assignment, credential, digest, plaintext, or exact timestamp column.
- Verified direct table access is denied and only narrow service-role RPCs can issue/contextualize/redeem credentials.

### Remaining risks

- Thresholded reporting, trusted decryption, reviewer scope/self-access enforcement, production key rotation/recovery, rate limiting, retention, and backup acceptance remain production blockers.

## 2026-08-06 - Immutable Versioned Evaluation Templates

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- Supabase CLI: 2.109.1
- Docker Desktop: local Supabase PostgreSQL stack
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check`
- `npx supabase start`, `npx supabase db reset --local`, `npx supabase test db`, `npx supabase db lint --local`
- Linked migration dry-run, push, list, type generation, and linked lint
- Sequential deploys for `admin-project-cycles` and `evaluation-templates`
- `npm run smoke:templates` twice

### Passed

- Vitest passed 21 files and 91 tests; TypeScript, ESLint, production build, and memory checks passed.
- Clean local reset applied every migration through `20260807001500_template_immutability_hardening.sql`.
- pgTAP passed 26 cases across employee assignment access and template lifecycle suites.
- Template tests cover default-deny privileges, service-role grants, non-empty publication, published metadata/question immutability, rejection of moving a published question into a draft, cloning, draft-cycle rejection, exact cycle binding, assignment copy, drift rejection, and audit events.
- Local `public` schema lint and linked database lint reported no schema errors; local and remote migration versions match.
- Both Edge Functions compiled and deployed. Live synthetic verification published four questions, returned exact version metadata for the existing cycle, denied anonymous administration, and passed idempotently on the second run.

### Failed

- The first pgTAP run exposed a missing early return in the version insert trigger and an old test fixture without the newly required version id; both were corrected without weakening the production constraint.
- Parallel Edge Function deploy commands reported success, but only one function remained registered. Sequential redeployment corrected the remote state.
- Migration push repeated the known non-fatal Supabase CLI pg-delta temporary certificate warning. Migration listing and linked lint confirmed the applied state.
- Local Docker verification temporarily stopped when the full system drive mounted Docker's WSL data disk read-only. Temporary completed installers and crash dumps were removed, the ext4 volume was repaired with the documented WSL `e2fsck` workflow, and a clean reset plus all 26 database tests then passed.
- Codex browser control again failed before navigation with the known kernel-assets path error.

### Security checks

- Verified published metadata and question rows are database-immutable.
- Verified authenticated browsers have no direct template-table access and anonymous Edge Function calls are denied.
- Verified tenant scope and active publication before cycle creation, plus exact template-version inheritance and drift rejection for assignments.
- Verified no employee response, evaluator-to-response mapping, credential, encryption key, or service-role credential was introduced.

### Remaining risks

- Template selection does not authorize submission; anonymous credentials and encrypted payload persistence remain production blockers.
- Automated visual and full browser end-to-end coverage remain incomplete.

## 2026-08-06 - Authenticated Employee Assignment Access

### Environment

- Workspace: `D:\Projects\anonim_degerlendirme`
- Runtime: Node.js v24.14.0
- Supabase CLI: 2.109.1
- Docker Desktop: 4.82.0
- Docker Engine: 29.6.1, Linux containers
- Linked Supabase project: `daxaymcmtbmummrxdyjy`

### Commands executed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check`
- `npx supabase start`, `npx supabase db reset --local`
- `npm run supabase:test:local`, `npm run supabase:lint:local`
- Linked migration dry-run, push, type generation, lint, and final dry-run
- `npm run smoke:assignments`
- `docker build --tag yanki-frontend:local .`
- Temporary frontend container health and runtime configuration checks
- `npm audit --omit=dev --audit-level=high`, `npm audit fix`, final `npm audit`

### Passed

- Vitest passed 20 files and 89 tests; TypeScript, ESLint, production build, and memory checks passed.
- Clean local database reset applied all migrations through `20260806233000_employee_assignment_access.sql`.
- pgTAP passed 8 authorization tests covering own-only access, draft/cancelled exclusion, authenticated-only execution, forbidden-field absence, membership expiry, and inactive-profile denial.
- Local and linked database lint reported no schema errors.
- Remote dry-run identified only the employee assignment migration before deployment and reported up to date afterward.
- Generated types include `get_my_evaluation_assignments()`.
- Live synthetic employee authentication returned three own assignments with `CLOSED` availability; anonymous RPC access was denied and forbidden fields were absent.
- Frontend Docker image built successfully, reported `healthy`, returned `ok` from `/healthz`, and wrote public runtime Supabase configuration.
- The local Supabase stack was stopped after verification with its Docker volume preserved.
- Production dependency audit found zero vulnerabilities; compatible development dependency patches reduced the full audit to zero.

### Failed

- Docker Desktop Linux Engine stopped during the first large local Supabase image bootstrap. Restarting Docker Desktop and cleanly stopping/starting the partial stack resolved it.
- The pgTAP runner image first failed DNS resolution against ECR, then Supabase CLI pulled the same image from GHCR and all tests passed.
- Remote migration application emitted a non-fatal experimental pg-delta cache warning for a missing temporary certificate file. The migration applied; type generation, linked lint, and final dry-run passed.
- The first smoke command expected `.env`; the project uses `.env.local`. After correcting the command, one transient Supabase DNS lookup failed and the retry passed after DNS resolution was confirmed.
- The first temporary frontend container mapped host port to container port 80 instead of the documented 8080. Recreating it with `18080:8080` passed both internal and external health checks.
- Codex in-app browser setup failed before navigation because its runtime could not write kernel assets.

### Skipped

- Desktop and mobile visual browser inspection was skipped because the browser runtime did not initialize. Component rendering and production image/build checks passed.
- Real invitation email delivery and acceptance remain deferred pending an approved provider and mailbox.

### Security checks

- Verified assignment ownership is derived only from `auth.uid()` and accepts no client-selected user or tenant id.
- Verified evaluator and subject active tenant membership at read time.
- Verified assignment and related identity tables remain default-deny to browser clients.
- Verified no evaluator identity field, response content, score, comment, payload, credential, service-role key, or encryption key is returned or logged.

### Remaining risks

- Assignment display does not authorize submission; templates, anonymous credentials, encryption, completion mutation, and reporting remain production blockers.
- Automated visual and full browser end-to-end coverage remain incomplete.

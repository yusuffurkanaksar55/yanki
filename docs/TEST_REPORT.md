# Test Report

## 2026-08-07 - Privacy-Preserving Anonymous Abuse Protection

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1.
- Docker Desktop local Supabase stack restored from retained volumes.
- Linked Supabase project `daxaymcmtbmummrxdyjy` with synthetic users only.

### Commands executed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check`
- `npm run deployment:config`
- `npx supabase migration up --local`, `npx supabase test db`, local and linked schema lint
- Remote migration dry-run/push/list, type generation, Edge Function deploy/list
- `npm run smoke:abuse` with temporary process-only synthetic credentials

### Passed

- Vitest passed request-body, static privacy boundary, service, form, monitoring panel, and full regression coverage.
- pgTAP passed 113 cases across five suites, including 19 new abuse table/grant/quota/summary cases.
- Local and linked schema lint reported no errors; local and remote migration histories include `20260807170000`.
- After a backup/restart, local `verify_jwt = false` parity allowed a no-session anonymous oversized request to reach the function and return controlled `413`; the stack was backed up and stopped again.
- A recognized credential remained usable after the invalid-only global quota was exhausted in pgTAP, then received `429` only after its isolated twelfth request.
- Live smoke returned `413` for a 270,000-character oversized body, `429` plus `Retry-After` for the thirteenth credential request, and `403` for non-admin monitoring access.
- Live system-admin monitoring returned only aggregate invalid/rate-limited counts and policy constants; encrypted submission, assignment completion, and replay denial remained intact.

### Failed And Corrected

- The first static ordering assertion matched the imported encryption symbol instead of the awaited encryption call; the test now checks the runtime call site.
- The first live oversized test used a 1.1 MB application limit and reached the hosted gateway's empty `503` timeout before a controlled response. Reducing the reviewed application limit to 256 KiB produced a fast stable `413`, and the client now has a dedicated Turkish oversized-response message.
- Supabase CLI could not write its telemetry state under the workspace sandbox; rerunning the database test with approved profile-directory access passed all pgTAP suites.
- Remote migration push applied successfully but experimental `pg-delta` cache export again missed its temporary CA file. Migration list and linked lint independently confirmed the applied schema.
- The sandbox denied the first Docker CLI child process used by `deployment:config`; rerunning the same read-only Compose validation with approved Docker access passed.

### Security checks

- Verified abuse tables contain no IP, device, user, tenant, assignment, credential digest, request body, or content columns and have no direct API/service-role privileges.
- Verified quota consumption happens before context lookup and encryption.
- Verified invalid-only traffic cannot exhaust a recognized credential's isolated quota.
- Verified monitoring authorization in both Edge and PostgreSQL and identifier-free aggregate output.

### Skipped

- Automated visual browser verification remained subject to the existing Codex browser runtime kernel-path issue; component tests and production build cover the panel structure pending that runtime fix.

### Remaining risks

- External gateway/WAF capacity controls and alert delivery, production key custody/recovery, retention, bootstrap, backup acceptance, and invitation email remain release blockers.

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

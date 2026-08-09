# Test Report

## 2026-08-09 - Tenant Evaluation Retention And Restore Acceptance

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1.
- Docker Desktop local Supabase PostgreSQL stack and disposable restore database.
- Linked Supabase project `daxaymcmtbmummrxdyjy` with synthetic users only.

### Commands executed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check`
- Local migration-up, `npm run supabase:test:local`, and local/linked database lint
- `npm run backup:restore:acceptance` with explicit disposable-target confirmation
- Remote migration dry-run/push/list, `npm run supabase:types`, Edge Function deployment
- `npm run smoke:retention` with process-only synthetic HR-admin and employee credentials

### Passed

- Vitest passed 38 files and 153 tests, including retention service/component boundaries and backup/restore safeguards.
- pgTAP passed 134 cases across six suites; 21 new cases verify default policy, tenant scope, grants, legal hold, expiry deletion, retained current content, count-free audit metadata, and idempotency.
- Local and linked schema lint reported no errors; local and remote migration histories include `20260808120000`.
- The final disposable restore streamed 640,718 compressed bytes directly from `pg_dump` into `pg_restore`, wrote no host dump file, verified migration history, encrypted-content and retention tables, operator function presence, ciphertext browser-read denial, and browser retention-execution denial, then removed the target database. A separate catalog query returned zero matching disposable databases.
- The live scoped administrator listed and updated the 730-day disabled policy; the employee received `403`, the unauthenticated caller received `401`, and no evaluation-domain data was returned.

### Failed And Corrected

- The first full restore used local Supabase's non-superuser `postgres` role and failed on a protected `realtime.list_changes` function setting. The drill now uses `supabase_admin`; the complete restore and cleanup passed.
- The first full Vitest run found server-only placeholders in the frontend `.env.example` and a multiline RLS statement outside the repository's canonical assertion. Server variables moved to `.env.operator.example`, and the migration now uses the canonical RLS form.
- The first live anonymous smoke expected the function's JSON error, but hosted JWT verification rejected the missing token at the gateway. The smoke now asserts the security-relevant `401` status for that path.
- Supabase CLI profile telemetry writes were sandbox-denied on first local/linked checks; approved reruns passed. The first linked type-generation attempt therefore produced an empty redirected file; the approved rerun regenerated all 1,464 lines from the live schema.
- The migration push repeated the known non-fatal `pg-delta` temporary CA warning. Migration list and linked lint independently confirmed successful application.

### Security checks

- Verified policy tables and destructive functions are inaccessible to browser roles and direct `service_role` table access.
- Verified legal hold prevents deletion and cleanup removes only ciphertext older than the date-only tenant cutoff.
- Verified no subject, evaluator, content, participation, submission count, or deleted-row count appears in policy, audit, operator, or frontend output.
- Verified live deletion and backup expiry are documented as separate controls.

### Skipped

- The destructive operator RPC was not called against the live project; a safety review correctly rejected a production-capable deletion test. Equivalent behavior passed with disposable local ciphertext fixtures.
- Automated visual browser verification remains subject to the existing Codex browser runtime kernel-path issue.

### Remaining risks

- Production backup scheduling, key-plus-database recovery, retention scheduler monitoring, gateway/WAF controls, alert delivery, bootstrap, and approved invitation email remain release blockers.

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

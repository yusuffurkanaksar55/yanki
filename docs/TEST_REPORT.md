# Test Report

## 2026-08-09 - Encrypted Off-Site Backup And Exact-Snapshot Restore

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1, and Docker Desktop local Supabase.
- Checksum-verified Restic 0.19.1 under ignored `.tools/restic` on the D: project drive.
- Disposable local Restic repository and process-only random repository/evaluation keys; the repository was removed after acceptance.

### Commands executed

- Focused off-site configuration/boundary and shared restore Vitest suites
- `npm run lint`, `npm run typecheck`, `npm run backup:tool:install`
- `npm run check`, `npm run deployment:config`
- Explicit repository init, encrypted snapshot, 100% data integrity check, scoped retention/prune, and off-site restore acceptance scripts

### Passed

- Remote repository validation, local acceptance-only override, database-URL argument secrecy, fail-aware source mode, environment-scoped retention, integrity subset validation, full snapshot metadata, and safe JSON summary tests passed.
- The official Windows Restic archive matched the pinned SHA-256 and reported version 0.19.1 from ignored D: storage.
- A 869,602-byte PostgreSQL custom dump created an encrypted snapshot with no plaintext host file; Restic stored 869,966 new repository bytes and a 100% repository data check passed.
- Exact environment host/tags/filename and full snapshot id were verified before restore. Stream hash/size matched, all reviewed database privileges passed, one independently keyed canary decrypted, and the disposable database plus local repository were removed.
- Full application checks passed 45 Vitest files and 190 tests, lint, typecheck, production build, bounded-memory verification, and Docker Compose configuration validation.

### Failed And Corrected

- The first exact-snapshot validation assumed Restic stdin paths were root-relative on every OS. Windows records the stdin filename under the current drive path. Validation now normalizes both separators and compares the final filename while still requiring the full snapshot id, exact host, and all tags; the complete rerun passed.

### Security checks

- Verified database URLs remain in `PGDATABASE`, repository/password values are absent from arguments/reports, and local repositories require an exact acceptance-only override.
- Verified snapshot creation uses `--stdin-from-command`, retention filters exact host plus combined tags, restore never uses `latest`, and neither backup nor restore creates a plaintext dump file.
- Verified restored system-admin/browser boundaries and every recovery canary before target deletion.

### Skipped

- No real S3/Azure/other remote provider or production systemd host was configured; this requires approved provider credentials and infrastructure.

### Remaining risks

- Production release still requires remote-provider immutability/access review, monitored timer execution, storage-object backup if adopted, aligned legal/retention policy, and signed production-like RPO/RTO evidence.

## 2026-08-09 - Key Custody And Database Recovery Acceptance

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1.
- Docker Desktop local Supabase PostgreSQL stack and guarded disposable restore database.
- Process-only random AES-256 test key and committed credential-free example custody manifest.

### Commands executed

- Focused custody, recovery-boundary, and backup/restore Vitest suites
- `npm run check`, `npm run deployment:config`
- Local migration-up, `npm run supabase:lint:local`, `npm run supabase:test:local`
- `npm run encryption:custody:validate`, canary provisioning, and `npm run encryption:recovery:acceptance` with explicit confirmations
- Linked migration dry-run/push/list, `npm run supabase:types`, and `npm run supabase:lint:linked`

### Passed

- Manifest validation enforced exactly one active key, independent custody references, canonical 32-byte key encoding, two distinct custodian roles, and no embedded credential/key fields.
- AES-256-GCM canaries round-tripped for active and historical keys; wrong-key and incomplete-set cases failed closed.
- A clean local reset applied every migration, schema lint reported no errors, and 180 pgTAP cases passed across eight suites, including 15 recovery-canary table, RLS, grant, RPC, duplicate, length, and input-validation cases.
- The final executable drill provisioned one synthetic canary, streamed a 670,101-byte compressed dump directly into restore, decrypted all custodied canaries, verified restored security boundaries, wrote no host dump, and removed the disposable database.
- Full application checks passed 43 Vitest files and 177 tests, lint, typecheck, production build, bounded-memory verification, and Docker Compose configuration validation.
- Local and remote migration histories include `20260809153000`; linked schema lint reported no errors and generated types contain the recovery canary table/function.

### Failed And Corrected

- The full repository security test expected every migration's `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statement on one line. The new migration enabled RLS correctly but split the statement across lines; it now follows the repository's machine-checked migration form.
- The first local helper used the unavailable static PowerShell `RandomNumberGenerator.Fill` method, leaving its disposable test byte array zero-filled even though the cryptographic acceptance path passed. The rerun used `RandomNumberGenerator.Create().GetBytes()`, refreshed the canary with a real random key, propagated child exit codes, and passed.
- The first Compose validation could not spawn Docker inside the workspace sandbox; the approved Docker-enabled rerun passed unchanged. Remote push repeated the known non-fatal `pg-delta` temporary CA-cache warning, while migration list and linked lint independently confirmed successful application.

### Security checks

- Verified `anon`, `authenticated`, and `service_role` have no direct canary-table read privilege; only `service_role` can execute the encrypted refresh RPC.
- Verified canary persistence contains no tenant, user, evaluator, subject, assignment, credential, answer, or evaluation-content column.
- Verified operator reports omit keys, key-version identifiers, custody references, ciphertext, decrypted bytes, and service-role credentials.

### Skipped

- No real production key/provider was configured and no linked canary was written because independently recovered production key material is not available in the workspace.

### Remaining risks

- Production acceptance still requires approved primary and recovery custody providers, scheduled encrypted off-host backups, an isolated environment restore, documented RPO/RTO, and signed two-person evidence.

## 2026-08-09 - Production Tenant Bootstrap And Password Setup

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1.
- Docker Desktop local Supabase PostgreSQL/Auth/Mailpit stack rebuilt from migrations and seed.
- Linked Supabase project `daxaymcmtbmummrxdyjy` with synthetic users only.
- Vite development server inspected with the Codex in-app browser at desktop and 390 x 844 mobile viewports.

### Commands executed

- `npm run check`, `npm run deployment:config`, `npm run supabase:lint:local`
- `npx supabase db reset --local --yes`, `npm run supabase:test:local`
- `node scripts/bootstrap-production-tenant.mjs --check` with process-only local Supabase configuration and synthetic nonexisting identity
- Focused bootstrap/operator/password component and auth-service Vitest runs
- Remote migration dry-run/push/list, linked type generation/schema lint, and `user-onboarding` function deploy/list

### Passed

- Vitest passed 41 files and 167 tests, including deterministic normalization/fingerprinting, explicit confirmation, Auth marker creation, compensation, invitation recovery, strong-password validation, password updates, `PASSWORD_RECOVERY` event gating, and password-setup session exit.
- pgTAP passed 165 cases across seven suites; 31 bootstrap cases verify RLS/grants, atomic records, default retention, no premature role/membership, idempotency, fingerprint conflict, Auth marker enforcement, duplicate-slug denial, safe renewal, acceptance, and exact organization-admin scope.
- A clean local database reset applied all migrations through `20260809120000`; local schema lint reported no errors.
- Side-effect-free operator preflight returned `ready` and `administratorIdentity: available` without creating a user or tenant.
- Docker Compose validation passed. Desktop and 390 px mobile browser inspection showed readable layouts, no horizontal overflow, and no console warning/error entries.
- Local and remote migration histories include `20260809120000`; linked schema lint reported no errors, generated types include every bootstrap table/function, and `user-onboarding` is active at version 8.

### Failed And Corrected

- The first recovery-event component test reassigned a readonly Auth service field. The test now constructs a new immutable stub with the listener override; full typecheck passes.
- Initial local operator-check helpers assumed a clean Supabase CLI status stream. CLI diagnostics and sandbox telemetry polluted parsing; the approved rerun parsed the local JSON envelope in process and passed. Production commands read secrets directly from the approved operator environment and do not parse CLI status output.
- Docker Compose and local Supabase lint initially hit expected workspace sandbox process/profile restrictions. Approved reruns passed unchanged.
- Remote migration push repeated the known non-fatal `pg-delta` temporary CA cache warning. Migration list and linked lint independently confirmed successful application.
- Vite again reported the existing non-blocking warning for a JavaScript chunk above 500 kB.

### Security checks

- Verified browser roles cannot read bootstrap operation state or execute status/create/renew functions; direct `service_role` table access is also denied.
- Verified no role or membership is granted before exact email-verified invitation acceptance and the accepted role is organization-scoped, never platform-scoped.
- Verified operator output excludes administrator email, passwords, tokens, action links, service-role keys, and Auth response bodies.
- Verified invitation renewal is limited to the original request/fingerprint and rejected after acceptance or revocation.

### Skipped

- No real tenant or Auth identity was created in the linked project. Real invitation delivery, password setup, and mailbox acceptance require an approved SMTP provider and mailbox.

### Remaining risks

- Production SMTP, redirect allow-list, Auth password policy, and mailbox acceptance remain release gates alongside key recovery, WAF/alerts, scheduled backups, and environment-specific restore acceptance.

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

# Test Report

## 2026-08-09 - Gateway Limits And Security Alert Delivery

### Environment

- Windows 11, Node.js 24, npm, Supabase CLI 2.109.1, Docker Desktop, and local Supabase.
- Built `yanki-web:local` from the committed Node 22/Nginx 1.28 Alpine stages.
- Linked synthetic Supabase project `daxaymcmtbmummrxdyjy`; no real alert provider or production credential was used.

### Commands executed

- Focused gateway, alert-state, deployment, and anonymous-abuse Vitest suites
- `npm run lint`, `npm run typecheck`, `npm run check`, `npm run deployment:config`
- Local migration-up, `npm run supabase:lint:local`, `npm run supabase:test:local`
- Linked migration dry-run/push/list, `npm run supabase:lint:linked`, `npm run supabase:types`
- Linked deployment/list verification for `evaluation-submission-credentials` and `anonymous-evaluation-submissions`, plus public no-session `401`/`413` boundary checks
- Docker image build, generated `nginx -t`, health/proxy/body-limit acceptance, and concurrent rate-limit/log-suppression acceptance
- `npm run security:alerts:acceptance` with the real local operator RPC and an ephemeral loopback webhook

### Passed

- Full application checks passed 48 Vitest files and 207 tests, lint, typecheck, production build, and bounded-memory verification.
- Local schema lint reported no errors and 185 pgTAP cases passed across eight suites. Browser roles cannot execute the operator summary, a non-service JWT claim is rejected, and service role receives only the identifier-free aggregate shape.
- Local and linked migration histories include `20260809190000`; linked lint is clean and generated types include `get_anonymous_submission_abuse_summary_for_operator()`.
- The final image generated valid Nginx configuration even when the documentation upstream hostname did not resolve. Application and proxied Supabase health returned `200`; oversized anonymous input returned `413` before upstream.
- Under 400 concurrent anonymous requests, 380 received gateway `429`; container logs contained zero sensitive endpoint or limiter-event lines.
- Local alert acceptance read the real service-role RPC, delivered one alert and one recovery to loopback, suppressed a duplicate, removed temporary state, and emitted content/identifier-free output.
- Linked `evaluation-submission-credentials` version 8 and `anonymous-evaluation-submissions` version 11 are active. With synthetic development enforcement intentionally unconfigured, no-session credential preparation returned `401` and oversized anonymous input returned `413`.

### Failed And Corrected

- The first lint run found that a generic state-read error discarded its caught filesystem cause. The outward message remains redacted and now preserves the internal `cause` chain.
- The first generated Nginx test used a static upstream, so unresolved documentation DNS blocked startup. The gateway now uses the official image's runtime resolver discovery and a variable-backed upstream with bounded DNS validity.
- Moving sensitive-token selection into a URI map preserved inherited proxy headers, but the long exact paths exceeded Nginx's default map hash bucket. The HTTP template now uses a 128-byte map bucket and the rebuilt image passes `nginx -t`.
- Initial Supabase commands could not write CLI telemetry outside the workspace sandbox. The same unchanged migration/lint/test commands passed in the approved Docker/Supabase environment.

### Security checks

- Verified no gateway log format includes query strings, request bodies, Authorization headers, credentials, or evaluation content; sensitive endpoint access and request-level limiter logs are disabled.
- Verified production gateway enforcement fails closed without a configured token, rejects missing/wrong tokens, accepts only the exact token, runs before sensitive Function work, and never exposes the token through browser runtime configuration.
- Verified webhook URLs cannot contain credentials/query strings, production delivery requires HTTPS, redirects are rejected, bearer/service-role secrets never enter payloads or reports, and delivery failure cannot advance state.
- Verified alert state is environment-bound, atomically replaced, duplicate-suppressing, content-free, and isolated from browser/application authority.

### Skipped

- No real Teams/email/SIEM webhook, production gateway token, production NAT load, CDN/WAF provider, TLS edge, or infrastructure alert receiver was available. Direct-denial is unit/static verified but awaits production-secret activation. These remain environment acceptance gates rather than missing repository implementation.
- The full authenticated abuse smoke did not run because user-email/password variables are intentionally absent from local files; no credentials were copied into a command or log. Public deployed boundaries were verified separately.

### Remaining risks

- Production thresholds must be tuned against company egress/NAT and peak submission windows. Provider/load-balancer logs and webhook retention need separate privacy review, and timer/container/Supabase availability must alert through infrastructure independent of the application database.

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

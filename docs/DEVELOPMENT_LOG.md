# Development Log

## 2026-08-09 - Tenant Evaluation Retention And Restore Acceptance

### Objective

Expire encrypted evaluation content under tenant control without exposing participation or allowing browser-triggered deletion, and prove that a backup can be restored into a disposable database without weakening reviewed privileges.

### Changes

- Added tenant-scoped 30-to-3650-day retention policies with a 730-day default, disabled-by-default automation, legal hold, policy versioning, and content-free run metadata.
- Added scoped retention administration in PostgreSQL, an authenticated Edge Function, typed frontend service, and Turkish system-administrator panel.
- Added a service-role-only scheduled operator boundary with advisory locking, count-free audit metadata, and no browser deletion action.
- Added explicit-confirmation retention and disposable Docker backup/restore commands, a separate server-only environment example, ADR-0024, and deployment/recovery documentation.
- Added 21 pgTAP retention cases plus service, component, static security, and backup/restore acceptance tests.

### Database changes

Applied `20260808120000_evaluation_content_retention.sql` locally and to project `daxaymcmtbmummrxdyjy`. Retention configuration has RLS and no direct privileges, including for `service_role`; destructive execution is available only through the narrow service-role function.

### Security impact

Positive. Legal hold blocks deletion, tenant administrators manage configuration without reading content, browsers cannot invoke cleanup, and no submission/deletion count leaves the operator boundary. Live-database deletion is explicitly separated from backup expiry and historical-key retirement.

### Tests performed

- `npm run lint`, `npm run typecheck`, 153 Vitest cases, production build, and full `npm run check`.
- Local migration-up, local/linked schema lint, and `npm run supabase:test:local`: 134 pgTAP cases across six suites.
- Disposable Docker dump/restore drill with migration, table, function, and restored privilege verification. The final 640,718-byte compressed stream was hashed while flowing directly into restore, no host dump file was written, and a separate catalog query confirmed the disposable database was removed.
- Remote dry-run/push/list, linked type generation, Edge Function deployment, and live admin/non-admin/anonymous smoke verification.

### Result

Tenant retention administration is active in the linked synthetic project with the 730-day policy and automatic purge disabled. The live Edge Function allowed the scoped HR administrator, denied the employee and unauthenticated caller, and exposed no evaluation-domain data. The destructive live operator command was intentionally not executed; deletion behavior is proven with disposable local ciphertext fixtures.

### Remaining work

- Configure production scheduling only after approved retention contracts, backup expiry, monitoring, and change control exist.
- Complete independent production key escrow/recovery, gateway/WAF limits and alerts, tenant bootstrap, and environment-specific backup recovery acceptance.
- Complete approved invitation-email and visual browser verification.

## 2026-08-07 - Privacy-Preserving Anonymous Abuse Protection

### Objective

Bound anonymous submission abuse and oversized requests without storing source identifiers, credential digests, request-level evaluation metadata, or content, while giving system administrators safe aggregate operational visibility.

### Changes

- Added isolated known-credential and invalid-only global quotas before context lookup, validation, or encryption.
- Added 256 KiB anonymous and 16 KiB authenticated preparation body limits, `413`/`429` responses, `Retry-After`, and centralized Turkish feedback.
- Added five-minute aggregate abuse counters with seven-day retention, an authenticated system-admin monitoring Edge Function, and a Turkish administration panel.
- Added request/boundary/service/component tests, 19 pgTAP abuse-control cases, live smoke coverage, and ADR-0023.

### Database changes

Applied `20260807170000_anonymous_endpoint_abuse_protection.sql` locally and to project `daxaymcmtbmummrxdyjy`. Abuse tables have RLS, no direct privileges including for `service_role`, and no IP, device, user, tenant, assignment, credential digest, request, or content columns.

### Security impact

Positive. Invalid traffic cannot consume recognized-credential application quotas. Operational visibility is aggregate-only, request bodies are bounded before parsing, and system administrators still cannot read evaluation content. External gateway/WAF capacity controls and alert delivery remain required for production.

### Tests performed

- `npm run lint`, `npm run typecheck`, Vitest, production build, and full `npm run check`.
- Local migration-up, schema lint, and `npm run supabase:test:local`: 113 pgTAP cases across five suites.
- Local self-host parity restart confirmed the anonymous no-session function configuration and controlled 413 response.
- Remote dry-run/push/list, linked lint, type generation, and three Edge Function deployments.
- Live `npm run smoke:abuse`: encrypted submission, replay denial, 256 KiB body rejection, isolated 429 quota with `Retry-After`, aggregate admin monitoring, and non-admin denial.

### Result

The migration and all three Edge Functions are active in the linked project. The live synthetic flow returned controlled `413` and `429` responses, preserved assignment completion and replay safety, exposed only aggregate counters to the HR system administrator, and denied the employee with `403`.

### Remaining work

- Establish production gateway/WAF limits and alert delivery without sensitive logging.
- Complete independent production key escrow/recovery, retention, bootstrap, and backup/restore acceptance.
- Complete approved invitation-email and visual browser verification.

## 2026-08-07 - Additive Encryption Key Rotation And Health

### Objective

Rotate evaluation encryption keys without retrieving or replacing historical Supabase secrets, losing access to existing ciphertext, or exposing key/content data to administrators.

### Changes

- Added backward-compatible merging of the legacy JSON keyring with immutable per-version `EVALUATION_ENCRYPTION_KEY_VERSION_<VERSION>` secrets.
- Added a service-role-only distinct referenced-version inventory and authenticated `encryption-key-health` Edge Function that returns only booleans and total version counts.
- Added a Turkish system-administrator health panel, typed service, safe no-stdout rotation-file generator, live health smoke test, focused tests, and ADR-0022.
- Updated deployment, security, architecture, authorization, data model, product status, and release documentation.

### Database changes

Applied `20260807143000_encryption_key_lifecycle.sql` locally and to project `daxaymcmtbmummrxdyjy`. The inventory function exposes no ciphertext, content, identities, per-version counts, or timestamps and is executable only by `service_role`.

### Security impact

Positive. New key versions can be added without overwriting unreadable historical secret values. The browser receives no key material or version name. Historical coverage is checked against actual ciphertext references, and non-admin users are denied the health endpoint.

### Tests performed

- `npm run lint`, `npm run typecheck`, 125 Vitest cases, `npm run build`, and `npm run check`.
- Local migration-up, schema lint, and `npm run supabase:test:local`: 94 pgTAP cases across five suites.
- Remote dry-run/push/list, linked lint, type generation, and four dependent Edge Function deployments.
- Live `smoke:key-health` before and after rotation, followed by `smoke:reports` under the new active key and a final two-configured/two-referenced health check.

### Result

The linked synthetic project retains its legacy development key, uses additive version `DEV_20260807_01` for new ciphertext, and reports healthy coverage for both referenced versions. Existing and new report decryption passed, and the temporary ignored secret-transfer file was deleted after upload.

### Remaining work

- Establish independent production key custody, approved secret escrow, and database-plus-key recovery acceptance.
- Add anonymous endpoint rate limiting, retention, production bootstrap, monitoring, and backup/restore automation.
- Complete approved invitation-email and visual browser verification.

## 2026-08-07 - Thresholded Trusted Aggregate Reporting

### Objective

Allow authorized reviewers to read useful closed-cycle aggregates without exposing individual responses, evaluator identities, below-threshold participation counts, administrative content access, or results about themselves.

### Changes

- Added service-role-only report-target and thresholded batch functions with fixed cycle-plus-subject grouping.
- Added reviewer scope and active membership checks, team-leader manager relationship enforcement, system-admin denial, self denial, closed-window enforcement, and count-free withholding below threshold.
- Added trusted AES-GCM decryption, exact immutable-question validation, numeric/categorical aggregation, and raw-text suppression in `evaluation-reports`.
- Added the Turkish report service/panel, reporting-role visibility controls, 34 pgTAP cases, aggregate/security/component tests, and a reusable live report smoke workflow.
- Added ADR-0021 and updated generated Supabase types and operational documentation.

### Database changes

Applied `20260807103000_thresholded_evaluation_reporting.sql` and forward-only `20260807111500_reporting_close_metadata_fix.sql` locally and to project `daxaymcmtbmummrxdyjy`. Direct ciphertext access remains revoked from `service_role`; only the thresholded function can release an identity-free encrypted batch.

### Security impact

Positive. Target discovery is participation-independent. Below threshold, no exact count, questions, ciphertext, or decrypted values leave PostgreSQL. System administrators and the subject are always denied. Raw text is discarded during aggregation and never enters the frontend report model.

### Tests performed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run check`.
- Clean local database reset and `npm run supabase:test:local`: 89 pgTAP cases across four suites.
- Remote migration dry-run/push/list, linked schema lint, type generation, function deployment/list.
- `npm run smoke:reports`: four encrypted submissions, `3.5` rating average, raw-text withholding, and premature/system-admin/self/employee/anonymous denial.

### Result

Both reporting migrations are current remotely. `evaluation-reports` is active as version 1, the redeployed anonymous submission function is active as version 4, and linked schema lint reports no errors. The first smoke run exposed missing close metadata; the forward-only fix was applied and the full rerun passed.

### Remaining work

- Replace the development key and implement production key rotation/recovery, rate limiting, retention, bootstrap, monitoring, and backup/restore acceptance.
- Complete approved invitation-email verification.
- Complete automated visual browser verification after the Codex browser runtime path issue is resolved.

## 2026-08-07 - Anonymous Encrypted Evaluation Submission

### Objective

Allow an eligible authenticated employee to submit an immutable evaluation exactly once without persisting evaluator identity beside content, while encrypting every answer before database persistence.

### Changes

- Added authenticated credential preparation and anonymous encrypted-submission Edge Functions.
- Added a Turkish typed-question modal connected to available employee assignments.
- Added memory-only raw credentials, anonymous no-cookie/no-Authorization fetch, answer validation, AES-256-GCM encryption, and stable operational error codes.
- Added a reusable live acceptance command and updated generated Supabase types.

### Database changes

Applied `20260807013000_anonymous_encrypted_evaluation_submissions.sql` locally and to project `daxaymcmtbmummrxdyjy`. It adds identity-domain digested credentials, content-domain ciphertext, immutable lifecycle guards, tenant foreign keys, and three service-role-only RPCs. Sensitive tables have no direct privileges, including for `service_role`.

### Security impact

Positive. Content rows contain no evaluator, assignment, credential, digest, plaintext answer, or exact submission timestamp. Raw credentials are transient, replay is terminal, assignment completion is atomic, and key material remains only in Supabase Secrets. The implementation provides application-level unlinkability, not blind-signature cryptographic anonymity.

### Tests performed

- `npm run lint`, `npm run typecheck`, `npm test`, and production build checks.
- `npm run supabase:test:local`: 55 pgTAP cases across three suites.
- Local and linked public schema lint plus final remote migration dry-run.
- `npm run smoke:submissions` with synthetic users: four encrypted answers accepted, assignment completed, replay denied.

### Result

The linked migration is current and both new Edge Functions are active. The live synthetic flow passes without creating additional fixture data. The linked schema lint reports no errors.

### Remaining work

- Implement trusted thresholded reporting, self-access denial, and scoped reviewer authorization.
- Replace the development key before live use and add rotation, recovery, rate limiting, retention, and backup acceptance.
- Complete visual browser verification when the Codex browser runtime path issue is resolved.

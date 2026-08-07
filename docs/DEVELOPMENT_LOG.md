# Development Log

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

## 2026-08-06 - Immutable Versioned Evaluation Templates

### Objective

Allow organization-scoped administrators to define reusable evaluation questions while permanently preserving the exact published configuration used by every cycle and assignment.

### Changes

- Added tenant-scoped logical templates, version snapshots, ordered questions, all documented question types, editable drafts, and published-version mutation guards that validate both the old and new question parent.
- Added service-role-only atomic draft-save, publish, and clone functions with repeated system-admin scope checks and safe audit metadata.
- Added the authenticated `evaluation-templates` Edge Function, typed frontend service, and Turkish template management panel.
- Required project-cycle creation to select an active published version in the same organization and copied that exact id to every assignment.
- Backfilled existing cycles and assignments to archived compatibility versions without changing their identity-domain behavior.
- Added template metadata to project and employee assignment views, regenerated linked database types, and added ADR-0019.

### Database changes

Applied `20260806234500_versioned_evaluation_templates.sql` to Supabase project `daxaymcmtbmummrxdyjy`. The migration adds three default-deny tables, three service-role-only lifecycle functions, database immutability and scope triggers, and required version foreign keys on cycles and assignments. The follow-up `20260807001500_template_immutability_hardening.sql` prevents moving a question out of a published version by checking both sides of an update.

### Security impact

Positive. Browser clients have no template-table privileges. Published configuration cannot be updated or deleted in PostgreSQL. Cycles reject draft or cross-tenant versions, assignments reject version drift, and administration still cannot read evaluation response content.

### Tests performed

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run check`.
- Clean local Supabase reset, local schema lint, and both pgTAP suites.
- Linked dry-run, migration push/list, generated types, linked lint, and sequential Edge Function deploys.
- `npm run smoke:templates` twice with a synthetic admin to verify creation, publication, legacy cycle metadata, anonymous denial, and idempotency.

### Result

Vitest passes 21 files and 91 tests. pgTAP passes 26 database cases. Local `public` schema lint and linked schema lint are clean. Live verification published the reusable four-question `Genel Proje Değerlendirmesi` v1 and the second run created no duplicate. The local UI remains available at `http://127.0.0.1:5173/`; browser visual inspection was blocked by the existing Codex runtime kernel-assets error.

### Remaining work

- Implement anonymous credentials and encrypted submissions before completion mutation or reporting.
- Complete invitation email delivery when an approved provider and mailbox are available.
- Add visual and end-to-end browser coverage when the Codex browser runtime is available.

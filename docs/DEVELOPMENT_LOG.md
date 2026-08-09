# Development Log

## 2026-08-09 - Independent Key Custody And Combined Recovery Acceptance

### Objective

Prove that every separately custodied evaluation-encryption key can decrypt a restored database without reading real evaluation content, committing provider-specific secrets, writing a host dump, or exposing keys/version identifiers in operator output.

### Changes

- Added a schema-versioned provider-neutral custody manifest validator requiring one active key, independent primary/recovery references, and at least two distinct custodian roles.
- Added AES-256-GCM encrypted random recovery canaries for every manifest key, with authenticated environment/version context and no identity, tenant, assignment, credential, or evaluation-content relationship.
- Added a default-deny canary table, narrow service-role-only atomic refresh RPC, explicit-confirmation operator commands, and combined verification inside the disposable streaming restore.
- Added unit/static boundary tests, 14 pgTAP cases, ADR-0026, and SaaS/dedicated custody and recovery runbooks.

### Database changes

Applied `20260809153000_encryption_recovery_canaries.sql` locally and to linked project `daxaymcmtbmummrxdyjy`. It adds `evaluation_encryption_recovery_canaries` and `upsert_evaluation_encryption_recovery_canaries()` while revoking direct table privileges from browser roles and `service_role`.

### Security impact

Positive. Key material remains only in the trusted process, manifests reject embedded credentials, real evaluation content is never selected, and recovery evidence exposes only counts, booleans, and dump stream metadata. A production provider/offline escrow and isolated environment drill are still required before live use.

### Tests performed

- Focused custody/recovery/restore Vitest, lint, typecheck, clean local reset, local schema lint, and 180 pgTAP cases across eight suites.
- Real local combined drill with a process-only random 32-byte test key: one encrypted canary was provisioned, a 670,101-byte compressed dump streamed into restore, every canary decrypted, privilege checks passed, no host dump was written, and the disposable target was removed.
- Full `npm run check`: 43 Vitest files and 177 tests, lint, typecheck, production build, and bounded-memory verification; Docker Compose configuration validation also passed.
- Linked migration dry-run/push/list, generated type refresh, and linked schema lint.

### Result

The repository and linked synthetic project now have the default-deny canary schema, while the executable combined recovery drill is proven locally for both deployment topologies. No linked canary was created because independently recovered production key material is intentionally unavailable in the workspace.

### Remaining work

- Select and configure the real production primary secret manager and independently controlled recovery/offline escrow.
- Schedule encrypted off-host backups and complete a signed isolated environment restore with approved RPO/RTO.
- Complete gateway/WAF alerts and approved invitation-email acceptance.

## 2026-08-09 - Idempotent Production Tenant Bootstrap

### Objective

Provision a company and its first administrator through one portable trusted workflow without browser privileges, manual table writes, password/token output, duplicate tenants, or silent elevation of an existing Auth identity.

### Changes

- Added a fingerprinted service-role-only bootstrap transaction that creates the organization, initial unit, invited administrator profile, organization-admin invitation, default retention policy, content-free operation state, and audit event.
- Added a side-effect-free preflight plus explicit-confirmation operator command with exact-request replay, server-controlled Auth markers, and compensation for a newly created Auth identity when database provisioning fails.
- Added an explicit initial-invitation recovery command that renews only an exact incomplete bootstrap and requests Supabase recovery mail without generating a raw action link.
- Added a Turkish strong-password gate for invitation metadata and Supabase `PASSWORD_RECOVERY` sessions; normal administrator invitations now set the same password-setup metadata.
- Raised the local Auth baseline to 12 characters with upper/lower/numeric/symbol requirements and documented equivalent production configuration.

### Database changes

Applied `20260809120000_production_tenant_bootstrap.sql` locally and to project `daxaymcmtbmummrxdyjy`. It adds default-deny `tenant_bootstrap_operations`, exact status/bootstrap/renewal functions, safe audit events, and service-role-only execution grants. A clean local reset applied every migration successfully, and linked schema lint passed.

### Security impact

Positive. Browser roles cannot inspect or execute bootstrap state. The first administrator receives no membership or role before email-verified invitation acceptance. Existing unmarked identities are rejected, action links and credentials never enter command output, and retries require the original request UUID plus exact fingerprint.

### Tests performed

- Full `npm run check`: 41 Vitest files and 167 tests, lint, typecheck, production build, and memory check.
- Clean local Supabase reset, local schema lint, and 165 pgTAP cases across seven suites, including 31 bootstrap cases.
- Side-effect-free local `tenant:bootstrap:check` returned `ready` with an available administrator identity.
- Docker Compose configuration validation and in-app browser inspection at desktop and 390 px mobile width; no horizontal overflow or browser console errors were observed.
- Remote migration dry-run/push/list, linked type generation, linked schema lint, and `user-onboarding` deployment/version verification.

### Result

The tenant bootstrap foundation is active in the linked synthetic project for shared SaaS and dedicated installation workflows. `user-onboarding` is active at version 8 with password-setup metadata. No live tenant or Auth identity was created.

### Remaining work

- Complete approved SMTP/mailbox acceptance, independent production key recovery, gateway/WAF alerts, scheduled encrypted off-host backups, and environment-specific restore acceptance.

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

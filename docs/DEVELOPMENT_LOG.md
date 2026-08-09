# Development Log

## 2026-08-09 - Signed Digest-Pinned Container Release Automation

### Objective

Publish one verifiable application image for shared SaaS and customer-managed installations, bind it to exact source and build evidence, and let a customer acceptance-test the package without rebuilding source or receiving vendor secrets.

### Changes

- Added a stable-tag-only GitHub Actions workflow that runs the full quality gate, builds `linux/amd64` and `linux/arm64`, publishes to GHCR, attaches max-mode provenance and SPDX SBOM, signs the image/manifest with Cosign OIDC, conditionally adds GitHub attestations, and refuses to mutate an existing release.
- Pinned Node/Nginx base images by registry digest and every workflow Action by full commit SHA; no `latest` image is produced or accepted.
- Added a signed manifest binding source commit, OCI digest/platforms/labels, signer identity, and every customer artifact hash, plus `SHA256SUMS`, no-build Compose, generated digest-pinned environment example, SBOM, provenance, and installation guide.
- Added an independent pre-execution manifest/verifier bootstrap and a standalone acceptance command that re-verifies signatures, hashes, pulled digest, OCI labels, Nginx, public-only runtime configuration, health, and temporary-container cleanup.
- Added ADR-0029, container release/customer acceptance documentation, package scripts, and focused static/runtime metadata tests.

### Database changes

None. The release workflow has no Supabase service role, database URL, gateway token, webhook credential, SMTP secret, or evaluation-encryption key.

### Security impact

Positive. Customers deploy an immutable digest rather than trusting a tag, package hashes are anchored by an identity-bound signature, build inputs and Actions are immutable, and the acceptance path fails closed on signer, file, image, label, Nginx, runtime-config, or health mismatch. Keyless transparency identity disclosure remains documented for private-source customers.

### Tests performed

- Full `npm run check`: 49 Vitest files and 214 tests, lint, typecheck, production build, and bounded-memory verification.
- Focused release, deployment, and project-memory suites passed 16 tests, including tag/version, digest, signer identity, artifact tampering, package preparation, checksum inventory, full-SHA Action pins, and no-build Compose boundaries.
- `npm run deployment:config` passed against Docker Desktop.
- A real local image built from the pinned Node 22 and Nginx 1.28 manifest digests. OCI source/revision/version labels matched, the container became healthy, `nginx -t` and `/healthz` passed, and `/app-config.js` contained only the synthetic public URL/key. The temporary container and image tag were removed.

### Result

The repository can produce and verify one signed digest-pinned customer package for both deployment topologies. No product version tag was created, so the first hosted GHCR/Cosign/GitHub Release execution remains an explicit release gate.

### Remaining work

- Enable immutable GitHub Releases and version-tag protection, then exercise the first reviewed version tag in the hosted workflow.
- Configure real production custody/off-site and alert providers and complete signed environment acceptance.
- Configure approved invitation email delivery and broader authenticated end-to-end workflows.

## 2026-08-09 - Same-Origin Gateway And Content-Free Alert Delivery

### Objective

Protect anonymous submission capacity before Supabase, route Docker browser traffic through one portable same-origin gateway, and deliver sustained aggregate abuse alerts without storing request-level identifiers, credentials, or evaluation content.

### Changes

- Converted the frontend Nginx runtime into a same-origin `/supabase` gateway with runtime DNS, exact 256 KiB/16 KiB sensitive body limits, per-source/global request zones, bounded connections, `429` rejection, and a server-only direct-bypass token.
- Disabled sensitive endpoint access logs, removed query strings/authorization/body data from the remaining log format, and suppressed request-level limiter messages below the runtime log threshold.
- Added a service-role-only identifier-free operator summary, generic authenticated HTTPS webhook transitions, bounded reminders, recovery delivery, atomic mode-`0600` state, and a hardened five-minute systemd timer.
- Added local loopback alert acceptance, Docker 200/413/429/log-suppression acceptance, ADR-0028, generated types, and SaaS/dedicated operations documentation.

### Database changes

Applied `20260809190000_security_alert_operator_summary.sql` locally and to linked project `daxaymcmtbmummrxdyjy`. It extracts one direct-revoked aggregate builder and adds a service-role-only operator summary while preserving active-system-admin authorization for the browser monitoring path.

### Security impact

Positive. Volumetric and oversized traffic is bounded before trusted Functions, configured production Functions reject direct upstream calls without the gateway token, scheduled alert delivery receives only global aggregate counts, and no new user/tenant/request/source/credential/content record is persisted. The gateway uses source addresses transiently in shared memory only.

### Tests performed

- Full `npm run check`: 48 Vitest files and 207 tests, lint, typecheck, production build, and bounded-memory verification.
- Local migration application, clean schema lint, and 185 pgTAP cases across eight suites; linked migration/list/type generation and linked schema lint also passed.
- Real Docker image build and generated `nginx -t`; temporary gateway returned `200` for application/Supabase health, `413` for 270,000-byte anonymous input, and `429` for 380 of 400 concurrent requests with zero sensitive request/limiter log lines.
- Real local operator RPC plus loopback webhook acceptance delivered alert and recovery transitions, suppressed the duplicate, wrote/removed temporary state, and logged no content or identifiers.
- Linked sensitive Functions were deployed at credential version 8 and anonymous version 11; public no-session boundaries returned `401`/`413` without requiring stored user credentials.

### Result

The portable gateway and content-free alert delivery contract is implemented for shared SaaS and dedicated installations. Production still requires a real receiver, NAT/load tuning, provider-log privacy review, and infrastructure availability alert acceptance.

### Remaining work

- Configure real production custody/off-site and alert providers and complete signed acceptance.
- Configure approved invitation email delivery and test a real mailbox flow.
- Add immutable release publishing and broader Playwright/customer acceptance coverage.

## 2026-08-09 - Encrypted Off-Site Backup And Environment Restore Automation

### Objective

Create scheduled, independently stored encrypted PostgreSQL snapshots for SaaS and dedicated installations, detect failed exports, apply bounded retention/integrity checks, and prove exact-snapshot recovery with every separately custodied evaluation key without writing a plaintext host dump.

### Changes

- Added pinned Restic `0.19.1` tooling, a checksum-verified Windows installer under ignored `.tools`, remote-repository enforcement, and Docker/native database source modes that keep database URLs out of process arguments.
- Added explicit-confirmation repository initialization, fail-aware encrypted snapshot creation, configurable repository data-subset checking, exact-environment retention/prune, and full-snapshot-id restore acceptance.
- Extracted shared streaming and restored-database security/key-canary verification for local and off-site drills.
- Added a fail-fast hardened systemd oneshot service plus persistent daily timer, ADR-0027, focused tests, and managed/dedicated operations documentation.

### Database changes

None. This change operates entirely in the trusted deployment/backup boundary and adds no browser or service-role database access.

### Security impact

Positive. Restic observes the `pg_dump` exit status, encrypts before remote persistence, and returns no repository locator or credential. Production rejects local repositories, retention is scoped to exact environment metadata, restore rejects `latest`, and every drill revalidates database privileges plus independently recovered keys.

### Tests performed

- Full `npm run check`: 45 Vitest files and 190 tests, lint, typecheck, production build, and bounded-memory verification; Docker Compose configuration validation also passed.
- 24 focused Vitest cases plus a final 13-case rerun after normalizing cross-platform Restic snapshot paths.
- Checksum-verified Restic `0.19.1` installation on the D: project drive.
- Full local encrypted repository lifecycle with process-only random credentials: one 869,602-byte dump created an encrypted snapshot, a 100% repository data check passed, scoped retention/prune passed, and the exact snapshot restored with all security and key-canary checks before target/repository cleanup.

### Result

The repository has executable scheduling and environment-scoped restore automation for both deployment topologies. A real remote provider, production systemd host, alert route, and signed isolated recovery evidence remain environment acceptance work.

### Remaining work

- Configure approved production secret/off-site providers and run a timed isolated recovery drill.
- Add outer gateway/WAF limits and alert delivery without sensitive request logging.
- Complete approved invitation-email and immutable release/customer acceptance work.

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

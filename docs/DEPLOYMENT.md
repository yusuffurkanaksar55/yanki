# Deployment Guide

## Supported Topologies

### Vendor-Hosted Shared SaaS

- One vendor-operated application and Supabase project serves multiple companies.
- `organizations.id` is the tenant boundary.
- Every tenant-owned record and trusted operation must carry or derive one organization id.
- Database constraints, RLS, and Edge Functions must reject cross-organization relationships.
- This topology has the lowest operational cost and is the default commercial offering.

### Customer-Managed Dedicated Installation

- One customer receives a dedicated application container and one dedicated self-hosted Supabase stack.
- The database still uses `organizations.id`; physical isolation does not replace application authorization.
- The customer controls infrastructure, database access, backups, TLS, SMTP, monitoring, updates, and disaster recovery.
- One dedicated stack per customer is preferred. Multiple subsidiaries may share that stack only when the customer explicitly accepts the shared operational boundary.

Supabase documents Docker Compose as the recommended self-hosting route and makes the operator responsible for security, maintenance, backups, availability, and monitoring. Self-hosted Supabase represents one project and does not include every managed-platform feature. See the official [self-hosting overview](https://supabase.com/docs/guides/self-hosting) and [Docker guide](https://supabase.com/docs/guides/self-hosting/docker).

## Required Tools

| Tool | Purpose |
| --- | --- |
| Linux server or supported customer infrastructure | Production host; Linux is the preferred baseline |
| Docker Engine and Docker Compose v2 | Run the application and official Supabase services |
| Node.js 20 or newer | Run reviewed release, bootstrap, backup, retention, and acceptance commands |
| Cosign 3.0.6 | Verify the release manifest and exact OCI image digest against the trusted workflow identity |
| GHCR access or approved OCI registry path | Pull the exact digest; private packages require a customer-specific read-only credential outside deployment files |
| Git | Obtain reviewed application and Supabase deployment sources |
| OpenSSL and `jq` | Generate and inspect self-hosted secrets using the official Supabase tooling |
| Supabase CLI | Apply versioned migrations and validate database state |
| Nginx, Caddy, or customer load balancer | TLS termination, public routing, and certificate renewal |
| PostgreSQL client matching the source major version | Stream logical custom-format backups and run restore drills |
| Restic 0.19.1 | Encrypt, authenticate, retain, verify, and retrieve off-site database snapshots |
| Customer secret manager | Store database, JWT, SMTP, service-role, and encryption keys |
| Monitoring and log collection | Service health, capacity, audit metadata, and alerting without sensitive payloads |
| SMTP relay | Production Auth invitation and password-reset delivery when email is enabled |

Kubernetes can be evaluated for customers that already operate it, but it is not the baseline delivery target. The first supported package is Docker Compose on a dedicated host.

## Application Container

The repository contains:

- `Dockerfile`: multi-stage frontend build and Nginx runtime.
- `compose.yaml`: deploys the frontend container with a health check.
- `deploy/nginx.conf`: SPA routing, immutable asset caching, no-store runtime configuration, and security headers.
- `deploy/40-write-runtime-config.sh`: writes public Supabase configuration when the container starts.
- `deploy/compose.env.example`: customer-specific public configuration template.
- `.github/workflows/container-release.yml`: tag-only multi-platform GHCR publication with pinned Actions, SBOM/provenance, signatures, and release assets.
- `deploy/release/`: no-build digest-pinned customer Compose templates.
- `scripts/verify-release-installation.mjs`: standalone signature, integrity, image-label, Nginx, runtime-config, and health acceptance.

Vite variables are normally replaced at build time. This application loads `/app-config.js` before the bundle, so one reviewed image can run against different managed or self-hosted Supabase installations without rebuilding. Only the public Supabase URL and anon or publishable key are written to this file. Service-role, database, SMTP, JWT, and encryption secrets must never enter the frontend container.

## Dedicated Installation Procedure

1. Record the customer owner, DNS names, network zones, expected users, retention requirements, backup targets, SMTP decision, recovery objectives, and maintenance window.
2. Provision at least the current official Supabase minimum for a small deployment: 2 CPU cores, 4 GB RAM, and 40 GB SSD. Prefer 4 cores, 8 GB or more RAM, and 80 GB or more SSD. Size from measured load before production approval.
3. Obtain a reviewed, pinned Supabase self-host release from the official repository. Do not assemble independent latest image tags; Supabase tests the release image set together.
4. Generate unique production secrets with the official Supabase scripts. Replace every sample password and key. Store secret files outside Git with least-privilege filesystem access.
5. Configure `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`, exact allowed redirect URLs, the proxy domain, JWT keys, database credentials, Studio credentials, and approved SMTP settings. Require at least 12 characters plus upper-case, lower-case, numeric, and symbol classes in the deployment's Auth password policy. Generate an independent 32-byte random AES key and configure it as server-only `EVALUATION_ENCRYPTION_KEY_VERSION_<VERSION>` plus `EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION`. Never reuse the linked development key. `EVALUATION_ENCRYPTION_KEYRING` is supported only for backward compatibility.
6. Put a TLS reverse proxy or customer load balancer in front of the application gateway. Set browser `SUPABASE_PUBLIC_URL` to the same public application origin ending in `/supabase`, and set server-only `SUPABASE_UPSTREAM_URL` to the public or private Supabase origin. Generate a separate 256-bit-or-stronger `YANKI_SENSITIVE_GATEWAY_TOKEN`, configure the same value in Nginx and Functions, and set `YANKI_SENSITIVE_GATEWAY_REQUIRED=true` in Functions. Expose only required HTTPS endpoints. Keep Postgres, Studio, and internal service ports on restricted networks.
7. Start Supabase with its official `run.sh start` workflow and wait for healthy services. Inspect failed service logs before continuing.
8. Apply this repository's migrations to the dedicated database from a trusted release workspace:

```bash
npx supabase db push --db-url "$DATABASE_URL" --include-all --yes
```

The database URL is a server secret and must be percent-encoded where required. Do not place it in frontend configuration or command logs retained by CI.

9. Copy each reviewed directory from `supabase/functions/` to the self-hosted stack's `volumes/functions/`, configure server-only values in the Functions environment file, preserve `verify_jwt = false` for `anonymous-evaluation-submissions`, and recreate or restart the Functions service. The function performs credential authorization itself and must remain callable without a user session. Follow the official [self-hosted Functions guide](https://supabase.com/docs/guides/self-hosting/self-hosted-functions).
10. Download every asset from one reviewed versioned GitHub Release. Run the full command in `docs/INSTALLATION_ACCEPTANCE.md`, copy the release `compose.env.example` to a protected deployment environment file, set the customer public URL/key and server-only gateway token, keep `YANKI_IMAGE` unchanged, and start the digest-pinned image without building source:

```bash
docker compose --env-file .env.deploy -f compose.yaml up -d --wait --no-build
```

11. Route the public application domain to the frontend container, verify `/healthz`, sign-in redirects, password reset, invitation delivery when enabled, and all role-denial scenarios. Run synthetic submission and report acceptance, including 413/429 behavior, threshold, self, system-admin, employee, and anonymous denial checks.
12. Create the initial organization and administrator with the production tenant bootstrap procedure below. Verify that the administrator receives the message, sets a strong password, accepts the invitation, and sees only the new organization scope. Manual service-role table writes are not an approved workaround.
13. Configure each tenant's evaluation-content policy, schedule `npm run retention:run` in the trusted operator environment, enable the encrypted off-site backup timer below, define aligned backup retention, and perform an environment-specific database-plus-key restore drill before accepting live data. Document recovery time and recovery point objectives.
14. Configure capacity, availability, certificate, backup, database, Auth, Functions, application health, and anonymous abuse-counter alerts. Acceptance-test the included Nginx limits or reproduce them in the selected CDN/WAF, then connect the content-free alert timer and infrastructure failures to approved receivers. Never collect scores, comments, decrypted payloads, credentials, tokens, request bodies, or evaluator-to-response mappings in logs.
15. Run the release acceptance checklist and obtain customer security/operations sign-off.

## Signed Container Release

The release workflow runs only when a stable `vMAJOR.MINOR.PATCH` tag exactly matches `package.json`. It builds one `linux/amd64` plus `linux/arm64` OCI index, publishes only a source-commit locator tag, and records the immutable image digest in the signed release manifest and generated customer environment file. No `latest` image is published or accepted.

Docker base images are pinned by manifest digest and every GitHub Action is pinned by a full commit SHA. BuildKit attaches max-mode provenance and an SPDX SBOM. Cosign signs both the exact OCI digest and `release-manifest.json` through the GitHub Actions OIDC identity. GitHub artifact attestations are added for public repositories and explicitly enabled supported private-repository plans; customer acceptance does not depend on that optional route.

Before the first production release, enable GitHub immutable releases and version-tag protection in repository settings. Do not delete and recreate a published version tag. A failed workflow may be rerun only while no GitHub Release exists; the workflow refuses to mutate an existing release. See `docs/INSTALLATION_ACCEPTANCE.md` for publisher and customer commands, expected signer identity, failure rules, and release contents.

Public GHCR packages can be pulled anonymously. Private packages require prior registry authentication through the customer's approved credential store; release and Compose files must contain no registry credential. Direct GHCR pull is the current baseline. Air-gapped transfer or mirroring into a customer registry is not production-approved until a reviewed process proves preservation and verification of the exact image digest, Cosign signatures, SBOM, and provenance.

## Updates And Rollback

- Publish through the reviewed tag-only workflow and deploy the exact `image@sha256:...` reference from its signed manifest. Registry tags are locators only.
- Verify Cosign identity, release-file hashes, OCI labels, generated Nginx configuration, runtime public-config boundary, and container health before every environment update.
- Pin the Supabase self-host release; review its changelog before updating the tested image set.
- Back up the database before migrations and validate restore procedures regularly.
- Run migration dry-run and staging acceptance checks before production.
- Database migrations are forward-only by default. A rollback plan must use a reviewed corrective migration or database restore, never an unreviewed destructive command.
- Keep the previous signed image digest and release package available for immediate frontend rollback when no incompatible migration has been applied.

## Production Release Gate

This repository now has anonymous encrypted submission storage, additive key rotation, key-health validation, application-level anonymous quotas, same-origin gateway limits, content-free aggregate monitoring and webhook alert transitions, scoped immediate aggregate reporting, tenant content-retention controls, production tenant bootstrap, scheduled encrypted off-site backup tooling, exact-snapshot restore acceptance, and signed digest-pinned container release automation, but it is not approved for live employee data. The first real hosted release, an independent production key, approved key escrow, real remote backup and alert providers, monitored systemd/infrastructure execution, production capacity tuning, signed environment-specific recovery drill, approved invitation-mail acceptance, and broader end-to-end security regression coverage must be completed before production use.

## Production Tenant Bootstrap Operations

1. Configure approved SMTP, the public site URL, the exact bootstrap redirect URL, and the Auth password policy before creating a tenant. Production URLs must use HTTPS; plain HTTP is accepted by the operator only for localhost development. The redirect must open this application so the invited administrator can set a password and then accept the invitation.
2. Copy `.env.operator.example` to ignored `.env.operator.local`. Obtain a new random UUID for `TENANT_BOOTSTRAP_REQUEST_ID` and keep that UUID plus every normalized input unchanged for retries. Put the service-role key into this file only through the approved secret channel.
3. Run the side-effect-free preflight:

```bash
npm run tenant:bootstrap:check
```

4. Review the organization slug, administrator mailbox, redirect allow-list, and output status. Set `TENANT_BOOTSTRAP_CONFIRM=CREATE_PRODUCTION_TENANT`, then execute:

```bash
npm run tenant:bootstrap
```

5. The command returns record identifiers and status only. It never returns the administrator email, password, service-role key, invitation token, or action link. An exact rerun returns `already_completed`; a different payload using the same request UUID is rejected.
6. The invited identity has an `INVITED` profile but no membership or role until the email-verified user completes the existing invitation acceptance. Verify the final role is `SYSTEM_ADMIN` scoped to the new organization, never `PLATFORM`.
7. If the initial message expired or was lost, keep every original input and request UUID unchanged, set `TENANT_BOOTSTRAP_RECOVERY_CONFIRM=REISSUE_BOOTSTRAP_INVITATION`, and run:

```bash
npm run tenant:bootstrap:recover
```

The recovery command refuses accepted, revoked, unknown, or fingerprint-mismatched requests. It renews the internal invitation and asks Supabase Auth to send password-recovery mail without generating a raw link. Alert and investigate `TENANT_BOOTSTRAP_COMPENSATION_FAILED`; it means the database step failed and the newly created Auth identity could not be removed automatically. If a process crash leaves `TENANT_BOOTSTRAP_ADMIN_EMAIL_ALREADY_EXISTS`, verify through restricted Auth administration that the identity has no profile, membership, role, or completed bootstrap record before deleting it. Never adopt or mark an unexplained existing identity.

## Evaluation Content Retention Operations

- Configure policies only through the authenticated administration UI or reviewed trusted boundary. The default is 730 days with automatic purge disabled; the supported range is 30 to 3650 days.
- Legal hold always prevents operator cleanup for the tenant, even when automatic purge is enabled.
- Copy `.env.operator.example` to ignored `.env.operator.local`, replace placeholders through the approved secret channel, and run `npm run retention:run` only in a trusted server/runner. Never place these values in frontend runtime configuration.
- Schedule the command at least daily in SaaS operations or the customer-controlled cron/Task Scheduler. Alert on command failure, not on deleted-row counts.
- The operator response contains the execution date and number of organization policies processed only. It does not contain submission/deletion counts or content.
- A live-database purge does not remove retained backups. Document backup expiry separately and retain historical encryption keys until every applicable backup window has ended.

## Backup And Restore Acceptance

- Start the local Supabase stack and apply all migrations before the repository-level drill.
- Set `BACKUP_RESTORE_ACCEPTANCE_CONFIRM=RUN_DISPOSABLE_BACKUP_RESTORE_ACCEPTANCE`, then run `npm run backup:restore:acceptance`.
- The default drill uses `supabase_admin` inside `supabase_db_anonim_degerlendirme`, creates only `yanki_restore_acceptance`, streams a compressed custom-format dump directly into restore without writing it to host storage, verifies migration and security invariants, and removes the temporary database.
- Override the container, database user, source, or target only in a reviewed disposable environment. The target name must end in `_restore_acceptance` and must never equal the source database.
- This local drill validates mechanics, schema, and restored privileges. Every SaaS or dedicated production environment must configure the provided scheduler against an approved remote repository, escrow its keys, document RPO/RTO, and restore into isolated infrastructure using its approved Supabase recovery procedure.

## Scheduled Encrypted Off-Site Backups

Managed Supabase backups remain useful but are not the independent repository controlled by this workflow. Self-hosted operators are responsible for all backup and disaster recovery. The Restic workflow is a logical same-version disaster-recovery export; platform-to-self-hosted or cross-major-version migration may require Supabase's separate portable roles/schema/data dump procedure. Database snapshots do not contain Supabase Storage object bytes, Edge Function source/secrets, SMTP settings, DNS, or runtime deployment configuration; back those up through their reviewed infrastructure channels.

### Operator configuration

1. Provision an object-storage bucket or remote backend in a different failure/account boundary from the database host. Enable provider-side immutability/versioning where approved, restrict credentials to the repository path, and block public access.
2. Generate a strong independent Restic repository password. Store it and backend credentials in the approved secret manager/recovery escrow, separate from repository data and evaluation-encryption keys.
3. Install exactly Restic `0.19.1` and a PostgreSQL client compatible with the source server. Windows development can run `npm run backup:tool:install`; the checksum-verified binary stays under ignored `.tools/` on the project drive rather than using a system-wide installation.
4. Copy `deploy/backup/operator.env.example` to `/etc/yanki/backup.env`, set owner/root access and mode `0600`, replace every placeholder, and remove variables for the unused source mode. `DATABASE_URL` keeps the connection in `PGDATABASE`; `DOCKER` runs `pg_dump` inside the named database container.
5. Set `RESTIC_REPOSITORY` to an approved remote backend or use `RESTIC_REPOSITORY_FILE`. Local paths are rejected unless `OFFSITE_BACKUP_ALLOW_LOCAL_REPOSITORY=ALLOW_LOCAL_ENCRYPTED_REPOSITORY_FOR_ACCEPTANCE`, which is never valid for production evidence.

Initialize each new remote repository once:

```bash
OFFSITE_BACKUP_REPOSITORY_INIT_CONFIRM=INITIALIZE_ENCRYPTED_OFFSITE_REPOSITORY \
  npm run backup:offsite:init
```

Run one controlled snapshot, integrity check, and retention preview/acceptance before scheduling:

```bash
npm run backup:offsite:create
npm run backup:offsite:check
npm run backup:offsite:retention
```

Snapshot creation uses `--stdin-from-command`, so a failed `pg_dump` cancels the snapshot. The report returns only the full snapshot id, source/repository byte totals, source mode, and safe booleans. Integrity defaults to a random 5% data subset; schedule periodic `100%` checks according to repository size and bandwidth budget. Retention values are mandatory and scoped to exact environment host/path/tags. Align them with tenant contracts, legal holds, database retention, and historical encryption-key custody before enabling prune.

Install the reviewed systemd files on a Linux operator host:

```bash
sudo install -m 0644 deploy/backup/yanki-offsite-backup.service /etc/systemd/system/
sudo install -m 0644 deploy/backup/yanki-offsite-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now yanki-offsite-backup.timer
```

The timer runs daily with randomized delay and persists missed executions. Monitor `yanki-offsite-backup.service` failure, stale last-success age, remote capacity, and provider access errors without logging database URLs, repository locators, credentials, dump output, or content.

### Environment-specific restore acceptance

1. Provision a compatible isolated Supabase/PostgreSQL environment. Never test by overwriting production.
2. Recover the Restic password/backend credentials and every key in the environment's custody manifest through their independent approved channels.
3. Select and record one full 64-character snapshot id from the intended environment. The command rejects `latest`, host/tag/path mismatches, and an unguarded target name.
4. Configure `OFFSITE_RESTORE_*`, `EVALUATION_KEY_CUSTODY_MANIFEST_PATH`, and the versioned encryption keys. Set `OFFSITE_RESTORE_ACCEPTANCE_CONFIRM=RUN_ENCRYPTED_OFFSITE_RESTORE_ACCEPTANCE`.
5. Run `npm run backup:offsite:restore:acceptance`. Accept only when the snapshot scope, streamed restore, reviewed database privileges, every recovery canary, and disposable target removal pass.
6. Record measured backup age, RPO, RTO, snapshot id, release/version compatibility, byte/hash report, operator approvals, and remediation. Archive no secret values or restored content.

Run an isolated drill at least quarterly and after backup-tool, PostgreSQL-major-version, key-custody, retention, or topology changes. A local repository drill proves mechanics only; production readiness requires the real remote backend and production-like isolated infrastructure.

## Anonymous Abuse-Control Operations

- The application baseline is 12 requests per recognized credential per 10 minutes, 120 unknown-credential requests per minute globally, a 256 KiB anonymous body limit, and a 16 KiB credential-preparation body limit.
- Application rate buckets expire after one day. Five-minute aggregate invalid/rate-limited counters are retained for seven days.
- `security-abuse-monitoring` is restricted to active system administrators and exposes only aggregate 60-minute/24-hour counts and policy constants.
- Do not add IP addresses, device fingerprints, request bodies, credential digests, users, assignments, or content to product abuse tables or application logs.
- Run `npm run smoke:abuse` with synthetic users after every anonymous submission, shared request-body, gateway, or monitoring change.

### Same-origin gateway

The application container is the browser's Supabase gateway. `SUPABASE_PUBLIC_URL` must be the HTTPS application origin ending in `/supabase`; `SUPABASE_UPSTREAM_URL` is consumed only by Nginx and must be an HTTP(S) host plus optional port with no path, credentials, query, or fragment. For local acceptance, the public URL may use loopback HTTP. Runtime DNS resolution means a temporarily unresolved upstream does not prevent `/healthz` or the static application from starting.

Managed Supabase remains publicly addressable, so routing browser configuration through `/supabase` alone is not an enforcement boundary. Generate an environment-specific 256-bit-or-stronger base64url token of 32-256 characters through the approved secret tool. Put it in container `YANKI_SENSITIVE_GATEWAY_TOKEN`; Nginx overwrites the corresponding upstream header on the two sensitive routes. Configure the same Function secret plus `YANKI_SENSITIVE_GATEWAY_REQUIRED=true`. The Functions then reject missing/wrong direct requests before body parsing, Auth lookup, quota work, context lookup, or encryption. Never put this token in `SUPABASE_PUBLIC_URL`, `app-config.js`, Vite variables, browser storage, source control, or logs.

For managed Supabase, prepare an ignored mode-`0600` secret file and apply it before deploying the two Functions:

```text
YANKI_SENSITIVE_GATEWAY_REQUIRED=true
YANKI_SENSITIVE_GATEWAY_TOKEN=replace-through-approved-secret-channel
```

```bash
npx supabase secrets set --project-ref "$PROJECT_REF" --env-file .secrets/sensitive-gateway.env
npx supabase functions deploy evaluation-submission-credentials --project-ref "$PROJECT_REF"
npx supabase functions deploy anonymous-evaluation-submissions --no-verify-jwt --project-ref "$PROJECT_REF"
```

For self-hosted Supabase, place the same two values in the Functions server environment and restart Functions. Rotate by updating Nginx and Functions in one maintenance window; a mismatch intentionally returns `403`. Development environments may omit both variables to retain direct synthetic testing, but that mode is forbidden for production evidence.

The committed baseline applies these controls before Supabase:

| Boundary | Per-source rate | Deployment rate | Burst | Body | Connections |
| --- | ---: | ---: | ---: | ---: | ---: |
| Anonymous redemption | 240/minute | 1200/minute | 60/240 | 256 KiB | 20/source |
| Credential preparation | 120/minute | 600/minute | 30/120 | 16 KiB | 20/source |
| Other Supabase routes | Not request-limited here | Not request-limited here | N/A | 8 MiB | 40/source |

These are outer capacity limits, not business eligibility decisions. The trusted application quota remains credential-aware and cannot be replaced by Nginx. Review source/global rates against peak submission windows and shared corporate NAT before tightening them. A non-Docker CDN/WAF must reproduce at least the exact sensitive body limits, bounded connections, `429` behavior, and independently reviewed volumetric limits.

Sensitive endpoint access logs are disabled. Remaining Nginx logs use `$uri`, not query strings, and never include bodies or Authorization headers. Limiter events are configured below the runtime error-log threshold. Provider/load-balancer logs remain outside this repository and require a documented privacy, access, and retention review. Do not expose the container port directly to the internet; restrict it behind the approved TLS proxy/load balancer.

Validate every image and gateway change:

```bash
npm run deployment:config
docker compose --env-file deploy/compose.env.example build web
docker compose --env-file deploy/compose.env.example run --rm --no-deps web nginx -t
```

Then run synthetic 413/429 tests through the public route and confirm sensitive request details are absent from every gateway/provider log sink. Call both sensitive endpoints through the direct upstream URL without the internal header and require `403`; call through `/supabase` and require normal application authorization behavior. Do not accept a production environment where the direct URL reaches credential, quota, or encryption work.

### Content-free alert delivery

1. Create a dedicated HTTPS webhook receiver or a reviewed adapter to the approved Teams, email, SIEM, or incident platform. Require a random bearer token; do not put credentials in the URL or allow redirects.
2. Copy `deploy/security/operator.env.example` to `/etc/yanki/security-alert.env`, set root ownership and mode `0600`, and place the bearer token in the configured secret file. The webhook token grants delivery only; it must not be a Supabase or encryption credential.
3. Select 60-minute invalid-credential and rate-limited thresholds using synthetic baseline/load evidence. Defaults are 60 and 5. Shared SaaS counters are intentionally global and contain no tenant split.
4. Apply the migration, set `SECURITY_ALERT_ACCEPTANCE_CONFIRM=RUN_LOCAL_SECURITY_ALERT_ACCEPTANCE`, and run `npm run security:alerts:acceptance`. This reads the real operator RPC, delivers alert/recovery payloads only to an ephemeral loopback receiver, verifies duplicate suppression, and removes temporary state.
5. Send a separately approved test through the real receiver before production. Confirm the receiver stores no source IP supplied by this application, tenant/user/request/credential identifier, body, ciphertext, or evaluation content.

Install the reviewed alert schedule on a Linux operator host:

```bash
sudo install -m 0644 deploy/security/yanki-security-alert.service /etc/systemd/system/
sudo install -m 0644 deploy/security/yanki-security-alert.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now yanki-security-alert.timer
```

The timer polls every five minutes. It sends only `ALERT`, bounded `ALERT_REMINDER`, and `RECOVERED` transitions. The mode-`0600` state contains environment id, alert/healthy status, and last delivery time only. A failed RPC, malformed state, or failed webhook returns non-zero and does not advance state. Monitor timer failures, last-success age, application `/healthz`, Supabase health, certificates, capacity, and container restarts through the approved infrastructure channel; those availability alerts do not depend on the application database.

## Encryption Key Operations

- Keep every still-referenced key version as an independent server-only secret until all ciphertext under that version has been re-encrypted or deleted under an approved retention policy.
- Report decryption requires the exact historic key version stored with each ciphertext. A key version must not be retired merely because it is no longer active for new submissions.
- Back up all key versions through the approved secret manager and test recovery together with a database restore. A database backup without its keys is unrecoverable; a key backup without access controls defeats database-at-rest confidentiality.
- Never print key values in CI logs, shell history, support bundles, browser configuration, or customer handover documents.

Custody and recovery sequence:

1. Copy `deploy/evaluation-key-custody.manifest.example.json` to the ignored path `.secrets/evaluation-key-custody.manifest.json`. Give the deployment a stable environment id and include every active or decrypt-only key version.
2. Replace the example references with an approved primary secret-manager reference and an independently controlled recovery/offline-escrow reference. Declare different primary and recovery control domains; two records under the same administrative control do not qualify as independent custody. References are identifiers only and must not contain credentials, query strings, fragments, or key values. Assign at least two distinct custodian roles.
3. Inject every key into the trusted operator process as `EVALUATION_ENCRYPTION_KEY_VERSION_<VERSION>`. Set `EVALUATION_KEY_CUSTODY_MANIFEST_PATH` and run `npm run encryption:custody:validate`. The result must report one active key, independent recovery custody, two-person control, and no key material in the manifest.
4. After the migration is active, set `EVALUATION_RECOVERY_CANARY_CONFIRM=UPSERT_ENCRYPTION_RECOVERY_CANARIES` and run `npm run encryption:recovery:canary`. This writes only encrypted random canaries through the service-role RPC and reads no evaluation content.
5. Restore the approved database backup into isolated Supabase/PostgreSQL infrastructure. Configure the Docker container/source/guarded target values for that isolated environment, recover all manifest keys through the approved custody channels, set `KEY_DATABASE_RECOVERY_ACCEPTANCE_CONFIRM=RUN_KEY_DATABASE_RECOVERY_ACCEPTANCE`, and run `npm run encryption:recovery:acceptance`.
6. Accept the drill only when every custodied key decrypts its restored canary, all restored privilege checks pass, no host dump is written, and the disposable target is removed. Archive only the count/boolean/hash report through the approved evidence channel.

Repeat manifest validation, canary refresh, backup creation, and combined recovery acceptance after every key-version addition and at the documented disaster-recovery cadence. The repository provides scheduled backup tooling, but it cannot prove that the configured provider is geographically or administratively independent. SaaS operations and each dedicated customer must separately approve secret-provider access, encrypted off-site storage, timer monitoring, retention, isolated restore infrastructure, RPO/RTO, and signed two-person evidence.

Managed Supabase rotation sequence:

```bash
npm run encryption:key:prepare -- PROD_20260807_01
npx supabase functions deploy evaluation-submission-credentials --project-ref "$PROJECT_REF"
npx supabase functions deploy anonymous-evaluation-submissions --no-verify-jwt --project-ref "$PROJECT_REF"
npx supabase functions deploy evaluation-reports --project-ref "$PROJECT_REF"
npx supabase functions deploy encryption-key-health --project-ref "$PROJECT_REF"
npx supabase secrets set --project-ref "$PROJECT_REF" --env-file .secrets/encryption-key-rotation.env
```

Deploy the backward-compatible readers before the secret update. Verify `smoke:key-health`, create and aggregate new synthetic ciphertext, verify health again, then securely delete `.secrets/encryption-key-rotation.env`. The application health response must be healthy and its referenced count must not exceed its configured count. In a dedicated installation, place the same two generated variables in the customer-controlled Functions secret environment and restart the Functions service instead of using `supabase secrets set`.

Rollback changes only `EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION` back to the previous configured version. Do not delete the newly added or historical key. Deletion requires an approved inventory showing no ciphertext reference, a retention or re-encryption decision, a tested backup, and two-person review.

## Customer Handover

The handover package must include the architecture diagram, data inventory, ports and DNS, secret ownership, SMTP configuration, backup and restore runbook, monitoring alerts, update cadence, incident contacts, vulnerability response, license inventory, signed release manifest, exact image digest, SBOM, provenance, release checksums, and signed acceptance results. Secret values and live credentials are delivered only through the customer's approved secure channel.

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

Vite variables are normally replaced at build time. This application loads `/app-config.js` before the bundle, so one reviewed image can run against different managed or self-hosted Supabase installations without rebuilding. Only the public Supabase URL and anon or publishable key are written to this file. Service-role, database, SMTP, JWT, and encryption secrets must never enter the frontend container.

## Dedicated Installation Procedure

1. Record the customer owner, DNS names, network zones, expected users, retention requirements, backup targets, SMTP decision, recovery objectives, and maintenance window.
2. Provision at least the current official Supabase minimum for a small deployment: 2 CPU cores, 4 GB RAM, and 40 GB SSD. Prefer 4 cores, 8 GB or more RAM, and 80 GB or more SSD. Size from measured load before production approval.
3. Obtain a reviewed, pinned Supabase self-host release from the official repository. Do not assemble independent latest image tags; Supabase tests the release image set together.
4. Generate unique production secrets with the official Supabase scripts. Replace every sample password and key. Store secret files outside Git with least-privilege filesystem access.
5. Configure `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`, exact allowed redirect URLs, the proxy domain, JWT keys, database credentials, Studio credentials, and approved SMTP settings. Require at least 12 characters plus upper-case, lower-case, numeric, and symbol classes in the deployment's Auth password policy. Generate an independent 32-byte random AES key and configure it as server-only `EVALUATION_ENCRYPTION_KEY_VERSION_<VERSION>` plus `EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION`. Never reuse the linked development key. `EVALUATION_ENCRYPTION_KEYRING` is supported only for backward compatibility.
6. Put a TLS reverse proxy or customer load balancer in front of the Supabase gateway and application. Expose only required HTTPS endpoints. Keep Postgres, Studio, and internal service ports on restricted networks.
7. Start Supabase with its official `run.sh start` workflow and wait for healthy services. Inspect failed service logs before continuing.
8. Apply this repository's migrations to the dedicated database from a trusted release workspace:

```bash
npx supabase db push --db-url "$DATABASE_URL" --include-all --yes
```

The database URL is a server secret and must be percent-encoded where required. Do not place it in frontend configuration or command logs retained by CI.

9. Copy each reviewed directory from `supabase/functions/` to the self-hosted stack's `volumes/functions/`, configure server-only values in the Functions environment file, preserve `verify_jwt = false` for `anonymous-evaluation-submissions`, and recreate or restart the Functions service. The function performs credential authorization itself and must remain callable without a user session. Follow the official [self-hosted Functions guide](https://supabase.com/docs/guides/self-hosting/self-hosted-functions).
10. Copy `deploy/compose.env.example` to an ignored deployment environment file, set the customer public URL/key, and start the application:

```bash
docker compose --env-file .env.deploy up -d --build --wait
```

11. Route the public application domain to the frontend container, verify `/healthz`, sign-in redirects, password reset, invitation delivery when enabled, and all role-denial scenarios. Run synthetic submission and report acceptance, including 413/429 behavior, threshold, self, system-admin, employee, and anonymous denial checks.
12. Create the initial organization and administrator with the production tenant bootstrap procedure below. Verify that the administrator receives the message, sets a strong password, accepts the invitation, and sees only the new organization scope. Manual service-role table writes are not an approved workaround.
13. Configure each tenant's evaluation-content policy, schedule `npm run retention:run` in the trusted operator environment, enable the encrypted off-site backup timer below, define aligned backup retention, and perform an environment-specific database-plus-key restore drill before accepting live data. Document recovery time and recovery point objectives.
14. Configure capacity, availability, certificate, backup, database, Auth, Functions, application health, and anonymous abuse-counter alerts. Apply reverse-proxy/WAF connection and request limits outside the application without collecting IP/device identifiers in the product database. Never collect scores, comments, decrypted payloads, credentials, tokens, or evaluator-to-response mappings in logs.
15. Run the release acceptance checklist and obtain customer security/operations sign-off.

## Updates And Rollback

- Build and tag application images with immutable release versions and source commit identifiers.
- Pin the Supabase self-host release; review its changelog before updating the tested image set.
- Back up the database before migrations and validate restore procedures regularly.
- Run migration dry-run and staging acceptance checks before production.
- Database migrations are forward-only by default. A rollback plan must use a reviewed corrective migration or database restore, never an unreviewed destructive command.
- Keep the previous application image available for immediate frontend rollback when no incompatible migration has been applied.

## Production Release Gate

This repository now has anonymous encrypted submission storage, additive key rotation, key-health validation, application-level anonymous quotas, content-free aggregate abuse monitoring, scoped thresholded reporting, tenant content-retention controls, production tenant bootstrap, scheduled encrypted off-site backup tooling, and exact-snapshot restore acceptance, but it is not approved for live employee data. An independent production key, approved key escrow, real remote backup provider, monitored systemd execution, signed environment-specific recovery drill, outer gateway/WAF limits and alert delivery, approved invitation-mail acceptance, and broader end-to-end security regression coverage must be completed before production use.

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
- Configure the public reverse proxy, CDN, or WAF with independently reviewed connection/request limits before production. External infrastructure logs have their own privacy and retention review and must never capture request bodies or credentials.
- Alert on sustained aggregate invalid/rate-limited activity and endpoint availability. Alert delivery is not implemented by this repository and remains a release gate.
- Run `npm run smoke:abuse` with synthetic users after every anonymous submission, shared request-body, gateway, or monitoring change.

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

The handover package must include the architecture diagram, data inventory, ports and DNS, secret ownership, SMTP configuration, backup and restore runbook, monitoring alerts, update cadence, incident contacts, vulnerability response, license inventory, release checksums, and signed acceptance results. Secret values and live credentials are delivered only through the customer's approved secure channel.

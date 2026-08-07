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
| PostgreSQL backup tooling | Scheduled backups, restore drills, and optional WAL archiving |
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
5. Configure `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`, allowed redirect URLs, the proxy domain, JWT keys, database credentials, Studio credentials, and optional SMTP settings. Generate an independent 32-byte random AES key and configure it as server-only `EVALUATION_ENCRYPTION_KEY_VERSION_<VERSION>` plus `EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION`. Never reuse the linked development key. `EVALUATION_ENCRYPTION_KEYRING` is supported only for backward compatibility.
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
12. Create the initial organization and administrator through an approved bootstrap procedure. A production bootstrap command is not implemented yet; manual service-role writes are not an approved workaround.
13. Schedule encrypted backups, define retention, and perform a restore drill before accepting live data. Document recovery time and recovery point objectives.
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

This repository now has deployed anonymous encrypted submission storage, additive key rotation, key-health validation, application-level anonymous quotas, content-free aggregate abuse monitoring, and scoped thresholded reporting, but it is not approved for live employee data. An independent production key, approved key escrow and recovery drill, outer gateway/WAF limits and alert delivery, production bootstrap, backup/restore automation, retention policy, and broader end-to-end security regression coverage must be completed before production use.

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

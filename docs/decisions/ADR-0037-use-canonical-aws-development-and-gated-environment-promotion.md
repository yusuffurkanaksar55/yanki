# ADR-0037: Use Canonical AWS Development And Gated Environment Promotion

## Status

Accepted on 2026-08-18.

## Context

The application now has an accepted AWS self-hosted Supabase development environment, a public synthetic HTTPS frontend, a protected same-origin gateway, synchronized repository migrations, deployed Edge Functions, synthetic fixtures, encrypted backup, and repeatable security/browser acceptance. Development needs to continue quickly on this real integration surface without weakening the eventual production boundary.

The temporary `sslip.io` origin is not a production domain. Existing migrated data, including 20 ciphertext rows whose historical development keys are unavailable, must remain preserved. Future staging and production environments need independent secrets, data, infrastructure controls, and evidence rather than inheriting development shortcuts.

## Decision

- Treat AWS self-hosted Supabase and `https://18-194-171-29.sslip.io` as the canonical synthetic DEV backend and web origin. Use the SSH loopback tunnel for trusted operator/database access and same-origin HTTPS for public browser acceptance.
- Keep only TCP 80/443 public. Preserve TLS, HTTP-to-HTTPS redirect, Caddy/Nginx, HSTS/CSP/security headers, same-origin routing, gateway-token enforcement, and direct sensitive-Function denial. Never expose PostgreSQL, pooler, internal gateway, MCP, or Studio publicly.
- Allow routine end-to-end Codex work in DEV: repository changes, new forward migrations, DEV apply, Edge Function/frontend deployment, uniquely scoped synthetic fixtures and cleanup, failure correction, real integration tests, commits, and GitHub pushes.
- Preserve migrated data and the exact 30-row accepted migration history. Do not replay the imported baseline. Create one new timestamped migration for every persistent schema change and keep repository SQL as the source of truth.
- Preserve all 20 legacy encrypted submissions without modification. Continue using only the identifier `AWS_DEV_20260817_01` for new synthetic development encryption while keeping its secret outside Git, browser configuration, local frontend environment, logs, and reports.
- Promote through DEV -> STAGING -> PRODUCTION. STAGING is an isolated release rehearsal with production-like controls. PRODUCTION receives only the exact artifacts and migrations accepted in lower environments after backup and controlled approval.
- Keep production secrets outside the normal Codex workspace and avoid interactive production development or direct routine production SQL. Prefer reviewed CI/CD deployment and independently controlled production credentials.
- Use expand -> deploy -> migrate -> contract for breaking live-schema evolution whenever practical.
- Stop for bulk/destructive migrated-data changes, hard-to-reverse drops, legacy-ciphertext intervention, production secrets or destructive production access, internal-port exposure, backup weakening, or former Supabase Cloud mutation.

## Alternatives Considered

- Continue using managed Supabase Cloud as a fallback: rejected because AWS self-hosted Supabase is the accepted source and fallback would reintroduce environment drift.
- Treat local mocks or Docker-only checks as sufficient backend evidence: rejected because backend-dependent behavior must be verified against canonical AWS DEV when practical.
- Develop directly in production after launch: rejected because it bypasses repeatable tests, artifact promotion, independent secrets, backup gates, and controlled rollback.
- Turn the temporary DEV host/domain directly into production: rejected because development data, keys, access, topology, monitoring, and operational controls are not production-approved.
- Require approval for every routine DEV change: rejected because the protected release path, not ordinary synthetic development, is the correct control boundary.

## Consequences

Development can proceed quickly against a real self-hosted integration environment while network, encryption, data-preservation, and source-of-truth rules remain explicit. GitHub and repository migrations stay authoritative, AWS DEV stays synchronized, and failures are corrected and retested without unnecessary approval pauses.

Production remains deliberately harder to change. It requires isolated infrastructure, independent secrets, tested artifacts and migrations, staging acceptance, backup/recovery evidence, and controlled deployment. The current AWS DEV acceptance is useful evidence but never approval for live employee data.

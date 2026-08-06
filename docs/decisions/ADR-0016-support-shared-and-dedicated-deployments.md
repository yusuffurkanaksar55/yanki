# ADR-0016 - Support Shared And Dedicated Deployments

## Status

Accepted

## Context

The product will be sold to multiple companies. Some customers can use a vendor-hosted shared service, while others require the application and data to run on infrastructure they control. A Vite build normally embeds public environment values at build time, which would require a different frontend image for every customer.

## Decision

Support two deployment topologies with the same source and schema:

- Vendor-hosted shared SaaS with `organizations.id` as the tenant boundary.
- Customer-managed dedicated installation with one application container and one official self-hosted Supabase stack per customer.

Build the frontend once and inject only the public Supabase URL and anon or publishable key into `/app-config.js` at container startup. Use a multi-stage Docker image and Nginx runtime. Keep service-role, database, SMTP, JWT, and encryption secrets in trusted server infrastructure only.

Use the official Supabase Docker Compose release as an external deployment dependency instead of copying its rapidly changing service topology into this repository. Keep this repository responsible for the application image, migrations, Edge Functions, and deployment runbook.

## Alternatives considered

- Build one frontend image per customer: rejected because it increases release drift and weakens artifact verification.
- Replace Supabase with a custom backend for on-premises installations: rejected because it creates a second security and maintenance architecture.
- Vendor the full Supabase Compose stack into this repository: rejected because upstream releases are tested as a set and need an explicit customer update process.
- Use Kubernetes as the only target: rejected because it raises the minimum customer operations burden.

## Consequences

- One immutable frontend artifact can move between managed and self-hosted environments.
- Dedicated customers assume responsibility for infrastructure hardening, availability, backups, monitoring, SMTP, and disaster recovery.
- Self-host release versions and application versions must be tested and recorded together.
- A production bootstrap workflow, encrypted evaluation runtime, and operational automation remain required before live deployment approval.

## Security impact

Positive. Public browser configuration is separated from server secrets, tenant authorization remains active even in dedicated installations, and customer-specific secrets are not built into frontend assets.

## Deployment impact

Adds `Dockerfile`, `compose.yaml`, `deploy/`, runtime browser configuration, and `docs/DEPLOYMENT.md`.

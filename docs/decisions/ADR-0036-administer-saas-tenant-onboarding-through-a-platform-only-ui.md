# ADR-0036: Administer SaaS Tenant Onboarding Through A Platform-Only UI

## Status

Accepted on 2026-08-16.

## Context

The server-only tenant bootstrap command is secure and portable, but normal shared-SaaS customer onboarding should not require an operator to edit environment files and run a CLI command for every sale. Replacing it with a public registration page would let unauthenticated callers create tenants or would expose privileged provisioning credentials to the browser. Organization administrators must also remain unable to discover or create other tenants.

## Decision

- Add a customer-onboarding module only for an active exact `SYSTEM_ADMIN` role scoped to `PLATFORM` with a null scope id.
- Keep Supabase service-role credentials in the `platform-tenant-administration` Edge Function. The browser sends only the authenticated access token and validated onboarding fields.
- Repeat exact platform authorization in service-role-only PostgreSQL functions before listing onboarding summaries, invoking the existing idempotent bootstrap, or renewing the first-administrator invitation.
- Reuse `bootstrap_organization_tenant()` and its Auth request marker, SHA-256 fingerprint, default retention policy, invitation acceptance, compensation, and content-free audit behavior instead of creating a second provisioning model.
- Return identity-domain onboarding metadata only: organization identity, status, first-administrator name/email, invitation state, and expiry. Never read or return evaluation content.
- Keep the CLI bootstrap as the required first-platform-operator and dedicated-installation path. The UI does not create or elevate the platform operator that authorizes it.
- Deliver invitation and recovery messages through Supabase Auth using the deployment's approved Site URL, redirect allow-list, SMTP, and password policy. Do not return raw action links.

## Alternatives Considered

- Public self-service company registration: rejected until commercial approval, abuse prevention, billing, domain ownership, and platform-operator governance are explicitly designed.
- Browser access to bootstrap RPCs: rejected because it would expose a privileged provisioning capability and allow actor identifiers to be spoofed directly.
- A separate onboarding schema for UI-created customers: rejected because it would duplicate idempotency, authorization, recovery, and audit behavior.
- Remove the CLI after adding the UI: rejected because the initial platform operator and customer-managed dedicated deployments still need an offline trusted bootstrap path.

## Consequences

Shared-SaaS operators can create a customer, initial unit, and first organization administrator from the administration UI, then monitor or reissue the pending invitation. Dedicated installations retain the same schema and trusted bootstrap command. A deployment still requires an independently provisioned platform operator and approved Auth email configuration before this UI can be used.

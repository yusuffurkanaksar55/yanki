# ADR-0025: Use Idempotent Operator Tenant Bootstrap

## Status

Accepted

## Context

Shared SaaS operations must create additional companies, while a dedicated installation must create its first company and administrator without manual table writes. The first administrator does not yet have an application identity capable of authorizing normal administration. Supabase Auth user creation and PostgreSQL configuration also cannot share one transaction.

The boundary must not expose service-role credentials, passwords, invitation tokens, or privileged bootstrap actions to the browser. A failed database transaction must not leave an operator-created Auth identity silently available for later privilege escalation, and a repeated command must not create duplicate tenants.

## Decision

- Run bootstrap only from the trusted operator environment with `SUPABASE_SERVICE_ROLE_KEY`, an explicit confirmation value, and a stable random request UUID.
- Compute a SHA-256 fingerprint over normalized non-secret bootstrap input. Store only the fingerprint and resulting record identifiers in `tenant_bootstrap_operations`.
- Deny direct access to bootstrap-operation state, including to `service_role`; expose only exact request-status, creation, and invitation-renewal functions to `service_role`.
- Create the Supabase Auth invitation first, mark its server-controlled app metadata with the exact bootstrap request UUID, and require PostgreSQL to verify the Auth id, email, and marker.
- Atomically create the organization, initial unit, invited profile, organization-scoped `SYSTEM_ADMIN` invitation, default retention policy, idempotency record, and content-free audit metadata in PostgreSQL.
- Grant no membership or role until the invited user proves email ownership and accepts through the existing atomic invitation flow.
- If PostgreSQL creation fails, delete only the Auth identity created by the current command. An existing identity without the exact server-controlled request marker is never adopted or elevated.
- Permit an explicit recovery command to renew only an unaccepted and unrevoked bootstrap invitation for the same request/fingerprint and request a Supabase password-recovery email. Do not generate or print raw action links.
- Require invited and recovery sessions to set a strong password before the application workspace opens. Clear only the user-facing password-setup metadata after the password update.
- Use the same migration and operator command for shared SaaS and dedicated installations.

## Alternatives Considered

- Manual service-role inserts: rejected because partial writes, missed constraints, and unaudited privilege escalation are too easy.
- A public first-run endpoint: rejected because deployment-state detection is not a sufficient authentication factor and could permit tenant takeover.
- Browser-based platform bootstrap: rejected because no trusted administrator exists yet and service-role credentials must never reach the browser.
- Store or print a temporary password/action link: rejected because operators, logs, and shell history must not become credential-delivery channels.
- Automatically adopt an existing Auth email: rejected because it could elevate an unrelated or attacker-controlled identity.

## Consequences

Tenant creation is portable, repeatable, audited, and default-deny. The Auth invitation and database transaction still form a compensated workflow rather than one distributed transaction. A process crash can leave an unprivileged Auth identity: an identity already carrying the exact server marker can be resumed with the original request, while an unmarked identity must be reviewed and removed through Auth administration before retry. Every other existing identity is rejected. Production use still depends on approved SMTP delivery, redirect configuration, Auth password policy, and mailbox acceptance testing.

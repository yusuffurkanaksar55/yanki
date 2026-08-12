# ADR-0033: Separate Platform Operations From Tenant Administration

## Status

Accepted on 2026-08-12.

## Context

`SYSTEM_ADMIN` is intentionally reused with different scopes. A `PLATFORM` assignment represents the vendor operator, while an `ORGANIZATION` assignment represents a customer administrator. Tenant configuration operations already accepted either a platform assignment or the exact organization scope. Encryption-key health and anonymous-abuse summaries are different: their source data and counts cover the whole deployment.

The first implementation checked only the role code and active dates. An organization-scoped administrator could therefore open platform-wide operational diagnostics. Those summaries contained no identities or evaluation content, but the access crossed the tenant/platform responsibility boundary.

## Decision

- Reserve deployment-global security diagnostics for an active `SYSTEM_ADMIN` assignment with `scope_type = 'PLATFORM'` and `scope_id is null`.
- Enforce this decision independently in the administration UI, each relevant Edge Function, and PostgreSQL RPC authorization.
- Continue allowing platform or exact-organization system administrators to perform their existing tenant configuration operations.
- Keep platform operations content-free and never return tenant, user, credential, assignment, ciphertext, key material, or evaluation content.
- Regression-test the positive platform path and negative organization-admin path.

## Alternatives Considered

- Add a new `PLATFORM_ADMIN` role: rejected because scope already expresses this distinction and a parallel role would duplicate the authorization model.
- Return tenant-filtered operational summaries to organization admins: rejected because the current privacy-preserving abuse counters deliberately contain no tenant identifiers and key health is deployment-global.
- Rely only on hiding the UI module: rejected because browser visibility is not an authorization boundary.

## Consequences

Customer administrators retain organization users, hierarchy, templates, projects, cycles, and retention management but cannot inspect vendor-wide security operations. Dedicated customer installations can assign a local platform operator explicitly. Shared SaaS operations remain separated from tenant administration without introducing a second role hierarchy.

# ADR-0031: Use Explicit API Table Privileges

## Status

Accepted on 2026-08-09.

## Context

Supabase project defaults are not a portable authorization contract. A fresh local stack exposed that RLS policies and service-role authentication alone do not guarantee table-level privileges: own-profile reads and trusted Edge Function identity/configuration access failed before row policies could be evaluated. Existing hosted projects may retain broader historical defaults, hiding the problem until a clean or customer-managed installation.

## Decision

- Version every required API table privilege in migrations instead of relying on project creation defaults.
- Grant `authenticated` only `SELECT` on `user_profiles`; keep its existing own-row RLS policy as the row authorization boundary.
- Grant `service_role` CRUD only on the reviewed identity/configuration tables used directly by trusted Edge Functions.
- Require a migration and security review before adding another table to the service-role list.
- Keep encrypted submissions, anonymous credentials, retention state, bootstrap operations, abuse controls, recovery canaries, and other sensitive operational tables outside the broad identity/configuration grant.
- Preserve narrow service-role-only functions for sensitive lifecycle operations and keep direct sensitive-table privileges revoked.
- Regression-test both positive required privileges and negative sensitive-table exclusions.

## Alternatives Considered

- Rely on Supabase defaults: rejected because defaults vary across project generations and are not reproducible for dedicated installations.
- Grant all public tables to `service_role`: rejected because it would bypass reviewed RPC-only boundaries for ciphertext and security operations.
- Replace every identity/configuration read with a dedicated RPC immediately: rejected because it would add substantial duplication without reducing the current trusted Edge Function authority.

## Consequences

Clean local, shared SaaS, and customer-managed deployments receive the same table capabilities. RLS remains necessary for browser reads, and service-role possession remains a high-trust capability, but its direct table surface is now reviewable in source. New tables are inaccessible through the API until an explicit privilege decision is made, while sensitive content and operational boundaries remain default-deny.

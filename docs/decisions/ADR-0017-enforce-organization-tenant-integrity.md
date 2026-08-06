# ADR-0017 - Enforce Organization Tenant Integrity

## Status

Accepted

## Context

The shared SaaS topology stores records for multiple companies in one database. Existing tables used `organizations` as company roots, but project memberships derived their tenant only through the project and direct-manager uniqueness applied globally to each user. Trusted functions checked many relationships, but database constraints did not independently reject every cross-organization identity reference.

## Decision

Treat `organizations.id` as the canonical tenant identifier.

- Add required `organization_id` to `project_memberships` and enforce a composite tenant/project foreign key.
- Require active organization identity for project managers, project members, manager relationships, evaluators, and evaluation subjects.
- Scope direct-manager uniqueness by organization so one Auth user can participate in more than one company with independent hierarchy.
- Keep `user_profiles` global because one authenticated identity may hold memberships in multiple organizations.
- Preserve default-deny RLS and trusted Edge Function authorization. Database tenant constraints are defense in depth, not a replacement for either boundary.

## Alternatives considered

- Create one database per company for every sale: rejected as the only topology because it prevents an economical shared SaaS offering.
- Duplicate Auth identities for every company: rejected because one person may legitimately participate in multiple organizations.
- Rely only on Edge Function checks: rejected because database-level tenant integrity protects against defects in trusted code and operational scripts.

## Consequences

- Shared records carry an explicit tenant key where operational queries need it.
- Cross-organization identity links fail in the database even when service-role code is incorrect.
- Existing and future writes must provide or derive the organization id.
- Tenant-isolation regression tests are required for new identity-bearing tables and workflows.

## Security impact

Positive. The database now rejects additional cross-tenant references before sensitive submission tables are introduced.

## Migration impact

Apply `supabase/migrations/20260806221500_multi_tenant_integrity_hardening.sql`, update trusted project membership writes, and regenerate Supabase types.

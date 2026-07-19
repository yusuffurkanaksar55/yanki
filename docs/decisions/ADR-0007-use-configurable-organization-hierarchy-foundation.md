# ADR-0007 - Use Configurable Organization Hierarchy Foundation

## Status

Accepted

## Context

Testing will start with synthetic users: one CEO, one HR administrator, one team leader, and three employees. This scenario is useful for acceptance testing, but the product must not hard-code that hierarchy. Real administrators must be able to configure different organization structures later.

Scoped roles also need a concrete organization scope. The earlier foundation treated `ORGANIZATION` as a null-scope global value, which is not expressive enough once organizations exist as records.

## Decision

Introduce a configurable identity-domain hierarchy:

- `organizations` for company roots.
- `organization_units` for departments, units, teams, and custom hierarchy levels.
- `organization_unit_memberships` for placing users into organization units.
- `manager_assignments` for direct manager, functional manager, and executive sponsor relationships.

Add a `PLATFORM` scope type for global platform-level scope and require non-platform scopes, including `ORGANIZATION`, to carry an explicit `scope_id`.

Keep all new hierarchy tables RLS-enabled with no client-facing policies in this phase. Management of hierarchy records must go through future trusted Edge Functions or reviewed administrative policies.

## Alternatives considered

- Hard-code CEO, HR, team leader, and employee levels: rejected because customers must define their own hierarchy.
- Model only teams: rejected because reporting and authorization need organization, department, unit, and custom hierarchy boundaries.
- Expose hierarchy tables directly to the frontend immediately: rejected because administrative authorization rules are not implemented yet.
- Continue using null `ORGANIZATION` scope IDs: rejected because organization-scoped roles must reference a specific organization record.

## Consequences

- The demo hierarchy can be created as test fixture data without constraining future customer structures.
- Role assignments and invitations can target specific organization, team, project, and evaluation-cycle records.
- Additional Edge Functions are still required before administrators can manage hierarchy data through the app.
- These tables store identity and organization metadata only; they do not store evaluation submissions, scores, comments, lessons learned content, anonymous credentials, or evaluator-to-response linkage.

## Security impact

Positive. The hierarchy foundation supports authorization scope planning while remaining default-deny to frontend clients. Sensitive evaluation content remains out of the schema.

## Migration impact

Creates organization hierarchy tables, manager assignment records, hierarchy validation triggers, and updates scope constraints to distinguish global `PLATFORM` scope from record-backed scopes.

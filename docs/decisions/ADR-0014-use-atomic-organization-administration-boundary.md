# ADR-0014 - Use Atomic Organization Administration Boundary

## Status

Accepted

## Context

System administrators need to manage existing users, scoped roles, organization units, primary memberships, and direct-manager relationships. These identity records remain default-deny to browser clients. Multiple writes can be required for one visible operation, and partial updates could leave a user without a primary unit, with conflicting manager assignments, or with an invalid role scope.

The hierarchy is configurable and can contain more than one administrator, C-Level reviewer, team leader, or custom unit. The administration workflow must preserve hierarchy integrity without granting administrators access to evaluation content.

## Decision

Add `organization-administration` as a trusted Edge Function with actions for:

- scoped hierarchy administration listing
- organization-unit creation and update
- primary membership and direct-manager updates
- existing-user role assignment
- existing-user role termination

The function validates the Supabase access token, active profile, current database-backed roles, and matching organization scope. It returns only identity-domain administration summaries.

Perform each mutation through service-role-only security-definer database functions. Revalidate the acting system administrator inside the database transaction. Enforce active organization membership for managed users, active-unit membership for unit-scoped roles, direct-manager cycle prevention, archive dependency checks, and protection against removing the final organization-scoped system administrator.

Keep project-manager roles outside this boundary because they are derived from project administration and project membership rules.

## Alternatives considered

- Allow browser writes through broad RLS policies: rejected because multi-table integrity and sensitive authorization would be difficult to preserve across independent requests.
- Extend `user-onboarding`: rejected because invitation lifecycle and existing-user organization management have different authorization and transactional responsibilities.
- Store roles and manager relationships only in UI state: rejected because authorization must remain record-backed and independently enforceable.
- Permit unrestricted role-code writes: rejected because project-manager and future specialized roles require their own domain rules.

## Consequences

- System administrators can manage existing-user organization context without direct table access.
- Organization-scoped administrators are restricted to their own organization; platform administrators can manage active organizations globally.
- Manager cycles, invalid unit scopes, unsafe unit archival, and final-admin removal are rejected transactionally.
- Safe audit metadata records configuration changes without evaluation content.
- Delegated project-manager date updates remain a separate future workflow.

## Security impact

Positive. Browser clients receive no service-role value and cannot query or mutate role, hierarchy, membership, manager, profile-directory, or audit tables directly. Both the Edge Function and database functions revalidate authorization. The workflow handles identity-domain metadata only and does not read or write evaluation submissions, scores, comments, lessons learned, anonymous credentials, or encryption material.

## Deployment impact

Apply `supabase/migrations/20260722210000_hierarchy_administration_foundation.sql` and follow-up `supabase/migrations/20260722223000_hierarchy_context_integrity_hardening.sql`, regenerate Supabase database types, and deploy `supabase/functions/organization-administration` with gateway JWT verification disabled because the function validates bearer tokens internally and must answer browser CORS preflight requests.

# ADR-0015 - Use Atomic Delegated Project Date Administration

## Status

Accepted

## Context

System administrators and delegated project managers need to update project completion dates and evaluation close dates. A delegated project manager must be restricted to the exact assigned project, while project and evaluation-cycle records must remain consistent. Browser clients cannot receive service-role credentials or direct write access to default-deny project tables.

## Decision

Add `update_project_dates` to `admin-project-cycles`. The action accepts an explicit project id, evaluation-cycle id, optional project completion date, and required evaluation close timestamp.

Perform the mutation through service-role-only `admin_update_project_dates()`. The database function locks and validates both records, rechecks the active actor, requires either platform/matching-organization `SYSTEM_ADMIN` scope or both an assigned project-manager reference and active matching `PROJECT_MANAGER` project scope, restricts changes to non-archived projects and draft/open cycles, validates date ordering, updates both records atomically, and writes safe audit metadata.

Keep project creation, membership management, and assignment generation restricted to system administrators. The frontend may hide unavailable controls for usability, but the Edge Function and atomic database function remain the authorization boundaries.

## Alternatives considered

- Allow direct browser updates through project-table RLS: rejected because the two-record mutation and delegated authorization must remain atomic and independently auditable.
- Trust only the `PROJECT_MANAGER` role assignment: rejected because stale or mismatched project-manager references could grant unintended access.
- Trust only `projects.project_manager_user_id`: rejected because an explicit active scoped role is required for delegated authority.
- Update project and cycle records in separate Edge Function calls: rejected because partial failure could leave inconsistent dates.

## Consequences

- Assigned project managers can update only the dates for their exact project.
- System administrators retain platform or matching-organization date management.
- Closed or archived evaluation cycles cannot be reopened through this action.
- Project and cycle dates change in one transaction and produce a safe configuration audit event.
- Evaluation content, evaluator identities, anonymous credentials, and encryption material remain outside this boundary.

## Security impact

Positive. Authorization is recomputed from database-backed records in the Edge Function and revalidated inside the database transaction. The RPC is executable only by `service_role`, while project tables remain default-deny to browser clients.

## Deployment impact

Apply `supabase/migrations/20260722234500_delegated_project_date_administration.sql` and deploy `supabase/functions/admin-project-cycles` with gateway JWT verification disabled because the function validates bearer tokens internally and must answer browser CORS preflight requests.

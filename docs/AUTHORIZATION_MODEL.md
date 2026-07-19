# Authorization Model

## Status

Authorization is documented and has an initial default-deny Supabase foundation, a narrow own-profile read policy, record-backed organization hierarchy foundation, own-workspace context RPC, and default-deny project/evaluation-cycle configuration foundation. Runtime evaluation policies and Edge Function authorization checks are not implemented yet.

## Principles

- Authorization is default-deny.
- Client-provided role claims are not trusted for sensitive authorization.
- Every sensitive action validates authentication, role, scope, ownership or hierarchy, input schema, and business rules in trusted server-side code.
- Database Row Level Security enforces access restrictions where applicable.
- UI route guards improve usability but are not security boundaries.

## Current Database Foundation

The initial migration creates `app_roles`, `scope_types`, and `user_role_assignments` for future scoped authorization. The profile/invitation migration creates `user_profiles` and `user_invitations`. The organization hierarchy migration creates `organizations`, `organization_units`, `organization_unit_memberships`, and `manager_assignments`. The project/evaluation-cycle migration creates `projects`, `project_memberships`, and `evaluation_cycles`.

RLS is enabled on all public tables. `user_profiles` allows authenticated users to select only their own row through `auth.uid() = user_id`. `get_my_workspace_context()` allows authenticated users to read only their own non-sensitive role, unit, and manager context. `user_invitations`, roles, role assignments, audit events, organization hierarchy tables, project tables, and evaluation-cycle tables remain default-deny to frontend clients.

`PLATFORM` is the only null-id global scope. `ORGANIZATION`, `DEPARTMENT`, `UNIT`, `TEAM`, `PROJECT`, and `EVALUATION_CYCLE` scopes must carry an explicit `scope_id`.

The current frontend auth, profile, workspace, and administration gates only control UI visibility. They are not sensitive authorization boundaries.

## Roles

### `SYSTEM_ADMIN`

Can manage users, hierarchy, projects, templates, assignments, cycles, and configuration. Cannot read evaluation content, lessons learned content, decrypted payloads, or raw individual responses.

### `EMPLOYEE`

Can view pending assignments, submit assigned evaluations, and see completion status. Cannot view submitted answers, evaluations about themselves, evaluations about others, scores, comments, or evaluator identities.

### `TEAM_LEADER`

Can access authorized anonymous aggregate results for users in assigned scope after threshold checks. Cannot view evaluator identities, own results, results outside scope, or below-threshold results.

### `PROJECT_MANAGER`

Can manage assigned projects according to explicit scope. When delegated by an administrator, can configure project completion dates and evaluation close dates for assigned projects. Can be evaluated. Cannot infer evaluator identities or view own results unless a separate approved reviewer role and scope explicitly permits it.

### `C_LEVEL_REVIEWER`

Can access authorized anonymous aggregate results within assigned organizational scopes. Cannot view evaluator identities or own results unless an approved higher-level policy permits it.

### `BOARD_REVIEWER`

Can access high-level authorized anonymous aggregate results according to explicit governance scope. Cannot bypass anonymity, threshold, or self-access restrictions.

## Scope Types

Planned scope boundaries:

- Organization
- Department
- Unit
- Team
- Project
- Evaluation cycle

`PLATFORM` is reserved for global platform-level authorization and must not be used for organization-specific access.

## Self-Access Prevention

Users must not access results about themselves. This must be enforced in UI, Edge Functions, database policies, and tests.

## Threshold Enforcement

Report access requires the configured anonymity threshold to be met. The default is 4 submissions per reportable group.

## URL Manipulation Defense

Changing user IDs, team IDs, project IDs, cycle IDs, or evaluation IDs in a request must not bypass authorization. Server-side logic must recompute authorization from trusted records.

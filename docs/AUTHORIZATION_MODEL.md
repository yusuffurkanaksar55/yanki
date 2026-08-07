# Authorization Model

## Status

Authorization is documented and implemented through default-deny tables, narrow own-context RPCs, record-backed scoped administration, immutable templates, authenticated one-time submission preparation, anonymous atomic redemption, and thresholded scoped aggregate reporting.

## Principles

- Authorization is default-deny.
- Client-provided role claims are not trusted for sensitive authorization.
- Every sensitive action validates authentication, role, scope, ownership or hierarchy, input schema, and business rules in trusted server-side code.
- Database Row Level Security enforces access restrictions where applicable.
- UI route guards improve usability but are not security boundaries.
- Every organization-owned action resolves one explicit tenant id and rejects cross-tenant identity references.

## Tenant Boundary

`organizations.id` is the canonical tenant identifier. Shared SaaS users may belong to more than one organization, so identity is global while memberships and authorization are scoped. Project membership stores `organization_id` explicitly and must match its parent project. Project managers, project members, manager relationships, evaluators, and subjects require active membership in the matching organization.

Dedicated customer installations retain the same checks. Physical infrastructure isolation is defense in depth, not authorization.

## Current Database Foundation

The initial migration creates `app_roles`, `scope_types`, and `user_role_assignments` for future scoped authorization. The profile/invitation migration creates `user_profiles` and `user_invitations`. The organization hierarchy migration creates `organizations`, `organization_units`, `organization_unit_memberships`, and `manager_assignments`. The project/evaluation-cycle migration creates `projects`, `project_memberships`, and `evaluation_cycles`. The evaluation assignment migration creates `evaluation_assignments`.

RLS is enabled on all public tables. `user_profiles` allows authenticated users to select only their own row through `auth.uid() = user_id`. `get_my_workspace_context()` allows authenticated users to read only their own non-sensitive role, unit, and manager context. `user_invitations`, roles, role assignments, audit events, organization hierarchy tables, project tables, evaluation-cycle tables, and evaluation assignment tables remain default-deny to frontend clients. `get_my_evaluation_assignments()` derives the caller from `auth.uid()`, requires an active profile and tenant membership, revalidates the subject's active matching membership, and returns only the caller's non-cancelled assignment display metadata from non-draft cycles.

`PLATFORM` is the only null-id global scope. `ORGANIZATION`, `DEPARTMENT`, `UNIT`, `TEAM`, `PROJECT`, and `EVALUATION_CYCLE` scopes must carry an explicit `scope_id`.

The current frontend auth, profile, workspace, and administration gates only control UI visibility. They are not sensitive authorization boundaries.

`admin-project-cycles` validates the authenticated user server-side, requires an active profile, recomputes roles from `user_role_assignments`, and allows project/evaluation-cycle creation only for `SYSTEM_ADMIN` users scoped to `PLATFORM` or the selected organization. Listing returns only configuration records within the user's admin/reviewer/project-manager scopes. Organization member lookup, project membership writes, and project-backed assignment generation are available only to system administrators with platform or matching organization scope. The function verifies that selected users have active profiles and active organization memberships before adding them to projects, and generates only non-self assignments from active project memberships.

Project date updates are available to platform/matching-organization system administrators and exact assigned project managers. Delegated access requires both `projects.project_manager_user_id = actor_user_id` and an active `PROJECT_MANAGER` role scoped to the same project. The service-role-only atomic database function repeats this check before updating the project and evaluation cycle.

`user-onboarding` requires a platform or matching-organization `SYSTEM_ADMIN` role for invitation listing, creation, and revocation. Invitation acceptance is available only to the exact Supabase Auth user created for the invitation, after verified-email, expiration, terminal-state, organization, unit, and optional manager checks. The acceptance database function is executable only by `service_role`.

`organization-administration` requires an active profile and a platform or matching-organization `SYSTEM_ADMIN` role. The Edge Function recomputes authorization from `user_role_assignments`; service-role-only database functions revalidate the actor within each mutation transaction. Unit changes, primary membership/direct-manager updates, and manageable existing-user role assignments remain organization-scoped. Direct-manager cycles, cross-organization membership, invalid unit-scoped roles, unsafe unit archival, and removal of the final organization-scoped system administrator are denied. `PROJECT_MANAGER` remains owned by the project administration boundary.

`evaluation-templates` requires an active profile and platform or matching-organization `SYSTEM_ADMIN` scope. Browser clients have no direct template-table privileges. Service-role-only functions atomically save drafts, publish valid versions, and clone published versions into the next draft. Database triggers enforce published-version immutability even if trusted application code regresses. `admin-project-cycles` additionally verifies that a selected version is published, active, and in the same organization before creating a cycle.

`evaluation-submission-credentials` accepts only an authenticated evaluator's assignment id. The database requires that the caller is the assignment evaluator, both evaluator and subject have active matching tenant membership, the assignment is pending, the cycle is open and within its server-clock window, and the bound template is active and published. A replacement preparation revokes the earlier pending credential.

`anonymous-evaluation-submissions` has no authenticated user authority. Its sole capability is possession of a valid unexpired random credential. It cannot select an organization, subject, assignment, cycle, or template; those values are derived from the credential digest in trusted code. Atomic redemption permits one encrypted insert and one assignment completion, then makes replay terminal.

`evaluation-reports` binds every request to the authenticated active user. `list_my_evaluation_report_targets()` returns only closed, authorized cycle-plus-subject targets and no participation state. `get_encrypted_evaluation_report_batch()` denies self access, every active `SYSTEM_ADMIN`, unapproved roles, missing active tenant membership, scope mismatch, and open cycles before applying the threshold. It releases ciphertext only at or above threshold. Direct ciphertext-table access remains revoked from `service_role`.

## Roles

### `SYSTEM_ADMIN`

Can manage scoped user invitations, hierarchy, projects, project memberships, templates, assignments, cycles, and configuration. Cannot read evaluation content, lessons learned content, decrypted payloads, or raw individual responses.

### `EMPLOYEE`

Can view only assignments addressed to their authenticated identity, prepare a one-time credential for an available assignment, and submit validated answers through the anonymous encryption boundary. Assignment access disappears when active organization membership ends. Employees cannot read submitted answers, evaluations about themselves, evaluations about others, scores, comments, ciphertext, or evaluator identities.

### `TEAM_LEADER`

Can access authorized anonymous aggregate results for users in assigned scope after threshold checks. Cannot view evaluator identities, own results, results outside scope, or below-threshold results.

### `PROJECT_MANAGER`

Can manage assigned projects according to explicit scope. When delegated by an administrator, can configure project completion dates and evaluation close dates for assigned projects. Can be evaluated. `PROJECT_MANAGER` alone grants no report access; a separately assigned approved reviewer role and scope can grant reports about other users, but self access remains denied.

The project administration boundary lists assigned project configuration and permits exact assigned project managers to update project completion and evaluation close dates. Project creation, membership management, and assignment generation remain system-administrator-only.

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

Users must not access results about themselves. The reporting target list excludes self targets, the batch function returns `REPORT_SELF_ACCESS_DENIED`, the Edge Function exposes only the authenticated actor's authorized result, and regression tests cover direct identifier manipulation.

## Threshold Enforcement

Report access requires the configured anonymity threshold to be met. The default and database floor are 4 submissions per fixed cycle-plus-subject group. Below threshold, no exact count, ciphertext, question set, or result is returned.

## URL Manipulation Defense

Changing user IDs, team IDs, project IDs, cycle IDs, or evaluation IDs in a request must not bypass authorization. Server-side logic must recompute authorization from trusted records.

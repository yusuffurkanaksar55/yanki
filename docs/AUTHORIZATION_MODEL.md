# Authorization Model

## Status

Authorization is documented and implemented through default-deny tables, narrow own-context RPCs, record-backed scoped administration, immutable templates, authenticated one-time submission preparation, anonymous atomic redemption, immediate scoped aggregate reporting, service-role-only tenant bootstrap, and service-role-only encrypted recovery-canary refresh.

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

The initial migration creates `app_roles`, `scope_types`, and `user_role_assignments` for future scoped authorization. The profile/invitation migration creates `user_profiles` and `user_invitations`. The organization hierarchy migration creates `organizations`, `organization_units`, `organization_unit_memberships`, and `manager_assignments`. The project/evaluation-cycle migration creates `projects`, `project_memberships`, and `evaluation_cycles`. The evaluation assignment migration creates `evaluation_assignments`. The production bootstrap migration creates content-free `tenant_bootstrap_operations` and narrow service-role functions. The recovery migration creates synthetic encrypted `evaluation_encryption_recovery_canaries` with no direct API privileges and one service-role-only refresh function.

The recovery-canary function accepts only encrypted synthetic values and reviewed cryptographic metadata. It cannot read the table or any evaluation-domain table. Browsers cannot execute it, while the disposable database recovery role reads canaries directly only inside isolated operator infrastructure after restore.

RLS is enabled on all public tables. `user_profiles` allows authenticated users to select only their own row through `auth.uid() = user_id`. `get_my_workspace_context()` allows authenticated users to read only their own non-sensitive role, unit, and manager context. `user_invitations`, roles, role assignments, audit events, organization hierarchy tables, project tables, evaluation-cycle tables, and evaluation assignment tables remain default-deny to frontend clients. `get_my_evaluation_assignments()` derives the caller from `auth.uid()`, requires an active profile and tenant membership, revalidates the subject's active matching membership, and returns only the caller's non-cancelled assignment display metadata from non-draft cycles.

Table grants are explicitly separated from row authorization. The browser has a table-level `SELECT` capability only for `user_profiles`, still constrained by its own-row RLS policy. Trusted Edge Functions use the service role for a reviewed list of identity/configuration tables; adding a table to that list requires a migration and security review. Sensitive content and operational tables are deliberately excluded even when a service-role RPC exists.

`PLATFORM` is the only null-id global scope. `ORGANIZATION`, `DEPARTMENT`, `UNIT`, `TEAM`, `PROJECT`, and `EVALUATION_CYCLE` scopes must carry an explicit `scope_id`.

The current frontend auth, profile, workspace, and administration gates only control UI visibility. They are not sensitive authorization boundaries.

`admin-project-cycles` validates the authenticated user server-side, requires an active profile, recomputes roles from `user_role_assignments`, and allows project/evaluation-cycle creation only for `SYSTEM_ADMIN` users scoped to `PLATFORM` or the selected organization. Listing returns only configuration records within the user's admin/reviewer/project-manager scopes. Organization member lookup, project membership writes, and project-backed assignment generation are available only to system administrators with platform or matching organization scope. The function verifies that selected users have active profiles and active organization memberships before adding them to projects, and generates only non-self assignments from active project memberships.

Project date updates are available to platform/matching-organization system administrators and exact assigned project managers. Delegated access requires both `projects.project_manager_user_id = actor_user_id` and an active `PROJECT_MANAGER` role scoped to the same project. The service-role-only atomic database function repeats this check before updating the project and evaluation cycle.

`user-onboarding` requires a platform or matching-organization `SYSTEM_ADMIN` role for invitation listing, creation, and revocation. Invitation acceptance is available only to the exact Supabase Auth user created for the invitation, after verified-email, expiration, terminal-state, organization, unit, and optional manager checks. The acceptance database function is executable only by `service_role`.

`bootstrap_organization_tenant()` and its exact-status/renewal companions are executable only by `service_role`; browser roles have no execute or operation-table access. Bootstrap is authorized by possession of the operator secret plus an explicit confirmation and exact request fingerprint, because no application administrator exists yet. The database also requires a matching server-controlled Auth app-metadata request marker and rejects any preconfigured identity. The invited user receives no membership or `SYSTEM_ADMIN` role until the normal email-verified `accept_user_invitation()` transaction succeeds, and that role is scoped only to the newly created organization.

`organization-administration` requires an active profile and a platform or matching-organization `SYSTEM_ADMIN` role. The Edge Function recomputes authorization from `user_role_assignments`; service-role-only database functions revalidate the actor within each mutation transaction. Unit changes, primary membership/direct-manager updates, and manageable existing-user role assignments remain organization-scoped. Direct-manager cycles, cross-organization membership, invalid unit-scoped roles, unsafe unit archival, and removal of the final organization-scoped system administrator are denied. `PROJECT_MANAGER` remains owned by the project administration boundary.

`evaluation-templates` requires an active profile and platform or matching-organization `SYSTEM_ADMIN` scope. Browser clients have no direct template-table privileges. Service-role-only functions atomically save drafts, publish valid versions, and clone published versions into the next draft. Database triggers enforce published-version immutability even if trusted application code regresses. `admin-project-cycles` additionally verifies that a selected version is published, active, and in the same organization before creating a cycle.

`evaluation-submission-credentials` accepts only an authenticated evaluator's assignment id. The database requires that the caller is the assignment evaluator, both evaluator and subject have active matching tenant membership, the assignment is pending, the cycle is open and within its server-clock window, and the bound template is active and published. A replacement preparation revokes the earlier pending credential.

`anonymous-evaluation-submissions` has no authenticated user authority. Its sole capability is possession of a valid unexpired random credential. It cannot select an organization, subject, assignment, cycle, or template; those values are derived from the credential digest in trusted code. Atomic redemption permits one encrypted insert and one assignment completion, then makes replay terminal.

`consume_anonymous_submission_request()` is executable only by `service_role`. It returns a quota decision but no credential, user, assignment, tenant, or content data. `security-abuse-monitoring` requires an authenticated active `SYSTEM_ADMIN` with exact `PLATFORM` scope and a null scope id, repeats that authorization in `get_anonymous_submission_abuse_summary()`, and returns only global aggregate counters. Organization-scoped administrators are denied. Browser roles cannot execute either database function directly or read the backing tables.

`get_anonymous_submission_abuse_summary_for_operator()` is executable only by `service_role` and verifies the JWT role again inside the function. It exists solely for the trusted scheduled alert process and returns the same global aggregate shape without adopting an administrator identity. Browser roles cannot execute the operator/helper functions or read backing abuse tables. The webhook bearer token grants delivery only and grants no database or application authority.

The sensitive-gateway token grants only passage through the pre-authorization outer boundary for anonymous redemption and credential preparation. It does not authenticate a user, select an assignment, bypass one-time credential validation, or grant database authority. Nginx overwrites the header, and production Functions reject a missing or incorrect token before body parsing, Auth lookup, quota consumption, context resolution, or encryption.

`evaluation-reports` binds every request to the authenticated active user. `list_my_evaluation_report_targets()` returns only authorized non-draft cycle-plus-subject targets and no participation state. `get_encrypted_evaluation_report_batch()` denies self access, every active `SYSTEM_ADMIN`, unapproved roles, missing active tenant membership, and scope mismatch. It returns `EMPTY` before participation and releases an identity-free ciphertext batch after the first submission. Direct ciphertext-table access remains revoked from `service_role`.

`encryption-key-health` requires an authenticated active `SYSTEM_ADMIN` with exact `PLATFORM` scope and a null scope id. Its service-role-only inventory can inspect only distinct key-version identifiers referenced by ciphertext. The browser receives configuration validity, active/historical coverage booleans, and total version counts; it receives no version names, keys, ciphertext, content, identities, or per-version usage. Organization-scoped administrators are denied.

`evaluation-retention-administration` requires an authenticated active `SYSTEM_ADMIN`. Platform administrators can list/update active-organization policies; organization administrators are limited to their exact tenant. PostgreSQL repeats scope authorization for every update. Browser roles and `service_role` have no direct policy-table privileges. The browser cannot execute content deletion. Only the trusted operator can call `execute_due_evaluation_content_retention()`, which skips disabled or legally held tenants and exposes no submission/deletion count.

## Roles

### `SYSTEM_ADMIN`

Can manage scoped user invitations, hierarchy, projects, project memberships, templates, assignments, cycles, retention policies, and configuration. Only a `PLATFORM`-scoped assignment can view content-free global abuse counters and encryption-key health; an `ORGANIZATION`-scoped assignment cannot. Cannot trigger destructive retention from the browser or read evaluation content, lessons learned content, decrypted payloads, raw individual responses, participation counts, or request-level abuse records.

### `EMPLOYEE`

Can view only assignments addressed to their authenticated identity, prepare a one-time credential for an available assignment, and submit validated answers through the anonymous encryption boundary. Assignment access disappears when active organization membership ends. Employees cannot read submitted answers, evaluations about themselves, evaluations about others, scores, comments, ciphertext, or evaluator identities.

### `TEAM_LEADER`

Can access authorized identity-separated aggregate results and question-grouped comments for users in assigned scope after the first encrypted submission. Cannot view evaluator identities, own results, or results outside scope.

### `PROJECT_MANAGER`

Can manage assigned projects according to explicit scope. When delegated by an administrator, can configure project completion dates and evaluation close dates for assigned projects. Can be evaluated. `PROJECT_MANAGER` alone grants no report access; a separately assigned approved reviewer role and scope can grant reports about other users, but self access remains denied.

The project administration boundary lists assigned project configuration and permits exact assigned project managers to update project completion and evaluation close dates. Project creation, membership management, and assignment generation remain system-administrator-only.

### `C_LEVEL_REVIEWER`

Can access authorized identity-separated aggregate results and question-grouped comments within assigned organizational scopes. Cannot view evaluator identities or own results.

### `BOARD_REVIEWER`

Can access high-level authorized identity-separated aggregate results and question-grouped comments according to explicit governance scope. Cannot bypass scope, administrator-deny, or self-access restrictions.

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

## Report Availability

Report access starts after the first encrypted submission for a fixed cycle-plus-subject group, including during an active cycle. Before that point, `EMPTY` reveals no count, ciphertext, or question set. Available reports may include independently shuffled comments grouped by question, but no evaluator, assignment, submission, timestamp, sequence, or cross-question linkage metadata. Role, tenant scope, active manager relationship where required, system-administrator denial, and self-access denial remain mandatory for every request.

## URL Manipulation Defense

Changing user IDs, team IDs, project IDs, cycle IDs, or evaluation IDs in a request must not bypass authorization. Server-side logic must recompute authorization from trusted records.

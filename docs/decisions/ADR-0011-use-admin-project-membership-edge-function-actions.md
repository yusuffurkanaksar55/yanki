# ADR-0011 - Use Admin Project Membership Edge Function Actions

## Status

Accepted

## Context

Administrators can create projects and project-completion evaluation cycles through `admin-project-cycles`, but assigning real people to projects still needs a trusted management path. The related tables remain default-deny to frontend clients, and organization member data is identity-domain metadata that should not be opened with broad browser table policies.

Project membership is also a prerequisite for later evaluation assignment planning. The assignment domain may know who belongs to a project, but this phase must still avoid evaluation response content, anonymous credentials, and encrypted submission tables.

## Decision

Extend `admin-project-cycles` with two additional actions:

- `list_organization_members`
- `add_project_member`

`list_organization_members` returns active profiles that have active memberships in the requested organization. `add_project_member` validates the authenticated user server-side, requires an active profile, recomputes roles from `user_role_assignments`, verifies the target project organization, verifies the selected user is active in that organization, and writes `project_memberships` with the service-role client inside the Edge Function.

Project-manager membership also assigns a scoped `PROJECT_MANAGER` role and updates the project manager reference through the same trusted function boundary.

## Alternatives considered

- Add direct frontend select/insert policies for `user_profiles`, organization memberships, and project memberships: rejected because administration writes need server-side scope validation and role recomputation.
- Keep UUID-only project member fields in the UI: rejected because it does not support realistic administration workflows.
- Start evaluation assignments immediately: rejected because project membership should be explicit before assignment generation or anonymous credential issuance.

## Consequences

- Administrators can select active organization members and add them to projects from the administration UI.
- The browser still does not query `user_profiles`, `organization_unit_memberships`, or `project_memberships` directly.
- Project membership remains identity-domain configuration only and does not store scores, comments, lessons learned content, anonymous credentials, or evaluator-to-response links.
- Delegated project-manager date updates, invitation management, evaluation assignment generation, anonymous credentials, encrypted submissions, and reporting remain future work.

## Security impact

Positive. Project membership writes now cross a trusted Edge Function boundary with server-side authentication, active-profile validation, role recomputation, organization-scope authorization, selected-user organization membership validation, and safe audit metadata.

## Deployment impact

Redeploy `supabase/functions/admin-project-cycles` after this change. No new database migration is required because the existing `project_memberships`, `user_profiles`, `organization_unit_memberships`, `projects`, `user_role_assignments`, and `audit_events` tables support the workflow.

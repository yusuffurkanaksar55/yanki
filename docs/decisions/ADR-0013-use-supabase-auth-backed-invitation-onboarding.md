# ADR-0013 - Use Supabase Auth-Backed Invitation Onboarding

## Status

Accepted

## Context

Administrators need to invite users into a configurable organization hierarchy without exposing service-role credentials, raw invitation secrets, role writes, or membership writes to the browser. Invitation acceptance must not leave a partially activated profile when one of the role, unit-membership, or manager-assignment writes fails.

The existing `user_invitations` table stores a token hash and remains default-deny. Supabase Auth already provides email ownership proof and invitation-link delivery, so the application does not need to return a custom raw invitation secret to the administrator.

## Decision

Add `user-onboarding` as a trusted Edge Function with these actions:

- `list_user_administration`
- `create_invitation`
- `revoke_invitation`
- `accept_invitation`

Use `auth.admin.inviteUserByEmail()` for user-facing invitation delivery. Store only a hash of a server-only correlation value in `user_invitations`; do not return an action link, token, access token, service-role value, or raw custom secret to the browser.

Bind each invitation to the Auth user created by Supabase, the selected organization and unit, an invited role scope, membership kind, and an optional active manager. Revalidate Auth user id, email, invitation state, expiration, organization, unit, and manager at acceptance time.

Implement `accept_user_invitation()` as a service-role-only, security-definer database function so profile activation, scoped role assignment, organization-unit membership, optional manager assignment, invitation acceptance, and safe audit metadata are committed atomically.

## Alternatives considered

- Return a custom invitation link from the Edge Function: rejected because it would expose the raw invitation secret to the administration browser and generated UI.
- Let the browser write profile, role, membership, and manager records directly: rejected because client-side role checks are not a sensitive authorization boundary.
- Perform acceptance as several independent Edge Function writes: rejected because partial failures could leave inconsistent onboarding state.
- Activate profiles when an administrator creates an invitation: rejected because email ownership has not been proven at that point.

## Consequences

- System administrators can list invitation options and create or revoke invitations within their platform or organization scope.
- Invited users can activate their own profile only after Supabase Auth verifies their invitation session.
- The browser never queries `user_invitations`, `user_role_assignments`, `organization_unit_memberships`, or `manager_assignments` directly for this workflow.
- Real invitation delivery still depends on Supabase Auth email configuration and must be smoke-tested with an approved test mailbox.
- General existing-user role changes and organization hierarchy edits remain separate future administration flows.

## Security impact

Positive. The flow uses server-side authentication and role recomputation, matching-organization scope checks, Auth-user and email binding, expiration and terminal-state validation, acceptance-time hierarchy revalidation, service-role-only atomic activation, and safe audit metadata. No evaluation content is introduced.

## Deployment impact

Apply `supabase/migrations/20260720232000_user_invitation_acceptance_flow.sql` and follow-up acceptance-time context revalidation migration `20260720234500_invitation_acceptance_context_revalidation.sql`, regenerate Supabase database types, and deploy `supabase/functions/user-onboarding` with gateway JWT verification disabled because the function performs bearer-token validation internally and must answer browser CORS preflight requests.

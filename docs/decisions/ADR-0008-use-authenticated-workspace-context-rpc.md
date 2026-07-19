# ADR-0008 - Use Authenticated Workspace Context RPC

## Status

Accepted

## Context

Synthetic users can now sign in, but the dashboard needs to show who the user is in the organization: roles, units, and manager relationships. Opening the underlying organization and role tables directly to frontend clients would create a wider access surface than needed.

The product also supports multiple administrators, CEOs, project managers, and reviewers. The UI must not assume there is only one user for any role.

## Decision

Expose a narrow `get_my_workspace_context()` Supabase RPC for authenticated users. The function returns only the caller's own non-sensitive profile, role, membership, and direct-manager context based on `auth.uid()`.

Keep role, invitation, hierarchy, and manager tables default-deny to frontend clients. The dashboard consumes the RPC through an injectable service and renders a Turkish workspace context panel. If the user has an administration role, the dashboard also shows a management-view entry point, but sensitive management actions still require future trusted authorization.

Evaluation cycles will be time-bound workflows. They do not require a fixed number of participants to be opened. Admins, and project managers when delegated by an admin, may configure project completion and evaluation close dates in a future management flow.

## Alternatives considered

- Add broad select policies to all organization tables: rejected because the dashboard only needs the caller's own context.
- Hard-code admin, CEO, or project manager as singletons: rejected because the product supports multiple users per role.
- Delay all context display until Edge Functions exist: rejected because a narrow own-context RPC is sufficient for safe test verification.

## Consequences

- Signed-in synthetic users can verify their role, unit, and manager context in the dashboard.
- The admin surface can evolve separately from the regular dashboard.
- The RPC is not a sensitive authorization boundary for evaluation content; sensitive management and evaluation workflows still require server-side validation.

## Security impact

Positive. The RPC returns only non-sensitive identity-domain data filtered by `auth.uid()` and grants execute only to authenticated users. It does not return evaluation submissions, scores, comments, lessons learned payloads, anonymous credential values, or decrypted content.

## Migration impact

Creates `public.get_my_workspace_context()` with explicit grants for authenticated users.

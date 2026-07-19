# ADR-0010 - Use Admin Project Cycle Edge Function

## Status

Accepted

## Context

Administrators need a production path to list project/evaluation-cycle configuration and create a project with a time-bound evaluation cycle. The related database tables are intentionally default-deny to frontend clients.

The browser must not receive service-role credentials and must not be trusted as the sensitive authorization boundary.

## Decision

Add `admin-project-cycles` as a Supabase Edge Function. The browser calls this function with the authenticated Supabase access token. The function validates the token, requires an active user profile, recomputes roles from `user_role_assignments`, and uses `SUPABASE_SERVICE_ROLE_KEY` only inside the Edge Function runtime.

Support two actions in this foundation:

- `list_project_cycles`
- `create_project_cycle`

Allow project/evaluation-cycle creation only for `SYSTEM_ADMIN` users scoped to `PLATFORM` or the selected `ORGANIZATION`. Keep future delegated project-manager update flows separate from this first create flow.

## Alternatives considered

- Add direct frontend RLS policies for project tables: rejected because management writes need trusted validation and role recomputation.
- Create only a frontend mock form: rejected because the next useful step is exercising the trusted backend boundary.
- Put service-role credentials in local browser code: rejected because it violates the security model.

## Consequences

- The administration UI can list accessible project/cycle configuration through an Edge Function.
- System administrators can create project-completion evaluation cycles through the trusted boundary once the function is deployed.
- The frontend still cannot read or write project tables directly.
- Project-manager delegated update flows, member selection UI, and richer validation remain future work.

## Security impact

Positive. The Edge Function validates auth server-side, checks active profile state, recomputes roles from the database, and keeps service-role credentials outside the browser. It does not handle evaluation response content.

## Deployment impact

Deploy `supabase/functions/admin-project-cycles` with JWT gateway verification disabled only because the function handles JWT validation internally and must answer browser CORS preflight requests.

# ADR-0005 - Use Typed Supabase Auth Client Foundation

## Status

Accepted

## Context

The application needs browser-based authentication before organization, assignment, and evaluation workflows are exposed. The browser must use only public Supabase values and must not receive service-role credentials, encryption keys, or privileged authorization decisions.

## Decision

Use `@supabase/supabase-js` with generated database types and a small authentication service boundary. The frontend client reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, validates them at runtime, and exposes email/password sign-in, local-session sign-out, password reset request, and session-state observation through an injectable `AuthService`.

## Alternatives considered

- Call Supabase Auth directly from UI components: rejected because it scatters integration behavior and makes tests harder.
- Store Supabase service-role credentials in the frontend: rejected because it violates the browser security boundary.
- Build custom password handling: rejected because Supabase Auth should own password storage and authentication.

## Consequences

- UI tests can use an injected auth service without network calls.
- Future invitation, Microsoft Entra ID, and scoped authorization flows can extend the auth boundary.
- Authenticated UI shell exists, but sensitive authorization must still be implemented server-side and with RLS.

## Security impact

Positive. The browser uses only public Supabase configuration and does not introduce privileged secrets or evaluation-content access.

## Migration impact

No database migration is required for this client foundation. Generated database types were created from the linked Supabase project.

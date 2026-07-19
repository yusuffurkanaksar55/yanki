# ADR-0006 - Use Profile And Invitation Onboarding Foundation

## Status

Accepted

## Context

Authenticated users need a safe profile bootstrap before organization, assignment, and evaluation workflows can be exposed. Invitation onboarding must not put privileged invitation creation, raw invitation secrets, service-role credentials, or authorization decisions in the browser.

## Decision

Create `user_profiles` for identity and onboarding metadata and `user_invitations` for trusted server-side invitation records. Enable RLS on both tables. Allow authenticated users to read only their own `user_profiles` row. Create no client-facing policies for `user_invitations`; invitation creation, redemption, role assignment, and profile activation must be handled by future trusted Edge Functions.

Invitation records store `token_hash` only. The raw invitation secret must never be stored in the database, browser, Git, logs, documentation, or generated UI.

## Alternatives considered

- Let the frontend create invitations directly: rejected because it would require privileged authorization decisions in the browser.
- Store raw invitation tokens for simpler lookup: rejected because leaked database rows or logs would allow invitation takeover.
- Add broad profile update policies for convenience: rejected because profile bootstrap and role assignment must remain server-side controlled.

## Consequences

- Authenticated users can progress to the dashboard only after their own profile row is active.
- A signed-in user without a profile sees a safe Turkish invitation onboarding state.
- Administrators cannot manage invitations through the frontend yet; an Edge Function boundary is required next.
- This foundation stores identity metadata but no evaluation content, scores, comments, lessons learned payloads, or evaluator-to-response linkage.

## Security impact

Positive. The first client-readable database policy is narrowly scoped to `auth.uid() = user_id` on `user_profiles`. Invitation records remain default-deny to frontend clients and store only hashed invitation secrets.

## Migration impact

Creates `user_profiles`, `user_invitations`, supporting indexes, timestamp triggers, RLS configuration, and the own-profile select policy.

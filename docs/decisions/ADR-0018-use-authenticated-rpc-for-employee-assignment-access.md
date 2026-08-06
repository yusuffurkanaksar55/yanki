# ADR-0018: Use Authenticated RPC For Employee Assignment Access

## Status

Accepted on 2026-08-06.

## Context

Employees need to see the evaluation assignments created for them, including the subject, organization, project, cycle, availability window, and completion state. `evaluation_assignments` is identity-domain eligibility data and must remain separate from anonymous submission content. Direct browser table access would also require exposing related profile, organization, project, and cycle records through broader RLS policies.

## Decision

Expose assignment metadata through `get_my_evaluation_assignments()`, a narrowly granted `SECURITY DEFINER` database function.

- Derive the actor exclusively from `auth.uid()` and accept no client-selected user or organization id.
- Require an active profile and active organization membership for the evaluator.
- Revalidate active matching organization membership and profile state for the subject.
- Exclude cancelled assignments and draft cycles.
- Return only assignment display metadata and a server-clock-derived availability state.
- Never return evaluator identity fields, responses, scores, comments, encrypted payloads, or anonymous credentials.
- Grant execution only to `authenticated`; keep assignment and related identity tables default-deny to browser clients.
- Use a typed frontend service that calls only the RPC.

## Alternatives Considered

- Direct RLS-backed table reads: rejected because the UI would need broader policies across several identity-domain tables and would receive more raw identifiers than necessary.
- A service-role Edge Function: valid, but rejected for this own-context read because it adds a privileged runtime surface while the existing authenticated own-workspace RPC pattern can enforce the same narrower contract in PostgreSQL.
- Embed assignments in the workspace-context RPC: rejected because workspace identity context and evaluation workflow state have different change rates and ownership boundaries.

## Consequences

Positive. Employees can see only their own current assignment metadata without any direct table policy. Tenant membership and profile state are rechecked on every call, and assignment availability uses the database clock.

The RPC does not authorize submission. Anonymous credential issuance, immutable template binding, encrypted submission, completion mutation, and reporting remain separate future boundaries.

# ADR-0004 - Use Default-Deny Supabase RLS Foundation

## Status

Accepted

## Context

The platform requires scoped authorization and defense in depth before sensitive evaluation workflows are implemented. The first Supabase migration must avoid plaintext evaluation content and evaluator-to-submission linkage while establishing a secure base for future server-side authorization.

## Decision

Create only foundational authorization reference tables, scoped role assignments, and safe audit metadata in the first migration. Enable Row Level Security on every public table created by the migration and create no client-facing policies in this phase.

## Alternatives considered

- Build the full evaluation schema immediately: rejected because the anonymity credential and encrypted submission design need a separate reviewed phase.
- Add broad `using (true)` policies for convenience: rejected because it violates default-deny authorization.
- Store audit payloads as unrestricted JSON: rejected because audit logs must not undermine anonymity or contain sensitive content.

## Consequences

- Frontend clients cannot read or write these tables directly yet.
- Future Edge Functions and RLS policies must explicitly open only the minimum required access.
- The migration is safe to apply before sensitive workflows because it does not store scores, comments, lessons learned content, or submission payloads.

## Security impact

Positive. The migration establishes default-deny RLS and keeps sensitive evaluation content out of the schema.

## Migration impact

Creates `app_roles`, `scope_types`, `user_role_assignments`, and `audit_events` tables plus supporting indexes and a timestamp trigger.

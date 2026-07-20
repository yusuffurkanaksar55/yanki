# ADR-0012 - Use Default-Deny Evaluation Assignment Planning

## Status

Accepted

## Context

Project memberships now exist behind the trusted `admin-project-cycles` boundary. The next useful evaluation step is to plan who should evaluate whom for a project-backed evaluation cycle.

Assignment planning is still an identity-domain workflow. It may know evaluator and subject identifiers so the system can later prove eligibility, but it must not store evaluation content, anonymous credential secrets, encrypted payloads, or response data. The browser must not receive direct table access to assignment rows before scoped employee assignment access and anonymous credential flows are designed.

## Decision

Create a default-deny `evaluation_assignments` table with RLS enabled and no client-facing policies. Store only identity-domain eligibility fields:

- organization, project, and evaluation-cycle scope
- evaluator user id
- subject user id
- assignment kind
- completion status
- safe creation metadata

Extend `admin-project-cycles` with `generate_project_assignments`. The action validates the authenticated user, requires an active profile, recomputes roles from `user_role_assignments`, requires a platform or matching-organization `SYSTEM_ADMIN` role, validates that the cycle is project-backed and assignable, reads active project memberships, prevents self assignments, inserts missing assignments idempotently, and returns aggregate counts.

## Alternatives considered

- Add direct frontend RLS policies for assignment generation: rejected because assignment generation requires trusted scope checks, project membership validation, and audit metadata.
- Wait for anonymous credentials before any assignment table exists: rejected because assignment planning is a separate identity-domain prerequisite and can be built without storing response content.
- Store assignment and submission data in one table: rejected because it would violate the required identity/content separation.

## Consequences

- Administrators can generate project-backed assignment records from active project memberships.
- The browser still does not query or mutate `evaluation_assignments` directly.
- Assignment rows can identify evaluator and subject eligibility, but they do not contain scores, comments, lessons learned content, anonymous credential values, encrypted payloads, or response content.
- Employee assignment inboxes, anonymous credential issuance, encrypted submissions, delegated project-manager assignment workflows, and reporting remain future work.

## Security impact

Positive foundation impact. The new table is default-deny, prevents self assignments, validates project/cycle/organization scope consistency, and keeps generation inside the trusted Edge Function boundary. It preserves the assignment-domain and submission-domain separation documented in the security model.

## Deployment impact

Apply `supabase/migrations/20260720223000_evaluation_assignment_foundation.sql`, regenerate Supabase database types, and redeploy `supabase/functions/admin-project-cycles`.

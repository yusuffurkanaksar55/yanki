# ADR-0009 - Use Default-Deny Project And Evaluation Cycle Foundation

## Status

Accepted

## Context

The product needs administrators, and delegated project managers, to configure projects, project completion dates, and evaluation close dates. Evaluation cycles can be opened without a fixed participant-count requirement, but reporting still needs the configured anonymity threshold before results are shown.

The platform does not yet have trusted Edge Functions for sensitive management actions, so frontend clients must not receive broad table access.

## Decision

Add default-deny Supabase tables for `projects`, `project_memberships`, and `evaluation_cycles`. Enable RLS on all three tables and do not add client-facing policies in this phase.

Represent evaluation cycles as time-bound configuration records with `opens_at`, `closes_at`, optional `project_completed_on`, and `anonymity_threshold`. Do not add participant-count constraints for opening a cycle.

Add a protected administration shell in the frontend for admin-like roles. Treat this as a usability boundary only; real create/update/delete operations remain future trusted Edge Function work.

## Alternatives considered

- Build frontend-only project management with direct table policies: rejected because management writes need trusted authorization checks.
- Delay all project and evaluation-cycle modeling: rejected because the user needs date-based project evaluation planning to shape the next screens and fixtures.
- Require a fixed participant count before opening cycles: rejected because the product decision is date-bound opening without a fixed count requirement.

## Consequences

- The database can now represent project metadata, project memberships, and time-bound evaluation-cycle configuration.
- The demo fixture can create a synthetic project and close-date scenario for acceptance testing.
- No evaluation content, scores, comments, anonymous credential values, or response payloads are introduced.
- Administration actions still require future Edge Functions, scoped authorization checks, and RLS policies.

## Security impact

Positive foundation impact. New tables are identity/configuration-domain records with RLS enabled and no frontend policies. They do not store evaluation response content.

## Migration impact

Creates `public.projects`, `public.project_memberships`, `public.evaluation_cycles`, and `public.validate_evaluation_cycle_project_scope()`.

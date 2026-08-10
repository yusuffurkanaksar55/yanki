# ADR-0032: Expose Identity-Separated Text Comments To Authorized Reviewers

## Status

Accepted on 2026-08-10. Supersedes only the raw-text withholding decision in ADR-0030.

## Context

Authorized leaders need the written feedback that explains aggregate scores. The existing reporting boundary already authenticates the reviewer, enforces tenant and hierarchy scope, denies every active system administrator, denies the evaluated person, and releases only an evaluator-free encrypted batch after the first submission. However, ADR-0030 withheld all short- and long-text values because distinctive writing can permit contextual inference.

The product owner accepts that sparse-group inference risk and requires authorized reviewers to see comments without weakening the evaluator/content separation or hierarchy rules.

## Decision

- Decrypt comments only inside the trusted `evaluation-reports` Edge Function after the database has authorized the exact cycle-plus-subject report group.
- Return comments grouped by question only. Do not return evaluator identifiers, assignment identifiers, submission identifiers, credentials, timestamps, storage dates, response sequence, or a cross-question response grouping.
- Shuffle each text question independently with a cryptographically secure random source before constructing the response, reducing stable row-order linkage between questions.
- Preserve active membership, role, scope, team-leader manager relationship, system-administrator denial, self-access denial, and fixed report-group checks for every request.
- Keep comments encrypted at rest. Do not create a plaintext report table, cache, export, audit record, or log entry.
- Render comments as escaped text in the browser and state clearly that writing style or contextual detail can still permit inference, especially after one or a few submissions.
- Continue to prohibit client-selected subgroups, slices, evaluator filtering, and individual-response views.

## Alternatives Considered

- Continue returning only text response counts: rejected because the report omits the qualitative feedback needed for management action.
- Return complete submission rows without identity fields: rejected because answer combinations and stable order would create unnecessary linkage across questions.
- Allow system administrators to inspect comments for support: rejected because configuration authority must remain separate from evaluation-content authority.
- Store decrypted comments in a reporting table: rejected because it would introduce plaintext persistence and a second content store.

## Consequences

Authorized reviewers can read qualitative feedback in the same report as numeric and categorical aggregates. The system still prevents a direct evaluator-to-comment mapping, but it cannot guarantee that a reviewer will not infer an author from language or organizational context. Product copy, customer policy, training, and acceptance tests must preserve that distinction.

No database migration is required. The Edge Function, shared aggregation contract, frontend parser, report UI, security tests, and operational documentation change together.

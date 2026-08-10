# ADR-0030: Use Immediate Identity-Separated Aggregate Reporting

## Status

Accepted on 2026-08-09. Supersedes the availability and cycle-closure rules in ADR-0021. The raw-text withholding rule is superseded by ADR-0032 on 2026-08-10.

## Context

The product owner requires authorized reviewers to see results as evaluations arrive, without a minimum group size and before an active cycle closes. The submission model already separates evaluator identity from encrypted content, but a one-person aggregate can still permit contextual inference. Product language and security documentation must distinguish identity separation from a guarantee of group anonymity.

## Decision

- List authorized report targets for every non-draft cycle, independently of submission existence and without participation counts during discovery.
- Return `EMPTY` before the first encrypted submission. Do not release questions, ciphertext, or a submission count in that state.
- Return `AVAILABLE` after the first encrypted submission, including while the cycle is open. The aggregate response may contain the current sample size.
- Keep the report group fixed to evaluation cycle plus evaluated subject. Do not accept client-selected slices.
- Preserve active-tenant, role, scope, manager-relationship, system-administrator denial, and self-access denial checks in service-role-only database functions.
- Release only identity-free ciphertext and immutable question configuration to trusted reporting code. Keep direct ciphertext-table access revoked from `service_role`.
- Continue to return numeric and categorical aggregates only. Never return raw short- or long-text answers; return only their response counts.
- Fix the legacy `anonymity_threshold` compatibility field to `1` for existing and new cycles until a later schema cleanup can remove it without breaking deployed clients.
- Describe the system as identity-separated or identity-free reporting, not as guaranteed anonymous reporting for small groups. Customer policy must address contextual inference in sparse groups.
- Audit report access with subject, state, and access mode only. Do not record exact counts or content in audit metadata.

## Alternatives Considered

- Keep the threshold of four: rejected because it conflicts with the required immediate visibility workflow.
- Make the threshold configurable: rejected for this phase because the product owner explicitly removed the minimum and configuration would preserve inconsistent behavior.
- Return individual responses: rejected because it would undermine identity separation and expand the trusted-content surface.
- Return raw comments after the first submission: rejected because writing style and details can identify an evaluator.

## Consequences

Authorized reviewers receive useful numeric and categorical signals immediately, and active-cycle reports update as submissions arrive. A result based on one or a few submissions has a material contextual inference risk, so Yankı cannot promise group anonymity solely from sample size. Database, Edge Function, frontend, tests, and public product copy must preserve that distinction while retaining encryption, evaluator-link separation, strict server-side authorization, administrator denial, self-access denial, and raw-text withholding.

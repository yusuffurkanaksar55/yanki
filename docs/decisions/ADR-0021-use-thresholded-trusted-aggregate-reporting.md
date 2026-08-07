# ADR-0021: Use Thresholded Trusted Aggregate Reporting

## Status

Accepted on 2026-08-07.

## Context

Authorized reviewers need useful evaluation results without receiving individual responses, evaluator identities, below-threshold participation signals, or results about themselves. Ciphertext can be decrypted only where server-only key material is available. Administrative authority must remain separate from evaluation-content authority.

## Decision

- Define one non-configurable report group as evaluation cycle plus evaluated subject. Do not accept client-selected subgroups or slices.
- List authorized closed report targets independently of whether zero, one, or several submissions exist, and expose no participation count during discovery.
- Enforce cycle closure, active tenant membership, role scope, self-access denial, and a minimum threshold of four in service-role-only database functions before releasing any ciphertext.
- Permit report access only to scoped `TEAM_LEADER`, `C_LEVEL_REVIEWER`, and `BOARD_REVIEWER` roles. A team leader additionally needs an active direct or functional manager relationship to the subject.
- Deny every account with an active `SYSTEM_ADMIN` role, including accounts that also hold a reviewer role. `PROJECT_MANAGER` alone grants no result access.
- Keep direct ciphertext-table access revoked from `service_role`; trusted code receives only a threshold-approved identity-free batch through the database function.
- Decrypt AES-GCM payloads and validate their complete immutable question shape inside `evaluation-reports`, then return aggregate distributions and rating averages only.
- Never return raw short- or long-text answers. Return only the number of non-empty answers for text questions until a separately reviewed disclosure-resistant thematic workflow exists.
- Below threshold, return `WITHHELD` without the exact submission count, questions, ciphertext, or decrypted values.
- Record report access using safe audit metadata that contains subject, threshold, and available/withheld status, but no exact count or content.

## Alternatives Considered

- Decrypt in the browser: rejected because it would expose server-only keys and individual responses.
- Let `SYSTEM_ADMIN` read reports: rejected because configuration authority must not imply content authority.
- Return raw comments after the numeric threshold: rejected because distinctive writing can identify evaluators even in a group of four.
- Allow arbitrary project, role, question, or time slicing: rejected because repeated small slices create differencing and singling-out attacks.
- Return the exact below-threshold count: rejected because it reveals participation and can aid inference.

## Consequences

Scoped reviewers can inspect closed-cycle numeric and categorical aggregates once the threshold is met. Database, Edge Function, frontend, and test boundaries all deny self access and administrative content access. Raw comments are intentionally unavailable in this phase. Operators must retain every referenced encryption-key version for historical reports, and production still requires key rotation/recovery, rate limits, retention, backup acceptance, monitoring, and approved identity/email operations.

# ADR-0002 - Separate Evaluation Identity From Submission Content

## Status

Accepted

## Context

The platform must prevent employees, reviewers, administrators, and database readers from identifying who submitted a specific score, comment, evaluation, or lessons learned entry.

## Decision

Separate assignment identity from submission content. Assignment records may represent eligibility. Submission records store encrypted payloads without evaluator identifiers. One-time anonymous credentials will bridge eligibility and submission while avoiding a reversible assignment-to-submission mapping.

## Alternatives considered

- Store `evaluator_id` directly on submission records: rejected because it violates the core anonymity requirement.
- Store evaluator identity in encrypted payloads: rejected because it still creates unnecessary sensitive linkage and raises decryption risk.
- Use only frontend hiding: rejected because it is not a security control.

## Consequences

- Reporting must rely on identity-separated aggregate results and must state sparse-group inference risk honestly.
- Duplicate prevention needs careful credential design.
- Debugging and auditing must avoid reintroducing identity linkage.

## Security impact

Strong positive impact for privacy by design. The first implementation must be documented honestly as application-level unlinkability unless cryptographic unlinkability is added.

## Migration impact

Future migrations must avoid any submission table design that stores evaluator identity with content.

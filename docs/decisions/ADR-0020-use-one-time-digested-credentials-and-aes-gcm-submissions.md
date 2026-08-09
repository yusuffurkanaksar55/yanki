# ADR-0020: Use One-Time Digested Credentials And AES-GCM Submissions

## Status

Accepted on 2026-08-07.

## Context

The system must prove that an authenticated employee is eligible to submit exactly once without storing evaluator identity beside evaluation content. Database readers must not see plaintext answers, and the same design must run in shared SaaS and dedicated Supabase installations. Full blind-signature infrastructure is outside the current phase, so the anonymity claim must remain precise.

## Decision

- Keep evaluator-to-subject eligibility in `evaluation_assignments` and never add response content to that identity domain.
- Generate a random 256-bit credential only after authenticating and revalidating the evaluator's pending assignment, active tenant memberships, open window, and immutable template.
- Store only the credential SHA-256 digest; keep the raw value in transient Edge Function and React component memory.
- Send answers to a separate anonymous endpoint without a user Authorization header or cookies.
- Derive organization, cycle, project, subject, assignment kind, and template exclusively from the credential context instead of accepting those identifiers from the anonymous client.
- Validate answers against the immutable question snapshot and encrypt normalized JSON with AES-256-GCM, a random 12-byte nonce, a 128-bit tag, and authenticated context.
- Persist no evaluator, assignment, credential, digest, plaintext answer, or exact timestamp in the encrypted content table.
- Atomically insert ciphertext, redeem the credential, and complete the assignment through a service-role-only database function.
- Revoke direct table privileges from all API roles, including `service_role`, so trusted functions use only narrow lifecycle RPCs.
- Version encryption keys and context. Keep keyring values exclusively in server-side secret configuration.
- Describe the result as application-level unlinkability, not blind-signature cryptographic anonymity.

## Alternatives Considered

- Store evaluator id with encrypted content: rejected because encryption would not protect the evaluator-to-response relationship.
- Store a submission id on the assignment or credential: rejected because it creates a direct reversible mapping.
- Encrypt in the browser: rejected because browser-delivered keys and untrusted validation would weaken key custody and integrity.
- Use only RLS on a plaintext response table: rejected because privileged database readers could read content.
- Implement blind signatures immediately: deferred because of additional protocol, key, abuse-prevention, and operational complexity; it remains a future stronger-anonymity option.

## Consequences

Eligible employees can submit once and database readers see ciphertext only. The content row remains directly unlinked from evaluator and assignment records, while subject and reporting scope remain available for trusted aggregation. The trusted credential-preparation function can observe the evaluator and raw credential during issuance, and sparse timing/context can still permit inference; therefore the system does not claim cryptographic anonymity. ADR-0030 permits aggregates after the first submission while preserving this explicit inference warning. Production requires a new key, rotation/recovery procedures, rate limits, retention policy, and backup/restore acceptance.

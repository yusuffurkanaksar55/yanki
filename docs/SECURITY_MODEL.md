# Security Model

## Status

This document describes the intended security model. The repository currently contains Supabase default-deny RLS foundation tables, a typed Supabase Auth client foundation, profile/invitation onboarding foundation, organization hierarchy foundation, authenticated workspace context RPC, project/evaluation-cycle configuration foundation, and a protected administration shell, but no production evaluation submission, encryption, reporting, or scoped authorization runtime.

## Security Objectives

- Protect evaluator anonymity.
- Prevent plaintext evaluation content from being readable in the database.
- Prevent self-access to evaluation results.
- Restrict reporting to authorized scopes.
- Prevent administrators from reading sensitive evaluation content.
- Avoid sensitive logging and metadata leakage.
- Preserve historical evaluation meaning after organization changes.

## Identity And Content Separation

The system separates assignment identity from submission content.

The assignment domain may know that an authenticated user is eligible to evaluate a target. The submission domain must not store the evaluator identity, evaluator email, employee number, IP address, device fingerprint, browser fingerprint, exact submission timestamp exposed to reviewers, or any other identifying metadata with the encrypted payload.

No submission record may contain both evaluator identity and evaluation content.

## Anonymous Credential Flow

Minimum intended flow:

1. Authenticate the employee.
2. Validate an active assignment and scope.
3. Issue or validate a one-time anonymous credential.
4. Remove authenticated identity before payload persistence.
5. Encrypt the payload in trusted server-side code.
6. Store encrypted content without evaluator identity.
7. Mark credential redemption in a way that prevents reuse.
8. Avoid a reversible assignment-to-submission mapping.

This design provides application-level unlinkability. It is not claimed to provide cryptographic anonymity until a blind-signature or equivalent unlinkable credential mechanism is implemented and reviewed.

## Encryption

Evaluation scores, comments, and lessons learned content must be encrypted before database persistence using authenticated encryption such as AES-256-GCM or an equivalent modern algorithm.

Each encrypted payload must include:

- Ciphertext
- Unique nonce
- Key version
- Encryption algorithm

Encryption keys must not be stored in frontend code, Git, migrations, public environment variables, browser storage, or documentation. Encryption and decryption happen only in trusted server-side code.

## Decryption

Decryption is allowed only in trusted server-side reporting flows after:

- Authentication validation
- Role validation
- Scope validation
- Self-access prevention
- Minimum anonymity threshold validation
- Request schema validation

Raw decrypted individual responses must not be returned to reviewers.

## Browser Authentication Boundary

The browser Supabase client uses only public project URL and anon key values. It must never receive service-role credentials, database passwords, encryption keys, decrypted payloads, anonymous credential values, or privileged authorization decisions.

The current auth client supports email/password sign-in, password reset request, local-session sign-out, and session-state observation. The profile gate reads only the authenticated user's own profile row through a narrow RLS policy. This improves access gating in the UI, but sensitive authorization still must be enforced in Edge Functions and RLS.

Invitation records store only hashed invitation secrets and remain inaccessible to frontend clients. Raw invitation secrets must never be stored in the database, browser, logs, Git, documentation, or generated UI.

Organization hierarchy records are identity-domain metadata and remain inaccessible to frontend clients until trusted administrative authorization is implemented. Demo fixture credentials must be generated at runtime and must not be committed.

The workspace context RPC returns only the authenticated user's own non-sensitive profile, role, membership, and manager context. It must not return evaluation submissions, scores, comments, lessons learned payloads, anonymous credentials, decrypted content, or evaluator-to-response relationships.

Project and evaluation-cycle configuration tables are identity/configuration-domain metadata. They remain inaccessible to frontend clients until trusted administrative authorization is implemented. The administration shell is not a sensitive authorization boundary and must not be used to justify direct table access.

## Anonymity Threshold

The default minimum result threshold is 4 submissions per reportable group. The threshold must be configurable per evaluation cycle, but lowering it below the documented security minimum requires an explicit administrative warning and recorded decision.

Below threshold, the application must withhold results and return a Turkish user-facing message through the localization system.

## Logging And Auditing

Allowed audit events include configuration and access metadata, such as user account creation, team creation, project creation, cycle opening, assignment batch creation, role scope changes, authorized report access, and encryption key version changes.

Forbidden logs include scores, comments, lessons learned text, decrypted payloads, anonymous credential values, access tokens, passwords, full sensitive request bodies, and evaluator-to-response relationships.

## Database Visibility

Database readers may see ciphertext and non-sensitive metadata only. Database encryption protects stored content from direct database inspection, but a party controlling both application code and encryption secrets could alter the system to access content. This limitation must remain documented and must not be hidden in product claims.

## Remaining Security Work

- Implement invitation creation and redemption through trusted Edge Functions.
- Implement trusted project and evaluation-cycle management functions before enabling writes from the administration shell.
- Add narrowly scoped Supabase RLS policies only after server-side authorization flows are designed.
- Implement Edge Functions for anonymous credential issuance, redemption, encryption, and reporting.
- Implement key management and key rotation procedures.
- Add security regression tests for self-access, threshold enforcement, duplicate credential redemption, plaintext persistence, and authorization bypass attempts.

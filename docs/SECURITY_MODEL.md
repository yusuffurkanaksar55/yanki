# Security Model

## Status

This document describes the intended security model. The repository currently contains Supabase default-deny RLS foundation tables, a typed Supabase Auth client foundation, Supabase Auth-backed invitation onboarding, organization hierarchy foundation, authenticated workspace and employee assignment RPCs, project/evaluation-cycle configuration, evaluation assignment planning, a protected administration shell, and trusted user/project administration Edge Functions. Production evaluation submission, encryption, anonymous credentials, and reporting are not implemented.

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

`user-onboarding` uses Supabase Auth for user-facing invitation delivery and email ownership proof. The administration browser never receives a custom action link or raw invitation secret. Invitation creation and revocation require a platform or matching-organization `SYSTEM_ADMIN` role. Acceptance binds the authenticated Auth user id and verified email to the invitation, revalidates expiration and hierarchy context, and calls service-role-only `accept_user_invitation()` for atomic activation. Real email delivery still depends on approved Supabase Auth SMTP settings.

Organization hierarchy records are identity-domain metadata and remain inaccessible to frontend clients. `organization-administration` validates the caller's authenticated active profile and database-backed platform or matching-organization `SYSTEM_ADMIN` role, then delegates mutations to service-role-only atomic database functions that revalidate the actor. The database rejects manager cycles, invalid role scopes, unsafe unit archival, and removal of the final organization administrator. Demo fixture credentials must be generated at runtime and must not be committed.

The workspace context RPC returns only the authenticated user's own non-sensitive profile, role, membership, and manager context. It must not return evaluation submissions, scores, comments, lessons learned payloads, anonymous credentials, decrypted content, or evaluator-to-response relationships.

Project and evaluation-cycle configuration tables are identity/configuration-domain metadata. They remain inaccessible to frontend clients until trusted administrative authorization is implemented. The administration shell is not a sensitive authorization boundary and must not be used to justify direct table access.

`admin-project-cycles` is the first trusted administrative Edge Function. It validates the Supabase access token, requires an active profile, recomputes role scope from database records, and uses service-role credentials only inside the Edge Function runtime. It now also lists active organization members for authorized administrators and writes project membership records after validating the selected user's active organization membership. The browser still has no direct table access to `project_memberships`, `organization_unit_memberships`, or administrative `user_profiles` lists.

Delegated project-date updates use the same Edge Function and service-role-only `admin_update_project_dates()`. A project manager must be both the project's current manager reference and the holder of an active matching project-scoped role. The database repeats authorization, locks both configuration records, updates them atomically, and writes only safe date/configuration audit metadata. This flow does not read or write evaluation content.

`evaluation_assignments` is an identity-domain eligibility table, not a submission-content table. It may store evaluator and subject identifiers so the system can later issue eligibility proofs, but it must never store scores, comments, lessons learned text, encrypted payloads, anonymous credential secrets, or evaluator-to-response mappings. It remains default-deny to frontend clients. The current assignment generation action is admin-only, project-backed, prevents self assignments, and returns aggregate assignment counts rather than response content.

`get_my_evaluation_assignments()` is the only employee assignment-read boundary. It accepts no user or organization id, derives ownership from `auth.uid()`, requires active evaluator and subject tenant membership, excludes cancelled assignments and draft cycles, and returns only display metadata with a server-clock availability state. Its execute grant is limited to `authenticated`. It does not authorize submission or return response content, anonymous credentials, or evaluator identity fields.

## Anonymity Threshold

The default minimum result threshold is 4 submissions per reportable group. The threshold must be configurable per evaluation cycle, but lowering it below the documented security minimum requires an explicit administrative warning and recorded decision.

Below threshold, the application must withhold results and return a Turkish user-facing message through the localization system.

## Logging And Auditing

Allowed audit events include configuration and access metadata, such as user account creation, team creation, project creation, cycle opening, assignment batch creation, role scope changes, authorized report access, and encryption key version changes.

Forbidden logs include scores, comments, lessons learned text, decrypted payloads, anonymous credential values, access tokens, passwords, full sensitive request bodies, and evaluator-to-response relationships.

## Database Visibility

Database readers may see ciphertext and non-sensitive metadata only. Database encryption protects stored content from direct database inspection, but a party controlling both application code and encryption secrets could alter the system to access content. This limitation must remain documented and must not be hidden in product claims.

## Tenant Isolation

`organizations.id` is the canonical tenant boundary in shared deployments. Trusted actions must derive organization scope from database records and reject client-selected cross-tenant relationships. Tenant-owned tables carry or derive the organization id, and database constraints require active organization membership for project managers, project members, manager relationships, evaluators, and evaluation subjects.

`user_profiles` remains global because one Auth identity may participate in multiple organizations. Membership, roles, projects, assignments, submissions, and reports remain organization-scoped. Dedicated customer infrastructure adds physical isolation but does not relax these application controls.

## Self-Hosted Responsibility

In customer-managed installations, the customer controls the host, database, application code, and secrets. The operator is responsible for TLS, network isolation, patching, backups, restore drills, availability, monitoring, SMTP, and secret rotation. The product must not claim protection from an operator that controls both ciphertext and encryption keys. Browser runtime configuration still contains public values only.

## Remaining Security Work

- Complete live invitation email delivery and acceptance verification with an approved test mailbox.
- Add narrowly scoped Supabase RLS policies only after server-side authorization flows are designed.
- Implement Edge Functions for anonymous credential issuance, redemption, encryption, and reporting.
- Implement key management and key rotation procedures.
- Add security regression tests for self-access, threshold enforcement, duplicate credential redemption, plaintext persistence, and authorization bypass attempts.
- Add executable cross-tenant database tests against a running local or dedicated Supabase stack.

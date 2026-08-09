# Security Model

## Status

This document describes the implemented and intended security model. The repository now contains default-deny identity/configuration data, immutable templates, authenticated one-time credential preparation, identity-free anonymous redemption, privacy-preserving application quotas, server-side AES-256-GCM encryption, additive key rotation, content-free key health checks, atomic assignment completion, trusted thresholded aggregate reporting, tenant-scoped content retention with legal hold, idempotent production tenant bootstrap, independent-custody manifest validation, encrypted recovery canaries, disposable database-plus-key restore verification, and trusted administration boundaries. Real production custody-provider configuration and environment-specific recovery acceptance remain incomplete.

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

Implemented flow:

1. Authenticate the employee.
2. Validate an active assignment and scope.
3. Issue or validate a one-time anonymous credential.
4. Remove authenticated identity before payload persistence.
5. Encrypt the payload in trusted server-side code.
6. Store encrypted content without evaluator identity.
7. Mark credential redemption in a way that prevents reuse.
8. Avoid a reversible assignment-to-submission mapping.

This design provides application-level unlinkability. It is not claimed to provide cryptographic anonymity until a blind-signature or equivalent unlinkable credential mechanism is implemented and reviewed.

The raw 256-bit credential exists only in Edge Function process memory and React component state. The database stores its SHA-256 digest only. The browser does not persist it to local storage, session storage, IndexedDB, URL state, analytics, or logs. Preparing a replacement credential revokes the previous pending digest.

## Encryption

Evaluation scores, comments, and lessons learned content must be encrypted before database persistence using authenticated encryption such as AES-256-GCM or an equivalent modern algorithm.

Each encrypted payload must include:

- Ciphertext
- Unique nonce
- Key version
- Encryption algorithm

Encryption keys must not be stored in frontend code, Git, migrations, public environment variables, browser storage, or documentation. Encryption and decryption happen only in trusted server-side code.

The implemented keyring selects new encryption with `EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION`. It reads the legacy `EVALUATION_ENCRYPTION_KEYRING` for backward compatibility and merges independently managed `EVALUATION_ENCRYPTION_KEY_VERSION_<VERSION>` secrets for additive rotation. Every key is exactly 32 random bytes encoded as base64. Encryption uses a fresh 12-byte nonce, a 128-bit authentication tag, and authenticated context containing tenant, cycle, optional project, subject, assignment kind, template version, and context version. Historical key secrets must remain configured while any ciphertext references them. The linked synthetic environment has exercised additive rotation, but its keys remain development-only and must never be reused for production data.

`encryption-key-health` is available only to authenticated active system administrators. It returns configuration validity, active-key presence, historical coverage, and total configured/referenced version counts. It never returns key material, key version names, ciphertext, evaluation content, identities, per-version usage counts, or timestamps.

## Decryption

Decryption is implemented only in `evaluation-reports`, after the database has enforced:

- Authentication validation
- Role validation
- Scope validation
- Self-access prevention
- Minimum anonymity threshold validation
- Request schema validation

Raw decrypted individual responses must not be returned to reviewers.

The trusted function validates the AES-GCM authenticated context and the exact immutable question set for every decrypted payload. It emits only aggregate values. Raw short- and long-text responses are discarded during aggregation and represented only by a non-empty response count.

## Browser Authentication Boundary

The browser Supabase client uses only public project URL and anon key values. It must never receive service-role credentials, database passwords, encryption keys, decrypted payloads, anonymous credential values, or privileged authorization decisions.

The current auth client supports email/password sign-in, password reset request, invitation/recovery password update, local-session sign-out, and session-state observation. Invitation metadata and the Supabase `PASSWORD_RECOVERY` event hold the session at a Turkish strong-password setup screen before workspace rendering. The metadata flag is a usability state, not an authorization claim. The profile gate reads only the authenticated user's own profile row through a narrow RLS policy. This improves access gating in the UI, but sensitive authorization still must be enforced in Edge Functions and RLS.

Invitation records store only hashed invitation secrets and remain inaccessible to frontend clients. Raw invitation secrets must never be stored in the database, browser, logs, Git, documentation, or generated UI.

`user-onboarding` uses Supabase Auth for user-facing invitation delivery and email ownership proof. The administration browser never receives a custom action link or raw invitation secret. Invitation creation and revocation require a platform or matching-organization `SYSTEM_ADMIN` role. Acceptance binds the authenticated Auth user id and verified email to the invitation, revalidates expiration and hierarchy context, and calls service-role-only `accept_user_invitation()` for atomic activation. Real email delivery still depends on approved Supabase Auth SMTP settings.

Production tenant bootstrap is not a browser endpoint. The operator requires the server-only service role, explicit confirmation, a stable random request UUID, normalized input, and an exact SHA-256 fingerprint. PostgreSQL verifies that the invited Auth identity has the matching server-controlled app-metadata marker before atomically creating tenant configuration. Existing unmarked identities are rejected, exact reruns are idempotent, and database failure deletes only an Auth identity created by that execution. Initial invitation recovery requires a separate confirmation, renews only the exact unaccepted/unrevoked invitation, and asks Supabase Auth to send recovery mail without exposing an action link.

Organization hierarchy records are identity-domain metadata and remain inaccessible to frontend clients. `organization-administration` validates the caller's authenticated active profile and database-backed platform or matching-organization `SYSTEM_ADMIN` role, then delegates mutations to service-role-only atomic database functions that revalidate the actor. The database rejects manager cycles, invalid role scopes, unsafe unit archival, and removal of the final organization administrator. Demo fixture credentials must be generated at runtime and must not be committed.

The workspace context RPC returns only the authenticated user's own non-sensitive profile, role, membership, and manager context. It must not return evaluation submissions, scores, comments, lessons learned payloads, anonymous credentials, decrypted content, or evaluator-to-response relationships.

Project and evaluation-cycle configuration tables are identity/configuration-domain metadata. They remain inaccessible to frontend clients until trusted administrative authorization is implemented. The administration shell is not a sensitive authorization boundary and must not be used to justify direct table access.

`admin-project-cycles` is the first trusted administrative Edge Function. It validates the Supabase access token, requires an active profile, recomputes role scope from database records, and uses service-role credentials only inside the Edge Function runtime. It now also lists active organization members for authorized administrators and writes project membership records after validating the selected user's active organization membership. The browser still has no direct table access to `project_memberships`, `organization_unit_memberships`, or administrative `user_profiles` lists.

Delegated project-date updates use the same Edge Function and service-role-only `admin_update_project_dates()`. A project manager must be both the project's current manager reference and the holder of an active matching project-scoped role. The database repeats authorization, locks both configuration records, updates them atomically, and writes only safe date/configuration audit metadata. This flow does not read or write evaluation content.

`evaluation_assignments` is an identity-domain eligibility table, not a submission-content table. It may store evaluator and subject identifiers so the system can later issue eligibility proofs, but it must never store scores, comments, lessons learned text, encrypted payloads, anonymous credential secrets, or evaluator-to-response mappings. It remains default-deny to frontend clients. The current assignment generation action is admin-only, project-backed, prevents self assignments, and returns aggregate assignment counts rather than response content.

`get_my_evaluation_assignments()` is the only employee assignment-read boundary. It accepts no user or organization id, derives ownership from `auth.uid()`, requires active evaluator and subject tenant membership, excludes cancelled assignments and draft cycles, and returns only display metadata with a server-clock availability state. Its execute grant is limited to `authenticated`. It does not authorize submission or return response content, anonymous credentials, or evaluator identity fields.

Evaluation templates are configuration-domain records. `evaluation-templates` authenticates the actor, recomputes active `SYSTEM_ADMIN` scope, and delegates mutations to service-role-only atomic functions that repeat organization authorization. Draft metadata and questions may change; publication requires at least one valid question. Database triggers reject every later update or delete of a published version or any of its questions. Cycles can bind only a published version from the same tenant, and assignments must copy the exact version from their cycle. Template prompts and options are configuration, not employee response content.

`evaluation-submission-credentials` requires a valid access token and active profile, generates the random credential in trusted code, and invokes a service-role-only database function that locks and revalidates the exact assignment. Its response contains the raw credential and form configuration, but never persists the raw value.

`anonymous-evaluation-submissions` intentionally accepts no user Authorization header. It receives only the one-time credential and answers, validates required/type/range/option rules against identity-free immutable question context, encrypts the normalized payload, and calls an atomic redemption function. Safe operational configuration errors may return stable codes, but no answer, key, digest, credential, or decrypted value is logged.

Before identity-free context lookup or encryption, the endpoint enforces a 256 KiB body limit and consumes an application quota. Recognized credentials have isolated 12-request/10-minute buckets; unknown credentials share a 120-request/minute invalid-only bucket. The known bucket key is a one-way hash of an internal random credential row id, not the stored credential digest. Rate buckets expire after one day. Five-minute invalid/rate-limit counters are retained for seven days without IP, device, user, tenant, assignment, credential, request, or content data.

`security-abuse-monitoring` is available only to authenticated active system administrators, with authorization repeated in the Edge Function and database. It exposes 60-minute and 24-hour aggregate counts and configured limits only. It cannot read credential or ciphertext tables. These controls reduce application-level abuse but do not replace reverse-proxy/WAF connection limits, capacity protection, and external alert delivery.

`anonymous_submission_credentials` remains in the identity domain and has no content or submission identifier. `encrypted_evaluation_submissions` remains in the content domain and has no evaluator, assignment, credential, digest, plaintext, or exact timestamp column. Both tables have RLS enabled and all direct table privileges are revoked from browser roles and `service_role`; trusted code can use only the narrow RPCs.

## Anonymity Threshold

The default minimum result threshold is 4 submissions per reportable group. The threshold must be configurable per evaluation cycle, but lowering it below the documented security minimum requires an explicit administrative warning and recorded decision.

Below threshold, the application must withhold results and return a Turkish user-facing message through the localization system.

The implemented report group is fixed to evaluation cycle plus evaluated subject. Target discovery is independent of submission existence. A below-threshold response contains neither the exact count nor questions, ciphertext, or decrypted values. Client-selected slicing is not supported.

## Logging And Auditing

Allowed audit events include configuration and access metadata, such as user account creation, team creation, project creation, cycle opening, assignment batch creation, role scope changes, authorized report access, and encryption key version changes.

Forbidden logs include scores, comments, lessons learned text, decrypted payloads, anonymous credential values, access tokens, passwords, full sensitive request bodies, and evaluator-to-response relationships.

Tenant bootstrap logs may contain request, organization, unit, invitation, and Auth user identifiers plus status. They must not contain administrator email, display name, passwords, service-role keys, SMTP secrets, invitation tokens, raw action links, or Auth response bodies.

Retention policy updates and cleanup executions may audit tenant scope, policy version, configured days, legal-hold/automation state, cutoff date, and execution mode. They must never audit subjects, evaluator identities, content, participation state, or deleted-row counts.

Key custody, off-site backup, and recovery output may contain schema version, key/canary counts, boolean acceptance results, snapshot id, dump stream size/hash, source mode, retention settings, and target cleanup status. It must never contain repository locators, repository passwords, provider/database credentials, key values, key-version identifiers, custody references, ciphertext, decrypted canary bytes, or real evaluation content. Recovery canaries are random synthetic values and have no identity or tenant relationship.

## Database Visibility

Database readers may see ciphertext and non-sensitive metadata only. Database encryption protects stored content from direct database inspection, but a party controlling both application code and encryption secrets could alter the system to access content. This limitation must remain documented and must not be hidden in product claims.

Tenant retention deletes expired ciphertext from the live logical database only. Existing WAL, snapshots, replicas, and backups remain subject to independently configured infrastructure retention. Historical encryption keys cannot be retired until both live references and approved backup-retention windows are exhausted.

Restic encrypts and authenticates off-site snapshots before remote persistence. Its repository password and backend credentials are independent server secrets and must be recoverable through an approved channel separate from the repository. The production validator rejects local repositories unless an acceptance-only override is explicit. Backup retention is scoped by exact environment metadata; it must also remain contractually aligned with tenant deletion, legal hold, and incident-preservation requirements.

## Tenant Isolation

`organizations.id` is the canonical tenant boundary in shared deployments. Trusted actions must derive organization scope from database records and reject client-selected cross-tenant relationships. Tenant-owned tables carry or derive the organization id, and database constraints require active organization membership for project managers, project members, manager relationships, evaluators, and evaluation subjects.

`user_profiles` remains global because one Auth identity may participate in multiple organizations. Membership, roles, projects, assignments, submissions, and reports remain organization-scoped. Dedicated customer infrastructure adds physical isolation but does not relax these application controls.

## Self-Hosted Responsibility

In customer-managed installations, the customer controls the host, database, application code, and secrets. The operator is responsible for TLS, network isolation, patching, backups, restore drills, availability, monitoring, SMTP, and secret rotation. The product must not claim protection from an operator that controls both ciphertext and encryption keys. Browser runtime configuration still contains public values only.

## Remaining Security Work

- Complete live invitation email delivery and acceptance verification with an approved test mailbox.
- Add narrowly scoped Supabase RLS policies only after server-side authorization flows are designed.
- Configure the implemented custody manifest and Restic workflow with real independent production secret/off-site providers, enable monitoring for the scheduled service, and complete a successful isolated environment-specific key-plus-database recovery drill before production.
- Add outer gateway/WAF limits for credential preparation and anonymous redemption, plus alert delivery without sensitive request logging.
- Add executable cross-tenant database tests against a running local or dedicated Supabase stack.

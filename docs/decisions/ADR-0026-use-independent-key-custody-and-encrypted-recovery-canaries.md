# ADR-0026: Use Independent Key Custody And Encrypted Recovery Canaries

## Status

Accepted

## Context

A database backup is unusable without every encryption key referenced by its ciphertext. Keeping the backup and all keys under one credential or infrastructure boundary also defeats the intended separation of duties. Schema-only restore checks cannot prove that an approved recovery custodian can retrieve the correct historical keys or that those keys still decrypt restored data.

A recovery drill must not read or expose real employee evaluation content merely to prove key availability. It must work for the shared SaaS topology and customer-operated dedicated installations without committing a cloud-vendor-specific secret format to the application repository.

## Decision

- Represent custody metadata in a versioned, provider-neutral manifest that contains stable environment and key-version identifiers, distinct primary and recovery administrative control domains/references, lifecycle status, and at least two distinct custodian roles.
- Forbid credentials, tokens, passwords, key values, query parameters, and embedded authentication in the manifest. Keep the real environment manifest outside version control; commit only a placeholder example.
- Load each AES-256 key from its independent server-only `EVALUATION_ENCRYPTION_KEY_VERSION_<VERSION>` environment value. Never retrieve keys from the browser or print them in operator output.
- Store one random encrypted recovery canary per environment and key version. The table contains only AES-GCM ciphertext, nonce, a SHA-256 digest of random canary bytes, context version, and refresh time. It contains no organization, evaluator, subject, assignment, credential, or evaluation content.
- Permit canary refresh only through a narrow service-role function. Revoke direct table access from browser roles and `service_role`.
- Bind every canary to its environment, key version, purpose, schema version, and context version with AES-GCM authenticated data.
- During a guarded disposable restore, read only synthetic canary rows through the database recovery role, load all keys from the approved recovery channel, decrypt every manifest entry, verify its digest, and fail on any missing, extra, duplicated, corrupt, or wrong-key canary.
- Stream the database dump directly into restore, keep writing no host dump file, return only counts/booleans and stream metadata, and always remove the disposable database.
- Treat the local executable drill as a foundation. Production readiness still requires a real independent secret manager/offline escrow, scheduled encrypted off-host backups, isolated environment restore, documented RPO/RTO, and signed two-person acceptance.

## Alternatives Considered

- Decrypt one real evaluation response after restore: rejected because a recovery test must not expose or single out employee content.
- Store a plaintext known value in PostgreSQL: rejected because operational verification must preserve the no-plaintext-at-rest rule.
- Keep keys in the database backup: rejected because compromise of one artifact would reveal both ciphertext and keys.
- Standardize on one cloud key manager: rejected because shared SaaS and customer-managed deployments may use different approved providers.
- Verify only that key environment variables exist: rejected because presence does not prove that the recovered key matches restored ciphertext.

## Consequences

The repository can now validate custody separation and execute a content-free database-plus-key recovery drill using the same application schema in managed and dedicated topologies. Recovery operators must maintain the manifest and refresh canaries whenever a key version is introduced. The mechanism proves cryptographic compatibility, not the durability, geographic independence, access reviews, or incident controls of a production custody provider; those remain deployment acceptance responsibilities.

# ADR-0003 - Encrypt Evaluation Payloads In Trusted Server Code

## Status

Accepted

## Context

Evaluation scores, comments, and lessons learned content must not be readable through direct database inspection. Browser-side encryption would expose sensitive key-management risk if master keys or service credentials reach the client.

## Decision

Use trusted server-side code, initially Supabase Edge Functions, to validate requests, remove identity linkage, encrypt payloads with authenticated encryption, and persist only ciphertext and non-sensitive metadata.

## Alternatives considered

- Store plaintext in PostgreSQL with RLS only: rejected because database readers could see sensitive content.
- Encrypt in the browser with a shared key: rejected because key exposure risk is too high.
- Use database-only encryption functions with keys in migrations: rejected because secrets must not be stored in Git or migrations.

## Consequences

- Key management and rotation procedures are required.
- Reporting flows must decrypt only in trusted server-side code after authorization and threshold checks.
- Tests must verify plaintext is not persisted.

## Security impact

Positive. Protects database-at-rest visibility while documenting that anyone controlling both application code and encryption secrets could alter access.

## Migration impact

Future schema must store ciphertext, nonce, key version, and algorithm metadata instead of plaintext answers.

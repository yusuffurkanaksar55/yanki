# ADR-0022: Use Additive Encryption Key Rotation

## Status

Accepted on 2026-08-07.

## Context

Supabase Secrets can be updated but existing secret values cannot be read back through normal operator tooling. Replacing one JSON keyring without an approved copy of every historical key could make stored evaluation ciphertext permanently unreadable. Rotation must preserve historical decryption, avoid printing key material, work in managed and self-hosted deployments, and expose no evaluation content to administrators.

## Decision

- Keep `EVALUATION_ENCRYPTION_KEYRING` as a backward-compatible source for already configured keys.
- Store every new key as an independently named, additive secret: `EVALUATION_ENCRYPTION_KEY_VERSION_<VERSION>`. New version identifiers use uppercase letters, digits, and underscores so they map safely to environment variable names.
- Select the encryption key for new submissions with `EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION`. Never overwrite or delete a historical key while any ciphertext references its version.
- Merge legacy and additive keys only in trusted Edge Function memory. Reject duplicate versions, malformed base64, non-32-byte values, and an active version without configured key material.
- Inventory only distinct key-version identifiers through a service-role-only database function. Do not return ciphertext, identities, content, counts per version, or timestamps.
- Let active system administrators read only a content-free health summary: configuration validity, active-key presence, historical coverage, and total configured/referenced version counts. Never return key material or version names.
- Generate new key material with `npm run encryption:key:prepare -- <VERSION>`. The tool writes a new file only under ignored `.secrets/`, never prints the key, and refuses to overwrite an existing transfer file.
- Deploy backward-compatible readers before changing the active version. After activation, verify old report decryption, create and read new ciphertext, verify health, and then delete the transfer file.

## Alternatives Considered

- Replace the JSON keyring in place: rejected because an unreadable or incomplete historical value can cause irreversible data loss.
- Store keys in PostgreSQL: rejected because database access would then expose both ciphertext and key material to the same control plane.
- Return key versions or fingerprints to every tenant administrator: rejected because only a minimal operational status is needed in the application.
- Delete inactive keys immediately: rejected because reports require the exact version recorded with each ciphertext.

## Consequences

Managed and dedicated installations can add and activate keys without retrieving or rewriting existing secrets. Historical keys accumulate until approved re-encryption or retention deletion removes every reference. Production still requires an independent production key, approved secret-manager escrow, access controls, and a successful database-plus-key recovery drill before live employee data is accepted.

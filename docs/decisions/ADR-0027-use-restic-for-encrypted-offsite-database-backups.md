# ADR-0027: Use Restic For Encrypted Off-Site Database Backups

## Status

Accepted

## Context

The shared SaaS topology benefits from managed Supabase backups, but an independently controlled export is still needed for provider-loss, account-loss, and long-term recovery scenarios. Customer-managed Supabase does not include vendor-operated backup and disaster-recovery responsibility. Both topologies need one portable workflow that creates no plaintext host dump, detects a failed database export, encrypts before remote persistence, applies bounded retention, verifies repository integrity, and proves restoration together with separately recovered evaluation keys.

The repository must not implement new cryptography for backup archives or standardize every customer on one object-storage vendor. It must also prevent a local directory from being represented as an off-site production backup.

## Decision

- Pin Restic `0.19.1` as the encrypted repository client. The optional Windows development installer downloads the official release into ignored `.tools/`, verifies a pinned SHA-256 checksum, and does not consume a system-wide installation path.
- Support remote Restic backends such as S3-compatible storage, Azure, B2, Google Cloud Storage, SFTP, REST, Swift, and reviewed rclone remotes. Reject local repositories unless the exact acceptance-only override is present.
- Use `restic backup --stdin-from-command` to run a fixed `pg_dump` command. Restic must observe the source exit code and cancel snapshot creation if the dump fails.
- Use PostgreSQL custom format with internal compression disabled; Restic performs authenticated encryption, compression, deduplication, and repository integrity management. No plaintext dump file is written to the host.
- Support a Docker database source for local/dedicated stacks and a `DATABASE_URL` source using a native version-compatible `pg_dump` for managed or restricted-network environments. Keep the database URL in `PGDATABASE`, never in process arguments or command output.
- Tag every snapshot with the stable environment id, product purpose, and archive format. Retention is restricted by exact host plus the combined tags and groups by host/path/tags.
- Require an explicit full snapshot id for recovery. Do not use an unscoped `latest` alias. Verify snapshot host, tags, and dump filename before creating a guarded `_offsite_restore_acceptance` database.
- Stream `restic dump` directly into `pg_restore`, run the same restored RLS/privilege invariants as the local drill, decrypt every recovery canary with separately recovered keys, and always remove the disposable target.
- Schedule backup, data-subset integrity checking, and retention as a fail-fast systemd oneshot service and persistent daily timer. Alerting consumes the service exit status outside this repository.
- Keep repository password, object-store credentials, database URL, and encryption keys in approved server-only secret channels. The repository password must be independently backed up; losing it makes snapshots unrecoverable.

## Alternatives Considered

- Rely only on managed Supabase backups: rejected because dedicated installations do not have that service and an independent provider/account-loss copy is still required.
- Write `pg_dump` to disk and upload it later: rejected because a plaintext sensitive archive would exist on host storage and cleanup could fail.
- Pipe `pg_dump` into a generic stdin backup without source-status propagation: rejected because an empty or truncated export could be recorded as successful.
- Implement archive encryption in application code: rejected because mature backup cryptography, repository locking, retention, integrity checking, and backend support already exist in Restic.
- Select snapshots with `latest`: rejected because a shared repository may contain multiple hosts, environments, paths, and backup purposes.

## Consequences

The project now has one executable backup and restore contract for shared SaaS and dedicated installations, with no application or browser permission surface. Production operators must still provision a genuinely remote repository, independently custody its password and provider credentials, monitor timer failures, configure storage-object backup if that feature is adopted, and record measured RPO/RTO from an isolated environment-specific drill. Managed-platform restoration and cross-major-version migrations may require Supabase's provider-specific portable dump procedure rather than this same-version disaster-recovery archive.

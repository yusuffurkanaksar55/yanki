# ADR-0024: Use Tenant Retention And Disposable Restore Drills

## Status

Accepted

## Context

Encrypted evaluation content must not be kept indefinitely, but deletion must preserve tenant choice, legal holds, reporting behavior, key lifecycle safety, and shared/dedicated deployment portability. PostgreSQL row deletion removes content from the live logical database; it does not immediately erase WAL segments, snapshots, or existing backups. The product therefore must not claim instantaneous physical erasure from every storage layer.

Production recovery also requires executable proof that a backup can be restored without weakening database privileges. A restore test must never overwrite the active database or leave a large duplicate behind on constrained developer machines.

## Decision

- Store one content-free policy per organization with a default 730-day retention period, a supported range of 30 to 3650 days, disabled automatic purge, legal hold, policy version, and content-free last-run metadata.
- Let platform or matching-organization `SYSTEM_ADMIN` users list and update only policies within their scope through `evaluation-retention-administration`. Repeat active-profile and role checks in the Edge Function and service-role-only PostgreSQL mutation.
- Keep destructive execution outside the browser. `execute_due_evaluation_content_retention()` is executable only by `service_role`, uses an advisory transaction lock, skips disabled or legally held tenants, deletes only ciphertext older than the date-only cutoff, and returns no submission or deletion count.
- Run the operator boundary from the same explicit-confirmation command in shared SaaS and dedicated installations. Scheduling remains an infrastructure responsibility so the schema does not depend on hosted-only cron features.
- Audit policy changes and executions without subject identifiers, content, participation state, or deleted-row counts.
- Treat live-database purge and backup expiry as separate controls. Historical encryption keys remain required while any live ciphertext or retained backup still references them.
- Verify backup restorability in a disposable database whose name must end in `_restore_acceptance`. The acceptance command streams a compressed dump directly into restore with a privileged local Supabase management role, hashes and measures the stream without writing it to host storage, checks migration/security invariants, and always removes the temporary database.

## Alternatives Considered

- Browser-triggered manual purge: rejected because a compromised administrator session should not directly invoke destructive content deletion.
- Hosted `pg_cron` as the only scheduler: rejected because customer-managed deployments must use the same application boundary.
- Return deleted submission counts to administrators: rejected because counts can reveal participation and are unnecessary for policy operations.
- Claim secure physical erasure after `DELETE`: rejected because existing backups, snapshots, replicas, and WAL follow independent infrastructure retention.
- Restore over the active local database: rejected because acceptance testing must be non-destructive and recover cleanly after failure.

## Consequences

Tenants can configure content lifetime and suspend deletion under legal hold without gaining content access. SaaS and dedicated operators can automate the same narrow function. Reports for purged periods become unavailable, and key retirement must account for retained backups. The disposable restore drill proves repository-level recovery mechanics, but each production environment still needs approved backup scheduling, encryption, off-host storage, recovery objectives, and an environment-specific restore acceptance record.

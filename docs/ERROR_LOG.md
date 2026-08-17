# Error Log

## ERR-20260817-083 - Abuse-counter pgTAP assumed an empty persistent database

### Context

All database test suites were run against the canonical AWS self-hosted development database without deleting migrated data.

### Symptoms

Two assertions in `anonymous_encrypted_submission.test.sql` expected an absolute 60-minute invalid-credential count of `121`. Existing valid abuse-counter rows made the aggregate larger even though the test's own quota behavior was correct.

### Root cause

The test encoded a clean-database assumption for a deployment-global rolling aggregate. That assumption held in disposable local stacks but not in a persistent shared development environment.

### Correct solution

Capture the pre-test 60-minute invalid and rate-limited totals in a transaction-local temporary table, then assert the exact baseline plus the test's `121` and `2` contributions. No existing row is deleted or changed, and the whole fixture still ends with `ROLLBACK`.

### Prevention

Persistent-environment integration tests must compare their own delta or use uniquely scoped fixtures. Never require clearing valid operational counters to make an assertion deterministic.

### Related files

- `supabase/tests/database/anonymous_encrypted_submission.test.sql`

### Related tests

- AWS self-hosted pgTAP acceptance: 10 files, 210 assertions

## ERR-20260817-082 - Imported ciphertext has no recoverable legacy key in reviewed sources

### Context

The AWS self-hosted development encryption health and synthetic report path were verified after activating a new additive key version.

### Symptoms

The active key configuration is valid and new submissions decrypt successfully, but global key health reports incomplete historical coverage. Eleven records reference `DEV_20260807_01` and nine reference `development-v1`; neither key value is configured.

### Root cause

The database migration preserved ciphertext and key identifiers, but the corresponding secrets were not transferred with the imported data. Read-only searches of ignored local files, server environment/history backups, S3 daily/golden environment backups, and available deployment records found no matching secret.

### Correct solution

Preserve all 20 records as `OLD_KEY_UNAVAILABLE`, activate a separate new key for future development submissions, and recover a legacy key only from a verified custody source. Never assign substitute key material, change identifiers, re-encrypt, or delete these records as an error workaround.

### Prevention

Require every environment to maintain a versioned key custody manifest, independent recovery reference, encrypted recovery canary, and database-plus-key restore drill before ciphertext is migrated or a key is retired.

### Related files

- `docs/SECURITY_MODEL.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DEPLOYMENT.md`

### Related tests

- `npm run smoke:self-hosted:edge`
- `npm run smoke:self-hosted:submission`

## ERR-20260817-081 - Self-hosted migration CLI emitted tunnel TLS and catalog-helper errors

### Context

The approved 29-row baseline and one reconciliation migration were applied to AWS PostgreSQL through a loopback SSH tunnel.

### Symptoms

The CLI first attempted SSL against the non-TLS tunnel endpoint. After the migration transaction succeeded, its optional pg-delta catalog helper also reported a localhost certificate/cache connection warning.

### Root cause

The trusted SSH tunnel already supplies transport protection, while the CLI inferred a direct TLS database endpoint. The optional post-operation catalog path did not share the corrected tunnel TLS mode. PostgreSQL did not report a migration failure.

### Correct solution

Set `PGSSLMODE=disable` only for the loopback tunnel command, verify migration history directly in `supabase_migrations.schema_migrations`, rerun exact schema/ACL assertions, and require a clean migration dry-run. All checks passed with 30 exact timestamps.

### Prevention

Use an environment-specific wrapper for self-hosted tunnel connections and never infer success or failure solely from the optional catalog helper. Preserve direct SQL history and runtime authorization evidence for every apply.

### Related files

- `supabase/migrations/20260817174207_reconcile_self_hosted_security_acl.sql`
- `docs/SELF_HOSTED_SECURITY_RECONCILIATION.md`

### Related tests

- `npm run security:self-hosted:acceptance`
- `tests/self-hosted-security-reconciliation.test.mjs`

## ERR-20260816-080 - Linked migration cache warning recurred after successful apply

### Context

The platform tenant-administration migration was pushed to the linked synthetic development project after a clean dry-run.

### Symptoms

The migration command reported successful application, then the optional pg-delta catalog cache could not read its generated target CA certificate.

### Root cause

The local CLI's post-apply catalog cache environment did not contain the temporary certificate path. PostgreSQL did not report a migration failure.

### Correct solution

Verify the exact local/remote migration pair with linked migration history, run linked schema lint, and deploy the dependent Edge Function only after both checks pass. All three validations succeeded.

### Prevention

Upgrade and retest the Supabase CLI before production rollout. Until then, treat this post-apply warning as unresolved tooling behavior and always require migration-history plus schema-lint evidence.

### Related files

- `supabase/migrations/20260816170000_platform_tenant_administration.sql`

### Related tests

- `npx supabase migration list --linked`
- `npm run supabase:lint:linked`

## ERR-20260816-079 - Browser lifecycle retained single-tenant assumptions after customer creation

### Context

The critical lifecycle was extended to create a second organization through the platform customer-onboarding UI before exercising organization-scoped administration.

### Symptoms

The first run renamed the newly created customer instead of the original fixture and strict cleanup refused the unexpected name. A later run also found an ambiguous organization label and no expected manager option because invitation administration defaulted to the newest customer.

### Root cause

The existing test relied on first-option defaults and a partial label that were valid only while one organization existed. The product correctly returned both authorized tenants to the platform operator.

### Correct solution

Select the intended organization id explicitly in hierarchy and invitation workflows, use an exact combobox role selector, recognize the separate `yanki-e2e-customer-<run-id>` fixture convention, and retain strict name/email checks before cleanup. Restore and remove the one interrupted synthetic fixture by exact id.

### Prevention

Every platform-operator E2E action that mutates tenant-scoped configuration must select its organization explicitly. Cleanup may support additional synthetic tenant kinds only through exact run-correlated names, slugs, and email patterns.

### Related files

- `tests/e2e/critical-lifecycle.e2e.ts`
- `scripts/lib/local-e2e-cleanup.mjs`
- `tests/local-e2e-cleanup.test.mjs`

### Related tests

- `npm run e2e:local`
- `npx vitest run tests/local-e2e-cleanup.test.mjs`

## ERR-20260816-078 - Report search removal left an unused reset helper

### Context

The redundant person-search field and its related state were removed from the reporting panel.

### Symptoms

ESLint rejected the panel because the old `resetReportSelection` helper was no longer referenced.

### Root cause

The helper previously served the search-change handler; all remaining report-selection handlers already perform their own explicit state reset.

### Correct solution

Remove the obsolete helper and retain the existing explicit reset behavior in person and cycle selection handlers.

### Prevention

Run lint immediately after deleting a UI interaction and its state so now-unreachable helpers are found before the full quality gate.

### Related files

- `src/features/reporting/EvaluationReportsPanel.tsx`

### Related tests

- `npm run lint`
- `npm run check`

## ERR-20260816-077 - Supabase CLI telemetry write was blocked by the workspace sandbox

### Context

Local and linked Supabase validation commands were run from the restricted workspace environment.

### Symptoms

The CLI stopped while trying to create telemetry state under the user profile, outside the writable repository roots.

### Root cause

The command required a non-product write to the Supabase CLI telemetry directory; the database, migration, and application paths were not failing.

### Correct solution

Repeat the unchanged reviewed Supabase CLI command with the existing scoped execution approval. Local lint, pgTAP, linked migration push, migration history, and function deployment then completed normally.

### Prevention

Treat user-profile telemetry writes as a tooling boundary and keep escalation scoped to exact Supabase commands. Do not broaden repository or credential permissions.

### Related files

- `supabase/config.toml`

### Related tests

- `npm run supabase:lint:local`
- `npm run supabase:test:local`
- `npx supabase db push --linked --include-all --yes`

## ERR-20260816-076 - Linked migration push reported a pg-delta cache certificate warning

### Context

The organization-name migration was applied to the linked synthetic development project.

### Symptoms

After applying the migration successfully, the CLI warned that a pg-delta catalog cache certificate file was unavailable.

### Root cause

The optional local pg-delta catalog cache could not read its generated target certificate. The migration command exited successfully and did not report a PostgreSQL migration failure.

### Correct solution

Confirm the exact migration in linked migration history. Both local and remote histories contain `20260816130000`, and the dependent Edge Function deployed successfully.

### Prevention

Always verify linked migration history after a successful push that emits a post-apply cache warning, and update the Supabase CLI before production rollout if the warning persists.

### Related files

- `supabase/migrations/20260816130000_organization_name_administration.sql`

### Related tests

- `npx supabase migration list --linked`

## ERR-20260816-075 - E2E cleanup rejected an intentionally renamed synthetic tenant

### Context

The critical lifecycle changed its synthetic organization name to test the new administration workflow.

### Symptoms

The product workflow passed, but strict cleanup refused to remove the fixture because its name no longer exactly matched the recognized `Yanki E2E <run-id>` format.

### Root cause

The cleanup fail-safe correctly protects any organization whose identity changes from the exact synthetic fixture convention.

### Correct solution

Restore the exact original synthetic name through the tested UI before cleanup. Restore the one pre-fix local fixture by exact id/name and rerun the lifecycle; cleanup then removed all synthetic tenant and user data.

### Prevention

Tests that exercise mutable fixture identity must restore the exact synthetic convention before invoking destructive cleanup. Keep the cleanup predicate strict.

### Related files

- `tests/e2e/critical-lifecycle.e2e.ts`

### Related tests

- `npm run e2e:local`

## ERR-20260816-074 - First focused npx test wrapper did not return a final result

### Context

The newly added staging-infrastructure and existing deployment-foundation Vitest suites were first launched through the `npx vitest` wrapper on Windows.

### Symptoms

The command printed the Vitest start banner but reached the 30-second execution window without test results or a reusable session id. No Node process remained afterward.

### Root cause

No deterministic test or product failure was reproduced. The evidence is limited to wrapper/process startup behavior in this execution environment; the unchanged suites completed normally through the repository-local Vitest entry point.

### Correct solution

Invoke the already installed local entry point directly with one worker for the focused diagnostic, then run the ordinary complete project test command as the authoritative result.

### Prevention

Use direct repository-local Node entry points for narrow diagnostics when an `npx` wrapper fails before producing a test result. Do not weaken tests or extend assertions for a wrapper-only event.

### Related files

- `tests/staging-infrastructure.test.mjs`
- `tests/deployment-foundation.test.mjs`

### Related tests

- `node node_modules/vitest/vitest.mjs run tests/staging-infrastructure.test.mjs tests/deployment-foundation.test.mjs --maxWorkers=1 --reporter=verbose`
- `npm test`

## ERR-YYYYMMDD-XXX - Short error title

### Context

### Symptoms

### Root cause

### Incorrect approach

### Correct solution

### Prevention

### Related files

### Related tests
```

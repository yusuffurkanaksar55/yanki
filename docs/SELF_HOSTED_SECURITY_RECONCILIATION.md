# Self-Hosted Security ACL Reconciliation

## Status

Designed, applied, and accepted against the AWS self-hosted development
environment on 2026-08-17. Backup `20260817T151150Z` completed before any
migration-history or schema operation. The 29 historical repository timestamps
were baselined without replaying their SQL, then
`20260817174207_reconcile_self_hosted_security_acl.sql` was applied as the real
30th migration.

No application row was inserted, updated, deleted, re-encrypted, or reset by
the reconciliation. The migration changed only the reviewed invitation
function definition, existing/future ACLs, and its own migration-history row.
No Supabase Cloud endpoint was used and no Edge Function source deployment was
required.

## Pre-Apply Read-Only AWS Evidence

- Connection identity: database `postgres`, user `postgres`.
- All 24 application tables are owned by `postgres`.
- `PUBLIC` has no privilege on any application table.
- `anon`, `authenticated`, and `service_role` had all seven table
  privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`,
  and `TRIGGER`) on all 24 application tables.
- The public schema contains 58 functions. Forty are `SECURITY DEFINER`.
- All application `SECURITY DEFINER` functions already denied `PUBLIC`, but all
  were executable by `anon`, `authenticated`, and `service_role`.
- Every `SECURITY DEFINER` function has an explicit `search_path` in
  `pg_proc.proconfig`. The observed values are `public, pg_temp`, `public`, an
  empty search path, or `pg_catalog` for the platform-specific event-trigger
  function.
- `PUBLIC`, `anon`, `authenticated`, and `service_role` cannot create objects in
  the public schema. The fixed search paths therefore do not expose a proven
  untrusted-schema shadowing path. No search-path change is proposed.

## Migration Creator And Default Privileges

The verified self-hosted MCP connection has `current_user = session_user =
postgres`, with no active `SET ROLE`. All 24 public application tables and all
58 public functions are owned by `postgres`; `supabase_admin` owns no current
public object. The reviewed baseline/apply procedure must therefore run as
`postgres`. Changing the application migration role requires a new default-ACL
preflight before any further apply.

The pre-apply `pg_default_acl` contained schema-specific broad defaults for both
`postgres` and `supabase_admin` in `public`:

- New functions grant `EXECUTE` to `anon`, `authenticated`, `service_role`, and
  the creator. `PUBLIC` is absent from the current custom default, so the
  PostgreSQL built-in public-function grant is already overridden.
- New tables grant `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`,
  `REFERENCES`, `TRIGGER`, and PostgreSQL 17 `MAINTAIN` to all three API roles and
  the creator.
- New sequences grant `SELECT`, `UPDATE`, and `USAGE` to all three API roles and
  the creator.

This was a proven recurrence path for the imported ACL drift. The reconciliation
migration changed defaults only for `FOR ROLE postgres IN SCHEMA public`:

- Revoke all future table privileges from `PUBLIC`, `anon`, `authenticated`, and
  `service_role`.
- Revoke all future sequence privileges from the same principals.
- Revoke future function execution from the same principals.

The owner retains its inherent owner authority. New application migrations must
grant each required API capability explicitly. Defaults for `supabase_admin`,
`supabase_auth_admin`, `supabase_storage_admin`, platform schemas, and existing
platform objects are unchanged. This scope prevents a global Supabase-platform
change while closing recurrence for the verified application creator.

## Target Table ACL

The migration first revokes all table privileges from all four API principals,
then grants only the following capabilities:

| Principal | Tables | Privileges |
| --- | --- | --- |
| `PUBLIC` | None | None |
| `anon` | None | None |
| `authenticated` | `user_profiles` | `SELECT`, constrained by own-profile RLS |
| `service_role` | `app_roles`, `audit_events`, `evaluation_assignments`, `evaluation_cycles`, `evaluation_template_questions`, `evaluation_template_versions`, `evaluation_templates`, `manager_assignments`, `organization_unit_memberships`, `organization_units`, `organizations`, `project_memberships`, `projects`, `scope_types`, `user_invitations`, `user_profiles`, `user_role_assignments` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

The following tables intentionally retain no direct API-role access:

- `anonymous_submission_credentials`
- `encrypted_evaluation_submissions`
- `evaluation_encryption_recovery_canaries`
- `organization_evaluation_retention_policies`
- `security_abuse_event_counters`
- `security_rate_limit_buckets`
- `tenant_bootstrap_operations`

Repository call-chain inspection found no Edge Function direct-table access to
those seven tables. Their trusted operations use narrow RPCs. Edge Functions do
directly use the 17 service-role CRUD tables listed above, so those grants are
preserved. Frontend code directly selects only `user_profiles` and uses an anon
key; no frontend source uses a service-role credential.

## Public Table Caller Matrix

`Service direct` includes Edge Functions and trusted operator/fixture scripts
using a service-role client. Embedded PostgREST relationship reads are marked
explicitly. `SQL internal` means access occurs inside an owner-controlled RPC or
trigger and does not require a caller table grant.

| Table | Frontend anon | Frontend authenticated | Service direct | SQL internal | Current direct caller conclusion |
| --- | --- | --- | --- | --- | --- |
| `anonymous_submission_credentials` | No | No | No | Credential issue/context/redemption/rate-limit RPCs | RPC only |
| `app_roles` | No | No | No | No runtime read; FK/reference configuration | None currently; reviewed config grant retained |
| `audit_events` | No | No | Edge insert | Administration/onboarding RPC inserts | Trusted service |
| `encrypted_evaluation_submissions` | No | No | No | Redemption, reporting, retention, key inventory | RPC only |
| `evaluation_assignments` | No | No | Project-cycle Edge Function | Assignment/credential/reporting RPCs and triggers | Trusted service plus RPC |
| `evaluation_cycles` | No | No | Project-cycle Edge Function and fixture | Assignment/submission/reporting RPCs | Trusted service plus RPC |
| `evaluation_encryption_recovery_canaries` | No | No | No | Canary upsert RPC | RPC only |
| `evaluation_template_questions` | No | No | Embedded template relationship read | Template/submission/reporting RPCs and triggers | Trusted service plus RPC |
| `evaluation_template_versions` | No | No | Project-cycle/template Edge Functions | Template/submission/reporting RPCs | Trusted service plus RPC |
| `evaluation_templates` | No | No | Project-cycle/template Edge Functions | Template RPCs and triggers | Trusted service plus RPC |
| `manager_assignments` | No | No | Organization Edge Function and fixture | Workspace/invitation/reporting RPCs and triggers | Trusted service plus RPC |
| `organization_evaluation_retention_policies` | No | No | No | Retention list/update/execution RPCs | RPC only |
| `organization_unit_memberships` | No | No | Project/organization/onboarding Edge Functions and fixture | Workspace/invitation/tenant/reporting RPCs | Trusted service plus RPC |
| `organization_units` | No | No | Organization/onboarding Edge Functions and fixture | Workspace/invitation/admin/reporting RPCs | Trusted service plus RPC |
| `organizations` | No | No | Organization/onboarding Edge Functions and fixture | Workspace/bootstrap/admin/reporting/retention RPCs | Trusted service plus RPC |
| `project_memberships` | No | No | Project-cycle Edge Function and fixture | Tenant/reporting RPCs and triggers | Trusted service plus RPC |
| `projects` | No | No | Project-cycle Edge Function and fixture | Project-date/submission/reporting RPCs and triggers | Trusted service plus RPC |
| `scope_types` | No | No | No | No runtime read; FK/reference configuration | None currently; reviewed config grant retained |
| `security_abuse_event_counters` | No | No | No | Abuse aggregate helpers | RPC only |
| `security_rate_limit_buckets` | No | No | No | Atomic rate-limit helpers | RPC only |
| `tenant_bootstrap_operations` | No | No | No | Bootstrap status/create/renew RPCs | RPC only |
| `user_invitations` | No | No | Onboarding Edge Function | Acceptance/bootstrap/renewal RPCs and trigger | Trusted service plus RPC |
| `user_profiles` | No | Own-profile RLS SELECT | All authenticated Edge Functions and fixture | Authorization/workspace/submission/reporting RPCs | Authenticated own row plus trusted service/RPC |
| `user_role_assignments` | No | No | Administration Edge Functions and fixture | Authorization/workspace/reporting/bootstrap RPCs | Trusted service plus RPC |

The seven sensitive tables therefore have no literal `.from('<table>')` caller
in frontend, Edge Function, or trusted runtime scripts. Operator scripts reach
recovery canaries, retention, abuse summaries, and bootstrap state through
service-role-only `/rest/v1/rpc/...` endpoints.

## Security Definer Risk Matrix

The current exposure column is the same for every application function below:
`anon`, `authenticated`, and `service_role` can execute it. `PUBLIC` cannot.
The migration removes that drift and establishes the expected caller exactly.

| Function | Expected caller | In-function authority or constraint | Reconciliation |
| --- | --- | --- | --- |
| `accept_user_invitation(uuid,uuid)` | `service_role` | Locked invitation, exact Auth user and email, terminal state, expiry, active tenant/unit/manager | Service only; persist hardened AWS body |
| `admin_assign_user_role(uuid,uuid,uuid,text,uuid)` | `service_role` | Actor and tenant system-admin scope, active membership, role/scope rules | Service only |
| `admin_clone_evaluation_template_version(uuid,uuid)` | `service_role` | Actor scope and immutable published source | Service only |
| `admin_end_user_role(uuid,uuid,uuid)` | `service_role` | Actor scope and final-admin protection | Service only |
| `admin_publish_evaluation_template_version(uuid,uuid)` | `service_role` | Actor scope and publish validation | Service only |
| `admin_save_evaluation_template_draft(uuid,uuid,uuid,uuid,text,text,jsonb)` | `service_role` | Actor scope, tenant match, draft validation | Service only |
| `admin_set_user_hierarchy_context(uuid,uuid,uuid,uuid,text,uuid)` | `service_role` | Actor scope, membership and manager integrity | Service only |
| `admin_update_evaluation_retention_policy(uuid,uuid,integer,boolean,boolean)` | `service_role` | Actor scope and tenant policy validation | Service only |
| `admin_update_organization_name(uuid,uuid,text)` | `service_role` | Actor scope and active tenant | Service only |
| `admin_update_project_dates(uuid,uuid,uuid,date,timestamptz)` | `service_role` | System-admin or exact assigned project-manager authorization | Service only |
| `admin_upsert_organization_unit(uuid,uuid,uuid,text,text,text,uuid,text)` | `service_role` | Actor scope and hierarchy integrity | Service only |
| `bootstrap_organization_tenant(uuid,text,uuid,text,text,text,text,text,text,integer)` | `service_role` | Request fingerprint, marked Auth identity, idempotent state | Service only |
| `can_review_evaluation_subject(uuid,uuid,uuid,uuid,uuid)` | Owner/internal | Tenant/reviewer scope, administrator denial, self denial | No API execute |
| `consume_anonymous_submission_request(text)` | `service_role` | Credential-digest-isolated rate-limit decision | Service only |
| `consume_security_rate_limit(text,bytea,integer,interval,timestamptz)` | Owner/internal | Internal atomic rate-limit primitive | No API execute |
| `create_default_evaluation_retention_policy()` | Trigger only | Trigger default creation | No API execute |
| `execute_due_evaluation_content_retention()` | `service_role` | Operator-only destructive boundary; legal hold and schedule checks | Service only |
| `get_anonymous_submission_abuse_summary(uuid)` | `service_role` | Exact active platform system-admin authorization | Service only |
| `get_anonymous_submission_abuse_summary_for_operator()` | `service_role` | Rechecks `auth.role() = service_role`; aggregate-only output | Service only |
| `get_anonymous_submission_context(text)` | `service_role` | Valid pending credential digest; identity-free context | Service only |
| `get_encrypted_evaluation_report_batch(uuid,uuid,uuid)` | `service_role` | Actor, tenant/reviewer scope, administrator denial, self denial | Service only |
| `get_my_evaluation_assignments()` | `authenticated` | Caller derived from `auth.uid()`, active profile and tenant membership | Authenticated only |
| `get_my_workspace_context()` | `authenticated` | Caller derived from `auth.uid()`, own non-sensitive context only | Authenticated only |
| `get_tenant_bootstrap_operation(uuid,text)` | `service_role` | Exact request id and fingerprint | Service only |
| `get_thresholded_evaluation_report_batch_without_close_metadata(uuid,uuid,uuid)` | Owner/internal | Legacy owner-only report implementation | No API execute |
| `issue_anonymous_submission_credential(uuid,uuid,text)` | `service_role` | Actor owns eligible pending assignment; tenant and cycle revalidation | Service only |
| `list_manageable_evaluation_retention_policies(uuid)` | `service_role` | Actor system-admin scope | Service only |
| `list_my_evaluation_report_targets(uuid)` | `service_role` | Actor role, tenant scope, administrator and self denial | Service only |
| `list_platform_organization_tenants(uuid)` | `service_role` | Exact active platform system-admin authorization | Service only |
| `list_referenced_evaluation_encryption_key_versions()` | `service_role` | Returns distinct key identifiers only, no content or identity | Service only |
| `platform_bootstrap_organization_tenant(uuid,uuid,text,uuid,text,text,text,text,text,text,integer)` | `service_role` | Exact platform actor plus underlying bootstrap controls | Service only |
| `platform_renew_tenant_bootstrap_invitation(uuid,uuid,integer)` | `service_role` | Exact platform actor and incomplete invitation state | Service only |
| `read_anonymous_submission_abuse_summary()` | Owner/internal | Identifier-free aggregate builder | No API execute |
| `record_security_abuse_event(text,timestamptz)` | Owner/internal | Internal aggregate mutation primitive | No API execute |
| `redeem_anonymous_submission_credential(text,text,text,text,integer,integer)` | `service_role` | One-time credential, encrypted-only payload, atomic completion | Service only |
| `renew_tenant_bootstrap_invitation(uuid,text,integer)` | `service_role` | Exact request fingerprint and incomplete invitation state | Service only |
| `require_active_platform_system_admin(uuid)` | `service_role` | Exact active platform system-admin assignment | Service only |
| `require_active_system_admin(uuid,uuid)` | `service_role` | Active platform or matching-tenant system-admin assignment | Service only |
| `rls_auto_enable()` | Platform/internal | Orphaned event-trigger body, `search_path=pg_catalog` | No API execute; body unchanged |
| `upsert_evaluation_encryption_recovery_canaries(text,jsonb)` | `service_role` | Synthetic encrypted canary validation only | Service only |

`require_active_organization_identity(uuid,uuid)` is `SECURITY INVOKER`, not
part of the 40-row matrix. It is nevertheless a callable internal integrity
helper. Its historical migration explicitly makes it service-role-only, so the
reconciliation includes it in the same exact ACL reset.

## Anonymous And Public Flow Preservation

The anonymous submission endpoint is public at the Edge Function layer. It
creates a server-side service-role client and calls
`consume_anonymous_submission_request`, `get_anonymous_submission_context`, and
`redeem_anonymous_submission_credential`. Direct `anon` or `authenticated`
database execution is neither used nor intended. All three service-role grants
are preserved.

The complete submission chain is:

1. An authenticated browser calls `get_my_evaluation_assignments()` directly.
2. It invokes `evaluation-submission-credentials` with its JWT and assignment id.
3. The Edge Function verifies the JWT and active profile, creates a one-time raw
   credential in memory, and calls `issue_anonymous_submission_credential()` as
   `service_role`; PostgreSQL stores only the credential digest.
4. The browser sends the raw credential and answers to the public
   `anonymous-evaluation-submissions` endpoint without an authorization header.
5. That Edge Function hashes the credential, calls
   `consume_anonymous_submission_request()` and
   `get_anonymous_submission_context()` as `service_role`, validates answers,
   and encrypts the payload in trusted code.
6. It calls `redeem_anonymous_submission_credential()` as `service_role`, which
   atomically stores ciphertext and completes the identity-domain assignment.

The anonymous browser never calls PostgREST tables or RPCs directly. Therefore
`anon` table grants can remain empty without breaking submission.

Authenticated browser RPC access remains limited to
`get_my_workspace_context()` and `get_my_evaluation_assignments()`. Both derive
the identity from `auth.uid()` instead of accepting an actor id.

## Service-Role RPC Caller Map

All 32 service-role functions are absent from frontend `.rpc(...)`, `/rpc/`, and
direct REST calls. Their callers are:

- Edge Function service clients (23): `accept_user_invitation`,
  `admin_assign_user_role`, `admin_clone_evaluation_template_version`,
  `admin_end_user_role`, `admin_publish_evaluation_template_version`,
  `admin_save_evaluation_template_draft`,
  `admin_set_user_hierarchy_context`,
  `admin_update_evaluation_retention_policy`,
  `admin_update_organization_name`, `admin_update_project_dates`,
  `admin_upsert_organization_unit`, `consume_anonymous_submission_request`,
  `get_anonymous_submission_abuse_summary`,
  `get_anonymous_submission_context`,
  `get_encrypted_evaluation_report_batch`,
  `issue_anonymous_submission_credential`,
  `list_manageable_evaluation_retention_policies`,
  `list_my_evaluation_report_targets`, `list_platform_organization_tenants`,
  `list_referenced_evaluation_encryption_key_versions`,
  `platform_bootstrap_organization_tenant`,
  `platform_renew_tenant_bootstrap_invitation`, and
  `redeem_anonymous_submission_credential`.
- Trusted operator scripts (6): `bootstrap_organization_tenant`,
  `execute_due_evaluation_content_retention`,
  `get_anonymous_submission_abuse_summary_for_operator`,
  `get_tenant_bootstrap_operation`, `renew_tenant_bootstrap_invitation`, and
  `upsert_evaluation_encryption_recovery_canaries`.
- SQL-internal integrity/authorization helpers (3):
  `require_active_organization_identity`,
  `require_active_platform_system_admin`, and `require_active_system_admin`.

The only direct authenticated browser RPCs remain
`get_my_evaluation_assignments()` and `get_my_workspace_context()`. The former
has exactly the `authenticated` execute grant in the accepted ACL and its
source still calls it through the browser Supabase client.

## PUBLIC Execute Result

All 40 `SECURITY DEFINER` functions plus the trusted invoker helper targeted by
the migration are explicitly revoked from `PUBLIC`. The two authenticated RPCs
and reviewed service-role RPCs are then granted narrowly. Trigger-only
`SECURITY INVOKER` functions retain their existing execution ACL because they
cannot be invoked as ordinary RPCs. The orphaned `rls_auto_enable()` body stays
unchanged, but its API execution is removed after the post-apply security
advisor proved that it was anonymously exposed.

## Invitation Function Diff

The AWS and historical repository definitions are otherwise deterministic
matches. AWS adds two checks immediately after the required invitation context
check and before the first identity-domain write:

1. The invitation organization and unit must both still be active and belong to
   the same tenant, otherwise `INVITATION_CONTEXT_INACTIVE` is raised.
2. An optional manager must still have an active organization membership and an
   active profile, otherwise `INVITATION_MANAGER_INACTIVE` is raised.

The later `user_invitations_validate_acceptance_context` trigger independently
repeats these checks when `accepted_at` changes. Keeping the checks inside the
function is intentional defense in depth: invalid context is rejected before
profile, role, membership, or manager writes, while the trigger protects any
future trusted acceptance path. The reconciliation migration stores this AWS
behavior as the forward source of truth without editing historical migrations.

## `rls_auto_enable()` Assessment

- Owner: `postgres`.
- Language/security: PL/pgSQL, `SECURITY DEFINER`.
- Return type: `event_trigger`.
- Search path: `pg_catalog`.
- Behavior: enables RLS after table-creation DDL for the public schema.
- Extension dependency: none recorded.
- Event-trigger relationship: no current `pg_event_trigger` row references it.
- Ordinary trigger relationship: none.
- Repository origin: absent from all 29 application migrations.

It is therefore environment/platform-specific and currently orphaned rather
than an application schema object. The application migration does not copy,
replace, grant, or drop it, and it does not change platform default privileges.
It only revokes `EXECUTE` from `PUBLIC`, `anon`, `authenticated`, and
`service_role` so the exposed public schema cannot turn it into an API RPC. A
later platform maintenance review may decide whether the orphan should remain.

## Applied Baseline

The following existing timestamps were marked as applied without replaying SQL:

1. `20260719132911`
2. `20260719171413`
3. `20260719174459`
4. `20260719181013`
5. `20260719184052`
6. `20260720223000`
7. `20260720232000`
8. `20260720234500`
9. `20260722210000`
10. `20260722223000`
11. `20260722234500`
12. `20260806221500`
13. `20260806233000`
14. `20260806234500`
15. `20260807001500`
16. `20260807013000`
17. `20260807103000`
18. `20260807111500`
19. `20260807143000`
20. `20260807170000`
21. `20260808120000`
22. `20260809120000`
23. `20260809153000`
24. `20260809190000`
25. `20260809210000`
26. `20260809223000`
27. `20260812120000`
28. `20260816130000`
29. `20260816170000`

`20260817174207` was not baselined. It was applied as real SQL only after the
29-row history was independently verified and the user explicitly approved the
apply phase.

## Post-Apply Acceptance

- Direct SQL history verification returned the exact 30 repository timestamps;
  the final migration dry-run reported the remote database up to date.
- All 24 application tables deny every direct privilege to `PUBLIC` and `anon`.
  `authenticated` has only `SELECT` on `user_profiles`, while `service_role`
  has reviewed CRUD on 17 identity/configuration tables and no direct access to
  seven sensitive content/credential/retention/abuse/recovery tables.
- All 40 application `SECURITY DEFINER` functions deny `PUBLIC` and `anon`.
  Authenticated execution is limited to `get_my_evaluation_assignments()` and
  `get_my_workspace_context()`; trusted service and internal functions retain
  only their reviewed boundaries. The orphaned `rls_auto_enable()` API execute
  grant was removed without altering or dropping its body.
- PostgreSQL default ACLs for the verified `postgres.public` migration creator
  no longer grant future tables, sequences, or functions to API roles. Supabase
  platform-role defaults were not changed.
- Security advisor rerun reports only the two intended authenticated RPCs as
  executable; RLS-without-policy notices correspond to intentional default-deny
  tables.
- Live HTTP acceptance passed anonymous denial on all 24 tables,
  authenticated denial on 23 tables, own-profile RLS success, both own-context
  RPC successes, seven sensitive-table denials, service-only RPC denial, and
  real email/password login.
- The 12 required Edge Functions and five shared modules matched repository
  source hashes. The unreviewed sample `hello` Function was removed; the
  required `main` Function remained. Trusted administration and diagnostic
  smoke tests passed through the AWS gateway.
- A synthetic authenticated credential-to-anonymous-submission flow persisted
  AES-256-GCM ciphertext under `AWS_DEV_20260817_01`, rejected replay, returned
  an authorized decrypted aggregate, and removed every test-created fixture.

## Recovery Approach

- Take and verify a database backup/snapshot before baseline or apply.
- Export the pre-apply ACL and function definitions as read-only evidence.
- Keep baseline repair and migration apply as separate reviewed commands.
- The migration contains only `CREATE OR REPLACE FUNCTION`, ACL statements, and
  a function comment. A failed transactional apply should roll back atomically.
- If apply succeeds but an authorization regression appears, stop traffic to the
  affected boundary and create a reviewed forward recovery migration from the
  captured ACL evidence. Do not edit history, replay the 29 migrations, or use a
  data-destructive rollback.
- Restore the hardened invitation body and exact ACL through a forward migration
  after fixing the regression. Use full database restore only for a wider
  integrity failure, not as the normal ACL rollback mechanism.

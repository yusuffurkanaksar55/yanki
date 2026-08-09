# Known Issues

## ISSUE-001 - Production security operations are incomplete

### Severity

High

### Description

One-time anonymous submission, additive key rotation, content-free key health, provider-neutral custody validation, encrypted synthetic recovery canaries, pinned encrypted off-site backup scheduling/integrity/retention, exact-snapshot database-plus-key restore automation, application-level anonymous quotas, same-origin gateway limits with direct-bypass token enforcement, transition-based content-free alert delivery, aggregate abuse monitoring, trusted immediate aggregate reporting, tenant retention with legal hold, and production tenant bootstrap are implemented. Real production custody/off-site provider configuration, production gateway-token activation/direct-denial, signed production-like recovery acceptance, real alert-receiver/capacity acceptance, and infrastructure availability monitoring are not complete yet.

### Impact

Synthetic encrypted submissions and authorized aggregate results are supported, but the product must not accept live employee content until production key and operational security gates pass.

### Workaround

Continue development and synthetic acceptance testing only. Do not use the linked development encryption key for live employee data and do not query ciphertext manually as a reporting workaround.

### Planned resolution

Configure independent production key, Restic credentials, gateway token, and alert webhook credentials in approved custody; activate required token enforcement in Nginx/Functions; point the implemented timers at real providers; tune gateway limits with production evidence; complete signed direct-denial, isolated recovery, receiver/availability, and approved invitation-mail verification.

### Related tests

`tests/encryptionKeyring.test.ts`, `tests/encryption-key-custody.test.ts`, `tests/encryption-recovery-acceptance.test.mjs`, `tests/offsite-backup.test.ts`, `tests/gateway-security-alert-boundary.test.mjs`, `tests/security-alerting.test.ts`, `supabase/tests/database/anonymous_encrypted_submission.test.sql`, `npm run security:alerts:acceptance`, `npm run backup:offsite:restore:acceptance`, `npm run smoke:key-health`, `npm run smoke:abuse`, `npm run smoke:reports`

## ISSUE-005 - Remaining delegated administration actions are not implemented

### Severity

Resolved

### Description

The product requires multiple administrators, CEOs/C-Level users, project managers, and team leaders, plus management flows for project completion dates and evaluation close dates. The application now has a protected administration shell, default-deny project/evaluation-cycle/assignment tables, trusted project administration, and atomic delegated date updates.

### Impact

Resolved for the delegated date requirement. System administrators and exact assigned project managers can update project completion and evaluation close dates. Employee assignment, anonymous submission, and immediate aggregate report flows are also implemented; production operations remain tracked by ISSUE-001.

### Workaround

None for delegated date management. Continue to avoid manual browser access to evaluation response data because the sensitive submission runtime is not implemented.

### Planned resolution

Completed on 2026-07-22 through service-role-only `admin_update_project_dates()`, `admin-project-cycles`, a role-aware Turkish UI, and authenticated live verification.

### Related tests

`tests/admin-project-cycle-function.test.mjs`, `src/features/administration/ProjectCycleManagementPanel.test.tsx`, `npm run smoke:project-dates`

## ISSUE-006 - Invitation email delivery and acceptance need an approved mailbox smoke test

### Severity

Medium

### Description

The `user-onboarding` Edge Function, invitation administration UI, invitation revocation, and atomic acceptance database function are deployed. A Docker-backed Playwright workflow now verifies real local Supabase Auth invitation delivery through Mailpit, callback routing, password setup, atomic acceptance, role/unit/manager activation, and subsequent evaluation access. Production SMTP delivery to an approved mailbox is still unverified.

### Impact

The application flow is verified end to end locally, but provider authentication, deliverability, spam handling, production redirect URLs, and approved-mailbox receipt are not yet verified.

### Workaround

Use `npm run e2e:local` for repeatable application-flow verification. Do not claim production invitation delivery until an approved test mailbox receives and accepts an invitation through the production SMTP configuration.

### Planned resolution

Configure the approved Supabase Auth email provider and redirect settings, then repeat the now-automated flow once with an approved production-like mailbox and retain content-free delivery evidence.

### Related tests

- Authenticated `list_user_administration` live smoke test
- `tests/user-onboarding-function.test.mjs`
- `tests/e2e/critical-lifecycle.e2e.ts`
- `src/features/administration/UserInvitationManagementPanel.test.tsx`
- `src/features/profiles/ProfileGate.test.tsx`

## ISSUE-002 - Git repository is not initialized in the workspace

### Severity

Resolved

### Description

The current workspace did not contain a `.git` directory before this task. Git was initialized on 2026-07-19, remote `origin` was set to `https://github.com/yusuffurkanaksar55/yanki.git`, and `main` was pushed successfully.

### Impact

Resolved. Change tracking is now available through Git.

### Workaround

None.

### Planned resolution

Completed on 2026-07-19.

### Related tests

None.

## ISSUE-003 - GitHub CLI is not installed

### Severity

Medium

### Description

`gh` is not available on PATH and was not found at `C:\Program Files\GitHub CLI\gh.exe`.

### Impact

Draft PR creation and GitHub CLI authentication checks cannot be completed through the standard GitHub publish workflow.

### Workaround

Use normal `git` remote, commit, and push. Install GitHub CLI later if PR automation is needed.

### Planned resolution

Install GitHub CLI and authenticate with `gh auth login`.

### Related tests

None.

## ISSUE-004 - Local Supabase Docker stack is not verified

### Severity

Resolved

### Description

Docker Desktop is running with the Linux engine. The local Supabase stack, clean migration reset, local database lint, pgTAP authorization tests, frontend image build, runtime configuration, and Nginx health endpoint have now been verified.

### Impact

Resolved. Docker-backed database and frontend delivery checks are available for continued development.

### Workaround

Keep Docker Desktop running when executing local Supabase and image tests.

### Planned resolution

Completed on 2026-08-06. The frontend image reported `healthy`, `/healthz` returned `ok`, all migrations applied to a clean local database, local schema lint found no errors, and 8 pgTAP authorization tests passed.

### Related tests

- `npm run supabase:lint:local`
- `npm run supabase:test:local`
- `docker build --tag yanki-frontend:local .`

## ISSUE-007 - Production dedicated-install automation is incomplete

### Severity

Medium

### Description

The repository now contains a portable frontend image, signed digest-pinned GHCR release workflow, no-build customer Compose package, standalone container acceptance, self-host deployment runbook, tenant-integrity migration, encrypted evaluation workflows, production tenant bootstrap, pinned encrypted off-site backup scheduling, environment-scoped restore automation, and a critical production-container browser workflow with required gateway enforcement. The hosted workflow has not yet been exercised with a real version tag, air-gapped/customer-registry transfer is not approved, and real staging/provider/systemd acceptance is not complete.

### Impact

The release and deployment packages can be tested as infrastructure foundations but must not be handed over for live evaluation content until the first hosted release and all environment gates pass.

### Workaround

None for production. Use managed development and synthetic fixture environments only.

### Planned resolution

Provision a production-like staging environment and repeat the authenticated synthetic workflow through real TLS/DNS and isolated Supabase. Then create the first reviewed version tag, verify GHCR/signature/release permissions end to end, run the implemented timers against approved customer providers, complete signed production-like restore drills, and finish the operator acceptance checklist.

### Related tests

- `tests/deployment-foundation.test.mjs`
- `tests/container-release.test.mjs`
- `tests/tenant-isolation.test.mjs`
- `tests/production-tenant-bootstrap.test.mjs`
- `tests/offsite-backup.test.ts`
- `tests/offsite-backup-boundary.test.mjs`
- `tests/e2e/critical-lifecycle.e2e.ts`
- `tests/e2e/public-accessibility.e2e.ts`
- `npm run e2e:container:local`

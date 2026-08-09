# Known Issues

## ISSUE-001 - Production security operations are incomplete

### Severity

High

### Description

One-time anonymous submission, additive key rotation, content-free key health, provider-neutral custody validation, encrypted synthetic recovery canaries, local database-plus-key restore acceptance, application-level anonymous quotas, aggregate abuse monitoring, trusted thresholded reporting, tenant retention with legal hold, and production tenant bootstrap are implemented. Real production secret-manager/offline-escrow configuration, outer gateway/WAF controls and alert delivery, scheduled encrypted off-host backups, and environment-specific restore acceptance are not implemented yet.

### Impact

Synthetic encrypted submissions and authorized aggregate results are supported, but the product must not accept live employee content until production key and operational security gates pass.

### Workaround

Continue development and synthetic acceptance testing only. Do not use the linked development encryption key for live employee data and do not query ciphertext manually as a reporting workaround.

### Planned resolution

Configure an independent production key in approved primary and recovery custody, use the implemented manifest/canary flow in an isolated production recovery drill, and add outer gateway/WAF limits, alert delivery, scheduled encrypted backups, environment-specific restore acceptance, and approved invitation-mail verification.

### Related tests

`tests/encryptionKeyring.test.ts`, `tests/encryption-key-custody.test.ts`, `tests/encryption-recovery-acceptance.test.mjs`, `tests/anonymous-abuse-protection-boundary.test.mjs`, `supabase/tests/database/encryption_recovery_canaries.test.sql`, `src/features/administration/SecurityOperationsPanel.test.tsx`, `npm run encryption:recovery:acceptance`, `npm run smoke:key-health`, `npm run smoke:abuse`, `npm run smoke:reports`

## ISSUE-005 - Remaining delegated administration actions are not implemented

### Severity

Resolved

### Description

The product requires multiple administrators, CEOs/C-Level users, project managers, and team leaders, plus management flows for project completion dates and evaluation close dates. The application now has a protected administration shell, default-deny project/evaluation-cycle/assignment tables, trusted project administration, and atomic delegated date updates.

### Impact

Resolved for the delegated date requirement. System administrators and exact assigned project managers can update project completion and evaluation close dates. Employee assignment, anonymous submission, and thresholded report flows are also implemented; production operations remain tracked by ISSUE-001.

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

The `user-onboarding` Edge Function, invitation administration UI, invitation revocation, and atomic acceptance database function are deployed. Live administration listing and authorization denial checks pass, but a real invitation was not sent to an arbitrary or invalid address during automated verification.

### Impact

Supabase Auth SMTP delivery, invite-link session creation, and the final invited-user acceptance interaction are not yet verified end to end.

### Workaround

Use the current synthetic accounts for existing authenticated workflow testing. Do not claim production invitation delivery until an approved test mailbox receives and accepts an invitation.

### Planned resolution

Confirm Supabase Auth email provider and redirect settings, send one invitation to an approved test mailbox, set the invited account password through the Supabase flow, accept the invitation in the application, and verify profile, role, unit membership, and manager context.

### Related tests

- Authenticated `list_user_administration` live smoke test
- `tests/user-onboarding-function.test.mjs`
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

The repository now contains a portable frontend image, customer Compose example, self-host deployment runbook, tenant-integrity migration, encrypted evaluation workflows, production tenant bootstrap, and a disposable restore drill. Scheduled encrypted off-host backups, environment-specific recovery automation, immutable release publishing, and customer acceptance automation are not implemented.

### Impact

The deployment package can be tested as infrastructure foundation but must not be handed over for live evaluation content.

### Workaround

None for production. Use managed development and synthetic fixture environments only.

### Planned resolution

Add immutable image publishing with checksums, scheduled encrypted off-host backups, environment-specific restore drills, deployment smoke tests, and an operator acceptance checklist.

### Related tests

- `tests/deployment-foundation.test.mjs`
- `tests/tenant-isolation.test.mjs`
- `tests/production-tenant-bootstrap.test.mjs`

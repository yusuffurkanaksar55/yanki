# Known Issues

## ISSUE-001 - Runtime sensitive evaluation flows are not implemented

### Severity

High

### Description

The repository now contains a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, React Testing Library scaffold, typed Supabase Auth client foundation, default-deny Supabase schema foundation, profile/invitation onboarding, trusted existing-user role/hierarchy administration, authenticated own-workspace context RPC, protected administration shell, default-deny project/evaluation-cycle configuration, default-deny evaluation assignment planning, and trusted project administration. Scoped employee assignment access, evaluation authorization policies, anonymous credentials, encrypted submissions, and reporting are not implemented yet.

### Impact

No production sensitive evaluation submission, authorization, encryption, anonymity, or reporting workflow is available yet.

### Workaround

Use the application scaffold only for frontend and trusted-administration foundation work. Do not treat the project as deployable for sensitive evaluation content.

### Planned resolution

Authenticated project/cycle/member/assignment management, delegated date management, invitation administration listing, and existing-user role/hierarchy administration are smoke-tested. Next complete invitation email delivery/acceptance verification when an approved mailbox is available, then employee assignment access, scoped authorization, explicit evaluation RLS policies, versioned templates, anonymous credentials, and encrypted submission flows in separate reviewable phases.

### Related tests

`tests/project-memory.test.mjs`, `src/app/App.test.tsx`, `src/features/workspace/WorkspaceContextGate.test.tsx`

## ISSUE-005 - Remaining delegated administration actions are not implemented

### Severity

Resolved

### Description

The product requires multiple administrators, CEOs/C-Level users, project managers, and team leaders, plus management flows for project completion dates and evaluation close dates. The application now has a protected administration shell, default-deny project/evaluation-cycle/assignment tables, trusted project administration, and atomic delegated date updates.

### Impact

Resolved for the delegated date requirement. System administrators and exact assigned project managers can update project completion and evaluation close dates. Employee-facing assignment workflows remain tracked by ISSUE-001.

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

Medium

### Description

Docker CLI 29.6.1 is installed and available on PATH, but Docker Engine was not running during the 2026-08-06 deployment verification. Reading the user Docker config also emitted a workspace permission warning.

### Impact

Container image build, local `supabase db reset`, local database linting, and local Studio workflows have not been verified yet.

### Workaround

Use static deployment tests and linked remote database checks for now. Start Docker Desktop before local container verification.

### Planned resolution

Start Docker Desktop, build the application image, run its health check, then run `npx supabase start`, `npx supabase db reset`, and `npx supabase db lint --local`.

### Related tests

- `npx supabase db lint --linked`

## ISSUE-007 - Production dedicated-install automation is incomplete

### Severity

High

### Description

The repository now contains a portable frontend image, customer Compose example, self-host deployment runbook, and tenant-integrity migration. Production organization bootstrap, backup/restore automation, immutable release publishing, customer acceptance automation, and encrypted evaluation workflows are not implemented.

### Impact

The deployment package can be tested as infrastructure foundation but must not be handed over for live evaluation content.

### Workaround

None for production. Use managed development and synthetic fixture environments only.

### Planned resolution

Complete the sensitive evaluation runtime first, then add a reviewed first-organization bootstrap boundary, image publishing with checksums, backup/restore drills, deployment smoke tests, and an operator acceptance checklist.

### Related tests

- `tests/deployment-foundation.test.mjs`
- `tests/tenant-isolation.test.mjs`

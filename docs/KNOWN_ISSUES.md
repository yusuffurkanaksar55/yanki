# Known Issues

## ISSUE-001 - Runtime sensitive evaluation flows are not implemented

### Severity

High

### Description

The repository now contains a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, React Testing Library scaffold, typed Supabase Auth client foundation, default-deny Supabase schema foundation, profile/invitation onboarding foundation, organization hierarchy foundation, authenticated own-workspace context RPC, protected administration shell, default-deny project/evaluation-cycle configuration foundation, default-deny evaluation assignment foundation, and admin project/cycle/member/assignment Edge Function foundation. Scoped employee assignment access, evaluation authorization policies, anonymous credentials, encrypted submissions, and reporting are not implemented yet.

### Impact

No production sensitive evaluation submission, authorization, encryption, anonymity, or reporting workflow is available yet.

### Workaround

Use the application scaffold only for frontend and trusted-administration foundation work. Do not treat the project as deployable for sensitive evaluation content.

### Planned resolution

Authenticated admin project/cycle/member/assignment management and user-administration listing are smoke-tested. Next complete invitation email delivery/acceptance verification, remaining production administration write actions, employee assignment access, scoped authorization, explicit evaluation RLS policies, anonymous credentials, and encrypted submission flows in separate reviewable phases.

### Related tests

`tests/project-memory.test.mjs`, `src/app/App.test.tsx`, `src/features/workspace/WorkspaceContextGate.test.tsx`

## ISSUE-005 - Administration write actions are not implemented

### Severity

High

### Description

The product requires multiple administrators, CEOs/C-Level users, project managers, and team leaders, plus management flows for project completion dates and evaluation close dates. The application now has a protected administration shell, default-deny project/evaluation-cycle/assignment tables, an admin project/cycle/member/assignment Edge Function foundation, and authenticated smoke verification, but not all trusted server-side management actions exist yet.

### Impact

Admins and delegated project managers cannot yet persist general existing-user role changes, hierarchy edits, delegated project-manager date updates, broader evaluation-cycle edits, or employee-facing assignment workflows through production application actions. System administrators can create/revoke invitations, add project members, and generate project-backed assignment records through trusted Edge Functions.

### Workaround

Use the current synthetic fixture only for login, workspace-context, administration-shell, project/cycle/member/assignment verification. Do not manage production organization or evaluation response data manually from the browser.

### Planned resolution

Complete invitation delivery/acceptance verification, then build trusted actions and production administration forms for existing-user roles, hierarchy edits, delegated date management, and employee assignment access.

### Related tests

`tests/supabase-foundation.test.mjs`, `src/app/App.test.tsx`

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

Docker Desktop is installed, but `docker` is not available on PATH in the current shell. The default Docker binary path exists, reading Docker config emitted a user-profile permission warning, and Supabase CLI migration catalog caching later received a Docker Desktop API 500 image-inspection response.

### Impact

Local `supabase db reset`, local database linting, and local Studio workflows have not been verified yet.

### Workaround

Use linked remote lint for now. Add Docker to PATH or run Docker-aware commands from a normal terminal.

### Planned resolution

Verify Docker CLI access, then run `npx supabase start`, `npx supabase db reset`, and `npx supabase db lint --local`.

### Related tests

- `npx supabase db lint --linked`

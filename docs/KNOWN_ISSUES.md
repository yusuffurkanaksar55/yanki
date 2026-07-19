# Known Issues

## ISSUE-001 - Runtime sensitive evaluation flows are not implemented

### Severity

High

### Description

The repository now contains a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, React Testing Library scaffold, typed Supabase Auth client foundation, default-deny Supabase schema foundation, profile/invitation onboarding foundation, and organization hierarchy foundation. Scoped evaluation authorization policies, anonymous credentials, encrypted submissions, and reporting are not implemented yet.

### Impact

No production sensitive evaluation submission, authorization, encryption, anonymity, or reporting workflow is available yet.

### Workaround

Use the application scaffold only for frontend foundation work. Do not treat the project as deployable.

### Planned resolution

Run synthetic fixture setup with service-role credentials, then implement invitation creation/redemption Edge Functions, scoped authorization, explicit evaluation RLS policies, anonymous credentials, and encrypted submission flows in separate reviewable phases.

### Related tests

`tests/project-memory.test.mjs`, `src/app/App.test.tsx`

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

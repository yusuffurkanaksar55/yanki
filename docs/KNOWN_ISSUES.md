# Known Issues

## ISSUE-001 - Runtime security flows are not implemented

### Severity

High

### Description

The repository now contains a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library scaffold. Supabase authentication, scoped authorization, RLS policies, anonymous credentials, encrypted submissions, and reporting are not implemented yet.

### Impact

No production authentication, authorization, encryption, anonymity, reporting, or database protection is available yet.

### Workaround

Use the application scaffold only for frontend foundation work. Do not treat the project as deployable.

### Planned resolution

Create the Supabase structure, then implement authentication, scoped authorization, RLS policies, anonymous credentials, and encrypted submission flows in separate reviewable phases.

### Related tests

`tests/project-memory.test.mjs`, `src/app/App.test.tsx`

## ISSUE-002 - Git repository is not initialized in the workspace

### Severity

Medium

### Description

The current workspace did not contain a `.git` directory before this task. This issue should be closed after Git initialization and successful push to `yusuffurkanaksar55/yanki`.

### Impact

Change tracking, diff review, and commit discipline cannot be fully applied inside this workspace until Git is initialized or the project is moved into a managed repository.

### Workaround

Use file-level review and test output until Git is available.

### Planned resolution

Initialize Git or connect the workspace to the intended remote repository before feature implementation.

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

## ISSUE-004 - Local Supabase Docker stack is not running

### Severity

Medium

### Description

Local `supabase db lint` cannot connect because the local Supabase/Postgres stack is not running.

### Impact

Local `supabase db reset`, local database linting, and local Studio workflows cannot be used yet.

### Workaround

Use linked remote lint for now. Start Docker Desktop before local Supabase workflows.

### Planned resolution

Install or start Docker Desktop, then run `npx supabase start`, `npx supabase db reset`, and `npx supabase db lint --local`.

### Related tests

- `npx supabase db lint --linked`

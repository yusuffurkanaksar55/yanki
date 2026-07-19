# Architecture

## Status

Foundation architecture is documented. The frontend application scaffold is implemented with React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library. The Supabase project is linked and has initial default-deny security plus profile/invitation onboarding migrations. A typed Supabase Auth client and own-profile gate are implemented.

## Target System

The target system is a single-page web application with a trusted backend boundary:

- Browser: React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- Auth: Supabase Auth for email/password, invitation onboarding, password reset, and Microsoft Entra ID.
- Database: Supabase PostgreSQL with Row Level Security enabled for all exposed tables.
- Trusted server code: Supabase Edge Functions for sensitive validation, anonymous credential handling, encryption, decryption, aggregation, and reporting.
- Tests: Vitest and React Testing Library for the current frontend scaffold and documentation foundation checks. Playwright and Supabase database tests are planned for later workflow phases.

## Module Boundaries

Planned source layout:

```text
src/
  app/
  components/
  features/
    authentication/
    organization/
    teams/
    projects/
    evaluations/
    lessons-learned/
    reporting/
    administration/
  hooks/
  lib/
  locales/
  services/
  types/
  validation/
supabase/
  functions/
  migrations/
tests/
```

## Sensitive Data Boundary

The browser must never receive encryption keys, service-role credentials, decrypted content outside authorized aggregated reporting, anonymous credential secrets after redemption, or sensitive operational logs.

Sensitive workflows must cross a trusted server-side boundary:

1. Browser authenticates with Supabase Auth.
2. Browser calls an Edge Function with a minimal request.
3. Edge Function validates auth, role, scope, assignment, and input schema.
4. Edge Function removes authenticated identity before persisting sensitive payloads.
5. Edge Function encrypts payloads server-side.
6. Database stores ciphertext and non-sensitive metadata only.

## Evaluation Submission Architecture

Assignments and submissions are separate domains.

- Assignment domain can know who is eligible to evaluate whom.
- Submission domain stores encrypted anonymous payloads without evaluator identity.
- A one-time anonymous credential proves eligibility without storing evaluator identity with content.
- Credential redemption must prevent duplicate submissions without creating a reversible assignment-to-submission mapping.

## Reporting Architecture

Reporting must use server-side aggregation, threshold checks, scoped authorization, and self-access prevention. Decryption is allowed only in trusted server code for authorized aggregate preparation. Raw individual response payloads must not be returned to reviewers.

## Localization

User-facing Turkish strings must be centralized under a future localization module such as `src/locales/tr/`. Code identifiers, internal errors, tests, and technical artifacts remain English.

## Current Foundation Check

`tests/project-memory.test.mjs` validates required project memory files and key security documentation statements. `src/app/App.test.tsx` validates the Turkish dashboard shell and centralized UI messages.

## Current Frontend Scaffold

- Entry point: `src/main.tsx`
- Root app: `src/app/App.tsx`
- Dashboard feature: `src/features/dashboard/DashboardPage.tsx`
- Turkish messages: `src/locales/tr/messages.ts`
- Authentication context and UI: `src/features/authentication/`
- Profile onboarding gate and service: `src/features/profiles/`
- Typed Supabase client: `src/lib/supabase/client.ts`
- Generated database types: `src/types/supabase.ts`
- Global styles: `src/index.css`
- Vite and Vitest config: `vite.config.ts`
- ESLint config: `eslint.config.js`

## Current Supabase Scaffold

- CLI config: `supabase/config.toml`
- Seed file: `supabase/seed.sql`
- Initial migration: `supabase/migrations/20260719132911_initial_security_foundation.sql`
- Profile/invitation migration: `supabase/migrations/20260719171413_user_profile_invitation_foundation.sql`
- Setup notes: `docs/SUPABASE_SETUP.md`
- Linked remote project ref: `daxaymcmtbmummrxdyjy`

The initial migration creates `app_roles`, `scope_types`, `user_role_assignments`, and `audit_events`. The profile/invitation migration creates `user_profiles` and `user_invitations`. RLS is enabled on all public tables. `user_profiles` has one narrow authenticated self-read policy. `user_invitations` has no client-facing policies and is reserved for trusted server-side invitation flows.

## Current Authentication Scaffold

- Public environment validation: `src/config/environment.ts`
- Supabase auth service boundary: `src/features/authentication/authService.ts`
- Auth provider and gate: `src/features/authentication/AuthProvider.tsx`, `src/features/authentication/AuthGate.tsx`
- Turkish auth page: `src/features/authentication/AuthPage.tsx`
- Own-profile service and gate: `src/features/profiles/profileService.ts`, `src/features/profiles/ProfileGate.tsx`

The auth service is injectable so unit and component tests do not call the network. Browser runtime uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The profile service is injectable and reads only the authenticated user's own profile row. A signed-in user without an active profile sees a Turkish invitation onboarding state instead of the dashboard.

# Architecture

## Status

Foundation architecture is documented. The frontend application scaffold is implemented with React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library. The Supabase project is linked and has default-deny security, Supabase Auth-backed invitation onboarding, organization hierarchy, atomic hierarchy administration, workspace context, employee assignment access, project/evaluation-cycle, and evaluation-assignment migrations. A typed Supabase Auth client, own-profile gate, own-workspace context panel, Turkish employee assignment inbox, protected administration shell, user invitation management, trusted existing-user role/hierarchy management, trusted project/cycle/member/assignment administration, portable Docker/Nginx frontend, and multi-tenant integrity hardening migration are implemented.

## Target System

The target system is a single-page web application with a trusted backend boundary:

- Browser: React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- Auth: Supabase Auth for email/password, invitation onboarding, password reset, and Microsoft Entra ID.
- Database: Supabase PostgreSQL with Row Level Security enabled for all exposed tables.
- Trusted server code: Supabase Edge Functions for sensitive validation, anonymous credential handling, encryption, decryption, aggregation, and reporting.
- Runtime delivery: one Docker image serving the static SPA through Nginx, configured at container startup with public Supabase values.
- Tests: Vitest and React Testing Library for frontend and documentation checks, plus Docker-backed Supabase pgTAP tests for database authorization. Playwright is planned for later workflow phases.

## Deployment Topologies

- Shared SaaS: one vendor-operated stack stores multiple companies with `organizations.id` as the tenant boundary.
- Dedicated: one customer-operated application container and one official self-hosted Supabase stack.

Both topologies use the same migrations, Edge Functions, and tenant authorization. Dedicated infrastructure is additional isolation and never disables organization scope checks. The official Supabase self-host Compose project remains an external pinned dependency; this repository owns the application image and application-specific database/function artifacts. See `docs/DEPLOYMENT.md` and ADR-0016.

## Runtime Configuration

`/app-config.js` is loaded before the Vite bundle. A container entrypoint writes only the public Supabase URL and anon or publishable key. Local Vite development falls back to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. A partial runtime configuration is rejected to prevent accidental mixing between customer and build-time environments.

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
- Employee assignment service and inbox: `src/features/evaluations/evaluationAssignmentService.ts`, `src/features/evaluations/AssignmentInbox.tsx`
- Administration feature: `src/features/administration/AdministrationPage.tsx`
- Administration project/cycle/member/assignment service and panel: `src/features/administration/projectCycleService.ts`, `src/features/administration/ProjectCycleManagementPanel.tsx`
- Administration role/hierarchy service and panel: `src/features/administration/hierarchyAdministrationService.ts`, `src/features/administration/RoleHierarchyManagementPanel.tsx`
- Turkish messages: `src/locales/tr/messages.ts`
- Authentication context and UI: `src/features/authentication/`
- Profile onboarding gate and service: `src/features/profiles/`
- Workspace context gate and service: `src/features/workspace/`
- Typed Supabase client: `src/lib/supabase/client.ts`
- Generated database types: `src/types/supabase.ts`
- Global styles: `src/index.css`
- Vite and Vitest config: `vite.config.ts`
- ESLint config: `eslint.config.js`

## Current Supabase Scaffold

- CLI config: `supabase/config.toml`
- Seed file: `supabase/seed.sql`
- Admin project/cycle/member Edge Function: `supabase/functions/admin-project-cycles/index.ts`
- User onboarding Edge Function: `supabase/functions/user-onboarding/index.ts`
- Organization administration Edge Function: `supabase/functions/organization-administration/index.ts`
- Initial migration: `supabase/migrations/20260719132911_initial_security_foundation.sql`
- Profile/invitation migration: `supabase/migrations/20260719171413_user_profile_invitation_foundation.sql`
- Organization hierarchy migration: `supabase/migrations/20260719174459_organization_hierarchy_foundation.sql`
- Workspace context RPC migration: `supabase/migrations/20260719181013_workspace_context_rpc.sql`
- Project/evaluation-cycle migration: `supabase/migrations/20260719184052_project_evaluation_cycle_foundation.sql`
- Evaluation assignment migration: `supabase/migrations/20260720223000_evaluation_assignment_foundation.sql`
- Employee assignment access migration: `supabase/migrations/20260806233000_employee_assignment_access.sql`
- Database authorization tests: `supabase/tests/database/employee_assignment_access.test.sql`
- Invitation acceptance migration: `supabase/migrations/20260720232000_user_invitation_acceptance_flow.sql`
- Invitation acceptance revalidation migration: `supabase/migrations/20260720234500_invitation_acceptance_context_revalidation.sql`
- Organization administration migration: `supabase/migrations/20260722210000_hierarchy_administration_foundation.sql`
- Hierarchy context hardening migration: `supabase/migrations/20260722223000_hierarchy_context_integrity_hardening.sql`
- Setup notes: `docs/SUPABASE_SETUP.md`
- Demo fixture notes: `docs/TEST_FIXTURES.md`
- Demo fixture script: `scripts/create-demo-fixture.mjs`
- Linked remote project ref: `daxaymcmtbmummrxdyjy`

The initial migration creates `app_roles`, `scope_types`, `user_role_assignments`, and `audit_events`. The profile/invitation migration creates `user_profiles` and `user_invitations`. The organization hierarchy migration creates `organizations`, `organization_units`, `organization_unit_memberships`, and `manager_assignments`, and adds `PLATFORM` as the global scope type. The workspace context migration creates `get_my_workspace_context()`. The project/evaluation-cycle migration creates `projects`, `project_memberships`, and `evaluation_cycles`. The evaluation assignment migration creates `evaluation_assignments` for identity-domain eligibility planning only. The employee access migration creates authenticated `get_my_evaluation_assignments()` without adding direct table policies. The invitation migrations add Auth-user and hierarchy context, service-role-only `accept_user_invitation()`, and acceptance-time active context revalidation. The delegated date migration adds service-role-only `admin_update_project_dates()` for atomic project/cycle configuration updates. RLS is enabled on all public tables. `user_profiles` has one narrow authenticated self-read policy. Invitation, hierarchy, project, evaluation-cycle, and evaluation-assignment administration tables have no client-facing policies and are reserved for trusted server-side flows.

## Current Authentication Scaffold

- Public environment validation: `src/config/environment.ts`
- Supabase auth service boundary: `src/features/authentication/authService.ts`
- Auth provider and gate: `src/features/authentication/AuthProvider.tsx`, `src/features/authentication/AuthGate.tsx`
- Turkish auth page: `src/features/authentication/AuthPage.tsx`
- Own-profile service and gate: `src/features/profiles/profileService.ts`, `src/features/profiles/ProfileGate.tsx`
- Own-workspace context service and gate: `src/features/workspace/workspaceContextService.ts`, `src/features/workspace/WorkspaceContextGate.tsx`

The auth service is injectable so unit and component tests do not call the network. Local development uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; container deployments inject equivalent public values through `/app-config.js` at startup.

The profile service is injectable and reads only the authenticated user's own profile row. A signed-in user without an active profile sees a Turkish invitation onboarding state instead of the dashboard.

The workspace context service is injectable and reads only the authenticated user's own non-sensitive role, unit, and manager context through `get_my_workspace_context()`.

The administration shell is reachable through `#administration` for admin-like workspace roles. It is a UI boundary only; production management writes must use future Edge Functions and RLS policies.

The project/cycle management panel calls `admin-project-cycles` through Supabase Functions. It does not query `projects`, `evaluation_cycles`, `evaluation_assignments`, `project_memberships`, `organization_unit_memberships`, or `user_profiles` directly from the browser.

The organization member selector and project membership form use the same Edge Function boundary. Organization member lookup returns active identity-domain profile metadata for administrators only. Project membership writes validate project organization scope and selected-user organization membership server-side before writing `project_memberships`.

The assignment planning control uses the same Edge Function boundary. It generates non-self evaluator-subject identity assignments from active project memberships for draft or open project-backed cycles, stores no scores or comments, and returns only aggregate assignment counts to the browser.

The project date control also uses `admin-project-cycles`. The Edge Function performs an early scope check, and service-role-only `admin_update_project_dates()` rechecks platform/matching-organization system-administrator scope or exact assigned-project-manager authority inside the transaction. Project completion and evaluation close dates are updated together; closed or archived cycles are rejected.

The user invitation panel calls `user-onboarding`. System administrators can list scoped organization/unit options, send Supabase Auth invitations, and revoke pending invitations. Invited users accept only through an authenticated, email-verified session. The Edge Function invokes service-role-only `accept_user_invitation()` so profile, role, unit membership, optional manager relationship, invitation state, and audit metadata change atomically. No raw custom invitation token is returned to the browser.

# Changelog

All notable changes to this project are documented in this file.

## 2026-07-22

### Added

- Added trusted existing-user role, organization-unit, primary-membership, and direct-manager administration.
- Added service-role-only atomic hierarchy mutation functions with manager-cycle, unit-archive, role-scope, and final-system-admin protections.
- Added the Turkish role and hierarchy management panel for organization-scoped system administrators.
- Added reusable authenticated hierarchy smoke testing and focused component/security regression coverage.
- Added ADR-0014 for the atomic organization administration boundary.

## 2026-07-20

### Added

- Extended `admin-project-cycles` with organization member lookup and project member assignment actions.
- Added project member selection and membership-kind controls to the Turkish administration panel.
- Added project-member metadata to the managed project service model without exposing direct browser table access.
- Added ADR-0011 for project membership management through trusted Edge Function actions.
- Added default-deny `evaluation_assignments` foundation for project-backed assignment planning.
- Extended `admin-project-cycles` with admin-only project assignment generation from active project memberships.
- Added assignment count display and Turkish generation control to the administration panel.
- Added ADR-0012 for default-deny evaluation assignment planning.
- Added Supabase Auth-backed user invitation creation and revocation through `user-onboarding`.
- Added service-role-only atomic invitation acceptance for profile, role, unit membership, manager relationship, and audit records.
- Added Turkish system-administrator invitation management and invited-profile acceptance controls.
- Added ADR-0013 for Supabase Auth-backed invitation onboarding.
- Fixed browser CORS preflight support for Supabase administration Edge Function calls by allowing the SDK `apikey` header.

## 2026-07-16

### Added

- Created persistent project memory foundation.
- Added initial architecture, security, data model, authorization, assumptions, known issues, test report, release notes, and development log documentation.
- Added initial ADRs for the target stack, anonymous identity separation, and server-side encryption.
- Added a lightweight Node test that verifies required documentation exists and contains key security statements.
- Scaffolded React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library.
- Added a Turkish dashboard shell with centralized UI messages.
- Added production build, lint, typecheck, test, and combined check scripts.
- Added package lock for installed application dependencies.
- Added Supabase CLI project setup, frontend env examples, and initial default-deny security migration.
- Applied initial Supabase migration to remote project `daxaymcmtbmummrxdyjy`.
- Added typed Supabase generated database types.
- Added Supabase Auth client foundation with email/password sign-in, password reset request, local sign-out, environment validation, and tests.
- Added user profile and invitation onboarding foundation with own-profile gating, hashed invitation records, generated database types, and tests.
- Added configurable organization hierarchy foundation and service-role-only demo fixture script for synthetic test users.
- Added authenticated own-workspace context RPC, workspace context dashboard panel, and admin-like management entry point.
- Added protected administration shell and default-deny project/evaluation-cycle configuration foundation.
- Added admin project/cycle Edge Function foundation and frontend project management panel.

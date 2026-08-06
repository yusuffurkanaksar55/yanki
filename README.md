# yanki

Anonymous Employee and Project Evaluation Platform

Secure company-internal web platform for anonymous employee, team, project, manager, and lessons learned evaluations.

## Current Status

The repository is in application foundation phase. It contains persistent project memory, security architecture notes, authorization boundaries, data model documentation, ADRs, a React + TypeScript + Vite application shell, Supabase Auth-backed invitation/profile onboarding, configurable organization hierarchy, trusted existing-user role/hierarchy administration, authenticated own-workspace context, authenticated employee assignment access, immutable versioned evaluation templates, a Turkish assignment inbox, protected administration, project/evaluation-cycle configuration, atomic delegated project-date management, default-deny evaluation assignment planning, trusted administration Edge Functions, a portable Docker/Nginx frontend package, explicit multi-tenant database integrity controls, Tailwind CSS styling, ESLint, TypeScript checking, Vitest, React Testing Library, and Supabase pgTAP tests.

Invitation delivery and acceptance still need an approved mailbox smoke test. Anonymous credential issuance, encrypted submission, completion mutation, and reporting authorization have not been implemented yet.

## Target Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Supabase Edge Functions
- Supabase Row Level Security
- Docker and Docker Compose
- Nginx
- Vitest
- React Testing Library
- Playwright

The frontend test/build stack, Supabase CLI foundation, and first Supabase Edge Function are installed. Playwright and shadcn/ui are still target-direction items for later phases.

## Security Principles

- Evaluation payloads are encrypted server-side before persistence.
- Evaluator identity and submission content are technically separated.
- Anonymous credentials are one-time-use and must not create a reversible assignment-to-submission mapping.
- Database readers must not be able to read scores, comments, or lessons learned content.
- Result access is scoped, thresholded, and self-access is denied.
- Administrative access does not imply access to sensitive evaluation content.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run check
npm run memory:trim
npm run memory:check
npm run deployment:config
npm run smoke:hierarchy
npm run smoke:assignments
npm run smoke:templates
npm run smoke:project-dates
npm run supabase:migrations
npm run supabase:lint:local
npm run supabase:lint:linked
npm run supabase:push:dry-run
npm run supabase:test:local
npm run supabase:types
```

These commands currently validate the React application scaffold, documentation foundation, lint rules, type checking, unit/component tests, and production build.

## Supabase

The remote Supabase project is linked to project ref `daxaymcmtbmummrxdyjy`. Public frontend environment examples are documented in `.env.example`; real local values belong in `.env.local`, which is ignored by Git.

The applied migrations create a default-deny security foundation, Auth-backed user invitation/profile onboarding, configurable organization hierarchy tables, atomic organization-administration functions, immutable versioned evaluation templates, project and time-bound evaluation-cycle configuration tables, atomic delegated project-date administration, an evaluation assignment planning table, narrow authenticated own-workspace and own-assignment RPCs, and a service-role-only atomic invitation acceptance function. Every cycle and assignment preserves an exact published template version. The schema does not create evaluation submission tables or store sensitive evaluation content.

## Deployment

The same application supports a vendor-hosted shared SaaS topology and a customer-managed dedicated topology. The frontend image reads only public Supabase configuration at container startup, so one immutable image can target managed or self-hosted Supabase without rebuilding. See `docs/DEPLOYMENT.md` for tools, topology, installation, backup, update, and production-gate requirements.

## Demo Fixtures

Synthetic CEO, HR admin, team leader, employee accounts, demo project, and demo evaluation close date are described in `docs/TEST_FIXTURES.md`. The local fixture command requires `SUPABASE_SERVICE_ROLE_KEY` from the environment and is not part of normal checks. At least one synthetic fixture account has been verified through local sign-in.

## Authentication

The frontend includes a typed Supabase Auth client foundation with email/password sign-in, password reset request, local-session sign-out, runtime public environment validation, React context-based session state, own-profile gating, own-workspace context display, employee own-assignment display through `get_my_evaluation_assignments()`, a protected administration shell, versioned template management through `evaluation-templates`, user invitation management through `user-onboarding`, existing-user role/hierarchy management through `organization-administration`, and project/cycle/member/assignment/date management through `admin-project-cycles`.

Only public Supabase values are used in the browser. Service-role keys, database URLs, and encryption keys must stay out of frontend code and Git.

## Documentation Map

- `docs/PROJECT_CONTEXT.md` - concise source of truth
- `docs/PRODUCT_REQUIREMENTS.md` - confirmed product requirements
- `docs/ARCHITECTURE.md` - target architecture and current status
- `docs/SECURITY_MODEL.md` - privacy, anonymity, encryption, and logging rules
- `docs/AUTHORIZATION_MODEL.md` - roles and scoped access rules
- `docs/DATA_MODEL.md` - initial conceptual data model
- `docs/decisions/` - architecture decision records
- `docs/DEPLOYMENT.md` - shared SaaS and customer-managed deployment runbook

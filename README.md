# yanki

Anonymous Employee and Project Evaluation Platform

Secure company-internal web platform for anonymous employee, team, project, manager, and lessons learned evaluations.

## Current Status

The repository is in application scaffold phase. It contains persistent project memory, security architecture notes, authorization boundaries, initial data model documentation, ADRs, a React + TypeScript + Vite application shell, Supabase Auth/profile onboarding foundation, configurable organization hierarchy foundation, authenticated own-workspace context foundation, Tailwind CSS styling, ESLint, TypeScript checking, Vitest, and React Testing Library tests.

No production Edge Functions, invitation redemption flow, administration management UI, project/evaluation-date management, evaluation authorization enforcement, anonymous credential flow, or encryption runtime has been implemented yet.

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
- Vitest
- React Testing Library
- Playwright

The frontend test/build stack and Supabase CLI foundation are installed. Supabase Edge Functions, Playwright, and shadcn/ui are still target-direction items for later phases.

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
npm run supabase:migrations
npm run supabase:lint:linked
npm run supabase:push:dry-run
npm run supabase:types
```

These commands currently validate the React application scaffold, documentation foundation, lint rules, type checking, unit/component tests, and production build.

## Supabase

The remote Supabase project is linked to project ref `daxaymcmtbmummrxdyjy`. Public frontend environment examples are documented in `.env.example`; real local values belong in `.env.local`, which is ignored by Git.

The applied migrations create a default-deny security foundation, user profile and invitation onboarding tables, configurable organization hierarchy tables, and a narrow authenticated own-workspace context RPC. They do not create evaluation submission tables or store sensitive evaluation content.

## Demo Fixtures

Synthetic CEO, HR admin, team leader, and employee accounts are described in `docs/TEST_FIXTURES.md`. The local fixture command requires `SUPABASE_SERVICE_ROLE_KEY` from the environment and is not part of normal checks. At least one synthetic fixture account has been verified through local sign-in.

## Authentication

The frontend includes a typed Supabase Auth client foundation with email/password sign-in, password reset request, local-session sign-out, runtime public environment validation, React context-based session state, own-profile gating, and own-workspace context display.

Only public Supabase values are used in the browser. Service-role keys, database URLs, and encryption keys must stay out of frontend code and Git.

## Documentation Map

- `docs/PROJECT_CONTEXT.md` - concise source of truth
- `docs/PRODUCT_REQUIREMENTS.md` - confirmed product requirements
- `docs/ARCHITECTURE.md` - target architecture and current status
- `docs/SECURITY_MODEL.md` - privacy, anonymity, encryption, and logging rules
- `docs/AUTHORIZATION_MODEL.md` - roles and scoped access rules
- `docs/DATA_MODEL.md` - initial conceptual data model
- `docs/decisions/` - architecture decision records

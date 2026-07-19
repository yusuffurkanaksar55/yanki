# yanki

Anonymous Employee and Project Evaluation Platform

Secure company-internal web platform for anonymous employee, team, project, manager, and lessons learned evaluations.

## Current Status

The repository is in application scaffold phase. It contains persistent project memory, security architecture notes, authorization boundaries, initial data model documentation, ADRs, a React + TypeScript + Vite application shell, Tailwind CSS styling, ESLint, TypeScript checking, Vitest, and React Testing Library tests.

No production Supabase schema, Edge Functions, authentication flow, authorization enforcement, anonymous credential flow, or encryption runtime has been implemented yet.

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

The stack is documented as the target direction, not yet installed.

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
```

These commands currently validate the React application scaffold, documentation foundation, lint rules, type checking, unit/component tests, and production build.

## Supabase

The remote Supabase project is linked to project ref `daxaymcmtbmummrxdyjy`. Public frontend environment examples are documented in `.env.example`; real local values belong in `.env.local`, which is ignored by Git.

The initial migration creates a default-deny security foundation only. It does not create evaluation submission tables or store sensitive evaluation content.

## Documentation Map

- `docs/PROJECT_CONTEXT.md` - concise source of truth
- `docs/PRODUCT_REQUIREMENTS.md` - confirmed product requirements
- `docs/ARCHITECTURE.md` - target architecture and current status
- `docs/SECURITY_MODEL.md` - privacy, anonymity, encryption, and logging rules
- `docs/AUTHORIZATION_MODEL.md` - roles and scoped access rules
- `docs/DATA_MODEL.md` - initial conceptual data model
- `docs/decisions/` - architecture decision records

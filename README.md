# yanki

Anonymous Employee and Project Evaluation Platform

Secure company-internal web platform for anonymous employee, team, project, manager, and lessons learned evaluations.

## Current Status

The repository is in application development phase. It contains persistent project memory, a React + TypeScript + Vite application, a public Turkish product site, Supabase Auth onboarding, configurable hierarchy and scoped administration, immutable versioned evaluation templates, authenticated assignment access, a Turkish evaluation form, one-time anonymous credentials, AES-256-GCM encrypted submission persistence, privacy-preserving anonymous endpoint quotas, immediate identity-separated aggregate reporting, a portable Docker/Nginx frontend package, signed digest-pinned container release automation, explicit multi-tenant integrity controls, and executable frontend/database/security tests.

Invitation delivery still needs an approved mailbox smoke test. Key rotation/health, anonymous quotas, same-origin gateway limits, content-free alerting, retention, tenant bootstrap, encrypted off-site backup/restore, and release supply-chain automation are implemented. Real production providers, the first hosted version-tag release, and environment-specific signed acceptance remain incomplete.

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
- Result access is scoped, starts after the first encrypted submission, and denies self-access.
- Administrative access does not imply access to sensitive evaluation content.
- Abuse controls must not persist IP addresses, device fingerprints, credential digests, user identifiers, assignment identifiers, or request content.

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
YANKI_RELEASE_TAG=v0.1.0 npm run release:validate-tag
npm run release:acceptance
npm run smoke:hierarchy
npm run smoke:assignments
npm run smoke:submissions
npm run smoke:abuse
npm run smoke:reports
npm run smoke:key-health
npm run smoke:templates
npm run smoke:project-dates
npm run supabase:migrations
npm run supabase:lint:local
npm run supabase:lint:linked
npm run supabase:push:dry-run
npm run supabase:test:local
npm run supabase:types
npm run encryption:key:prepare -- DEV_YYYYMMDD_01
```

These commands currently validate the React application scaffold, documentation foundation, lint rules, type checking, unit/component tests, and production build.

## Supabase

The canonical development and integration-test backend is AWS self-hosted Supabase, reached locally at `http://localhost:8080` through the approved SSH tunnel. The former Supabase Cloud project is inactive and must not be used. Public frontend environment examples are documented in `.env.example`; real local values belong in `.env.local`, which is ignored by Git.

The applied migrations create default-deny onboarding, hierarchy, template, project, cycle, assignment, one-time credential, encrypted content, anonymous abuse-control, and identity-separated reporting boundaries. Every cycle and assignment preserves an exact published template version. Evaluation answers are stored only as AES-256-GCM ciphertext; the content table has no evaluator, assignment, credential, plaintext answer, or exact submission timestamp column. Active and completed reports become available after the first encrypted submission and are decrypted only in trusted code after scope, self-access, and administrator-deny checks.

## Deployment

The same application supports a vendor-hosted shared SaaS topology and a customer-managed dedicated topology. The frontend image reads only public Supabase configuration at container startup, so one signed digest-pinned image can target managed or self-hosted Supabase without rebuilding. See `docs/DEPLOYMENT.md` and `docs/INSTALLATION_ACCEPTANCE.md` for tools, verification, installation, backup, update, and production-gate requirements.

## Demo Fixtures

Synthetic CEO, HR admin, team leader, employee accounts, demo project, and demo evaluation close date are described in `docs/TEST_FIXTURES.md`. The local fixture command requires `SUPABASE_SERVICE_ROLE_KEY` from the environment and is not part of normal checks. At least one synthetic fixture account has been verified through local sign-in.

## Authentication

The frontend includes email/password Auth, own-profile/workspace/assignment gates, a memory-only anonymous submission form, and protected administration. Submission preparation uses `evaluation-submission-credentials`; the browser then calls `anonymous-evaluation-submissions` without a user Authorization header or cookies. Administration remains behind the existing scoped Edge Functions.

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

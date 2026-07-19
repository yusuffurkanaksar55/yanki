# Repository Operating Guide

This repository is the persistent memory for the Anonymous Employee and Project Evaluation Platform.

## Core Rules

- Source code, database identifiers, technical documentation, tests, commit messages, and internal logs are written in English.
- User-facing application text is Turkish and must be centralized for future localization.
- Evaluation content must never be stored in plaintext.
- Evaluator identity must never be stored with submission content.
- Supabase service-role credentials and encryption keys must never be exposed to the browser.
- Every sensitive authorization rule must be enforced outside the UI, preferably in Edge Functions and Row Level Security.
- System administrators manage configuration but must not read evaluation content.
- Reviewers must not see results below the configured anonymity threshold.
- Users must not access results about themselves.

## Required Reading Before Development

Read these files before making meaningful changes:

- `docs/PROJECT_CONTEXT.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY_MODEL.md`
- `docs/AUTHORIZATION_MODEL.md`
- `docs/DATA_MODEL.md`
- `docs/ERROR_LOG.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DEVELOPMENT_LOG.md`
- Relevant ADRs in `docs/decisions/`

## Quality Commands

Current application checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check
npm run supabase:lint:linked
npm run supabase:push:dry-run
```

When Supabase and end-to-end workflows are added, extend the command set with Supabase database linting, database tests, Edge Function checks, Playwright end-to-end tests, and security regression tests.

## Documentation Updates

For each meaningful change:

- Append a development log entry.
- Update `docs/TEST_REPORT.md`.
- Update architecture, security, data model, authorization, assumptions, known issues, or ADR files when decisions or behavior change.
- Record discovered errors in `docs/ERROR_LOG.md`.

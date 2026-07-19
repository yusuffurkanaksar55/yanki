# Test Fixtures

## Purpose

Development and acceptance testing uses synthetic users only. Real employee accounts are not required for the foundation phase.

Fixture credentials must be generated at runtime and must not be committed to Git, migrations, docs, screenshots, or logs beyond the local one-time handoff to the tester.

## Baseline Scenario

The default scenario models the user's requested hierarchy without hard-coding the product to this exact structure:

| Fixture key | Display name | Role | Organization placement | Manager |
| --- | --- | --- | --- | --- |
| `ceo` | Demo CEO | `C_LEVEL_REVIEWER` | Executive Office | None |
| `hr_admin` | Demo HR Admin | `SYSTEM_ADMIN` | People Operations | None |
| `team_leader` | Demo Team Leader | `TEAM_LEADER` | Product Team | Demo CEO |
| `employee_1` | Demo Employee 1 | `EMPLOYEE` | Product Team | Demo Team Leader |
| `employee_2` | Demo Employee 2 | `EMPLOYEE` | Product Team | Demo Team Leader |
| `employee_3` | Demo Employee 3 | `EMPLOYEE` | Product Team | Demo Team Leader |

The application must support other organization structures through configurable organization units, memberships, role scopes, and manager assignments.

## Baseline Project Scenario

The fixture also creates a synthetic project and time-bound evaluation cycle:

| Fixture key | Value |
| --- | --- |
| Project name | Yanki Demo Project |
| Project code | YANKI-DEMO |
| Project manager | Demo Team Leader |
| Project completion date | 2026-07-19 |
| Evaluation cycle | Yanki Demo Project Completion Evaluation |
| Evaluation close date | 2026-07-30 |

The evaluation cycle can be opened without a fixed participant count requirement. Reporting still requires the configured anonymity threshold before results can be shown.

## Runtime Requirements

The fixture script requires server-side Supabase privileges and must be run outside the browser:

```bash
SUPABASE_URL=https://daxaymcmtbmummrxdyjy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=never-commit-this-value
npm run fixture:demo
```

The script uses `SUPABASE_SERVICE_ROLE_KEY` only from the local environment. Do not add service-role keys to `.env.example`, frontend variables, Vite config, source code, or documentation.

## Generated Output

When the fixture script succeeds, it prints a local credentials table for the tester. The output should be treated as temporary test credentials and rotated or deleted when no longer needed.

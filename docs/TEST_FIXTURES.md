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

The evaluation cycle can be opened without a fixed participant count requirement. Authorized aggregate reporting starts after the first encrypted submission.

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

## Linked Smoke Scenario

The linked test project was authenticated-smoke-tested with a synthetic project created through `admin-project-cycles`:

| Fixture key | Value |
| --- | --- |
| Project name | Yanki Canli Test Projesi |
| Project code | YANKI-LIVE-SMOKE |
| Project manager | Demo Team Leader |
| Project members | Demo Team Leader and three demo employees |
| Sponsor | Demo CEO |
| Evaluation cycle | Yanki Canli Test Degerlendirmesi |
| Evaluation close date | 2026-07-30 |
| Generated assignment candidates | 12 non-self assignments across four evaluating participants |

These credentials were originally generated before the fixture script included its baseline project records, so the smoke project was created through the production administration boundary. Rerunning `npm run fixture:demo` creates or updates the baseline `YANKI-DEMO` project but also rotates all synthetic account passwords.

## Immediate Reporting Fixtures

`npm run smoke:reports` creates uniquely named `Immediate reporting smoke ...` projects and cycles in the linked synthetic organization. Each run uses the CEO as reviewer, the team leader as evaluated subject, and the CEO plus three employees as evaluators. Successful runs leave encrypted submissions and safe audit/configuration records because anonymous content is immutable and must not be linked back to evaluators for cleanup.

The accepted live run verified `EMPTY` before participation, active-target discovery, immediate availability after the first encrypted submission while the cycle was active, the four-submission final aggregate with a synthetic `3.5` rating average, raw-text withholding, and system-admin/self/employee/anonymous denial. Historical thresholded-run evidence remains in the bounded operational logs and release notes.

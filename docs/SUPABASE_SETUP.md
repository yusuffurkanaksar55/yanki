# Supabase Setup

For customer-managed dedicated installation, use the official self-hosted Supabase Docker release and follow `docs/DEPLOYMENT.md`. The Supabase CLI local stack is a development tool and is not the production self-host topology.

## Remote Project

- Project ref: `daxaymcmtbmummrxdyjy`
- Project URL: `https://daxaymcmtbmummrxdyjy.supabase.co`
- Dashboard URL: `https://supabase.com/dashboard/project/daxaymcmtbmummrxdyjy`

## Local CLI

The Supabase CLI is installed as a development dependency and should be run through npm scripts or `npx`.

```bash
npx supabase --version
npx supabase init
npx supabase login
npx supabase link --project-ref daxaymcmtbmummrxdyjy
npx supabase gen types typescript --linked > src/types/supabase.ts
```

Do not commit access tokens, database passwords, service-role keys, encryption keys, or OAuth secrets.

## Frontend Environment

Frontend code may use only public Supabase values:

```env
VITE_SUPABASE_URL=https://daxaymcmtbmummrxdyjy.supabase.co
VITE_SUPABASE_ANON_KEY=replace-with-public-anon-key
```

Local values belong in `.env.local`, which is ignored by Git. `.env.example` is safe to commit because it does not contain private credentials.

## Migration Workflow

Create schema changes through version-controlled migrations:

```bash
npx supabase migration new descriptive_name
npx supabase db reset
npm run supabase:lint:local
npm run supabase:test:local
npx supabase db push --dry-run
npx supabase db push
```

Use `db push --dry-run` before remote changes. Never run destructive linked reset commands against production.

## Security Baseline

The applied migrations create foundational authorization tables, safe audit metadata tables, profile and invitation onboarding tables, organization hierarchy tables, project and time-bound evaluation-cycle configuration, immutable templates, default-deny assignment planning, one-time anonymous credentials, encrypted submissions, thresholded reporting, retention controls, and content-free tenant bootstrap operations.

The `admin-project-cycles` Edge Function is the first trusted administrative function. It uses `SUPABASE_SERVICE_ROLE_KEY` only in the Edge Function runtime and must not expose that value to frontend code. It supports project/cycle listing and creation, organization member lookup, project member assignment, project-backed evaluation assignment generation, and atomic delegated project-date updates through service-role-only `admin_update_project_dates()`.

The `user-onboarding` Edge Function uses the same trusted boundary for system-admin invitation options, invitation creation, revocation, and authenticated acceptance. Supabase Auth delivers the user-facing invite link. The application does not return a custom raw invitation secret to the administration browser. Every invitation is marked for browser password setup, and acceptance calls service-role-only `accept_user_invitation()` for one atomic identity-domain update.

Production organization creation uses `npm run tenant:bootstrap:check`, `npm run tenant:bootstrap`, and, only for an incomplete initial invitation, `npm run tenant:bootstrap:recover`. These commands require the ignored operator environment and are documented in `docs/DEPLOYMENT.md`. They must never run in frontend code or expose the service-role key, email action link, password, or token.

The `organization-administration` Edge Function handles existing-user role, organization-unit, primary-membership, and direct-manager administration. It invokes service-role-only atomic database functions that revalidate the acting system administrator, reject manager cycles and unsafe unit archival, constrain unit-scoped roles to active memberships, and preserve at least one organization-scoped system administrator.

`admin-project-cycles`, `user-onboarding`, and `organization-administration` are deployed with Supabase gateway JWT verification disabled so browser CORS preflight can reach the functions. All three functions validate the bearer token internally with `auth.getUser()`.

## Auth Dashboard Settings

For local Vite development, configure Supabase Auth with:

- Site URL: `http://127.0.0.1:5173`
- Additional redirect URLs:
  - `http://127.0.0.1:5173`
  - `http://localhost:5173`

The current frontend auth client uses email/password sign-in, password reset request, and strong password update for invitation/recovery sessions. Authenticated users are gated by their own active `user_profiles` row. Supabase Auth-backed invitation creation/revocation and atomic acceptance are implemented. Microsoft Entra ID remains a future phase.

Before production invitation testing, configure or verify the Supabase Auth email provider and send only to an approved test mailbox. Require at least 12 characters plus upper-case, lower-case, numeric, and symbol classes in the deployment Auth policy. The Site URL and exact HTTPS redirect allowlist must point back to the application. Do not paste invitation tokens, access tokens, SMTP credentials, or service-role values into Git or chat.

Current baseline rules:

- RLS is enabled on all public tables created by migrations.
- `user_profiles` has one self-read policy for authenticated users.
- `user_invitations` has no client-facing policies and stores only hashed invitation secrets.
- Organization hierarchy tables have no client-facing policies.
- Evaluation assignment tables have no client-facing policies; employees read only their own safe assignment metadata through `get_my_evaluation_assignments()`.
- Project and evaluation-cycle configuration tables have no client-facing policies.
- Evaluation assignment planning tables have no client-facing policies and store identity-domain eligibility only.
- `get_my_workspace_context()` is executable only by authenticated users and returns only the caller's own non-sensitive profile, role, membership, and manager context.
- `admin-project-cycles` validates the caller's JWT and active profile before using scoped role records for project/cycle/member/assignment/date administration. Delegated date updates require both the exact project-manager reference and an active matching project-scoped role.
- `user-onboarding` validates the caller's JWT, recomputes system-admin scope for management actions, and binds acceptance to the invited Auth user id and verified email.
- Tenant bootstrap tables have no direct API access. Exact status, creation, and initial-invitation renewal are executable only by `service_role` from the trusted operator environment.
- `organization-administration` recomputes system-admin scope, returns only authorized organization identity metadata, and delegates all mutations to service-role-only atomic RPCs.
- `PLATFORM` is the global null-id scope; organization, team, project, and evaluation-cycle roles must use explicit `scope_id` values.
- No plaintext evaluation scores, comments, lessons learned content, or evaluator-to-response linkage are stored.
- Sensitive evaluation submission and reporting flows run only through the deployed trusted server-side functions; direct sensitive-table access remains revoked.

## Demo Fixture

Synthetic test users can be created only with a local server-side service-role key:

```bash
$env:SUPABASE_URL="https://daxaymcmtbmummrxdyjy.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="never-commit-this-value"
npm run fixture:demo
```

The fixture command prints generated test credentials. Do not commit the output or add service-role values to Vite environment variables.

At least one synthetic fixture user has been verified through local sign-in. Recreate or rotate fixture users with the script whenever credentials need to be refreshed for acceptance testing. The fixture also creates `Yanki Demo Project` and a project-completion evaluation cycle that closes on 2026-07-30.

## Hierarchy Administration Smoke Test

The reusable live smoke script reads public Supabase connection values and synthetic admin/employee credentials from process environment variables. It does not contain credentials and must not be run against real employee accounts.

```bash
npm run smoke:hierarchy
```

The script lists authorized hierarchy data, creates and archives a temporary unit, performs an idempotent hierarchy update, assigns and ends a temporary reviewer role, verifies manager-cycle rejection, and verifies employee and unauthenticated denial. It leaves safe audit records and an archived synthetic unit for traceability.

## Project Date Administration Smoke Test

The reusable date smoke script reads public Supabase connection values and synthetic administrator, project-manager, and employee credentials from process environment variables. It does not contain credentials and must not be run against real employee accounts.

```bash
npm run smoke:project-dates
```

The script selects an editable project returned to the synthetic project manager, temporarily advances its evaluation close timestamp, verifies employee and unauthenticated denial, and uses the synthetic system administrator to restore and verify the original timestamp.

## Thresholded Reporting Smoke Test

The reusable report smoke script reads public Supabase values plus synthetic admin, reviewer, subject, and three employee credentials from process environment variables. It contains no credentials and must not run against real employee accounts.

```bash
npm run smoke:reports
```

The script creates a temporary project and closed evaluation cycle, submits four encrypted evaluations, verifies the expected aggregate, and confirms that raw text is withheld. It also verifies premature, system-admin, self, employee, and anonymous access denial. Required credential variables use the `REPORT_ADMIN_*`, `REPORT_REVIEWER_*`, `REPORT_SUBJECT_*`, and `REPORT_EMPLOYEE_1_*` through `REPORT_EMPLOYEE_3_*` prefixes.

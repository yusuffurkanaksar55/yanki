# Supabase Setup

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
npx supabase db lint
npx supabase db push --dry-run
npx supabase db push
```

Use `db push --dry-run` before remote changes. Never run destructive linked reset commands against production.

## Security Baseline

The applied migrations create foundational authorization tables, safe audit metadata tables, profile and invitation onboarding tables, organization hierarchy tables, project and time-bound evaluation-cycle configuration tables, and a narrow authenticated own-workspace context RPC. They intentionally do not create evaluation submission content tables yet.

## Auth Dashboard Settings

For local Vite development, configure Supabase Auth with:

- Site URL: `http://127.0.0.1:5173`
- Additional redirect URLs:
  - `http://127.0.0.1:5173`
  - `http://localhost:5173`

The current frontend auth client uses email/password sign-in and password reset request. Authenticated users are gated by their own active `user_profiles` row. Microsoft Entra ID and trusted invitation creation/redemption Edge Functions are planned future phases.

Current baseline rules:

- RLS is enabled on all public tables created by migrations.
- `user_profiles` has one self-read policy for authenticated users.
- `user_invitations` has no client-facing policies and stores only hashed invitation secrets.
- Organization hierarchy tables have no client-facing policies.
- Project and evaluation-cycle configuration tables have no client-facing policies.
- `get_my_workspace_context()` is executable only by authenticated users and returns only the caller's own non-sensitive profile, role, membership, and manager context.
- `PLATFORM` is the global null-id scope; organization, team, project, and evaluation-cycle roles must use explicit `scope_id` values.
- No plaintext evaluation scores, comments, lessons learned content, or evaluator-to-response linkage are stored.
- Sensitive evaluation submission and reporting flows must be implemented through trusted server-side functions later.

## Demo Fixture

Synthetic test users can be created only with a local server-side service-role key:

```bash
$env:SUPABASE_URL="https://daxaymcmtbmummrxdyjy.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="never-commit-this-value"
npm run fixture:demo
```

The fixture command prints generated test credentials. Do not commit the output or add service-role values to Vite environment variables.

At least one synthetic fixture user has been verified through local sign-in. Recreate or rotate fixture users with the script whenever credentials need to be refreshed for acceptance testing. The fixture also creates `Yanki Demo Project` and a project-completion evaluation cycle that closes on 2026-07-30.

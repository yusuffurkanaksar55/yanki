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

The initial migration creates only foundational authorization and safe audit metadata tables. It intentionally does not create evaluation submission content tables yet.

Current baseline rules:

- RLS is enabled on all public tables created by the migration.
- No client policies are created yet, so access is default-deny.
- No plaintext evaluation scores, comments, lessons learned content, or evaluator-to-response linkage are stored.
- Sensitive evaluation submission and reporting flows must be implemented through trusted server-side functions later.

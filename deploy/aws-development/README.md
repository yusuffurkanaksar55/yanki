# AWS Development Web Deployment

This package adds the production frontend container and a TLS-terminating Caddy
proxy to the canonical AWS self-hosted Supabase development stack. It also
changes the published Supabase API, PostgreSQL, and transaction-pooler ports to
loopback-only bindings.

The deployment is for synthetic development and integration data. The current
`sslip.io` hostname is a temporary DNS convenience, not an approved customer or
production domain.

## Preconditions

- `/home/ubuntu/yanki-app` is a clean checkout of the reviewed Yanki revision.
- `/home/ubuntu/yanki-supabase` contains the running self-hosted Supabase stack.
- `yanki-backup.service` exists and completes successfully.
- The hostname resolves to the host, and inbound TCP 80 and 443 are allowed.
- The Supabase `.env` file and backup material remain mode `0600` outside Git.

## Configure

Run from the checked-out application repository:

```bash
sudo env \
  AWS_DEVELOPMENT_WEB_CONFIRM=CONFIGURE_AWS_DEVELOPMENT_WEB \
  YANKI_PUBLIC_HOST=18-194-171-29.sslip.io \
  YANKI_APP_SOURCE_DIR=/home/ubuntu/yanki-app \
  YANKI_SUPABASE_DIR=/home/ubuntu/yanki-supabase \
  sh deploy/aws-development/configure.sh
```

The script requires a successful pre-change backup, preserves a protected copy
of the previous environment, generates or reuses a server-only gateway token,
updates Auth redirect/public URLs, validates the merged Compose configuration,
builds the exact checked-out frontend revision, and waits for HTTPS health. It
does not run migrations or change application data.

## Acceptance

From a trusted workstation with the public anon key in ignored local
configuration:

```bash
AWS_DEVELOPMENT_PUBLIC_ORIGIN=https://18-194-171-29.sslip.io \
  npm run smoke:aws-development:web

E2E_BASE_URL=https://18-194-171-29.sslip.io \
E2E_EXTERNAL_WEB_SERVER=true \
  npm run e2e:aws-development:web
```

Also verify on the host that TCP 8000, 5432, and 6543 bind only to
`127.0.0.1`, and that direct access to either sensitive Function without the
gateway token returns `403 SENSITIVE_GATEWAY_REQUIRED`.

# Assumptions

## Product

- The platform is company-internal and not public-facing.
- Initial user-facing language is Turkish.
- Future localization should be possible without rewriting business logic.
- Organization hierarchy can change over time, so historical memberships and manager assignments must be preserved.

## Security

- Supabase Auth is the intended identity provider.
- Supabase Edge Functions are the intended trusted server-side execution boundary.
- Encryption keys will be provided through secure server-side environment configuration outside Git.
- The first anonymous submission model provides application-level unlinkability, not full cryptographic anonymity.
- A stronger blind-signature or equivalent credential model may be introduced later.
- Raw anonymous credentials live only in transient trusted-process and React component memory; browser persistence and request logging remain forbidden.
- The linked Supabase encryption key is synthetic-development-only and must be replaced before any live employee content is accepted.

## Operations

- The current workspace is initialized as a Git repository and tracks `origin/main`.
- Only public Supabase frontend values are available in the workspace.
- External dependencies were installed for the React/Vite scaffold after approval.
- Local development uses Vite on `http://127.0.0.1:5173/` when the dev server is running.
- The linked Supabase project ref is `daxaymcmtbmummrxdyjy`.
- Docker Desktop is required before local Supabase stack commands can run.
- The commercial default is vendor-hosted shared SaaS; dedicated customer-managed installation is supported when contractual or compliance needs require it.
- Dedicated deployments use one official self-hosted Supabase stack per customer and keep application tenant checks enabled.
- Linux with Docker Engine and Docker Compose v2 is the preferred dedicated production baseline.
- Customer-managed operators own TLS, infrastructure patching, backups, recovery, availability, monitoring, SMTP, and secret management.
- The same frontend image is configured at container startup with public Supabase values; server secrets never enter browser assets.
- GitHub repository target is `yusuffurkanaksar55/yanki`.
- GitHub remote `origin` is configured as `https://github.com/yusuffurkanaksar55/yanki.git`.
- Supabase Auth Email provider is enabled in the dashboard.
- Supabase Auth Site URL is configured as `http://127.0.0.1:5173`.
- Supabase Auth redirect URLs include `http://127.0.0.1:5173` and `http://localhost:5173`.
- Invitation creation and redemption will require trusted Edge Functions and must not be implemented directly in the browser.
- Development and acceptance testing can use synthetic users instead of live employees.
- The default synthetic hierarchy is CEO, HR admin, team leader, and three employees, but real organization structures must remain configurable.
- Demo fixture users require a service-role key provided through a local environment variable and are not created by normal `npm run check`.
- The demo fixture may create a synthetic project and time-bound evaluation cycle for acceptance testing; these records remain non-production data.

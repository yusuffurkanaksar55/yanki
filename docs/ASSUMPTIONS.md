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

## Operations

- The current workspace is initialized as a Git repository and tracks `origin/main`.
- Only public Supabase frontend values are available in the workspace.
- External dependencies were installed for the React/Vite scaffold after approval.
- Local development uses Vite on `http://127.0.0.1:5173/` when the dev server is running.
- The linked Supabase project ref is `daxaymcmtbmummrxdyjy`.
- Docker Desktop is required before local Supabase stack commands can run.
- GitHub repository target is `yusuffurkanaksar55/yanki`.
- GitHub remote `origin` is configured as `https://github.com/yusuffurkanaksar55/yanki.git`.
- Supabase Auth Email provider is enabled in the dashboard.
- Supabase Auth Site URL is configured as `http://127.0.0.1:5173`.
- Supabase Auth redirect URLs include `http://127.0.0.1:5173` and `http://localhost:5173`.
- Invitation creation and redemption will require trusted Edge Functions and must not be implemented directly in the browser.

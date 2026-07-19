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

- The current workspace is empty and not initialized as a Git repository.
- No Supabase project credentials are available in this workspace.
- External dependencies were installed for the React/Vite scaffold after approval.
- Local development uses Vite on `http://127.0.0.1:5173/` when the dev server is running.
- The linked Supabase project ref is `daxaymcmtbmummrxdyjy`.
- Docker Desktop is required before local Supabase stack commands can run.
- GitHub repository target is `yusuffurkanaksar55/yanki`.
- GitHub remote `origin` is configured as `https://github.com/yusuffurkanaksar55/yanki.git`.

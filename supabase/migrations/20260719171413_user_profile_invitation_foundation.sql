create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  onboarding_status text not null default 'INVITED',
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_email_not_blank check (length(btrim(email)) > 0),
  constraint user_profiles_email_format_check check (position('@' in email) > 1),
  constraint user_profiles_display_name_not_blank check (
    display_name is null or length(btrim(display_name)) > 0
  ),
  constraint user_profiles_onboarding_status_check check (
    onboarding_status in ('INVITED', 'ACTIVE', 'SUSPENDED')
  ),
  constraint user_profiles_active_requires_activation_time check (
    onboarding_status <> 'ACTIVE' or activated_at is not null
  )
);

create unique index user_profiles_email_unique_idx
on public.user_profiles (lower(email));

create index user_profiles_status_lookup_idx
on public.user_profiles (onboarding_status, created_at desc);

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

create policy user_profiles_select_own_profile
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

create table public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null,
  invited_role_code text not null references public.app_roles (role_code),
  invited_scope_type text not null references public.scope_types (scope_type),
  invited_scope_id uuid,
  invited_by_user_id uuid references auth.users (id) on delete set null,
  accepted_by_user_id uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_invitations_email_not_blank check (length(btrim(email)) > 0),
  constraint user_invitations_email_format_check check (position('@' in email) > 1),
  constraint user_invitations_token_hash_not_blank check (
    length(btrim(token_hash)) >= 32
  ),
  constraint user_invitations_valid_window check (expires_at > created_at),
  constraint user_invitations_scope_pair_check check (
    (invited_scope_type = 'ORGANIZATION' and invited_scope_id is null)
    or (invited_scope_type <> 'ORGANIZATION' and invited_scope_id is not null)
  ),
  constraint user_invitations_accepted_user_pair_check check (
    (accepted_at is null and accepted_by_user_id is null)
    or (accepted_at is not null and accepted_by_user_id is not null)
  ),
  constraint user_invitations_single_terminal_state_check check (
    not (accepted_at is not null and revoked_at is not null)
  )
);

create unique index user_invitations_token_hash_unique_idx
on public.user_invitations (token_hash);

create unique index user_invitations_open_scope_unique_idx
on public.user_invitations (
  lower(email),
  invited_role_code,
  invited_scope_type,
  coalesce(invited_scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where accepted_at is null and revoked_at is null;

create index user_invitations_email_lookup_idx
on public.user_invitations (lower(email), created_at desc);

create index user_invitations_expiration_lookup_idx
on public.user_invitations (expires_at)
where accepted_at is null and revoked_at is null;

create trigger user_invitations_set_updated_at
before update on public.user_invitations
for each row
execute function public.set_updated_at();

alter table public.user_invitations enable row level security;

comment on table public.user_profiles is
  'Identity and onboarding metadata for authenticated users. This table does not store evaluation content or evaluator-to-response linkage.';

comment on column public.user_profiles.onboarding_status is
  'Lifecycle status for account onboarding. Sensitive authorization decisions must still be enforced in trusted server-side code.';

comment on table public.user_invitations is
  'Trusted server-side invitation records. Store only hashed invitation secrets and safe onboarding metadata.';

comment on column public.user_invitations.token_hash is
  'Hash of the invitation secret. Never store the raw invitation secret in the database, browser, logs, or documentation.';

create table public.evaluation_encryption_recovery_canaries (
  environment_id text not null,
  encryption_key_version text not null,
  encrypted_canary bytea not null,
  nonce bytea not null,
  canary_digest bytea not null,
  context_version smallint not null default 1,
  refreshed_at timestamptz not null default now(),
  primary key (environment_id, encryption_key_version),
  constraint evaluation_encryption_recovery_environment_check check (
    environment_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'
  ),
  constraint evaluation_encryption_recovery_key_version_check check (
    encryption_key_version ~ '^[A-Z][A-Z0-9_]{0,47}$'
  ),
  constraint evaluation_encryption_recovery_ciphertext_check check (
    octet_length(encrypted_canary) between 17 and 4096
  ),
  constraint evaluation_encryption_recovery_nonce_check check (
    octet_length(nonce) = 12
  ),
  constraint evaluation_encryption_recovery_digest_check check (
    octet_length(canary_digest) = 32
  ),
  constraint evaluation_encryption_recovery_context_check check (
    context_version = 1
  )
);

alter table public.evaluation_encryption_recovery_canaries enable row level security;

revoke all on table public.evaluation_encryption_recovery_canaries
from public, anon, authenticated, service_role;

create or replace function public.upsert_evaluation_encryption_recovery_canaries(
  managed_environment_id text,
  managed_canaries jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  canary jsonb;
  canary_count integer;
  canary_key_version text;
  decoded_canary bytea;
  decoded_nonce bytea;
  decoded_digest bytea;
  seen_key_versions text[] := array[]::text[];
begin
  if managed_environment_id is null
    or managed_environment_id !~ '^[a-z0-9][a-z0-9_-]{2,63}$' then
    raise exception 'RECOVERY_CANARY_ENVIRONMENT_INVALID';
  end if;

  if managed_canaries is null or jsonb_typeof(managed_canaries) <> 'array' then
    raise exception 'RECOVERY_CANARY_SET_INVALID';
  end if;

  canary_count := jsonb_array_length(managed_canaries);

  if canary_count not between 1 and 32 then
    raise exception 'RECOVERY_CANARY_SET_INVALID';
  end if;

  for canary in
    select item.value
    from jsonb_array_elements(managed_canaries) item(value)
  loop
    if jsonb_typeof(canary) <> 'object'
      or not (canary ?& array[
        'encryptionKeyVersion',
        'encryptedCanary',
        'nonce',
        'canaryDigest',
        'contextVersion'
      ])
      or (canary - array[
        'encryptionKeyVersion',
        'encryptedCanary',
        'nonce',
        'canaryDigest',
        'contextVersion'
      ]::text[]) <> '{}'::jsonb then
      raise exception 'RECOVERY_CANARY_INVALID';
    end if;

    canary_key_version := canary ->> 'encryptionKeyVersion';

    if canary_key_version is null
      or canary_key_version !~ '^[A-Z][A-Z0-9_]{0,47}$'
      or (canary ->> 'contextVersion') !~ '^[0-9]+$'
      or (canary ->> 'contextVersion')::integer <> 1
      or canary_key_version = any(seen_key_versions) then
      raise exception 'RECOVERY_CANARY_INVALID';
    end if;

    seen_key_versions := array_append(seen_key_versions, canary_key_version);

    begin
      decoded_canary := decode(canary ->> 'encryptedCanary', 'base64');
      decoded_nonce := decode(canary ->> 'nonce', 'base64');
      decoded_digest := decode(canary ->> 'canaryDigest', 'base64');
    exception when others then
      raise exception 'RECOVERY_CANARY_INVALID';
    end;

    if octet_length(decoded_canary) not between 17 and 4096
      or octet_length(decoded_nonce) <> 12
      or octet_length(decoded_digest) <> 32 then
      raise exception 'RECOVERY_CANARY_INVALID';
    end if;

    insert into public.evaluation_encryption_recovery_canaries (
      environment_id,
      encryption_key_version,
      encrypted_canary,
      nonce,
      canary_digest,
      context_version,
      refreshed_at
    ) values (
      managed_environment_id,
      canary_key_version,
      decoded_canary,
      decoded_nonce,
      decoded_digest,
      1,
      clock_timestamp()
    )
    on conflict (environment_id, encryption_key_version) do update
    set encrypted_canary = excluded.encrypted_canary,
        nonce = excluded.nonce,
        canary_digest = excluded.canary_digest,
        context_version = excluded.context_version,
        refreshed_at = excluded.refreshed_at;
  end loop;

  return canary_count;
end;
$$;

revoke all on function public.upsert_evaluation_encryption_recovery_canaries(
  text,
  jsonb
) from public, anon, authenticated;
grant execute on function public.upsert_evaluation_encryption_recovery_canaries(
  text,
  jsonb
) to service_role;

comment on table public.evaluation_encryption_recovery_canaries
is 'Stores only encrypted random recovery canaries and non-identifying cryptographic metadata. It never stores evaluation content, evaluator identity, or key material.';

comment on function public.upsert_evaluation_encryption_recovery_canaries(
  text,
  jsonb
)
is 'Allows trusted operator code to atomically refresh encrypted synthetic recovery canaries without releasing table access or key material.';

create or replace function public.list_referenced_evaluation_encryption_key_versions()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array_agg(key_usage.encryption_key_version order by key_usage.encryption_key_version),
    array[]::text[]
  )
  from (
    select distinct submission.encryption_key_version
    from public.encrypted_evaluation_submissions submission
  ) key_usage;
$$;

revoke all on function public.list_referenced_evaluation_encryption_key_versions()
from public, anon, authenticated;
grant execute on function public.list_referenced_evaluation_encryption_key_versions()
to service_role;

comment on function public.list_referenced_evaluation_encryption_key_versions()
is 'Returns only distinct encryption key version identifiers referenced by stored ciphertext. Restricted to trusted service code and never releases ciphertext, content, identities, counts, or timestamps.';

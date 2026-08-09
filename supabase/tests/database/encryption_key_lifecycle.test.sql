begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

select has_function(
  'public',
  'list_referenced_evaluation_encryption_key_versions',
  array[]::text[],
  'The trusted key-usage inventory function exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.list_referenced_evaluation_encryption_key_versions()',
    'EXECUTE'
  ),
  'Trusted service code can inspect referenced key versions'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.list_referenced_evaluation_encryption_key_versions()',
    'EXECUTE'
  ),
  'Authenticated browser clients cannot inspect referenced key versions directly'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.list_referenced_evaluation_encryption_key_versions()',
    'EXECUTE'
  ),
  'Anonymous clients cannot inspect referenced key versions'
);

select is(
  public.list_referenced_evaluation_encryption_key_versions(),
  (
    select coalesce(
      array_agg(key_usage.encryption_key_version order by key_usage.encryption_key_version),
      array[]::text[]
    )
    from (
      select distinct submission.encryption_key_version
      from public.encrypted_evaluation_submissions submission
    ) key_usage
  ),
  'The inventory returns the exact distinct key versions referenced by stored ciphertext'
);

select * from finish();

rollback;

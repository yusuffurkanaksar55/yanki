begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_table(
  'public',
  'evaluation_encryption_recovery_canaries',
  'The encrypted recovery canary table exists'
);

select columns_are(
  'public',
  'evaluation_encryption_recovery_canaries',
  array[
    'environment_id',
    'encryption_key_version',
    'encrypted_canary',
    'nonce',
    'canary_digest',
    'context_version',
    'refreshed_at'
  ],
  'Recovery canaries contain only synthetic cryptographic metadata'
);

select ok(
  (
    select class.relrowsecurity
    from pg_catalog.pg_class class
    join pg_catalog.pg_namespace namespace
      on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = 'evaluation_encryption_recovery_canaries'
  ),
  'RLS is enabled on recovery canaries'
);

select ok(
  not has_table_privilege(
    'anon',
    'public.evaluation_encryption_recovery_canaries',
    'SELECT'
  ),
  'Anonymous clients cannot read recovery canaries'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.evaluation_encryption_recovery_canaries',
    'SELECT'
  ),
  'Authenticated clients cannot read recovery canaries'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.evaluation_encryption_recovery_canaries',
    'SELECT'
  ),
  'Service-role code cannot bypass the canary RPC with direct reads'
);

select has_function(
  'public',
  'upsert_evaluation_encryption_recovery_canaries',
  array['text', 'jsonb'],
  'The trusted recovery canary upsert function exists'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.upsert_evaluation_encryption_recovery_canaries(text,jsonb)',
    'EXECUTE'
  ),
  'Trusted operator code can refresh recovery canaries'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.upsert_evaluation_encryption_recovery_canaries(text,jsonb)',
    'EXECUTE'
  ),
  'Authenticated clients cannot write recovery canaries'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.upsert_evaluation_encryption_recovery_canaries(text,jsonb)',
    'EXECUTE'
  ),
  'Anonymous clients cannot write recovery canaries'
);

select is(
  public.upsert_evaluation_encryption_recovery_canaries(
    'local-recovery-test',
    jsonb_build_array(jsonb_build_object(
      'encryptionKeyVersion', 'LOCAL_RECOVERY_TEST',
      'encryptedCanary', encode(decode(repeat('01', 48), 'hex'), 'base64'),
      'nonce', encode(decode(repeat('02', 12), 'hex'), 'base64'),
      'canaryDigest', encode(decode(repeat('03', 32), 'hex'), 'base64'),
      'contextVersion', 1
    ))
  ),
  1,
  'Trusted code can insert one encrypted synthetic canary'
);

select is(
  (
    select count(*)::integer
    from public.evaluation_encryption_recovery_canaries canary
    where canary.environment_id = 'local-recovery-test'
  ),
  1,
  'Exactly one canary is stored for an environment and key version'
);

select ok(
  (
    select octet_length(canary.encrypted_canary) = 48
      and octet_length(canary.nonce) = 12
      and octet_length(canary.canary_digest) = 32
      and canary.context_version = 1
    from public.evaluation_encryption_recovery_canaries canary
    where canary.environment_id = 'local-recovery-test'
  ),
  'Stored canary values preserve reviewed cryptographic lengths'
);

select throws_ok(
  $$
    select public.upsert_evaluation_encryption_recovery_canaries(
      'local-recovery-test',
      '[{"unexpected":"field"}]'::jsonb
    )
  $$,
  'P0001',
  'RECOVERY_CANARY_INVALID',
  'Unexpected canary fields are rejected'
);

select throws_ok(
  $$
    select public.upsert_evaluation_encryption_recovery_canaries(
      'local-recovery-test',
      jsonb_build_array(
        jsonb_build_object(
          'encryptionKeyVersion', 'DUPLICATE_TEST',
          'encryptedCanary', encode(decode(repeat('01', 48), 'hex'), 'base64'),
          'nonce', encode(decode(repeat('02', 12), 'hex'), 'base64'),
          'canaryDigest', encode(decode(repeat('03', 32), 'hex'), 'base64'),
          'contextVersion', 1
        ),
        jsonb_build_object(
          'encryptionKeyVersion', 'DUPLICATE_TEST',
          'encryptedCanary', encode(decode(repeat('04', 48), 'hex'), 'base64'),
          'nonce', encode(decode(repeat('05', 12), 'hex'), 'base64'),
          'canaryDigest', encode(decode(repeat('06', 32), 'hex'), 'base64'),
          'contextVersion', 1
        )
      )
    )
  $$,
  'P0001',
  'RECOVERY_CANARY_INVALID',
  'Duplicate key versions are rejected by the database boundary'
);

select * from finish();

rollback;

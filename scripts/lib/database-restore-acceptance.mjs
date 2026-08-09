import { spawnSync } from "node:child_process";
import {
  loadCustodiedEncryptionKeys,
  readKeyCustodyManifest,
  verifyEncryptionRecoveryCanaries
} from "./encryption-key-custody.mjs";

const expectedChecks = [
  "schemaMigrationsPresent",
  "encryptedSubmissionsPresent",
  "retentionPoliciesPresent",
  "retentionExecutorPresent",
  "recoveryCanariesPresent",
  "browserCiphertextReadDenied",
  "browserRetentionExecutionDenied",
  "browserRecoveryCanaryReadDenied",
  "serviceRecoveryCanaryReadDenied"
];

export function assertDisposableDatabaseTarget(
  sourceDatabase,
  targetDatabase,
  requiredSuffix
) {
  const targetPattern = new RegExp(
    `^[a-z][a-z0-9_]*${escapeRegExp(requiredSuffix)}$`,
    "u"
  );

  if (!targetPattern.test(targetDatabase)) {
    throw new Error(
      `The disposable target database must end in ${requiredSuffix}.`
    );
  }

  if (sourceDatabase && sourceDatabase === targetDatabase) {
    throw new Error("The source and disposable restore databases must differ.");
  }
}

export function inspectDatabaseContainer(containerName) {
  runDocker(["inspect", "--type", "container", containerName]);
}

export function createDisposableDatabase({
  containerName,
  databaseUser,
  targetDatabase
}) {
  runDocker([
    "exec",
    containerName,
    "dropdb",
    "--if-exists",
    "--force",
    "--username",
    databaseUser,
    targetDatabase
  ]);
  runDocker([
    "exec",
    containerName,
    "createdb",
    "--username",
    databaseUser,
    targetDatabase
  ]);
}

export function dropDisposableDatabase({
  containerName,
  databaseUser,
  targetDatabase
}) {
  runDocker([
    "exec",
    containerName,
    "dropdb",
    "--if-exists",
    "--force",
    "--username",
    databaseUser,
    targetDatabase
  ]);
}

export async function verifyRestoredDatabase({
  containerName,
  databaseUser,
  targetDatabase,
  requireEncryptionRecovery = false,
  expectedEnvironmentId,
  keyCustodyManifestPath,
  encryptionEnvironment = process.env
}) {
  const verification = runDocker([
    "exec",
    containerName,
    "psql",
    "--username",
    databaseUser,
    "--dbname",
    targetDatabase,
    "--tuples-only",
    "--no-align",
    "--command",
    `select jsonb_build_object(
      'schemaMigrationsPresent',
        to_regclass('supabase_migrations.schema_migrations') is not null,
      'encryptedSubmissionsPresent',
        to_regclass('public.encrypted_evaluation_submissions') is not null,
      'retentionPoliciesPresent',
        to_regclass('public.organization_evaluation_retention_policies') is not null,
      'retentionExecutorPresent',
        to_regprocedure('public.execute_due_evaluation_content_retention()') is not null,
      'recoveryCanariesPresent',
        to_regclass('public.evaluation_encryption_recovery_canaries') is not null,
      'browserCiphertextReadDenied',
        not has_table_privilege(
          'authenticated',
          'public.encrypted_evaluation_submissions',
          'SELECT'
        ),
      'browserRetentionExecutionDenied',
        not has_function_privilege(
          'authenticated',
          'public.execute_due_evaluation_content_retention()',
          'EXECUTE'
        ),
      'browserRecoveryCanaryReadDenied',
        not has_table_privilege(
          'authenticated',
          'public.evaluation_encryption_recovery_canaries',
          'SELECT'
        ),
      'serviceRecoveryCanaryReadDenied',
        not has_table_privilege(
          'service_role',
          'public.evaluation_encryption_recovery_canaries',
          'SELECT'
        )
    );`
  ]).trim();
  const verificationResult = JSON.parse(verification);

  if (expectedChecks.some((check) => verificationResult[check] !== true)) {
    throw new Error("Restored database security verification failed.");
  }

  let encryptionRecovery = { required: false };

  if (requireEncryptionRecovery) {
    const manifest = await readKeyCustodyManifest(keyCustodyManifestPath);

    if (
      expectedEnvironmentId
      && manifest.environmentId !== expectedEnvironmentId
    ) {
      throw new Error(
        "The key custody manifest does not match the restored environment."
      );
    }

    const keys = loadCustodiedEncryptionKeys(manifest, encryptionEnvironment);
    const canaryRows = JSON.parse(runDocker([
      "exec",
      containerName,
      "psql",
      "--username",
      databaseUser,
      "--dbname",
      targetDatabase,
      "--tuples-only",
      "--no-align",
      "--command",
      `select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'encryptionKeyVersion', canary.encryption_key_version,
            'encryptedCanary', encode(canary.encrypted_canary, 'base64'),
            'nonce', encode(canary.nonce, 'base64'),
            'canaryDigest', encode(canary.canary_digest, 'base64'),
            'contextVersion', canary.context_version
          ) order by canary.encryption_key_version
        ),
        '[]'::jsonb
      )
      from public.evaluation_encryption_recovery_canaries canary
      where canary.environment_id = ${quoteSqlLiteral(manifest.environmentId)};`
    ]).trim());

    encryptionRecovery = await verifyEncryptionRecoveryCanaries(
      manifest,
      keys,
      canaryRows
    );
  }

  return {
    encryptionRecovery,
    verification: verificationResult
  };
}

export function createDockerRestoreProcess({
  containerName,
  databaseUser,
  targetDatabase
}) {
  return {
    command: "docker",
    argumentsList: [
      "exec",
      "--interactive",
      containerName,
      "pg_restore",
      "--exit-on-error",
      "--no-owner",
      "--username",
      databaseUser,
      "--dbname",
      targetDatabase
    ],
    label: "pg_restore"
  };
}

export function runDocker(argumentsList) {
  const result = spawnSync("docker", argumentsList, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true
  });

  if (result.error) {
    throw new Error(`Docker command could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error("Docker database operation failed.");
  }

  return result.stdout;
}

function quoteSqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  loadCustodiedEncryptionKeys,
  readKeyCustodyManifest,
  verifyEncryptionRecoveryCanaries
} from "./lib/encryption-key-custody.mjs";

const expectedConfirmation = "RUN_DISPOSABLE_BACKUP_RESTORE_ACCEPTANCE";
const confirmation = process.env.BACKUP_RESTORE_ACCEPTANCE_CONFIRM;

if (confirmation !== expectedConfirmation) {
  fail(
    `Set BACKUP_RESTORE_ACCEPTANCE_CONFIRM=${expectedConfirmation} before `
      + "running the disposable restore drill."
  );
}

const containerName = process.env.BACKUP_ACCEPTANCE_DB_CONTAINER?.trim()
  || "supabase_db_anonim_degerlendirme";
const sourceDatabase = process.env.BACKUP_ACCEPTANCE_SOURCE_DATABASE?.trim()
  || "postgres";
const targetDatabase = process.env.BACKUP_ACCEPTANCE_TARGET_DATABASE?.trim()
  || "yanki_restore_acceptance";
const databaseUser = process.env.BACKUP_ACCEPTANCE_DATABASE_USER?.trim()
  || "supabase_admin";
const requireEncryptionRecovery =
  process.env.BACKUP_RESTORE_REQUIRE_ENCRYPTION_RECOVERY === "true";

if (!/^[a-z][a-z0-9_]*_restore_acceptance$/u.test(targetDatabase)) {
  fail(
    "BACKUP_ACCEPTANCE_TARGET_DATABASE must be a disposable database name "
      + "ending in _restore_acceptance."
  );
}

if (sourceDatabase === targetDatabase) {
  fail("The source and disposable restore databases must be different.");
}

runDocker(["inspect", "--type", "container", containerName]);

let targetCreated = false;
let acceptanceReport;

try {
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
  targetCreated = true;

  const dumpStream = await runDockerDumpToRestore(
    [
      "exec",
      containerName,
      "pg_dump",
      "--format=custom",
      "--compress=9",
      "--username",
      databaseUser,
      sourceDatabase
    ],
    [
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
    ]
  );

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

  if (expectedChecks.some((check) => verificationResult[check] !== true)) {
    fail(
      `Restored database verification failed: ${JSON.stringify(
        verificationResult
      )}`
    );
  }

  let encryptionRecovery;

  if (requireEncryptionRecovery) {
    const manifest = await readKeyCustodyManifest(
      process.env.EVALUATION_KEY_CUSTODY_MANIFEST_PATH
    );
    const keys = loadCustodiedEncryptionKeys(manifest);
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

  acceptanceReport = {
    dumpStreamSha256: dumpStream.sha256,
    dumpStreamSizeBytes: dumpStream.sizeBytes,
    disposableTargetRemoved: true,
    encryptionRecovery: encryptionRecovery ?? { required: false },
    restoreVerified: true,
    temporaryDumpWritten: false,
    verification: verificationResult
  };
} finally {
  if (targetCreated) {
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
}

if (acceptanceReport) {
  console.log(JSON.stringify(acceptanceReport, null, 2));
}

function runDocker(argumentsList, ignoreFailure = false) {
  const result = spawnSync("docker", argumentsList, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true
  });

  if (result.error) {
    if (ignoreFailure) {
      return "";
    }

    fail(`Docker command could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    if (ignoreFailure) {
      return "";
    }

    fail(
      `Docker command failed: ${(result.stderr || result.stdout).trim()}`
    );
  }

  return result.stdout;
}

async function runDockerDumpToRestore(dumpArguments, restoreArguments) {
  const dumpProcess = spawn("docker", dumpArguments, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  const restoreProcess = spawn("docker", restoreArguments, {
    stdio: ["pipe", "ignore", "pipe"],
    windowsHide: true
  });
  const dumpErrors = [];
  const restoreErrors = [];
  const hash = createHash("sha256");
  let sizeBytes = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      sizeBytes += chunk.length;
      callback(null, chunk);
    }
  });

  dumpProcess.stderr.on("data", (chunk) => dumpErrors.push(chunk));
  restoreProcess.stderr.on("data", (chunk) => restoreErrors.push(chunk));

  try {
    await Promise.all([
      pipeline(dumpProcess.stdout, meter, restoreProcess.stdin),
      waitForProcess(dumpProcess, "pg_dump", dumpErrors),
      waitForProcess(restoreProcess, "pg_restore", restoreErrors)
    ]);
  } catch (error) {
    dumpProcess.kill();
    restoreProcess.kill();
    throw error;
  }

  return { sha256: hash.digest("hex"), sizeBytes };
}

function waitForProcess(child, label, errorChunks) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(
        `${label} failed: ${Buffer.concat(errorChunks).toString("utf8").trim()}`
      ));
    });
  });
}

function fail(message) {
  throw new Error(message);
}

function quoteSqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

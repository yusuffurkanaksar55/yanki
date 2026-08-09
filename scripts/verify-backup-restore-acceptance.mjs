import {
  assertDisposableDatabaseTarget,
  createDisposableDatabase,
  createDockerRestoreProcess,
  dropDisposableDatabase,
  inspectDatabaseContainer,
  verifyRestoredDatabase
} from "./lib/database-restore-acceptance.mjs";
import { streamProcessToProcess } from "./lib/stream-processes.mjs";

const expectedConfirmation = "RUN_DISPOSABLE_BACKUP_RESTORE_ACCEPTANCE";

if (process.env.BACKUP_RESTORE_ACCEPTANCE_CONFIRM !== expectedConfirmation) {
  throw new Error(
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

assertDisposableDatabaseTarget(
  sourceDatabase,
  targetDatabase,
  "_restore_acceptance"
);
inspectDatabaseContainer(containerName);

let targetCreated = false;
let acceptanceReport;

try {
  createDisposableDatabase({
    containerName,
    databaseUser,
    targetDatabase
  });
  targetCreated = true;

  const dumpStream = await streamProcessToProcess(
    {
      command: "docker",
      argumentsList: [
        "exec",
        containerName,
        "pg_dump",
        "--format=custom",
        "--compress=9",
        "--username",
        databaseUser,
        sourceDatabase
      ],
      label: "pg_dump"
    },
    createDockerRestoreProcess({
      containerName,
      databaseUser,
      targetDatabase
    })
  );
  const restored = await verifyRestoredDatabase({
    containerName,
    databaseUser,
    targetDatabase,
    requireEncryptionRecovery,
    keyCustodyManifestPath:
      process.env.EVALUATION_KEY_CUSTODY_MANIFEST_PATH
  });

  acceptanceReport = {
    dumpStreamSha256: dumpStream.sha256,
    dumpStreamSizeBytes: dumpStream.sizeBytes,
    disposableTargetRemoved: true,
    encryptionRecovery: restored.encryptionRecovery,
    restoreVerified: true,
    temporaryDumpWritten: false,
    verification: restored.verification
  };
} finally {
  if (targetCreated) {
    dropDisposableDatabase({
      containerName,
      databaseUser,
      targetDatabase
    });
  }
}

if (acceptanceReport) {
  console.log(JSON.stringify(acceptanceReport, null, 2));
}

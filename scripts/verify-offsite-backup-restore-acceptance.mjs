import {
  assertDisposableDatabaseTarget,
  createDisposableDatabase,
  createDockerRestoreProcess,
  dropDisposableDatabase,
  inspectDatabaseContainer,
  verifyRestoredDatabase
} from "./lib/database-restore-acceptance.mjs";
import {
  assertResticVersion,
  assertSnapshotMatches,
  readOffsiteBackupConfiguration,
  runRestic
} from "./lib/offsite-backup.mjs";
import { streamProcessToProcess } from "./lib/stream-processes.mjs";

const expectedConfirmation = "RUN_ENCRYPTED_OFFSITE_RESTORE_ACCEPTANCE";

if (process.env.OFFSITE_RESTORE_ACCEPTANCE_CONFIRM !== expectedConfirmation) {
  throw new Error(
    `Set OFFSITE_RESTORE_ACCEPTANCE_CONFIRM=${expectedConfirmation} before `
      + "running the encrypted off-site restore drill."
  );
}

const configuration = await readOffsiteBackupConfiguration();
const snapshotId = process.env.OFFSITE_RESTORE_SNAPSHOT_ID?.trim();

if (!snapshotId || !/^[a-f0-9]{64}$/u.test(snapshotId)) {
  throw new Error("OFFSITE_RESTORE_SNAPSHOT_ID must be one full snapshot id.");
}

const containerName = process.env.OFFSITE_RESTORE_DB_CONTAINER?.trim()
  || "supabase_db_anonim_degerlendirme";
const databaseUser = process.env.OFFSITE_RESTORE_DATABASE_USER?.trim()
  || "supabase_admin";
const targetDatabase = process.env.OFFSITE_RESTORE_TARGET_DATABASE?.trim()
  || "yanki_offsite_restore_acceptance";

assertDisposableDatabaseTarget(
  null,
  targetDatabase,
  "_offsite_restore_acceptance"
);
assertResticVersion(configuration.resticCommand);
const snapshotResult = await runRestic(
  configuration.resticCommand,
  ["snapshots", "--json", snapshotId]
);
const snapshots = JSON.parse(snapshotResult.stdout);

if (!Array.isArray(snapshots) || snapshots.length !== 1) {
  throw new Error("The selected off-site snapshot was not found exactly once.");
}

assertSnapshotMatches(snapshots[0], configuration, snapshotId);
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
      command: configuration.resticCommand,
      argumentsList: [
        "dump",
        snapshotId,
        configuration.stdinFilename
      ],
      environment: process.env,
      label: "restic dump"
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
    requireEncryptionRecovery: true,
    expectedEnvironmentId: configuration.environmentId,
    keyCustodyManifestPath:
      process.env.EVALUATION_KEY_CUSTODY_MANIFEST_PATH
  });

  acceptanceReport = {
    databaseAndKeysRecovered: true,
    decryptedDumpSha256: dumpStream.sha256,
    decryptedDumpSizeBytes: dumpStream.sizeBytes,
    disposableTargetRemoved: true,
    encryptionRecovery: restored.encryptionRecovery,
    repositoryLocatorLogged: false,
    snapshotId,
    snapshotScopeVerified: true,
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

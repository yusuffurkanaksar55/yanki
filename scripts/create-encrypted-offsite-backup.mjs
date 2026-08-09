import {
  assertResticVersion,
  buildResticBackupArguments,
  createBackupSource,
  parseBackupSummary,
  readOffsiteBackupConfiguration,
  runRestic
} from "./lib/offsite-backup.mjs";

const expectedConfirmation = "CREATE_ENCRYPTED_OFFSITE_BACKUP";

if (process.env.OFFSITE_BACKUP_CREATE_CONFIRM !== expectedConfirmation) {
  throw new Error(
    `Set OFFSITE_BACKUP_CREATE_CONFIRM=${expectedConfirmation} before `
      + "creating an encrypted off-site snapshot."
  );
}

const configuration = await readOffsiteBackupConfiguration();
const source = createBackupSource();
assertResticVersion(configuration.resticCommand);
const result = await runRestic(
  configuration.resticCommand,
  buildResticBackupArguments(configuration, source),
  source.environment
);
const summary = parseBackupSummary(result.stdout);

console.log(JSON.stringify({
  encryptedSnapshotCreated: true,
  keyMaterialLogged: false,
  repositoryBytesAdded: summary.repositoryBytesAdded,
  repositoryLocatorLogged: false,
  snapshotId: summary.snapshotId,
  sourceBytes: summary.sourceBytes,
  sourceMode: source.mode,
  temporaryDumpWritten: false
}, null, 2));

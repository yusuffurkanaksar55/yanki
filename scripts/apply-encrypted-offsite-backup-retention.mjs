import {
  assertResticVersion,
  buildResticRetentionArguments,
  readOffsiteBackupConfiguration,
  readRetentionPolicy,
  runRestic
} from "./lib/offsite-backup.mjs";

const expectedConfirmation = "APPLY_ENCRYPTED_OFFSITE_RETENTION";

if (process.env.OFFSITE_BACKUP_RETENTION_CONFIRM !== expectedConfirmation) {
  throw new Error(
    `Set OFFSITE_BACKUP_RETENTION_CONFIRM=${expectedConfirmation} before `
      + "applying encrypted snapshot retention."
  );
}

const configuration = await readOffsiteBackupConfiguration();
const policy = readRetentionPolicy();
assertResticVersion(configuration.resticCommand);
await runRestic(
  configuration.resticCommand,
  buildResticRetentionArguments(configuration, policy)
);

console.log(JSON.stringify({
  keyMaterialLogged: false,
  policy,
  repositoryLocatorLogged: false,
  repositoryPruned: true,
  retentionApplied: true,
  scopeRestrictedToEnvironment: true
}, null, 2));

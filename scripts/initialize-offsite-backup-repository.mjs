import {
  assertResticVersion,
  readOffsiteBackupConfiguration,
  runRestic
} from "./lib/offsite-backup.mjs";

const expectedConfirmation = "INITIALIZE_ENCRYPTED_OFFSITE_REPOSITORY";

if (process.env.OFFSITE_BACKUP_REPOSITORY_INIT_CONFIRM !== expectedConfirmation) {
  throw new Error(
    `Set OFFSITE_BACKUP_REPOSITORY_INIT_CONFIRM=${expectedConfirmation} before `
      + "initializing the encrypted repository."
  );
}

const configuration = await readOffsiteBackupConfiguration();
assertResticVersion(configuration.resticCommand);
await runRestic(
  configuration.resticCommand,
  ["init", "--repository-version", "2"]
);

console.log(JSON.stringify({
  encryptedRepositoryInitialized: true,
  keyMaterialLogged: false,
  remoteRepository: configuration.remoteRepository,
  repositoryLocatorLogged: false,
  resticVersionVerified: true
}, null, 2));

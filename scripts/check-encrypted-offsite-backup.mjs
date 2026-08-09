import {
  assertResticVersion,
  readIntegritySubset,
  readOffsiteBackupConfiguration,
  runRestic
} from "./lib/offsite-backup.mjs";

const configuration = await readOffsiteBackupConfiguration();
const subset = readIntegritySubset(process.env.BACKUP_CHECK_READ_DATA_SUBSET);
assertResticVersion(configuration.resticCommand);
await runRestic(
  configuration.resticCommand,
  ["check", "--read-data-subset", subset]
);

console.log(JSON.stringify({
  encryptedRepositoryIntegrityVerified: true,
  keyMaterialLogged: false,
  readDataSubset: subset,
  repositoryLocatorLogged: false
}, null, 2));

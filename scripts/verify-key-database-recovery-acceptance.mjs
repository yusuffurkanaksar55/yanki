const expectedConfirmation = "RUN_KEY_DATABASE_RECOVERY_ACCEPTANCE";

if (process.env.KEY_DATABASE_RECOVERY_ACCEPTANCE_CONFIRM !== expectedConfirmation) {
  throw new Error(
    `Set KEY_DATABASE_RECOVERY_ACCEPTANCE_CONFIRM=${expectedConfirmation} before `
      + "running the combined key and database recovery drill."
  );
}

process.env.BACKUP_RESTORE_ACCEPTANCE_CONFIRM =
  "RUN_DISPOSABLE_BACKUP_RESTORE_ACCEPTANCE";
process.env.BACKUP_RESTORE_REQUIRE_ENCRYPTION_RECOVERY = "true";

await import("./verify-backup-restore-acceptance.mjs");

import { describe, expect, it } from "vitest";
import {
  assertSnapshotMatches,
  buildResticBackupArguments,
  buildResticRetentionArguments,
  createBackupSource,
  localRepositoryAcceptanceConfirmation,
  parseBackupSummary,
  readIntegritySubset,
  readOffsiteBackupConfiguration,
  readRetentionPolicy
} from "../scripts/lib/offsite-backup.mjs";

const snapshotId = "a".repeat(64);

describe("encrypted off-site backup configuration", () => {
  it("accepts a remote encrypted repository without exposing its locator", async () => {
    const configuration = await readOffsiteBackupConfiguration(
      createEnvironment()
    );

    expect(configuration).toEqual(expect.objectContaining({
      environmentId: "production-yanki",
      remoteRepository: true,
      stdinFilename: "yanki-postgresql-production-yanki.dump"
    }));
    expect(configuration.tags).toEqual([
      "yanki-postgres",
      "environment:production-yanki",
      "format:pgdump-custom-v1"
    ]);
    expect(configuration).not.toHaveProperty("repositoryLocator");
  });

  it("rejects local repositories unless acceptance-only use is explicit", async () => {
    await expect(readOffsiteBackupConfiguration({
      ...createEnvironment(),
      RESTIC_REPOSITORY: "D:/temporary/restic"
    })).rejects.toThrow(/acceptance testing/u);

    await expect(readOffsiteBackupConfiguration({
      ...createEnvironment(),
      RESTIC_REPOSITORY: "D:/temporary/restic",
      OFFSITE_BACKUP_ALLOW_LOCAL_REPOSITORY:
        localRepositoryAcceptanceConfirmation
    })).resolves.toEqual(expect.objectContaining({
      remoteRepository: false
    }));
  });

  it("keeps a managed database URL out of source command arguments", () => {
    const databaseUrl =
      "postgresql://backup-user:server-secret@db.example.com:5432/postgres";
    const source = createBackupSource({
      BACKUP_SOURCE_MODE: "DATABASE_URL",
      BACKUP_DATABASE_URL: databaseUrl
    });

    expect(source.argumentsList.join(" ")).not.toContain(databaseUrl);
    expect(source.environment.PGDATABASE).toBe(databaseUrl);
    expect(source.argumentsList).toContain("--no-password");
  });

  it("uses Restic source-command mode so pg_dump failure cancels the snapshot", async () => {
    const configuration = await readOffsiteBackupConfiguration(
      createEnvironment()
    );
    const source = createBackupSource({
      BACKUP_SOURCE_MODE: "DOCKER",
      BACKUP_SOURCE_DB_CONTAINER: "supabase-db",
      BACKUP_SOURCE_DATABASE_USER: "supabase_admin",
      BACKUP_SOURCE_DATABASE: "postgres"
    });
    const argumentsList = buildResticBackupArguments(configuration, source);

    expect(argumentsList).toContain("--stdin-from-command");
    expect(argumentsList).not.toContain("--stdin");
    expect(argumentsList).toContain("pg_dump");
    expect(argumentsList).toContain("--compress=0");
  });

  it("scopes retention to the exact host, path, and combined tags", async () => {
    const configuration = await readOffsiteBackupConfiguration(
      createEnvironment()
    );
    const policy = readRetentionPolicy({
      BACKUP_KEEP_DAILY: "14",
      BACKUP_KEEP_WEEKLY: "8",
      BACKUP_KEEP_MONTHLY: "6",
      BACKUP_KEEP_YEARLY: "0"
    });
    const argumentsList = buildResticRetentionArguments(
      configuration,
      policy
    );

    expect(argumentsList).toContain("--prune");
    expect(argumentsList).toContain("production-yanki");
    expect(argumentsList).toContain(configuration.tags.join(","));
    expect(argumentsList).toContain("host,paths,tags");
  });

  it("validates exact snapshot scope and a complete JSON summary", async () => {
    const configuration = await readOffsiteBackupConfiguration(
      createEnvironment()
    );
    const snapshot = {
      id: snapshotId,
      hostname: configuration.environmentId,
      paths: [`/${configuration.stdinFilename}`],
      tags: [...configuration.tags]
    };

    expect(assertSnapshotMatches(
      snapshot,
      configuration,
      snapshotId
    )).toBe(true);
    expect(assertSnapshotMatches(
      {
        ...snapshot,
        paths: [`D:\\${configuration.stdinFilename}`]
      },
      configuration,
      snapshotId
    )).toBe(true);
    expect(() => assertSnapshotMatches(
      { ...snapshot, hostname: "another-environment" },
      configuration,
      snapshotId
    )).toThrow(/does not match/u);
    expect(parseBackupSummary(JSON.stringify({
      message_type: "summary",
      snapshot_id: snapshotId,
      total_bytes_processed: 1200,
      data_added: 800
    }))).toEqual({
      snapshotId,
      sourceBytes: 1200,
      repositoryBytesAdded: 800
    });
  });

  it("validates bounded integrity subsets and non-empty retention", () => {
    expect(readIntegritySubset(undefined)).toBe("5%");
    expect(readIntegritySubset("0.5%")).toBe("0.5%");
    expect(readIntegritySubset("1/5")).toBe("1/5");
    expect(() => readIntegritySubset("0%")).toThrow(/greater than zero/u);
    expect(() => readIntegritySubset("6/5")).toThrow();
    expect(() => readRetentionPolicy({
      BACKUP_KEEP_DAILY: "0",
      BACKUP_KEEP_WEEKLY: "0",
      BACKUP_KEEP_MONTHLY: "0",
      BACKUP_KEEP_YEARLY: "0"
    })).toThrow(/At least one/u);
  });
});

function createEnvironment() {
  return {
    BACKUP_ENVIRONMENT_ID: "production-yanki",
    BACKUP_RESTIC_COMMAND: "restic",
    RESTIC_REPOSITORY: "s3:s3.example.com/yanki-backups",
    RESTIC_PASSWORD: "a-long-disposable-test-password"
  };
}

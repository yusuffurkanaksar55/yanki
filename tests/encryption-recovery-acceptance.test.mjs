import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(read("package.json"));
const provisionSource = read(
  "scripts/provision-encryption-recovery-canaries.mjs"
);
const acceptanceSource = read(
  "scripts/verify-key-database-recovery-acceptance.mjs"
);
const restoreSource = read("scripts/verify-backup-restore-acceptance.mjs");
const migrationSource = read(
  "supabase/migrations/20260809153000_encryption_recovery_canaries.sql"
);

describe("combined key and database recovery acceptance", () => {
  it("requires separate explicit confirmations for canary writes and recovery", () => {
    expect(provisionSource).toMatch(/UPSERT_ENCRYPTION_RECOVERY_CANARIES/u);
    expect(acceptanceSource).toMatch(/RUN_KEY_DATABASE_RECOVERY_ACCEPTANCE/u);
    expect(acceptanceSource).toMatch(
      /BACKUP_RESTORE_REQUIRE_ENCRYPTION_RECOVERY = "true"/u
    );
  });

  it("writes encrypted synthetic canaries only through a narrow trusted RPC", () => {
    expect(provisionSource).toMatch(
      /rpc\/upsert_evaluation_encryption_recovery_canaries/u
    );
    expect(provisionSource).toMatch(/SUPABASE_SERVICE_ROLE_KEY/u);
    expect(provisionSource).not.toMatch(/console\.log\([\s\S]*serviceRoleKey/u);
    expect(migrationSource).toMatch(
      /revoke all on table public\.evaluation_encryption_recovery_canaries[\s\S]*service_role/u
    );
  });

  it("decrypts canaries inside the disposable restore window", () => {
    expect(restoreSource).toMatch(/verifyEncryptionRecoveryCanaries/u);
    expect(restoreSource).toMatch(/evaluation_encryption_recovery_canaries/u);
    expect(restoreSource).toMatch(/finally \{[\s\S]*dropdb/u);
    expect(restoreSource).not.toMatch(/createWriteStream|mkdtempSync/u);
  });

  it("does not add identity or evaluation-content columns to the canary table", () => {
    const tableDefinition = migrationSource.match(
      /create table public\.evaluation_encryption_recovery_canaries \(([\s\S]*?)\n\);/u
    )?.[1] ?? "";

    expect(tableDefinition).not.toMatch(
      /organization_id|user_id|evaluator|subject|assignment|evaluation_content/u
    );
    expect(tableDefinition).toMatch(/encrypted_canary bytea not null/u);
    expect(tableDefinition).toMatch(/canary_digest bytea not null/u);
  });

  it("exposes validation, provisioning, and acceptance commands", () => {
    expect(packageJson.scripts["encryption:custody:validate"]).toBeTruthy();
    expect(packageJson.scripts["encryption:recovery:canary"]).toBeTruthy();
    expect(packageJson.scripts["encryption:recovery:acceptance"]).toBeTruthy();
  });
});

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

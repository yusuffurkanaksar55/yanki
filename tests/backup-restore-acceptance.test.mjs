import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scriptSource = read("scripts/verify-backup-restore-acceptance.mjs");
const packageJson = JSON.parse(read("package.json"));

describe("backup and restore acceptance foundation", () => {
  it("requires explicit confirmation and a protected disposable target name", () => {
    expect(scriptSource).toMatch(
      /RUN_DISPOSABLE_BACKUP_RESTORE_ACCEPTANCE/u
    );
    expect(scriptSource).toContain("_restore_acceptance$/u");
    expect(scriptSource).toMatch(/sourceDatabase === targetDatabase/u);
  });

  it("creates a compressed dump and restores it with fail-fast behavior", () => {
    expect(scriptSource).toMatch(/pg_dump/u);
    expect(scriptSource).toMatch(/--format=custom/u);
    expect(scriptSource).toMatch(/--compress=9/u);
    expect(scriptSource).toMatch(/pg_restore/u);
    expect(scriptSource).toMatch(/--exit-on-error/u);
  });

  it("verifies restored security boundaries without reading evaluation content", () => {
    expect(scriptSource).toMatch(/encryptedSubmissionsPresent/u);
    expect(scriptSource).toMatch(/browserCiphertextReadDenied/u);
    expect(scriptSource).toMatch(/browserRetentionExecutionDenied/u);
    expect(scriptSource).toMatch(/browserRecoveryCanaryReadDenied/u);
    expect(scriptSource).toMatch(/serviceRecoveryCanaryReadDenied/u);
    expect(scriptSource).not.toMatch(/select encrypted_payload/u);
  });

  it("streams the dump without writing it to host storage", () => {
    expect(scriptSource).toMatch(/pipeline\(dumpProcess\.stdout/u);
    expect(scriptSource).toMatch(/temporaryDumpWritten: false/u);
    expect(scriptSource).not.toMatch(/createWriteStream|mkdtempSync/u);
  });

  it("always removes the disposable database", () => {
    expect(scriptSource).toMatch(/finally \{[\s\S]*dropdb/u);
  });

  it("is exposed through the project command surface", () => {
    expect(packageJson.scripts["backup:restore:acceptance"]).toContain(
      "scripts/verify-backup-restore-acceptance.mjs"
    );
  });
});

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

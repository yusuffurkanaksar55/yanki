import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(read("package.json"));
const backupSource = read("scripts/create-encrypted-offsite-backup.mjs");
const retentionSource = read(
  "scripts/apply-encrypted-offsite-backup-retention.mjs"
);
const restoreSource = read(
  "scripts/verify-offsite-backup-restore-acceptance.mjs"
);
const librarySource = read("scripts/lib/offsite-backup.mjs");
const installerSource = read("scripts/install-restic-local-tool.mjs");
const serviceSource = read("deploy/backup/yanki-offsite-backup.service");
const timerSource = read("deploy/backup/yanki-offsite-backup.timer");

describe("encrypted off-site backup boundary", () => {
  it("uses a pinned checksum-verified local Restic tool", () => {
    expect(installerSource).toMatch(/const version = "0\.19\.1"/u);
    expect(installerSource).toMatch(/archiveSha256/u);
    expect(installerSource).toMatch(/actualSha256 !== archiveSha256/u);
    expect(installerSource).toContain(".tools");
  });

  it("requires explicit mutation confirmations", () => {
    expect(backupSource).toMatch(/CREATE_ENCRYPTED_OFFSITE_BACKUP/u);
    expect(retentionSource).toMatch(/APPLY_ENCRYPTED_OFFSITE_RETENTION/u);
    expect(restoreSource).toMatch(/RUN_ENCRYPTED_OFFSITE_RESTORE_ACCEPTANCE/u);
  });

  it("uses fail-aware source commands and never writes a plaintext dump", () => {
    expect(librarySource).toMatch(/--stdin-from-command/u);
    expect(librarySource).not.toMatch(/createWriteStream|mkdtemp|\.backup\b/u);
    expect(backupSource).toMatch(/temporaryDumpWritten: false/u);
  });

  it("requires a full snapshot id and exact environment scope for restore", () => {
    expect(restoreSource).toMatch(/\^\[a-f0-9\]\{64\}\$/u);
    expect(restoreSource).toMatch(/assertSnapshotMatches/u);
    expect(restoreSource).not.toMatch(/\["dump",\s*"latest"/u);
    expect(restoreSource).toMatch(/requireEncryptionRecovery: true/u);
    expect(restoreSource).toMatch(/finally \{[\s\S]*dropDisposableDatabase/u);
  });

  it("schedules backup, integrity, and retention as one fail-fast service", () => {
    expect(serviceSource).toMatch(/backup:offsite:create/u);
    expect(serviceSource).toMatch(/backup:offsite:check/u);
    expect(serviceSource).toMatch(/backup:offsite:retention/u);
    expect(serviceSource).toMatch(/UMask=0077/u);
    expect(timerSource).toMatch(/OnCalendar=/u);
    expect(timerSource).toMatch(/Persistent=true/u);
  });

  it("exposes the complete operator command surface", () => {
    for (const command of [
      "backup:tool:install",
      "backup:offsite:init",
      "backup:offsite:create",
      "backup:offsite:check",
      "backup:offsite:retention",
      "backup:offsite:restore:acceptance"
    ]) {
      expect(packageJson.scripts[command]).toBeTruthy();
    }
  });
});

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const functionSource = read("supabase/functions/encryption-key-health/index.ts");
const migrationSource = read(
  "supabase/migrations/20260807143000_encryption_key_lifecycle.sql"
);
const serviceSource = read(
  "src/features/administration/securityOperationsService.ts"
);
const smokeSource = read("scripts/smoke-encryption-key-health.mjs");

describe("encryption key health boundary", () => {
  it("requires authentication, an active profile, and a platform system-admin role", () => {
    expect(functionSource).toMatch(/auth\.getUser\(\)/u);
    expect(functionSource).toMatch(/onboarding_status", "ACTIVE"/u);
    expect(functionSource).toMatch(/role_code", "SYSTEM_ADMIN"/u);
    expect(functionSource).toMatch(/scope_type", "PLATFORM"/u);
    expect(functionSource).toMatch(/\.is\("scope_id", null\)/u);
    expect(functionSource).toMatch(/ends_at\.is\.null,ends_at\.gt/u);
  });

  it("returns aggregate health without key material or version names", () => {
    const responseMatch = functionSource.match(
      /return jsonResponse\(\{\s+health: \{([\s\S]*?)\r?\n\s+\}\r?\n\s+\}\);/u
    );
    const responseSource = responseMatch?.[1] ?? "";

    expect(responseMatch).not.toBeNull();
    expect(responseSource).toMatch(/activeKeyConfigured/u);
    expect(responseSource).toMatch(/configuredKeyCount/u);
    expect(responseSource).not.toMatch(/configuredVersions|referencedVersions|keyMaterial/u);
  });

  it("keeps the version inventory service-role-only", () => {
    expect(migrationSource).toMatch(
      /revoke all on function public\.list_referenced_evaluation_encryption_key_versions\(\)[\s\S]*from public, anon, authenticated/u
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.list_referenced_evaluation_encryption_key_versions\(\)[\s\S]*to service_role/u
    );
  });

  it("keeps version names out of the browser service model", () => {
    expect(serviceSource).not.toMatch(/configuredVersions|referencedVersions|keyMaterial/u);
  });

  it("uses a dedicated platform operator for linked smoke verification", () => {
    expect(smokeSource).toMatch(/PLATFORM_ADMIN_EMAIL/u);
    expect(smokeSource).toMatch(/PLATFORM_ADMIN_PASSWORD/u);
  });
});

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

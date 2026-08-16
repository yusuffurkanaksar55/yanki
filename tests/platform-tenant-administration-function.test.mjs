import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const functionSource = await readFile(
  "supabase/functions/platform-tenant-administration/index.ts",
  "utf8"
);
const migrationSource = await readFile(
  "supabase/migrations/20260816170000_platform_tenant_administration.sql",
  "utf8"
);
const serviceSource = await readFile(
  "src/features/administration/platformTenantService.ts",
  "utf8"
);

describe("platform tenant administration boundary", () => {
  it("requires an active exact platform system administrator twice", () => {
    expect(functionSource).toMatch(/auth\.getUser\(\)/u);
    expect(functionSource).toMatch(/hasActiveProfile/u);
    expect(functionSource).toMatch(/hasPlatformSystemAdministratorRole/u);
    expect(migrationSource).toMatch(
      /require_active_platform_system_admin[\s\S]*scope_type = 'PLATFORM'[\s\S]*scope_id is null/u
    );
  });

  it("keeps all tenant operations behind service-role-only functions", () => {
    expect(migrationSource).toMatch(
      /revoke all on function public\.platform_bootstrap_organization_tenant[\s\S]*from public, anon, authenticated/u
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.platform_renew_tenant_bootstrap_invitation[\s\S]*to service_role/u
    );
    expect(serviceSource).toMatch(
      /functions\.invoke\(\s*"platform-tenant-administration"/u
    );
    expect(serviceSource).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/u);
  });

  it("limits input and compensates a failed new Auth identity", () => {
    expect(functionSource).toMatch(/maximumRequestBodyBytes = 16 \* 1024/u);
    expect(functionSource).toMatch(/tenant_bootstrap_request_id/u);
    expect(functionSource).toMatch(/requires_password_setup: true/u);
    expect(functionSource).toMatch(
      /if \(createdUserInThisRequest && administratorUser\)[\s\S]*deleteUser/u
    );
  });

  it("never reads or returns evaluation content", () => {
    const forbiddenContent =
      /evaluation_submissions|encrypted_payload|ciphertext|decrypted|evaluator_user_id/iu;

    expect(functionSource).not.toMatch(forbiddenContent);
    expect(migrationSource).not.toMatch(forbiddenContent);
  });
});

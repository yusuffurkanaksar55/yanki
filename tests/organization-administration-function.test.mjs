import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const functionSource = await readFile(
  "supabase/functions/organization-administration/index.ts",
  "utf8"
);
const migrationSource = await readFile(
  "supabase/migrations/20260722210000_hierarchy_administration_foundation.sql",
  "utf8"
);
const integrityMigrationSource = await readFile(
  "supabase/migrations/20260722223000_hierarchy_context_integrity_hardening.sql",
  "utf8"
);
const serviceSource = await readFile(
  "src/features/administration/hierarchyAdministrationService.ts",
  "utf8"
);

describe("organization administration trusted boundary", () => {
  it("authenticates active system administrators and enforces organization scope", () => {
    expect(functionSource).toMatch(/auth\.getUser\(\)/);
    expect(functionSource).toMatch(/readHasActiveProfile/);
    expect(functionSource).toMatch(/readActiveRoles/);
    expect(functionSource).toMatch(/canManageOrganization/);
    expect(functionSource).toMatch(/ADMINISTRATION_SCOPE_DENIED/);
    expect(migrationSource).toMatch(/require_active_system_admin/);
  });

  it("keeps every browser mutation behind service-role-only atomic RPCs", () => {
    expect(functionSource).toMatch(/\.rpc\("admin_upsert_organization_unit"/);
    expect(functionSource).toMatch(/"admin_set_user_hierarchy_context"/);
    expect(functionSource).toMatch(/\.rpc\("admin_assign_user_role"/);
    expect(functionSource).toMatch(/\.rpc\("admin_end_user_role"/);
    expect(migrationSource).toMatch(
      /revoke all on function public\.admin_upsert_organization_unit[\s\S]*from public, anon, authenticated/
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.admin_end_user_role\(uuid, uuid, uuid\)[\s\S]*to service_role/
    );
    expect(serviceSource).toMatch(
      /functions\.invoke\(\s*"organization-administration"/
    );
    expect(serviceSource).not.toMatch(/\.from\(/);
    expect(serviceSource).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("protects hierarchy integrity and the final organization administrator", () => {
    expect(migrationSource).toMatch(/MANAGER_ASSIGNMENT_CYCLE/);
    expect(migrationSource).toMatch(/MANAGER_HIERARCHY_DEPTH_EXCEEDED/);
    expect(migrationSource).toMatch(/LAST_SYSTEM_ADMIN_REQUIRED/);
    expect(migrationSource).toMatch(/UNIT_ARCHIVE_BLOCKED/);
    expect(migrationSource).toMatch(/ROLE_UNIT_MEMBERSHIP_REQUIRED/);
    expect(integrityMigrationSource).toMatch(/UNIT_PARENT_NOT_ACTIVE/);
    expect(integrityMigrationSource).toMatch(/ended_orphaned_role_count/);
    expect(integrityMigrationSource).toMatch(
      /manager_assignment\.scope_unit_id is distinct from primary_unit_id/
    );
  });

  it("keeps identity administration separate from evaluation content", () => {
    expect(migrationSource).not.toMatch(
      /add column\s+(score|comment|lesson|ciphertext|encrypted_payload|submission_content)\b/i
    );
    expect(integrityMigrationSource).not.toMatch(
      /add column\s+(score|comment|lesson|ciphertext|encrypted_payload|submission_content)\b/i
    );
    expect(functionSource).not.toMatch(
      /evaluation_submissions|encrypted_payload|ciphertext/
    );
  });
});

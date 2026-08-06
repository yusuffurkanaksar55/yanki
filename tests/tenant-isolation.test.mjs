import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase/migrations/20260806221500_multi_tenant_integrity_hardening.sql"
);

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("multi-tenant integrity hardening", () => {
  it("makes the project membership tenant explicit and immutable by relation", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(
      /alter table public\.project_memberships\s+add column organization_id uuid;/
    );
    expect(migration).toMatch(
      /foreign key \(organization_id, project_id\)[\s\S]+references public\.projects \(organization_id, id\)/
    );
    expect(migration).toMatch(/PROJECT_MEMBERSHIP_TENANT_MISMATCH/);
  });

  it("requires tenant membership for every identity-bearing relation", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(/validate_project_tenant_manager/);
    expect(migration).toMatch(/validate_project_membership_tenant/);
    expect(migration).toMatch(/validate_manager_assignment_tenant/);
    expect(migration).toMatch(/validate_evaluation_assignment_tenant_users/);
    expect(migration.match(/require_active_organization_identity\(/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it("scopes active direct-manager uniqueness to one tenant", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toMatch(
      /manager_assignments_active_direct_tenant_unique_idx[\s\S]+organization_id,[\s\S]+direct_report_user_id/
    );
  });

  it("passes the tenant id through trusted project membership writes", () => {
    const functionSource = readProjectFile(
      "supabase/functions/admin-project-cycles/index.ts"
    );
    const fixtureSource = readProjectFile("scripts/create-demo-fixture.mjs");

    expect(functionSource).toMatch(
      /membership_kind: membershipKind,\s+organization_id: organizationId,/
    );
    expect(fixtureSource).toMatch(
      /organization_id: organizationId,\s+project_id: projectId,/
    );
  });
});

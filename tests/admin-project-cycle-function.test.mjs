import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const functionPath = join(
  root,
  "supabase",
  "functions",
  "admin-project-cycles",
  "index.ts"
);
const servicePath = join(
  root,
  "src",
  "features",
  "administration",
  "projectCycleService.ts"
);
const dateAdministrationMigrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260722234500_delegated_project_date_administration.sql"
);

function readProjectFile(path) {
  return readFileSync(path, "utf8");
}

describe("admin project cycle Edge Function foundation", () => {
  it("keeps privileged project management behind an Edge Function boundary", () => {
    const functionSource = readProjectFile(functionPath);

    expect(functionSource).toMatch(/Deno\.serve/);
    expect(functionSource).toMatch(/auth\.getUser\(\)/);
    expect(functionSource).toMatch(/readHasActiveProfile/);
    expect(functionSource).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(functionSource).toMatch(/list_project_cycles/);
    expect(functionSource).toMatch(/create_project_cycle/);
    expect(functionSource).toMatch(/list_organization_members/);
    expect(functionSource).toMatch(/add_project_member/);
    expect(functionSource).toMatch(/generate_project_assignments/);
    expect(functionSource).toMatch(/update_project_dates/);
  });

  it("rechecks delegated project-date authorization inside an atomic RPC", () => {
    const functionSource = readProjectFile(functionPath);
    const migrationSource = readProjectFile(dateAdministrationMigrationPath);

    expect(functionSource).toMatch(/\.rpc\("admin_update_project_dates"/);
    expect(functionSource).toMatch(/canManageProjectDates/);
    expect(migrationSource).toMatch(
      /project_record\.project_manager_user_id = actor_user_id/
    );
    expect(migrationSource).toMatch(/role_assignment\.role_code = 'PROJECT_MANAGER'/);
    expect(migrationSource).toMatch(/role_assignment\.scope_type = 'PROJECT'/);
    expect(migrationSource).toMatch(/PROJECT_DATES_NOT_EDITABLE/);
    expect(migrationSource).toMatch(/PROJECT_DATES_UPDATED/);
    expect(migrationSource).toMatch(
      /revoke all on function public\.admin_update_project_dates[\s\S]*from public, anon, authenticated/
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.admin_update_project_dates[\s\S]*to service_role/
    );
  });

  it("requires administration scope for project creation", () => {
    const functionSource = readProjectFile(functionPath);

    expect(functionSource).toMatch(/canManageOrganization/);
    expect(functionSource).toMatch(/ADMINISTRATION_SCOPE_DENIED/);
    expect(functionSource).toMatch(/role\.role_code === "SYSTEM_ADMIN"/);
    expect(functionSource).toMatch(/role\.scope_type === "ORGANIZATION"/);
  });

  it("allows the Supabase browser SDK headers through CORS preflight", () => {
    const functionSource = readProjectFile(functionPath);

    expect(functionSource).toMatch(
      /"Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info"/
    );
  });

  it("keeps the browser project cycle service away from direct table access", () => {
    const serviceSource = readProjectFile(servicePath);

    expect(serviceSource).toMatch(/functions\.invoke\("admin-project-cycles"/);
    expect(serviceSource).not.toMatch(/\.from\("projects"\)/);
    expect(serviceSource).not.toMatch(/\.from\("evaluation_cycles"\)/);
    expect(serviceSource).not.toMatch(/\.from\("project_memberships"\)/);
    expect(serviceSource).not.toMatch(/\.from\("evaluation_assignments"\)/);
    expect(serviceSource).not.toMatch(/\.from\("user_profiles"\)/);
    expect(serviceSource).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

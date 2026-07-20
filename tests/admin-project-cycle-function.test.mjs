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
  });

  it("requires administration scope for project creation", () => {
    const functionSource = readProjectFile(functionPath);

    expect(functionSource).toMatch(/canManageOrganization/);
    expect(functionSource).toMatch(/ADMINISTRATION_SCOPE_DENIED/);
    expect(functionSource).toMatch(/role\.role_code === "SYSTEM_ADMIN"/);
    expect(functionSource).toMatch(/role\.scope_type === "ORGANIZATION"/);
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

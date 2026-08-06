import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationSource = readFileSync(
  join(
    root,
    "supabase",
    "migrations",
    "20260806233000_employee_assignment_access.sql"
  ),
  "utf8"
);
const serviceSource = readFileSync(
  join(
    root,
    "src",
    "features",
    "evaluations",
    "evaluationAssignmentService.ts"
  ),
  "utf8"
);

describe("employee assignment access boundary", () => {
  it("derives assignment ownership from auth.uid and active tenant membership", () => {
    expect(migrationSource).toMatch(/actor_user_id uuid := auth\.uid\(\)/);
    expect(migrationSource).toMatch(
      /assignment\.evaluator_user_id = actor_user_id/
    );
    expect(migrationSource).toMatch(/actor_membership\.organization_id/);
    expect(migrationSource).toMatch(/subject_membership\.organization_id/);
    expect(migrationSource).toMatch(/onboarding_status = 'ACTIVE'/);
  });

  it("keeps draft and cancelled assignments outside the employee response", () => {
    expect(migrationSource).toMatch(/assignment\.status <> 'CANCELLED'/);
    expect(migrationSource).toMatch(/cycle\.status <> 'DRAFT'/);
  });

  it("exposes the RPC only to authenticated users", () => {
    expect(migrationSource).toMatch(/security definer/);
    expect(migrationSource).toMatch(
      /revoke all on function public\.get_my_evaluation_assignments\(\)[\s\S]*from public, anon, authenticated/
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.get_my_evaluation_assignments\(\)[\s\S]*to authenticated/
    );
  });

  it("does not return sensitive content or evaluator identity fields", () => {
    expect(migrationSource).not.toMatch(
      /jsonb_build_object\([\s\S]*'(score|comment|payload|credential|evaluator_user_id)'/
    );
  });

  it("keeps the browser away from identity-domain tables", () => {
    expect(serviceSource).toMatch(/rpc\("get_my_evaluation_assignments"\)/);
    expect(serviceSource).not.toMatch(/\.from\(/);
    expect(serviceSource).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

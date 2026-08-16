import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationSource = read(
  "supabase/migrations/20260808120000_evaluation_content_retention.sql"
);
const functionSource = read(
  "supabase/functions/evaluation-retention-administration/index.ts"
);
const operatorSource = read("scripts/run-evaluation-retention.mjs");
const serviceSource = read(
  "deploy/retention/yanki-evaluation-retention.service"
);
const timerSource = read(
  "deploy/retention/yanki-evaluation-retention.timer"
);
const environmentExample = read("deploy/retention/operator.env.example");

describe("evaluation content retention boundary", () => {
  it("repeats active system-admin and tenant-scope checks in Edge and PostgreSQL", () => {
    expect(functionSource).toMatch(/auth\.getUser\(\)/u);
    expect(functionSource).toMatch(/onboarding_status", "ACTIVE"/u);
    expect(functionSource).toMatch(/role_code === "SYSTEM_ADMIN"/u);
    expect(functionSource).toMatch(/canManageOrganization/u);
    expect(migrationSource).toMatch(/require_active_system_admin/u);
  });

  it("keeps retention state and destructive execution behind narrow service-role functions", () => {
    expect(migrationSource).toMatch(
      /revoke all on table public\.organization_evaluation_retention_policies[\s\S]*service_role/u
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.execute_due_evaluation_content_retention\(\)[\s\S]*to service_role/u
    );
    expect(migrationSource).toMatch(
      /revoke all on function public\.execute_due_evaluation_content_retention\(\)[\s\S]*authenticated/u
    );
  });

  it("deletes only expired ciphertext when automation is enabled and legal hold is absent", () => {
    expect(migrationSource).toMatch(/automatic_purge_enabled/u);
    expect(migrationSource).toMatch(/not retention_policy\.legal_hold/u);
    expect(migrationSource).toMatch(
      /delete from public\.encrypted_evaluation_submissions[\s\S]*stored_on < retention_cutoff_on/u
    );
  });

  it("does not return per-tenant submission counts or evaluation content", () => {
    const executionReturn = migrationSource.match(
      /return jsonb_build_object\(\s*'executed',[\s\S]*?'organizationsProcessed',[\s\S]*?\);/u
    )?.[0] ?? "";

    expect(executionReturn).not.toContain("submission");
    expect(executionReturn).not.toContain("deleted");
    expect(executionReturn).not.toContain("content");
    expect(functionSource).not.toMatch(/encrypted_evaluation_submissions/u);
  });

  it("requires an explicit trusted-operator confirmation", () => {
    expect(operatorSource).toMatch(/RUN_DUE_EVALUATION_RETENTION/u);
    expect(operatorSource).toMatch(/SUPABASE_SERVICE_ROLE_KEY/u);
    expect(operatorSource).not.toMatch(/VITE_SUPABASE_SERVICE_ROLE_KEY/u);
  });

  it("provides a hardened persistent daily production scheduler", () => {
    expect(serviceSource).toMatch(/User=yanki-retention/u);
    expect(serviceSource).toMatch(/EnvironmentFile=\/etc\/yanki\/retention\.env/u);
    expect(serviceSource).toMatch(/NoNewPrivileges=true/u);
    expect(serviceSource).toMatch(/ProtectSystem=strict/u);
    expect(serviceSource).toMatch(/npm run retention:run/u);
    expect(timerSource).toMatch(/OnCalendar=\*-\*-\* 02:15:00/u);
    expect(timerSource).toMatch(/Persistent=true/u);
    expect(timerSource).toMatch(/RandomizedDelaySec=15m/u);
    expect(environmentExample).toMatch(
      /EVALUATION_RETENTION_EXECUTION_CONFIRM=RUN_DUE_EVALUATION_RETENTION/u
    );
    expect(environmentExample).not.toMatch(/VITE_/u);
  });
});

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

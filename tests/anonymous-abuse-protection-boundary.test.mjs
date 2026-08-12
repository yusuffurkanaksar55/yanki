import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationSource = read(
  "supabase/migrations/20260807170000_anonymous_endpoint_abuse_protection.sql"
);
const platformScopeMigrationSource = read(
  "supabase/migrations/20260812120000_platform_security_operations_scope.sql"
);
const anonymousFunctionSource = read(
  "supabase/functions/anonymous-evaluation-submissions/index.ts"
);
const monitoringFunctionSource = read(
  "supabase/functions/security-abuse-monitoring/index.ts"
);
const submissionSmokeSource = read(
  "scripts/smoke-anonymous-evaluation-submission.mjs"
);
const requestBodySource = read("supabase/functions/_shared/requestBody.ts");
const rateLimitTableSource = migrationSource
  .split("create table public.security_rate_limit_buckets")[1]
  .split("create index security_rate_limit_buckets_expiry_idx")[0];
const eventTableSource = migrationSource
  .split("create table public.security_abuse_event_counters")[1]
  .split("create index security_abuse_event_counters_time_idx")[0];

describe("anonymous endpoint abuse protection boundary", () => {
  it("stores only short-lived operational hashes and aggregate counters", () => {
    expect(rateLimitTableSource).toMatch(/bucket_key_hash bytea/);
    expect(rateLimitTableSource).toMatch(/expires_at timestamptz/);
    expect(eventTableSource).toMatch(/event_count integer/);

    const tableDefinitions = `${rateLimitTableSource}\n${eventTableSource}`;
    expect(tableDefinitions).not.toMatch(
      /ip_address|device_id|user_id|organization_id|assignment_id|credential_digest|request_body|content/
    );
  });

  it("keeps abuse tables inaccessible even to direct service-role queries", () => {
    expect(migrationSource).toMatch(
      /revoke all on table public\.security_rate_limit_buckets[\s\S]*service_role/
    );
    expect(migrationSource).toMatch(
      /revoke all on table public\.security_abuse_event_counters[\s\S]*service_role/
    );
    expect(migrationSource).not.toMatch(
      /grant (select|insert|update|delete)[\s\S]*security_(rate_limit|abuse_event)/i
    );
  });

  it("authorizes only service-role decision and platform-admin summary RPCs", () => {
    expect(migrationSource).toMatch(
      /grant execute on function public\.consume_anonymous_submission_request\(text\)[\s\S]*to service_role/
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.get_anonymous_submission_abuse_summary\(uuid\)[\s\S]*to service_role/
    );
    expect(platformScopeMigrationSource).toMatch(/role_code = 'SYSTEM_ADMIN'/);
    expect(platformScopeMigrationSource).toMatch(/scope_type = 'PLATFORM'/);
    expect(platformScopeMigrationSource).toMatch(/scope_id is null/);
    expect(platformScopeMigrationSource).toMatch(/onboarding_status = 'ACTIVE'/);
  });

  it("consumes quota before context resolution or encryption", () => {
    const quotaIndex = anonymousFunctionSource.indexOf(
      "consume_anonymous_submission_request"
    );
    const contextIndex = anonymousFunctionSource.indexOf(
      "get_anonymous_submission_context"
    );
    const encryptionIndex = anonymousFunctionSource.indexOf(
      "await encryptEvaluationPayload"
    );

    expect(quotaIndex).toBeGreaterThan(0);
    expect(contextIndex).toBeGreaterThan(quotaIndex);
    expect(encryptionIndex).toBeGreaterThan(contextIndex);
    expect(anonymousFunctionSource).toMatch(/Retry-After/);
    expect(anonymousFunctionSource).toMatch(/429/);
  });

  it("bounds request bodies before parsing", () => {
    expect(requestBodySource).toMatch(/content-length/);
    expect(requestBodySource).toMatch(/byteCount > maximumBytes/);
    expect(anonymousFunctionSource).toMatch(/maximumRequestBodyBytes = 262144/);
  });

  it("exposes authenticated aggregate monitoring only to platform admins", () => {
    expect(monitoringFunctionSource).toMatch(/auth\.getUser\(\)/);
    expect(monitoringFunctionSource).toMatch(/hasActiveSystemAdmin/);
    expect(monitoringFunctionSource).toMatch(/scope_type", "PLATFORM"/);
    expect(monitoringFunctionSource).toMatch(/\.is\("scope_id", null\)/);
    expect(monitoringFunctionSource).toMatch(
      /get_anonymous_submission_abuse_summary/
    );
    expect(monitoringFunctionSource).not.toMatch(
      /encrypted_evaluation_submissions|anonymous_submission_credentials/
    );
    expect(monitoringFunctionSource).not.toMatch(
      /console\.(log|info|debug|error)/
    );
    expect(submissionSmokeSource).toMatch(/PLATFORM_ADMIN_EMAIL/);
    expect(submissionSmokeSource).toMatch(
      /"security-abuse-monitoring",\s+\{\},\s+platformAdminAccessToken/
    );
  });
});

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

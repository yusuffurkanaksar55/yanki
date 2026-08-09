import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260809223000_explicit_identity_domain_privileges.sql"
);
const migration = await readFile(migrationPath, "utf8");

describe("explicit identity-domain privileges", () => {
  it("allows authenticated users to select only through the own-profile RLS policy", () => {
    expect(migration).toMatch(
      /grant select on table public\.user_profiles to authenticated/iu
    );
    expect(migration).not.toMatch(
      /grant[^;]*(?:insert|update|delete)[^;]*user_profiles[^;]*authenticated/iu
    );
  });

  it("grants trusted identity/configuration tables to service_role", () => {
    for (const table of [
      "audit_events",
      "evaluation_assignments",
      "evaluation_cycles",
      "manager_assignments",
      "organization_unit_memberships",
      "organization_units",
      "organizations",
      "project_memberships",
      "projects",
      "user_invitations",
      "user_profiles",
      "user_role_assignments"
    ]) {
      expect(migration).toContain(`public.${table}`);
    }

    expect(migration).toMatch(/to service_role/iu);
  });

  it("does not grant access to sensitive content or operational tables", () => {
    for (const table of [
      "anonymous_submission_credentials",
      "encrypted_evaluation_submissions",
      "evaluation_encryption_recovery_canaries",
      "organization_evaluation_retention_policies",
      "security_abuse_event_counters",
      "security_rate_limit_buckets",
      "tenant_bootstrap_operations"
    ]) {
      expect(migration).not.toContain(table);
    }
  });
});

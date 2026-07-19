import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationsDir = join(root, "supabase", "migrations");
const initialMigrationPath = join(
  migrationsDir,
  "20260719132911_initial_security_foundation.sql"
);
const profileInvitationMigrationPath = join(
  migrationsDir,
  "20260719171413_user_profile_invitation_foundation.sql"
);
const organizationHierarchyMigrationPath = join(
  migrationsDir,
  "20260719174459_organization_hierarchy_foundation.sql"
);
const workspaceContextMigrationPath = join(
  migrationsDir,
  "20260719181013_workspace_context_rpc.sql"
);
const projectEvaluationCycleMigrationPath = join(
  migrationsDir,
  "20260719184052_project_evaluation_cycle_foundation.sql"
);

function readMigration(path) {
  return readFileSync(path, "utf8");
}

function readAllMigrations() {
  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .map((fileName) => readFileSync(join(migrationsDir, fileName), "utf8"))
    .join("\n");
}

function getCreatedPublicTables(migration) {
  return [...migration.matchAll(/create table public\.([a-z_]+)/g)].map(
    ([, tableName]) => tableName
  );
}

describe("Supabase security foundation", () => {
  it("enables RLS on every public table created by migrations", () => {
    const migration = readAllMigrations();
    const createdTables = getCreatedPublicTables(migration);

    for (const tableName of createdTables) {
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${tableName} enable row level security;`)
      );
    }
  });

  it("does not introduce evaluator-linked submission content columns", () => {
    const migration = readAllMigrations();

    expect(migration).not.toMatch(/\bevaluator_id\b/i);
    expect(migration).not.toMatch(/\bcomment_text\b/i);
    expect(migration).not.toMatch(/\bscore_value\b/i);
    expect(migration).not.toMatch(/\bplaintext\b/i);
  });

  it("documents safe audit metadata constraints", () => {
    const migration = readMigration(initialMigrationPath);

    expect(migration).toMatch(/safe_metadata jsonb not null default '\{\}'::jsonb/);
    expect(migration).toMatch(/Do not store scores, comments, decrypted payloads, credentials, tokens, or evaluator-to-response linkage/);
  });

  it("keeps invitation onboarding server-side with hashed secrets", () => {
    const migration = readMigration(profileInvitationMigrationPath);

    expect(migration).toMatch(/\btoken_hash text not null\b/);
    expect(migration).not.toMatch(/\btoken text\b/i);
    expect(migration).not.toMatch(/\braw_token\b/i);
    expect(migration).toMatch(
      /alter table public\.user_invitations enable row level security;/
    );
    expect(migration).not.toMatch(/create policy[^;]+on public\.user_invitations/i);
  });

  it("allows only authenticated users to read their own profile", () => {
    const migration = readMigration(profileInvitationMigrationPath);

    expect(migration).toMatch(
      /create policy user_profiles_select_own_profile[\s\S]+to authenticated[\s\S]+using \(auth\.uid\(\) = user_id\);/i
    );
    expect(migration).not.toMatch(
      /create policy[^;]+on public\.user_profiles[^;]+for insert/i
    );
    expect(migration).not.toMatch(
      /create policy[^;]+on public\.user_profiles[^;]+for update/i
    );
  });

  it("adds a platform scope while requiring explicit organization scope ids", () => {
    const migration = readMigration(organizationHierarchyMigrationPath);

    expect(migration).toMatch(/'PLATFORM'/);
    expect(migration).toMatch(
      /\(scope_type = 'PLATFORM' and scope_id is null\)[\s\S]+\(scope_type <> 'PLATFORM' and scope_id is not null\)/
    );
    expect(migration).toMatch(
      /\(invited_scope_type = 'PLATFORM' and invited_scope_id is null\)[\s\S]+\(invited_scope_type <> 'PLATFORM' and invited_scope_id is not null\)/
    );
  });

  it("creates configurable organization hierarchy tables without client policies", () => {
    const migration = readMigration(organizationHierarchyMigrationPath);
    const organizationTables = [
      "organizations",
      "organization_units",
      "organization_unit_memberships",
      "manager_assignments"
    ];

    for (const tableName of organizationTables) {
      expect(migration).toMatch(new RegExp(`create table public\\.${tableName}`));
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${tableName} enable row level security;`)
      );
      expect(migration).not.toMatch(
        new RegExp(`create policy[^;]+on public\\.${tableName}`, "i")
      );
    }
  });

  it("guards organization hierarchy shape and manager assignments", () => {
    const migration = readMigration(organizationHierarchyMigrationPath);

    expect(migration).toMatch(/unit_type in \('DEPARTMENT', 'UNIT', 'TEAM', 'CUSTOM'\)/);
    expect(migration).toMatch(/Organization unit hierarchy cannot contain cycles/);
    expect(migration).toMatch(/manager_user_id <> direct_report_user_id/);
    expect(migration).toMatch(/relationship_type in \(/);
  });

  it("exposes only the authenticated user's workspace context through RPC", () => {
    const migration = readMigration(workspaceContextMigrationPath);

    expect(migration).toMatch(/create or replace function public\.get_my_workspace_context\(\)/);
    expect(migration).toMatch(/security definer/);
    expect(migration).toMatch(/set search_path = public/);
    expect(migration).toMatch(/where user_id = auth\.uid\(\)/);
    expect(migration).toMatch(/where membership\.user_id = auth\.uid\(\)/);
    expect(migration).toMatch(
      /where manager_assignment\.direct_report_user_id = auth\.uid\(\)/
    );
    expect(migration).toMatch(
      /grant execute on function public\.get_my_workspace_context\(\) to authenticated;/
    );
  });

  it("keeps workspace context RPC free of evaluation content", () => {
    const migration = readMigration(workspaceContextMigrationPath);

    expect(migration).not.toMatch(/\bscore\b/i);
    expect(migration).not.toMatch(/\bcomment_text\b/i);
    expect(migration).not.toMatch(/\bsubmission\b/i);
    expect(migration).not.toMatch(/\bevaluator\b/i);
  });

  it("creates default-deny project and evaluation-cycle configuration tables", () => {
    const migration = readMigration(projectEvaluationCycleMigrationPath);
    const configurationTables = [
      "projects",
      "project_memberships",
      "evaluation_cycles"
    ];

    for (const tableName of configurationTables) {
      expect(migration).toMatch(new RegExp(`create table public\\.${tableName}`));
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${tableName} enable row level security;`)
      );
      expect(migration).not.toMatch(
        new RegExp(`create policy[^;]+on public\\.${tableName}`, "i")
      );
    }
  });

  it("keeps evaluation cycles time-bound without a participant-count opening rule", () => {
    const migration = readMigration(projectEvaluationCycleMigrationPath);

    expect(migration).toMatch(/opens_at timestamptz not null/);
    expect(migration).toMatch(/closes_at timestamptz not null/);
    expect(migration).toMatch(/evaluation_cycles_valid_window check \(closes_at > opens_at\)/);
    expect(migration).toMatch(/anonymity_threshold integer not null default 4/);
    expect(migration).not.toMatch(/participant_count/i);
    expect(migration).not.toMatch(/minimum_participant/i);
    expect(migration).not.toMatch(/required_participant/i);
  });

  it("guards project-scoped evaluation cycles without content tables", () => {
    const migration = readMigration(projectEvaluationCycleMigrationPath);

    expect(migration).toMatch(/validate_evaluation_cycle_project_scope/);
    expect(migration).toMatch(/project_organization_id <> new\.organization_id/);
    expect(migration).not.toMatch(/\bscore\b/i);
    expect(migration).not.toMatch(/\bcomment_text\b/i);
    expect(migration).not.toMatch(/\bsubmission\b/i);
    expect(migration).not.toMatch(/\bplaintext\b/i);
  });
});

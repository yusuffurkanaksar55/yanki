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
});

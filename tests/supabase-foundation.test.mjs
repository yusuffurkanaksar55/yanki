import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260719132911_initial_security_foundation.sql"
);

function readMigration() {
  return readFileSync(migrationPath, "utf8");
}

describe("Supabase security foundation", () => {
  it("enables RLS on every public table created in the foundation migration", () => {
    const migration = readMigration();
    const createdTables = [
      "app_roles",
      "scope_types",
      "user_role_assignments",
      "audit_events"
    ];

    for (const tableName of createdTables) {
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${tableName} enable row level security;`)
      );
    }
  });

  it("does not introduce evaluator-linked submission content columns", () => {
    const migration = readMigration();

    expect(migration).not.toMatch(/\bevaluator_id\b/i);
    expect(migration).not.toMatch(/\bcomment_text\b/i);
    expect(migration).not.toMatch(/\bscore_value\b/i);
    expect(migration).not.toMatch(/\bplaintext\b/i);
  });

  it("documents safe audit metadata constraints", () => {
    const migration = readMigration();

    expect(migration).toMatch(/safe_metadata jsonb not null default '\{\}'::jsonb/);
    expect(migration).toMatch(/Do not store scores, comments, decrypted payloads, credentials, tokens, or evaluator-to-response linkage/);
  });
});

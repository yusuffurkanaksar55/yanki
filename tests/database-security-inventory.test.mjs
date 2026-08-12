import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationsDirectory = join(root, "supabase", "migrations");
const migrationSource = readdirSync(migrationsDirectory)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort()
  .map((fileName) => readFileSync(join(migrationsDirectory, fileName), "utf8"))
  .join("\n");

describe("database security inventory", () => {
  it("enables RLS for every application table created by migrations", () => {
    const createdTables = [
      ...migrationSource.matchAll(
        /create table(?: if not exists)? public\.([a-z0-9_]+)/giu
      )
    ].map((match) => match[1]);

    expect(createdTables.length).toBeGreaterThan(0);

    for (const tableName of new Set(createdTables)) {
      expect(
        migrationSource,
        `Expected public.${tableName} to enable row level security`
      ).toMatch(
        new RegExp(
          `alter table public\\.${tableName} enable row level security`,
          "iu"
        )
      );
    }
  });

  it("keeps the checked-in browser environment example public-only", () => {
    const browserEnvironment = readFileSync(join(root, ".env.example"), "utf8");

    expect(browserEnvironment).toMatch(/VITE_SUPABASE_URL=/u);
    expect(browserEnvironment).toMatch(/VITE_SUPABASE_ANON_KEY=/u);
    expect(browserEnvironment).not.toMatch(
      /SERVICE_ROLE|DATABASE_URL|ENCRYPTION_KEY|daxaymcmtbmummrxdyjy/iu
    );
  });
});

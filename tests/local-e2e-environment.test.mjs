import { describe, expect, it } from "vitest";
import {
  assertLocalDatabaseUrl,
  assertLocalHttpUrl,
  createLocalFunctionSecrets,
  parseLocalSupabaseStatus,
  redactSecret
} from "../scripts/lib/local-e2e-environment.mjs";

describe("local E2E environment", () => {
  it("accepts only loopback HTTP Supabase services", () => {
    expect(assertLocalHttpUrl("http://127.0.0.1:54321", "API")).toBe(
      "http://127.0.0.1:54321"
    );
    expect(() =>
      assertLocalHttpUrl("https://project.supabase.co", "API")
    ).toThrow(/loopback/u);
    expect(assertLocalDatabaseUrl(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    )).toContain("127.0.0.1:54322");
    expect(() => assertLocalDatabaseUrl(
      "postgresql://postgres:secret@database.example.com/postgres"
    )).toThrow(/loopback/u);
  });

  it("rejects status output that could target a hosted project", () => {
    expect(() =>
      parseLocalSupabaseStatus(JSON.stringify({
        ANON_KEY: "anon",
        API_URL: "https://project.supabase.co",
        DB_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        MAILPIT_URL: "http://127.0.0.1:54324",
        SERVICE_ROLE_KEY: "service"
      }))
    ).toThrow(/loopback/u);
  });

  it("creates a valid local-only key file and redacts the generated key", () => {
    const secrets = createLocalFunctionSecrets();

    expect(secrets.content).toContain(
      "EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION=LOCAL_E2E"
    );
    expect(Buffer.from(secrets.encryptionKey, "base64")).toHaveLength(32);
    expect(redactSecret(secrets.content, secrets.encryptionKey)).not.toContain(
      secrets.encryptionKey
    );
  });
});

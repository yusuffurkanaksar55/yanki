import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertLocalE2EDatabaseUrl,
  assertLocalE2EUserEmail,
  parseLocalE2EOrganization
} from "../scripts/lib/local-e2e-cleanup.mjs";

const cleanupSource = await readFile(
  resolve(process.cwd(), "scripts/lib/local-e2e-cleanup.mjs"),
  "utf8"
);

describe("local E2E cleanup safety", () => {
  const runId = "m1abc23-12abef";

  it("accepts only loopback PostgreSQL URLs", () => {
    expect(assertLocalE2EDatabaseUrl(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    )).toContain("127.0.0.1");
    expect(() => assertLocalE2EDatabaseUrl(
      "postgresql://postgres:secret@database.example.com/postgres"
    )).toThrow("loopback");
  });

  it("recognizes the exact synthetic organization identity", () => {
    expect(parseLocalE2EOrganization({
      id: "00000000-0000-0000-0000-000000000001",
      name: `Yanki E2E ${runId}`,
      slug: `yanki-e2e-${runId}`
    })).toBe(runId);
    expect(parseLocalE2EOrganization({
      id: "00000000-0000-0000-0000-000000000002",
      name: `Yanki E2E Customer ${runId}`,
      slug: `yanki-e2e-customer-${runId}`
    })).toBe(runId);
  });

  it("rejects organization names that do not match the run identifier", () => {
    expect(() => parseLocalE2EOrganization({
      id: "00000000-0000-0000-0000-000000000001",
      name: "Yanki E2E another-run",
      slug: `yanki-e2e-${runId}`
    })).toThrow("Refusing to clean");
  });

  it("accepts only synthetic users from the same run", () => {
    expect(() => assertLocalE2EUserEmail(
      `e2e-employee-${runId}@example.test`,
      runId
    )).not.toThrow();
    expect(() => assertLocalE2EUserEmail(
      `e2e-customer-admin-${runId}@example.test`,
      runId
    )).not.toThrow();
    expect(() => assertLocalE2EUserEmail(
      "ceo@example.com",
      runId
    )).toThrow("Refusing to clean");
    expect(() => assertLocalE2EUserEmail(
      "e2e-admin-another-run-12abef@example.test",
      runId
    )).toThrow("Refusing to clean");
  });

  it("bypasses only the two template deletion guards and restores them", () => {
    expect(cleanupSource).toContain(
      'setTemplateImmutabilityTriggers(database, "disable")'
    );
    expect(cleanupSource).toContain(
      'setTemplateImmutabilityTriggers(database, "enable")'
    );
    expect(cleanupSource).toContain(
      "${action} trigger evaluation_template_questions_validate_mutation"
    );
    expect(cleanupSource).toContain(
      "${action} trigger evaluation_template_versions_validate_mutation"
    );
    expect(cleanupSource).not.toContain("disable trigger all");
  });
});

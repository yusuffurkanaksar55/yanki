import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("demo fixture foundation", () => {
  it("documents the requested synthetic hierarchy scenario", () => {
    const fixtureDocs = readProjectFile("docs/TEST_FIXTURES.md");

    expect(fixtureDocs).toMatch(/Demo CEO/);
    expect(fixtureDocs).toMatch(/Demo HR Admin/);
    expect(fixtureDocs).toMatch(/Demo Team Leader/);
    expect(fixtureDocs).toMatch(/Demo Employee 1/);
    expect(fixtureDocs).toMatch(/Demo Employee 2/);
    expect(fixtureDocs).toMatch(/Demo Employee 3/);
    expect(fixtureDocs).toMatch(/The application must support other organization structures/);
  });

  it("documents the synthetic project and time-bound evaluation cycle", () => {
    const fixtureDocs = readProjectFile("docs/TEST_FIXTURES.md");

    expect(fixtureDocs).toMatch(/Yanki Demo Project/);
    expect(fixtureDocs).toMatch(/2026-07-19/);
    expect(fixtureDocs).toMatch(/2026-07-30/);
    expect(fixtureDocs).toMatch(/fixed participant count/i);
  });

  it("keeps service-role credentials outside frontend configuration", () => {
    const envExample = readProjectFile(".env.example");
    const script = readProjectFile("scripts/create-demo-fixture.mjs");

    expect(envExample).not.toMatch(/SERVICE_ROLE/i);
    expect(envExample).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/i);
    expect(script).toMatch(/readRequiredEnvironment\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  });

  it("keeps printed credentials valid when fixture users already exist", () => {
    const script = readProjectFile("scripts/create-demo-fixture.mjs");

    expect(script).toMatch(/updateUserById/);
    expect(script).toMatch(/password,/);
  });

  it("creates demo project records without storing response content", () => {
    const script = readProjectFile("scripts/create-demo-fixture.mjs");

    expect(script).toMatch(/upsertProjectAndEvaluationCycle/);
    expect(script).toMatch(/Yanki Demo Project/);
    expect(script).toMatch(/2026-07-30T23:59:00\+03:00/);
    expect(script).toMatch(/PROJECT_MANAGER/);
    expect(script).not.toMatch(/comment_text/i);
    expect(script).not.toMatch(/score_value/i);
    expect(script).not.toMatch(/plaintext/i);
  });

  it("generates fixture passwords at runtime instead of storing them", () => {
    const script = readProjectFile("scripts/create-demo-fixture.mjs");

    expect(script).toMatch(/randomBytes/);
    expect(script).toMatch(/createPassword/);
    expect(script).not.toMatch(/password:\s*"[^"]+"/);
    expect(script).not.toMatch(/password:\s*'[^']+'/);
  });

  it("exposes a local fixture command without running it in normal checks", () => {
    const packageJson = JSON.parse(readProjectFile("package.json"));

    expect(packageJson.scripts["fixture:demo"]).toBe(
      "node scripts/create-demo-fixture.mjs"
    );
    expect(packageJson.scripts.check).not.toContain("fixture:demo");
  });
});

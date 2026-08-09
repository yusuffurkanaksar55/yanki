import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(
  resolve(root, "package.json"),
  "utf8"
));
const runner = await readFile(
  resolve(root, "scripts/run-local-e2e.mjs"),
  "utf8"
);
const playwrightConfig = await readFile(
  resolve(root, "playwright.config.ts"),
  "utf8"
);

describe("local container E2E boundary", () => {
  it("exposes an explicit production-container acceptance command", () => {
    expect(packageJson.scripts["e2e:container:local"]).toBe(
      "node scripts/run-local-e2e.mjs --container"
    );
    expect(runner).toContain('args[0] === "--container"');
    expect(playwrightConfig).toContain("E2E_EXTERNAL_WEB_SERVER");
  });

  it("routes browser traffic through a loopback same-origin gateway", () => {
    expect(runner).toContain('"http://127.0.0.1:4174"');
    expect(runner).toContain('`${baseUrl}/supabase`');
    expect(runner).toContain('upstreamUrl.hostname = "host.docker.internal"');
    expect(runner).toContain("E2E_EXPECT_GATEWAY_REQUIRED");
  });

  it("does not put the generated gateway token in Docker command arguments", () => {
    expect(runner).toContain('"YANKI_SENSITIVE_GATEWAY_TOKEN"');
    expect(runner).not.toMatch(
      /--env[\s\S]{0,120}YANKI_SENSITIVE_GATEWAY_TOKEN=\$\{/u
    );
  });

  it("removes the temporary container and image in the outer finally path", () => {
    const finallyBlock = runner.split("} finally {")[1]?.split("}\n\nfunction")[0];

    expect(finallyBlock).toContain("cleanupDockerResources(dockerResources)");
    expect(runner).toMatch(/"rm",\s*"--force"/u);
    expect(runner).toMatch(/"image",\s*"rm",\s*"--force"/u);
    expect(runner).toContain('containerName: `yanki-e2e-${processId}`');
    expect(runner).toContain('imageName: `yanki-e2e:${processId}`');
  });
});

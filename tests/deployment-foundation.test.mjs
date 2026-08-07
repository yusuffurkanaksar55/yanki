import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("portable deployment foundation", () => {
  it("contains the application container and operations files", () => {
    const requiredFiles = [
      "Dockerfile",
      "compose.yaml",
      "deploy/nginx.conf",
      "deploy/40-write-runtime-config.sh",
      "deploy/compose.env.example",
      "docs/DEPLOYMENT.md"
    ];

    expect(requiredFiles.filter((path) => !existsSync(join(root, path)))).toEqual([]);
  });

  it("builds a static bundle and serves it from a separate runtime stage", () => {
    const dockerfile = readProjectFile("Dockerfile");

    expect(dockerfile).toMatch(/FROM \$\{NODE_IMAGE\} AS build/);
    expect(dockerfile).toMatch(/RUN npm run build/);
    expect(dockerfile).toMatch(/FROM \$\{NGINX_IMAGE\} AS runtime/);
    expect(dockerfile).toMatch(/HEALTHCHECK/);
  });

  it("injects only public Supabase configuration into the browser", () => {
    const runtimeScript = readProjectFile("deploy/40-write-runtime-config.sh");
    const compose = readProjectFile("compose.yaml");
    const combinedSource = `${runtimeScript}\n${compose}`;

    expect(combinedSource).toMatch(/SUPABASE_PUBLIC_URL/);
    expect(combinedSource).toMatch(/SUPABASE_ANON_KEY/);
    expect(combinedSource).not.toMatch(/SERVICE_ROLE/);
    expect(combinedSource).not.toMatch(/DATABASE_URL/);
    expect(combinedSource).not.toMatch(/ENCRYPTION_KEY/);
    expect(runtimeScript).not.toMatch(/\beval\b/);
  });

  it("documents both commercial deployment modes and the production gate", () => {
    const guide = readProjectFile("docs/DEPLOYMENT.md");

    expect(guide).toMatch(/Vendor-Hosted Shared SaaS/);
    expect(guide).toMatch(/Customer-Managed Dedicated Installation/);
    expect(guide).toMatch(/organizations\.id/);
    expect(guide).toMatch(/not approved for live employee data/);
  });
});

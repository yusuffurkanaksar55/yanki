import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const compose = read("deploy/aws-development/docker-compose.override.yml");
const caddy = read("deploy/aws-development/Caddyfile");
const configure = read("deploy/aws-development/configure.sh");
const nginx = read("deploy/nginx.conf");
const acceptance = read("scripts/verify-aws-development-web-acceptance.mjs");
const packageJson = JSON.parse(read("package.json"));

describe("AWS development web deployment", () => {
  it("keeps Supabase and database ingress loopback-only", () => {
    expect(compose).toMatch(/127\.0\.0\.1:\$\{API_GW_HTTP_PORT/u);
    expect(compose).toMatch(/127\.0\.0\.1:\$\{POSTGRES_PORT/u);
    expect(compose).toMatch(/127\.0\.0\.1:\$\{POOLER_PROXY_PORT_TRANSACTION/u);
    expect(compose).not.toMatch(/0\.0\.0\.0.*(?:5432|6543|8000)/u);
  });

  it("requires one server-only token at the gateway and Functions", () => {
    expect(compose).toMatch(/YANKI_SENSITIVE_GATEWAY_REQUIRED: "true"/u);
    expect(compose).toMatch(
      /functions:[\s\S]*YANKI_SENSITIVE_GATEWAY_TOKEN: \$\{YANKI_SENSITIVE_GATEWAY_TOKEN:\?/u
    );
    expect(compose).toMatch(
      /yanki-web:[\s\S]*YANKI_SENSITIVE_GATEWAY_TOKEN: \$\{YANKI_SENSITIVE_GATEWAY_TOKEN:\?/u
    );
    expect(configure).toMatch(/openssl rand -base64 48/u);
    expect(configure).toMatch(/chmod 600/u);
    expect(configure).toMatch(/systemctl start yanki-backup\.service/u);
    expect(configure).toMatch(/BACKUP=PASS/u);
    expect(configure).not.toMatch(/echo.*gateway_token/u);
  });

  it("publishes only the TLS proxy and pins its image", () => {
    expect(compose).toMatch(/caddy:2\.10\.2-alpine@sha256:[a-f0-9]{64}/u);
    expect(compose).toMatch(/- "80:80"/u);
    expect(compose).toMatch(/- "443:443"/u);
    expect(caddy).toMatch(/Strict-Transport-Security/u);
    expect(caddy).not.toMatch(/\blog\s*\{/u);
  });

  it("serves a same-origin browser client with a restrictive CSP", () => {
    expect(compose).toMatch(/SUPABASE_UPSTREAM_URL: http:\/\/api-gw:8000/u);
    expect(nginx).toMatch(/Content-Security-Policy/u);
    expect(nginx).toMatch(/default-src 'self'/u);
    expect(nginx).toMatch(/frame-ancestors 'none'/u);
  });

  it("provides repeatable HTTPS and direct-denial acceptance", () => {
    expect(packageJson.scripts["smoke:aws-development:web"]).toBeTruthy();
    expect(packageJson.scripts["e2e:aws-development:web"]).toBeTruthy();
    expect(acceptance).toMatch(/SENSITIVE_GATEWAY_REQUIRED/u);
    expect(acceptance).toMatch(/oversizedRequestDenied/u);
    expect(acceptance).not.toMatch(/SERVICE_ROLE_KEY/u);
  });
});

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

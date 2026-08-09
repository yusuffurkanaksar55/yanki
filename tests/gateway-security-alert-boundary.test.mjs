import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const nginxSource = read("deploy/nginx.conf");
const runtimeSource = read("deploy/40-write-runtime-config.sh");
const composeSource = read("compose.yaml");
const migrationSource = read(
  "supabase/migrations/20260809190000_security_alert_operator_summary.sql"
);
const alertSource = read("scripts/check-security-alerts.mjs");
const alertAcceptanceSource = read(
  "scripts/verify-security-alert-acceptance.mjs"
);
const alertLibrarySource = read("scripts/lib/security-alerting.mjs");
const serviceSource = read("deploy/security/yanki-security-alert.service");
const timerSource = read("deploy/security/yanki-security-alert.timer");
const packageJson = JSON.parse(read("package.json"));

describe("gateway and security alert boundary", () => {
  it("routes browser Supabase traffic through the same-origin gateway", () => {
    expect(composeSource).toMatch(/SUPABASE_UPSTREAM_URL/u);
    expect(runtimeSource).toMatch(/\/supabase/u);
    expect(nginxSource).toMatch(/location \/supabase\//u);
    expect(nginxSource).toMatch(
      /resolver \$\{NGINX_LOCAL_RESOLVERS\}/u
    );
    expect(nginxSource).toMatch(/proxy_pass \$supabase_upstream/u);
    expect(nginxSource).toMatch(
      /map \$uri \$yanki_sensitive_gateway_token/u
    );
    expect(nginxSource).toMatch(
      /proxy_set_header X-Yanki-Sensitive-Gateway-Token \$yanki_sensitive_gateway_token/u
    );
    expect(runtimeSource).not.toMatch(/SERVICE_ROLE|DATABASE_URL|ENCRYPTION_KEY/u);
    expect(runtimeSource).toMatch(/upstream_authority/u);
    expect(runtimeSource).toMatch(/only a host and optional port/u);
    const browserConfig = runtimeSource.split("cat >")[1];
    expect(browserConfig).not.toMatch(/YANKI_SENSITIVE_GATEWAY_TOKEN/u);
  });

  it("limits sensitive endpoints before upstream processing", () => {
    const anonymousLocation = readLocation(
      "/supabase/functions/v1/anonymous-evaluation-submissions"
    );
    const credentialLocation = readLocation(
      "/supabase/functions/v1/evaluation-submission-credentials"
    );

    expect(anonymousLocation).toMatch(/client_max_body_size 256k/u);
    expect(credentialLocation).toMatch(/client_max_body_size 16k/u);
    expect(anonymousLocation).toMatch(/limit_req zone=yanki_anonymous_client/u);
    expect(anonymousLocation).toMatch(/limit_req zone=yanki_anonymous_global/u);
    expect(credentialLocation).toMatch(/limit_req zone=yanki_credential_client/u);
    expect(credentialLocation).toMatch(/limit_conn/u);
    expect(`${anonymousLocation}\n${credentialLocation}`).toMatch(
      /limit_req_status 429/u
    );
  });

  it("does not persist anonymous request or limiter details", () => {
    const anonymousLocation = readLocation(
      "/supabase/functions/v1/anonymous-evaluation-submissions"
    );

    expect(anonymousLocation).toMatch(/access_log off/u);
    expect(anonymousLocation).toMatch(/limit_req_log_level info/u);
    expect(anonymousLocation).toMatch(/limit_conn_log_level info/u);
    expect(nginxSource).toMatch(/\$request_method \$uri/u);
    expect(nginxSource).not.toMatch(
      /\$request_uri|\$args|\$request_body|\$http_authorization/u
    );
  });

  it("keeps the scheduled summary service-role-only and identifier-free", () => {
    expect(migrationSource).toMatch(
      /auth\.role\(\)[\s\S]*service_role/u
    );
    expect(migrationSource).toMatch(
      /revoke all on function public\.get_anonymous_submission_abuse_summary_for_operator\(\)[\s\S]*authenticated/u
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.get_anonymous_submission_abuse_summary_for_operator\(\)[\s\S]*to service_role/u
    );
    expect(migrationSource).not.toMatch(
      /encrypted_evaluation_submissions|anonymous_submission_credentials/u
    );
  });

  it("delivers transition-only HTTPS alerts without logging secrets", () => {
    expect(alertLibrarySource).toMatch(/url\.protocol !== "https:"/u);
    expect(alertLibrarySource).toMatch(/redirect: "error"/u);
    expect(alertLibrarySource).toMatch(/ALERT_REMINDER/u);
    expect(alertSource).toMatch(/contentOrIdentifiersLogged: false/u);
    expect(alertSource).toMatch(/webhookLocatorLogged: false/u);
    expect(alertSource).not.toMatch(/console\.log\([^)]*summary/u);
  });

  it("runs alert checks in a hardened persistent timer", () => {
    expect(packageJson.scripts["security:alerts:check"]).toBeTruthy();
    expect(packageJson.scripts["security:alerts:acceptance"]).toBeTruthy();
    expect(serviceSource).toMatch(/NoNewPrivileges=true/u);
    expect(serviceSource).toMatch(/ProtectSystem=strict/u);
    expect(serviceSource).toMatch(/StateDirectory=yanki-security-alert/u);
    expect(timerSource).toMatch(/OnCalendar=\*:0\/5/u);
    expect(timerSource).toMatch(/Persistent=true/u);
    expect(alertAcceptanceSource).toMatch(/127\.0\.0\.1/u);
    expect(alertAcceptanceSource).toMatch(/temporaryStateRemoved: true/u);
  });
});

function readLocation(path) {
  const marker = `location = ${path} {`;
  const start = nginxSource.indexOf(marker);
  const end = nginxSource.indexOf("\n  }", start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return nginxSource.slice(start, end);
}

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

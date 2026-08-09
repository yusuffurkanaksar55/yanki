import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationSource = read("supabase/migrations/20260807013000_anonymous_encrypted_evaluation_submissions.sql");
const credentialFunctionSource = read("supabase/functions/evaluation-submission-credentials/index.ts");
const anonymousFunctionSource = read("supabase/functions/anonymous-evaluation-submissions/index.ts");
const sharedSource = read("supabase/functions/_shared/evaluationSubmission.ts");
const keyringSource = read("supabase/functions/_shared/encryptionKeyring.ts");
const gatewaySource = read("supabase/functions/_shared/sensitiveGateway.ts");
const browserServiceSource = read("src/features/evaluations/evaluationAssignmentService.ts");
const submissionTableSource = migrationSource
  .split("create table public.encrypted_evaluation_submissions")[1]
  .split("create index encrypted_evaluation_submissions_reporting_idx")[0];

describe("anonymous encrypted submission boundary", () => {
  it("keeps evaluator, assignment, and credential linkage out of content rows", () => {
    expect(submissionTableSource).not.toMatch(/evaluator_user_id/);
    expect(submissionTableSource).not.toMatch(/evaluation_assignment_id/);
    expect(submissionTableSource).not.toMatch(/credential_(id|digest)/);
    expect(submissionTableSource).not.toMatch(/created_at|submitted_at|stored_at/);
    expect(submissionTableSource).toMatch(/stored_on date/);
  });

  it("stores only authenticated ciphertext and versioned encryption metadata", () => {
    expect(submissionTableSource).toMatch(/encrypted_payload bytea/);
    expect(submissionTableSource).toMatch(/encryption_nonce bytea/);
    expect(submissionTableSource).toMatch(/AES-256-GCM/);
    expect(submissionTableSource).toMatch(/encryption_key_version/);
    expect(submissionTableSource).not.toMatch(/answers?\s+(text|jsonb?)/);
  });

  it("exposes lifecycle mutations only through service-role RPCs", () => {
    expect(migrationSource).toMatch(
      /revoke all on table public\.encrypted_evaluation_submissions[\s\S]*service_role/
    );
    expect(migrationSource).toMatch(
      /grant execute on function public\.redeem_anonymous_submission_credential[\s\S]*to service_role/
    );
    expect(migrationSource).not.toMatch(
      /grant (select|insert|update|delete)[\s\S]*encrypted_evaluation_submissions/i
    );
  });

  it("authenticates credential issuance and persists only a digest", () => {
    expect(credentialFunctionSource).toMatch(/auth\.getUser\(\)/);
    expect(credentialFunctionSource).toMatch(/createAnonymousCredential/);
    expect(credentialFunctionSource).toMatch(/credential_digest_hex/);
    expect(credentialFunctionSource).not.toMatch(/console\.(log|info|debug|error)/);
  });

  it("keeps the submission endpoint independent from the user session", () => {
    expect(anonymousFunctionSource).not.toMatch(/authorization/i);
    expect(anonymousFunctionSource).not.toMatch(/auth\.getUser/);
    expect(anonymousFunctionSource).toMatch(/hashAnonymousCredential/);
    expect(anonymousFunctionSource).toMatch(/encryptEvaluationPayload/);
    expect(anonymousFunctionSource).not.toMatch(/console\.(log|info|debug|error)/);
  });

  it("uses a server-only versioned keyring and random AES-GCM nonces", () => {
    expect(keyringSource).toMatch(/EVALUATION_ENCRYPTION_KEYRING/);
    expect(keyringSource).toMatch(/EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION/);
    expect(keyringSource).toMatch(/EVALUATION_ENCRYPTION_KEY_VERSION_/);
    expect(sharedSource).toMatch(/crypto\.getRandomValues\(new Uint8Array\(12\)\)/);
    expect(sharedSource).toMatch(/name: "AES-GCM"/);
    expect(sharedSource).not.toMatch(/SUPABASE_ANON_KEY/);
  });

  it("sends anonymous content without browser credentials or authorization", () => {
    expect(browserServiceSource).toMatch(/credentials: "omit"/);
    expect(browserServiceSource).toMatch(/referrerPolicy: "no-referrer"/);
    expect(browserServiceSource).toMatch(/anonymous-evaluation-submissions/);
    expect(browserServiceSource).not.toMatch(/localStorage|sessionStorage/);

    const anonymousRequestSource = browserServiceSource
      .split("async submitEvaluation")[1]
      .split("function getDefaultService")[0];
    expect(anonymousRequestSource).not.toMatch(/Authorization/);
  });

  it("can require the trusted gateway before sensitive function work", () => {
    expect(gatewaySource).toMatch(/YANKI_SENSITIVE_GATEWAY_REQUIRED/u);
    expect(gatewaySource).toMatch(/YANKI_SENSITIVE_GATEWAY_TOKEN/u);
    expect(gatewaySource).toMatch(/crypto\.subtle\.digest/u);
    expect(gatewaySource).not.toMatch(/console\.(log|info|debug|error)/u);

    for (const functionSource of [
      credentialFunctionSource,
      anonymousFunctionSource
    ]) {
      const enforcementIndex = functionSource.indexOf(
        "await enforceSensitiveGateway(request)"
      );
      const bodyIndex = functionSource.indexOf("await readJsonBodyWithLimit");

      expect(enforcementIndex).toBeGreaterThan(0);
      expect(bodyIndex).toBeGreaterThan(enforcementIndex);
    }
  });
});

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

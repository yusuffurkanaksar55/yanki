import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "CHANGELOG.md",
  "docs/PROJECT_CONTEXT.md",
  "docs/PRODUCT_REQUIREMENTS.md",
  "docs/ARCHITECTURE.md",
  "docs/SECURITY_MODEL.md",
  "docs/DATA_MODEL.md",
  "docs/AUTHORIZATION_MODEL.md",
  "docs/DEVELOPMENT_LOG.md",
  "docs/ERROR_LOG.md",
  "docs/KNOWN_ISSUES.md",
  "docs/TEST_REPORT.md",
  "docs/RELEASE_NOTES.md",
  "docs/ASSUMPTIONS.md",
  "docs/DEPLOYMENT.md",
  "docs/SUPABASE_SETUP.md",
  "docs/TEST_FIXTURES.md",
  "docs/decisions/ADR-0001-use-react-vite-supabase.md",
  "docs/decisions/ADR-0002-separate-evaluation-identity.md",
  "docs/decisions/ADR-0003-server-side-encrypted-payloads.md",
  "docs/decisions/ADR-0004-default-deny-supabase-foundation.md",
  "docs/decisions/ADR-0005-use-typed-supabase-auth-client.md",
  "docs/decisions/ADR-0006-use-profile-invitation-onboarding-foundation.md",
  "docs/decisions/ADR-0007-use-configurable-organization-hierarchy-foundation.md",
  "docs/decisions/ADR-0008-use-authenticated-workspace-context-rpc.md",
  "docs/decisions/ADR-0009-use-default-deny-project-evaluation-cycle-foundation.md",
  "docs/decisions/ADR-0010-use-admin-project-cycle-edge-function.md",
  "docs/decisions/ADR-0011-use-admin-project-membership-edge-function-actions.md",
  "docs/decisions/ADR-0012-use-default-deny-evaluation-assignment-planning.md",
  "docs/decisions/ADR-0013-use-supabase-auth-backed-invitation-onboarding.md",
  "docs/decisions/ADR-0014-use-atomic-organization-administration-boundary.md",
  "docs/decisions/ADR-0015-use-atomic-delegated-project-date-administration.md",
  "docs/decisions/ADR-0016-support-shared-and-dedicated-deployments.md",
  "docs/decisions/ADR-0017-enforce-organization-tenant-integrity.md",
  "docs/decisions/ADR-0030-use-immediate-identity-separated-aggregate-reporting.md",
  "docs/decisions/ADR-0037-use-canonical-aws-development-and-gated-environment-promotion.md"
];

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("project memory foundation", () => {
  it("contains every required project memory file", () => {
    const missingFiles = requiredFiles.filter((file) => !existsSync(join(root, file)));

    expect(missingFiles).toEqual([]);
  });

  it("documents evaluator identity separation", () => {
    const securityModel = readProjectFile("docs/SECURITY_MODEL.md");
    const identityAdr = readProjectFile("docs/decisions/ADR-0002-separate-evaluation-identity.md");

    expect(securityModel).toMatch(/No submission record may contain both evaluator identity and evaluation content\./);
    expect(identityAdr).toMatch(/Submission records store encrypted payloads without evaluator identifiers\./);
  });

  it("documents server-side encrypted payload storage", () => {
    const securityModel = readProjectFile("docs/SECURITY_MODEL.md");
    const encryptionAdr = readProjectFile("docs/decisions/ADR-0003-server-side-encrypted-payloads.md");

    expect(securityModel).toMatch(/Evaluation scores, comments, and lessons learned content must be encrypted before database persistence/);
    expect(encryptionAdr).toMatch(/persist only ciphertext and non-sensitive metadata/);
  });

  it("documents immediate and scoped result access", () => {
    const authorizationModel = readProjectFile("docs/AUTHORIZATION_MODEL.md");

    expect(authorizationModel).toMatch(/Report access starts after the first encrypted submission/);
    expect(authorizationModel).toMatch(/Users must not access results about themselves/);
  });

  it("documents portable deployment and tenant isolation", () => {
    const deploymentGuide = readProjectFile("docs/DEPLOYMENT.md");
    const tenantDecision = readProjectFile(
      "docs/decisions/ADR-0017-enforce-organization-tenant-integrity.md"
    );

    expect(deploymentGuide).toMatch(/Customer-Managed Dedicated Installation/);
    expect(tenantDecision).toMatch(/canonical tenant identifier/);
  });

  it("documents canonical AWS development and gated production promotion", () => {
    const operatingGuide = readProjectFile("AGENTS.md");
    const promotionDecision = readProjectFile(
      "docs/decisions/ADR-0037-use-canonical-aws-development-and-gated-environment-promotion.md"
    );

    expect(operatingGuide).toMatch(/https:\/\/18-194-171-29\.sslip\.io/);
    expect(operatingGuide).toMatch(/Public ingress is limited to TCP\/80 and TCP\/443/);
    expect(operatingGuide).toMatch(/Do not replay the first 29 migrations/);
    expect(operatingGuide).toMatch(/20 legacy encrypted submissions/);
    expect(promotionDecision).toMatch(/DEV -> STAGING -> PRODUCTION/);
    expect(promotionDecision).toMatch(/avoid interactive production development/);
  });
});

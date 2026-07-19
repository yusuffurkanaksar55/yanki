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
  "docs/SUPABASE_SETUP.md",
  "docs/TEST_FIXTURES.md",
  "docs/decisions/ADR-0001-use-react-vite-supabase.md",
  "docs/decisions/ADR-0002-separate-evaluation-identity.md",
  "docs/decisions/ADR-0003-server-side-encrypted-payloads.md",
  "docs/decisions/ADR-0004-default-deny-supabase-foundation.md",
  "docs/decisions/ADR-0005-use-typed-supabase-auth-client.md",
  "docs/decisions/ADR-0006-use-profile-invitation-onboarding-foundation.md",
  "docs/decisions/ADR-0007-use-configurable-organization-hierarchy-foundation.md",
  "docs/decisions/ADR-0008-use-authenticated-workspace-context-rpc.md"
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

  it("documents thresholded and scoped result access", () => {
    const authorizationModel = readProjectFile("docs/AUTHORIZATION_MODEL.md");

    expect(authorizationModel).toMatch(/Report access requires the configured anonymity threshold to be met/);
    expect(authorizationModel).toMatch(/Users must not access results about themselves/);
  });
});

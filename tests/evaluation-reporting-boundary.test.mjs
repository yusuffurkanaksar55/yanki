import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(path, "utf8");
const migration = read(
  "supabase/migrations/20260807103000_thresholded_evaluation_reporting.sql"
);
const edgeFunction = read("supabase/functions/evaluation-reports/index.ts");
const aggregation = read(
  "supabase/functions/_shared/evaluationReporting.ts"
);
const frontendService = read(
  "src/features/reporting/evaluationReportService.ts"
);

describe("evaluation reporting security boundary", () => {
  it("releases no ciphertext or exact count below the database threshold", () => {
    const withheldStart = migration.indexOf(
      "if submission_count < report_record.anonymity_threshold then"
    );
    const ciphertextSelection = migration.indexOf(
      "'encrypted_payload_hex', encode(submission.encrypted_payload, 'hex')"
    );
    const withheldBlock = migration.slice(withheldStart, ciphertextSelection);

    expect(withheldStart).toBeGreaterThan(0);
    expect(ciphertextSelection).toBeGreaterThan(withheldStart);
    expect(withheldBlock).not.toContain("'submission_count'");
    expect(withheldBlock).not.toContain("'submissions'");
    expect(withheldBlock).not.toContain("'questions'");
  });

  it("keeps target discovery independent of submission existence", () => {
    const listStart = migration.indexOf(
      "create or replace function public.list_my_evaluation_report_targets"
    );
    const batchStart = migration.indexOf(
      "create or replace function public.get_encrypted_evaluation_report_batch"
    );
    const listFunction = migration.slice(listStart, batchStart);

    expect(listFunction).not.toContain("encrypted_evaluation_submissions");
    expect(listFunction).not.toContain("submission_count");
  });

  it("authenticates first and decrypts only the threshold-approved RPC batch", () => {
    const batchRpc = edgeFunction.indexOf(
      '"get_encrypted_evaluation_report_batch"'
    );
    const decryption = edgeFunction.indexOf("decryptEvaluationPayload(");

    expect(edgeFunction).toContain("userClient.auth.getUser()");
    expect(edgeFunction).toContain("hasActiveProfile");
    expect(batchRpc).toBeGreaterThan(0);
    expect(decryption).toBeGreaterThan(batchRpc);
    expect(edgeFunction).toContain("aggregateEvaluationPayloads");
    expect(edgeFunction).not.toMatch(/console\.(?:log|info|warn|error)/u);
  });

  it("never models raw text or encrypted payloads in frontend report results", () => {
    expect(aggregation).toContain('kind: "TEXT_WITHHELD"');
    expect(aggregation).not.toContain("rawText");
    expect(frontendService).toContain('readonly kind: "TEXT_WITHHELD"');
    expect(frontendService).not.toContain("ciphertext");
    expect(frontendService).not.toContain("encryptedPayload");
    expect(frontendService).not.toContain("evaluatorUserId");
  });
});

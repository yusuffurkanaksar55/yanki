import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(path, "utf8");
const migration = read(
  "supabase/migrations/20260809210000_immediate_evaluation_reporting.sql"
);
const edgeFunction = read("supabase/functions/evaluation-reports/index.ts");
const aggregation = read(
  "supabase/functions/_shared/evaluationReporting.ts"
);
const frontendService = read(
  "src/features/reporting/evaluationReportService.ts"
);

describe("evaluation reporting security boundary", () => {
  it("releases no ciphertext or exact count before the first submission", () => {
    const emptyStart = migration.indexOf(
      "if submission_count = 0 then"
    );
    const ciphertextSelection = migration.indexOf(
      "'encrypted_payload_hex', encode(submission.encrypted_payload, 'hex')"
    );
    const emptyBlock = migration.slice(emptyStart, ciphertextSelection);

    expect(emptyStart).toBeGreaterThan(0);
    expect(ciphertextSelection).toBeGreaterThan(emptyStart);
    expect(emptyBlock).not.toContain("'submission_count'");
    expect(emptyBlock).not.toContain("'submissions'");
    expect(emptyBlock).not.toContain("'questions'");
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
    expect(listFunction).toContain("cycle.status <> 'DRAFT'");
    expect(listFunction).not.toContain("cycle.status in ('CLOSED', 'ARCHIVED')");
  });

  it("authenticates first and decrypts only the authorized identity-free RPC batch", () => {
    const batchRpc = edgeFunction.indexOf(
      '"get_encrypted_evaluation_report_batch"'
    );
    const decryption = edgeFunction.indexOf("decryptEvaluationPayload(");

    expect(edgeFunction).toContain("userClient.auth.getUser()");
    expect(edgeFunction).toContain("hasActiveProfile");
    expect(batchRpc).toBeGreaterThan(0);
    expect(decryption).toBeGreaterThan(batchRpc);
    expect(edgeFunction).toContain("aggregateEvaluationPayloads");
    expect(edgeFunction).toContain("submissionCount < 1");
    expect(edgeFunction).not.toContain("threshold < 4");
    expect(edgeFunction).not.toMatch(/console\.(?:log|info|warn|error)/u);
  });

  it("returns question-grouped comments without identity or encrypted payload metadata", () => {
    expect(aggregation).toContain('kind: "TEXT_COMMENTS"');
    expect(aggregation).toContain("shuffleAnonymousComments");
    expect(aggregation).not.toContain("rawText");
    expect(frontendService).toContain('readonly kind: "TEXT_COMMENTS"');
    expect(frontendService).toContain("readonly comments: readonly string[]");
    expect(frontendService).not.toContain("ciphertext");
    expect(frontendService).not.toContain("encryptedPayload");
    expect(frontendService).not.toContain("evaluatorUserId");
    expect(frontendService).not.toContain("submissionId");
    expect(frontendService).not.toContain("submittedAt");
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../../types/supabase";
import { createSupabaseEvaluationAssignmentService } from "./evaluationAssignmentService";

describe("evaluationAssignmentService submission boundary", () => {
  it("prepares a credential through the authenticated trusted function", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        credential: "one-time-token",
        submission: {
          evaluationCycleId: "cycle-id",
          evaluationCycleName: "Cycle",
          expiresAt: "2026-08-07T12:00:00.000Z",
          organizationId: "organization-id",
          organizationName: "Organization",
          projectCode: null,
          projectId: null,
          projectName: null,
          questions: [],
          subjectDisplayName: "Subject",
          subjectEmail: "subject@example.com",
          templateName: "Template",
          templateVersionId: "template-version-id",
          templateVersionNumber: 1
        }
      },
      error: null
    }));
    const service = createSupabaseEvaluationAssignmentService(
      createClientStub(invoke),
      createPublicEnvironment(),
      vi.fn()
    );

    const prepared = await service.prepareSubmission("assignment-id");

    expect(invoke).toHaveBeenCalledWith("evaluation-submission-credentials", {
      body: { assignmentId: "assignment-id" }
    });
    expect(prepared.credential).toBe("one-time-token");
  });

  it("submits through an anonymous request without cookies or authorization", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(
      JSON.stringify({ accepted: true }),
      { status: 201 }
    ));
    const service = createSupabaseEvaluationAssignmentService(
      createClientStub(vi.fn()),
      createPublicEnvironment(),
      fetcher
    );

    await service.submitEvaluation("one-time-token", [
      { questionId: "question-id", value: 5 }
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];

    expect(options).toBeDefined();

    if (!options) {
      throw new Error("Expected anonymous request options.");
    }

    expect(url).toBe(
      "https://project.supabase.co/functions/v1/anonymous-evaluation-submissions"
    );
    expect(options.credentials).toBe("omit");
    expect(options.referrerPolicy).toBe("no-referrer");
    expect(options.headers).toEqual({
      apikey: "public-anon-key",
      "Content-Type": "application/json"
    });
    expect(options.headers).not.toHaveProperty("Authorization");
  });

  it("maps anonymous endpoint rate limits to a safe client error", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(
      JSON.stringify({ error: "ANONYMOUS_RATE_LIMIT_EXCEEDED" }),
      { headers: { "Retry-After": "37" }, status: 429 }
    ));
    const service = createSupabaseEvaluationAssignmentService(
      createClientStub(vi.fn()),
      createPublicEnvironment(),
      fetcher
    );

    await expect(service.submitEvaluation("one-time-token", [])).rejects
      .toMatchObject({
        code: "EVALUATION_SUBMISSION_RATE_LIMITED",
        cause: {
          error: "ANONYMOUS_RATE_LIMIT_EXCEEDED",
          retryAfterSeconds: 37
        }
      });
  });

  it("maps oversized anonymous submissions to a safe client error", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(
      JSON.stringify({ error: "REQUEST_PAYLOAD_TOO_LARGE" }),
      { status: 413 }
    ));
    const service = createSupabaseEvaluationAssignmentService(
      createClientStub(vi.fn()),
      createPublicEnvironment(),
      fetcher
    );

    await expect(service.submitEvaluation("one-time-token", [])).rejects
      .toMatchObject({ code: "EVALUATION_SUBMISSION_TOO_LARGE" });
  });
});

function createClientStub(
  invoke: ReturnType<typeof vi.fn>
): SupabaseClient<Database> {
  return {
    functions: { invoke }
  } as unknown as SupabaseClient<Database>;
}

function createPublicEnvironment() {
  return {
    supabaseAnonKey: "public-anon-key",
    supabaseUrl: "https://project.supabase.co"
  };
}

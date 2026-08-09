import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../../types/supabase";
import { createSupabaseEvaluationRetentionService } from
  "./evaluationRetentionService";

describe("evaluationRetentionService", () => {
  it("lists content-free tenant retention policies", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        data: {
          policies: [createPolicyResponse()]
        }
      },
      error: null
    }));
    const service = createSupabaseEvaluationRetentionService(
      createClientStub(invoke)
    );

    await expect(service.listPolicies()).resolves.toEqual([
      {
        automaticPurgeEnabled: false,
        lastPurgeCompletedAt: null,
        lastPurgeCutoffOn: null,
        legalHold: false,
        organizationId: "8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        organizationName: "Retention Test Organization",
        policyVersion: 1,
        retentionDays: 730,
        updatedAt: "2026-08-08T12:00:00Z"
      }
    ]);
    expect(invoke).toHaveBeenCalledWith(
      "evaluation-retention-administration",
      {
        body: { action: "list_retention_policies" },
        headers: { Authorization: "Bearer access-token" }
      }
    );
  });

  it("updates policy configuration without a browser-side destructive action", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        data: {
          ...createPolicyResponse(),
          automaticPurgeEnabled: true,
          legalHold: true,
          policyVersion: 2,
          retentionDays: 365
        }
      },
      error: null
    }));
    const service = createSupabaseEvaluationRetentionService(
      createClientStub(invoke)
    );

    await expect(service.updatePolicy({
      automaticPurgeEnabled: true,
      legalHold: true,
      organizationId: "8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      retentionDays: 365
    })).resolves.toMatchObject({
      automaticPurgeEnabled: true,
      legalHold: true,
      policyVersion: 2,
      retentionDays: 365
    });
    expect(invoke).toHaveBeenCalledWith(
      "evaluation-retention-administration",
      {
        body: {
          action: "update_retention_policy",
          payload: {
            automaticPurgeEnabled: true,
            legalHold: true,
            organizationId: "8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            retentionDays: 365
          }
        },
        headers: { Authorization: "Bearer access-token" }
      }
    );
  });
});

function createPolicyResponse() {
  return {
    automaticPurgeEnabled: false,
    lastPurgeCompletedAt: null,
    lastPurgeCutoffOn: null,
    legalHold: false,
    organizationId: "8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationName: "Retention Test Organization",
    policyVersion: 1,
    retentionDays: 730,
    updatedAt: "2026-08-08T12:00:00Z"
  };
}

function createClientStub(
  invoke: ReturnType<typeof vi.fn>
): SupabaseClient<Database> {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "access-token" } },
        error: null
      }))
    },
    functions: { invoke }
  } as unknown as SupabaseClient<Database>;
}

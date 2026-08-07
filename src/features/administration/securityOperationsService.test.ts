import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../../types/supabase";
import { createSupabaseSecurityOperationsService } from
  "./securityOperationsService";

describe("securityOperationsService", () => {
  it("reads a content-free encryption key health summary", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        health: {
          activeKeyConfigured: true,
          allReferencedKeysConfigured: true,
          configurationValid: true,
          configuredKeyCount: 2,
          referencedKeyCount: 2,
          status: "HEALTHY"
        }
      },
      error: null
    }));
    const service = createSupabaseSecurityOperationsService(
      createClientStub(invoke)
    );

    await expect(service.getEncryptionKeyHealth()).resolves.toEqual({
      activeKeyConfigured: true,
      allReferencedKeysConfigured: true,
      configurationValid: true,
      configuredKeyCount: 2,
      referencedKeyCount: 2,
      status: "HEALTHY"
    });
    expect(invoke).toHaveBeenCalledWith("encryption-key-health", {
      body: {},
      headers: { Authorization: "Bearer access-token" }
    });
  });
});

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

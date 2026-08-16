import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../../types/supabase";
import { createSupabasePlatformTenantService } from
  "./platformTenantService";

describe("platformTenantService", () => {
  it("lists content-free tenant onboarding summaries through the trusted function", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        tenants: [{
          administratorDisplayName: "First Administrator",
          administratorEmail: "first.admin@example.com",
          bootstrapManaged: true,
          createdAt: "2026-08-16T10:00:00.000Z",
          invitationExpiresAt: "2026-08-23T10:00:00.000Z",
          invitationStatus: "PENDING",
          organizationId: "81111111-1111-4111-8111-111111111111",
          organizationName: "Example Company",
          organizationSlug: "example-company",
          organizationStatus: "ACTIVE",
          requestId: "82222222-2222-4222-8222-222222222222"
        }]
      },
      error: null
    }));
    const service = createSupabasePlatformTenantService(createClientStub(invoke));

    await expect(service.listTenants()).resolves.toEqual([
      expect.objectContaining({
        bootstrapManaged: true,
        invitationStatus: "PENDING",
        organizationSlug: "example-company"
      })
    ]);
    expect(invoke).toHaveBeenCalledWith("platform-tenant-administration", {
      body: { action: "list_tenants" },
      headers: { Authorization: "Bearer access-token" }
    });
  });

  it("sends the idempotent request id only to the trusted function", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        result: {
          organizationId: "81111111-1111-4111-8111-111111111111",
          organizationSlug: "example-company",
          replayed: false,
          requestId: "82222222-2222-4222-8222-222222222222"
        },
        tenants: []
      },
      error: null
    }));
    const service = createSupabasePlatformTenantService(createClientStub(invoke));
    const draft = {
      administratorDisplayName: "First Administrator",
      administratorEmail: "first.admin@example.com",
      initialUnitName: "Administration",
      invitationExpiresInDays: 7,
      organizationName: "Example Company",
      organizationSlug: "example-company",
      requestId: "82222222-2222-4222-8222-222222222222"
    };

    await service.createTenant(draft);

    expect(invoke).toHaveBeenCalledWith("platform-tenant-administration", {
      body: { action: "create_tenant", payload: draft },
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

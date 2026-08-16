import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import { PlatformTenantManagementPanel } from
  "./PlatformTenantManagementPanel";
import type {
  PlatformTenant,
  PlatformTenantService
} from "./platformTenantService";

describe("PlatformTenantManagementPanel", () => {
  it("creates a tenant with a normalized stable slug and first administrator", async () => {
    const user = userEvent.setup();
    const service = createService();

    render(<PlatformTenantManagementPanel service={service} />);

    await screen.findByText(tr.administration.tenants.list.empty);
    await user.type(
      screen.getByLabelText(tr.administration.tenants.form.organizationName),
      "Örnek Çözüm AŞ"
    );
    expect(screen.getByLabelText(
      tr.administration.tenants.form.organizationSlug
    )).toHaveValue("ornek-cozum-as");

    await user.type(
      screen.getByLabelText(tr.administration.tenants.form.administratorName),
      "Ayşe Yönetici"
    );
    await user.type(
      screen.getByLabelText(tr.administration.tenants.form.administratorEmail),
      "AYSE.YONETICI@EXAMPLE.COM"
    );
    await user.click(screen.getByRole("button", {
      name: tr.administration.tenants.form.submit
    }));

    expect(service.createTenant).toHaveBeenCalledWith({
      administratorDisplayName: "Ayşe Yönetici",
      administratorEmail: "ayse.yonetici@example.com",
      initialUnitName: tr.administration.tenants.form.defaultUnitName,
      invitationExpiresInDays: 7,
      organizationName: "Örnek Çözüm AŞ",
      organizationSlug: "ornek-cozum-as",
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/u)
    });
    expect(await screen.findByText(
      tr.administration.tenants.feedback.created
    )).toBeInTheDocument();
    expect(screen.getByText("Örnek Çözüm AŞ")).toBeInTheDocument();
  });

  it("reissues only a pending first-administrator invitation", async () => {
    const user = userEvent.setup();
    const tenant = createTenant();
    const service = createService([tenant]);

    render(<PlatformTenantManagementPanel service={service} />);

    await screen.findByText(tenant.organizationName);
    await user.click(screen.getByRole("button", {
      name: tr.administration.tenants.list.reissue
    }));

    expect(service.reissueInitialInvitation).toHaveBeenCalledWith(
      tenant.requestId,
      7
    );
    expect(await screen.findByText(
      tr.administration.tenants.feedback.reissued
    )).toBeInTheDocument();
  });
});

function createService(
  initialTenants: readonly PlatformTenant[] = []
): PlatformTenantService {
  const createdTenant = createTenant({
    administratorDisplayName: "Ayşe Yönetici",
    administratorEmail: "ayse.yonetici@example.com",
    organizationName: "Örnek Çözüm AŞ",
    organizationSlug: "ornek-cozum-as"
  });

  return {
    createTenant: vi.fn(async () => ({
      result: {
        organizationId: createdTenant.organizationId,
        organizationSlug: createdTenant.organizationSlug,
        replayed: false,
        requestId: createdTenant.requestId ?? ""
      },
      tenants: [createdTenant]
    })),
    listTenants: vi.fn(async () => initialTenants),
    reissueInitialInvitation: vi.fn(async () => initialTenants)
  };
}

function createTenant(
  overrides: Partial<PlatformTenant> = {}
): PlatformTenant {
  return {
    administratorDisplayName: "Test Yönetici",
    administratorEmail: "test.yonetici@example.com",
    bootstrapManaged: true,
    createdAt: "2026-08-16T10:00:00.000Z",
    invitationExpiresAt: "2026-08-23T10:00:00.000Z",
    invitationStatus: "PENDING",
    organizationId: "81111111-1111-4111-8111-111111111111",
    organizationName: "Test Organizasyonu",
    organizationSlug: "test-organizasyonu",
    organizationStatus: "ACTIVE",
    requestId: "82222222-2222-4222-8222-222222222222",
    ...overrides
  };
}

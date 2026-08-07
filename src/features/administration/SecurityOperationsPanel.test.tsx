import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tr } from "../../locales/tr/messages";
import { SecurityOperationsPanel } from "./SecurityOperationsPanel";
import type {
  AbuseMonitoringSummary,
  EncryptionKeyHealth,
  SecurityOperationsService
} from "./securityOperationsService";

describe("SecurityOperationsPanel", () => {
  it("shows key health without rendering key material or version names", async () => {
    const service: SecurityOperationsService = {
      getAbuseMonitoringSummary: vi.fn(async () => createAbuseSummary()),
      getEncryptionKeyHealth: vi.fn(async (): Promise<EncryptionKeyHealth> => ({
        activeKeyConfigured: true,
        allReferencedKeysConfigured: true,
        configurationValid: true,
        configuredKeyCount: 2,
        referencedKeyCount: 2,
        status: "HEALTHY"
      }))
    };

    render(<SecurityOperationsPanel service={service} />);

    expect(
      await screen.findByText(
        tr.administration.securityOperations.keyCountValue
          .replace("{configured}", "2")
          .replace("{referenced}", "2")
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText(
      tr.administration.securityOperations.healthy
    )).toHaveLength(3);
    expect(document.body.textContent).not.toContain("DEV_20260807_01");
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(
      tr.administration.securityOperations.abuse.last24Hours.replace(
        "{count}",
        "8"
      )
    )).toBeInTheDocument();
  });

  it("makes missing historical coverage visible", async () => {
    const service: SecurityOperationsService = {
      getAbuseMonitoringSummary: vi.fn(async () => createAbuseSummary()),
      getEncryptionKeyHealth: vi.fn(async (): Promise<EncryptionKeyHealth> => ({
        activeKeyConfigured: true,
        allReferencedKeysConfigured: false,
        configurationValid: true,
        configuredKeyCount: 1,
        referencedKeyCount: 2,
        status: "UNHEALTHY"
      }))
    };

    render(<SecurityOperationsPanel service={service} />);

    expect(await screen.findAllByText(
      tr.administration.securityOperations.unhealthy
    )).toHaveLength(2);
  });
});

function createAbuseSummary(): AbuseMonitoringSummary {
  return {
    counterRetentionDays: 7,
    invalidCredentialAttemptsLast24Hours: 8,
    invalidCredentialAttemptsLast60Minutes: 3,
    invalidGlobalLimit: 120,
    invalidGlobalWindowSeconds: 60,
    knownCredentialLimit: 12,
    knownCredentialWindowSeconds: 600,
    rateLimitedRequestsLast24Hours: 2,
    rateLimitedRequestsLast60Minutes: 1
  };
}

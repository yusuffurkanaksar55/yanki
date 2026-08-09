import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSecurityAlertPayload,
  deliverSecurityAlert,
  localWebhookAcceptanceConfirmation,
  readAbuseSummary,
  readSecurityAlertConfiguration,
  readSecurityAlertState,
  selectSecurityAlertTransition,
  writeSecurityAlertState
} from "../scripts/lib/security-alerting.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { force: true, recursive: true })
    )
  );
});

describe("content-free security alerting", () => {
  it("requires HTTPS webhooks outside explicit loopback acceptance", async () => {
    await expect(readSecurityAlertConfiguration(
      createEnvironment({ SECURITY_ALERT_WEBHOOK_URL: "http://alerts.example.test/hook" })
    )).rejects.toThrow(/must use HTTPS/u);

    await expect(readSecurityAlertConfiguration(createEnvironment({
      SECURITY_ALERT_ALLOW_LOCAL_WEBHOOK:
        localWebhookAcceptanceConfirmation,
      SECURITY_ALERT_WEBHOOK_URL: "http://127.0.0.1:9123/hook"
    }))).resolves.toEqual(expect.objectContaining({
      environmentId: "production-yanki",
      webhookUrl: "http://127.0.0.1:9123/hook"
    }));

    await expect(readSecurityAlertConfiguration(createEnvironment({
      SECURITY_ALERT_WEBHOOK_URL:
        "https://token@alerts.example.test/hook?secret=value"
    }))).rejects.toThrow(/invalid/u);
  });

  it("selects alert, reminder, suppression, and recovery transitions", () => {
    const configuration = createConfiguration();
    const healthy = createSummary(59, 4);
    const active = createSummary(60, 4);
    const observedAt = new Date("2026-08-09T19:00:00.000Z");
    const recentAlert = createState("ALERT", "2026-08-09T18:30:01.000Z");
    const oldAlert = createState("ALERT", "2026-08-09T17:59:59.000Z");

    expect(selectSecurityAlertTransition(
      active,
      null,
      configuration,
      observedAt
    )).toEqual({ active: true, notificationType: "ALERT" });
    expect(selectSecurityAlertTransition(
      active,
      recentAlert,
      configuration,
      observedAt
    )).toEqual({ active: true, notificationType: null });
    expect(selectSecurityAlertTransition(
      active,
      oldAlert,
      configuration,
      observedAt
    )).toEqual({ active: true, notificationType: "ALERT_REMINDER" });
    expect(selectSecurityAlertTransition(
      healthy,
      recentAlert,
      configuration,
      observedAt
    )).toEqual({ active: false, notificationType: "RECOVERED" });
  });

  it("builds and delivers a bounded identifier-free webhook payload", async () => {
    const configuration = createConfiguration();
    const observedAt = new Date("2026-08-09T19:00:00.000Z");
    const payload = createSecurityAlertPayload({
      configuration,
      notificationType: "ALERT",
      observedAt,
      summary: createSummary(61, 6)
    });
    const request = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(_url).toBe(configuration.webhookUrl);
      expect(init?.headers).toEqual(expect.objectContaining({
        Authorization: `Bearer ${configuration.webhookBearerToken}`
      }));
      expect(JSON.parse(String(init?.body))).toEqual(payload);
      return new Response(null, { status: 204 });
    });

    expect(payload).toEqual(expect.objectContaining({
      environmentId: "production-yanki",
      eventType: "YANKI_ANONYMOUS_ABUSE",
      status: "ALERT"
    }));
    expect(JSON.stringify(payload)).not.toContain(configuration.serviceRoleKey);
    expect(JSON.stringify(payload)).not.toContain(
      configuration.webhookBearerToken
    );

    await expect(deliverSecurityAlert(
      configuration,
      payload,
      request as typeof fetch
    )).resolves.toBeUndefined();
  });

  it("reads only the two aggregate metrics through the operator RPC", async () => {
    const configuration = createConfiguration();
    const request = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toMatch(
        /get_anonymous_submission_abuse_summary_for_operator$/u
      );
      expect(init?.headers).toEqual(expect.objectContaining({
        apikey: configuration.serviceRoleKey,
        Authorization: `Bearer ${configuration.serviceRoleKey}`
      }));
      return new Response(JSON.stringify({
        counter_retention_days: 7,
        invalid_credential_attempts_last_24_hours: 80,
        invalid_credential_attempts_last_60_minutes: 61,
        invalid_global_limit: 120,
        invalid_global_window_seconds: 60,
        known_credential_limit: 12,
        known_credential_window_seconds: 600,
        rate_limited_requests_last_24_hours: 8,
        rate_limited_requests_last_60_minutes: 6
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    });

    await expect(readAbuseSummary(
      configuration,
      request as typeof fetch
    )).resolves.toEqual({
      invalidCredentialAttemptsLast60Minutes: 61,
      rateLimitedRequestsLast60Minutes: 6
    });
  });

  it("writes state atomically and rejects another environment's state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "yanki-alert-state-"));
    const statePath = join(directory, "nested", "state.json");

    temporaryDirectories.push(directory);
    await writeSecurityAlertState(
      statePath,
      "production-yanki",
      true,
      "2026-08-09T19:00:00.000Z"
    );

    await expect(readSecurityAlertState(
      statePath,
      "production-yanki"
    )).resolves.toEqual({
      environmentId: "production-yanki",
      lastDeliveredAt: "2026-08-09T19:00:00.000Z",
      schemaVersion: 1,
      status: "ALERT"
    });
    await expect(readSecurityAlertState(
      statePath,
      "another-environment"
    )).rejects.toThrow(/state is invalid/u);
  });
});

function createEnvironment(overrides: Record<string, string> = {}) {
  return {
    SECURITY_ALERT_ENVIRONMENT_ID: "production-yanki",
    SECURITY_ALERT_INVALID_60M_THRESHOLD: "60",
    SECURITY_ALERT_RATE_LIMITED_60M_THRESHOLD: "5",
    SECURITY_ALERT_REMINDER_MINUTES: "60",
    SECURITY_ALERT_STATE_PATH: ".secrets/test-security-alert-state.json",
    SECURITY_ALERT_WEBHOOK_BEARER_TOKEN:
      "disposable-test-webhook-token-value",
    SECURITY_ALERT_WEBHOOK_URL: "https://alerts.example.test/hook",
    SUPABASE_SERVICE_ROLE_KEY: "disposable-test-service-role-key-value",
    SUPABASE_URL: "https://supabase.example.test",
    ...overrides
  };
}

function createConfiguration() {
  return {
    environmentId: "production-yanki",
    invalidCredentialThreshold: 60,
    rateLimitedThreshold: 5,
    reminderMinutes: 60,
    serviceRoleKey: "disposable-test-service-role-key-value",
    statePath: ".secrets/test-security-alert-state.json",
    supabaseUrl: "https://supabase.example.test",
    webhookBearerToken: "disposable-test-webhook-token-value",
    webhookUrl: "https://alerts.example.test/hook"
  };
}

function createSummary(invalid: number, rateLimited: number) {
  return {
    invalidCredentialAttemptsLast60Minutes: invalid,
    rateLimitedRequestsLast60Minutes: rateLimited
  };
}

function createState(
  status: "ALERT" | "HEALTHY",
  lastDeliveredAt: string | null
) {
  return {
    environmentId: "production-yanki",
    lastDeliveredAt,
    schemaVersion: 1 as const,
    status
  };
}

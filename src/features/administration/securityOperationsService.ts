import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type EncryptionKeyHealth = {
  readonly activeKeyConfigured: boolean;
  readonly allReferencedKeysConfigured: boolean;
  readonly configurationValid: boolean;
  readonly configuredKeyCount: number;
  readonly referencedKeyCount: number;
  readonly status: "HEALTHY" | "UNHEALTHY";
};

export type AbuseMonitoringSummary = {
  readonly counterRetentionDays: number;
  readonly invalidCredentialAttemptsLast24Hours: number;
  readonly invalidCredentialAttemptsLast60Minutes: number;
  readonly invalidGlobalLimit: number;
  readonly invalidGlobalWindowSeconds: number;
  readonly knownCredentialLimit: number;
  readonly knownCredentialWindowSeconds: number;
  readonly rateLimitedRequestsLast24Hours: number;
  readonly rateLimitedRequestsLast60Minutes: number;
};

export type SecurityOperationsService = {
  readonly getAbuseMonitoringSummary: () => Promise<AbuseMonitoringSummary>;
  readonly getEncryptionKeyHealth: () => Promise<EncryptionKeyHealth>;
};

export type SecurityOperationsServiceErrorCode =
  | "SECURITY_OPERATIONS_SESSION_REQUIRED"
  | "ABUSE_MONITORING_READ_FAILED"
  | "ENCRYPTION_KEY_HEALTH_READ_FAILED";

export class SecurityOperationsServiceError extends Error {
  constructor(
    readonly code: SecurityOperationsServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "SecurityOperationsServiceError";
  }
}

let cachedSecurityOperationsService: SecurityOperationsService | null = null;

export const browserSecurityOperationsService: SecurityOperationsService = {
  getAbuseMonitoringSummary: () =>
    getDefaultSecurityOperationsService().getAbuseMonitoringSummary(),
  getEncryptionKeyHealth: () =>
    getDefaultSecurityOperationsService().getEncryptionKeyHealth()
};

export function createSupabaseSecurityOperationsService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): SecurityOperationsService {
  return {
    async getAbuseMonitoringSummary() {
      const data = await invokeSecurityFunction(
        client,
        "security-abuse-monitoring",
        "ABUSE_MONITORING_READ_FAILED"
      );

      if (!isRecord(data.summary)) {
        throw new SecurityOperationsServiceError(
          "ABUSE_MONITORING_READ_FAILED"
        );
      }

      return toAbuseMonitoringSummary(data.summary);
    },

    async getEncryptionKeyHealth() {
      const data = await invokeSecurityFunction(
        client,
        "encryption-key-health",
        "ENCRYPTION_KEY_HEALTH_READ_FAILED"
      );

      if (!isRecord(data.health)) {
        throw new SecurityOperationsServiceError(
          "ENCRYPTION_KEY_HEALTH_READ_FAILED"
        );
      }

      return toEncryptionKeyHealth(data.health);
    }
  };
}

async function invokeSecurityFunction(
  client: SupabaseClient<Database>,
  functionName: string,
  errorCode: Exclude<
    SecurityOperationsServiceErrorCode,
    "SECURITY_OPERATIONS_SESSION_REQUIRED"
  >
): Promise<Record<string, unknown>> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new SecurityOperationsServiceError(
      "SECURITY_OPERATIONS_SESSION_REQUIRED",
      { message: sessionError?.message }
    );
  }

  const { data, error } = await client.functions.invoke(functionName, {
    body: {},
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`
    }
  });

  if (error || !isRecord(data)) {
    throw new SecurityOperationsServiceError(errorCode, {
      data,
      message: error?.message
    });
  }

  return data;
}

function getDefaultSecurityOperationsService(): SecurityOperationsService {
  if (!cachedSecurityOperationsService) {
    cachedSecurityOperationsService = createSupabaseSecurityOperationsService();
  }

  return cachedSecurityOperationsService;
}

function toEncryptionKeyHealth(
  value: Record<string, unknown>
): EncryptionKeyHealth {
  const status = value.status === "HEALTHY" ? "HEALTHY" : "UNHEALTHY";

  return {
    activeKeyConfigured: value.activeKeyConfigured === true,
    allReferencedKeysConfigured:
      value.allReferencedKeysConfigured === true,
    configurationValid: value.configurationValid === true,
    configuredKeyCount: readNonNegativeInteger(value.configuredKeyCount),
    referencedKeyCount: readNonNegativeInteger(value.referencedKeyCount),
    status
  };
}

function toAbuseMonitoringSummary(
  value: Record<string, unknown>
): AbuseMonitoringSummary {
  return {
    counterRetentionDays: readNonNegativeInteger(value.counterRetentionDays),
    invalidCredentialAttemptsLast24Hours: readNonNegativeInteger(
      value.invalidCredentialAttemptsLast24Hours
    ),
    invalidCredentialAttemptsLast60Minutes: readNonNegativeInteger(
      value.invalidCredentialAttemptsLast60Minutes
    ),
    invalidGlobalLimit: readNonNegativeInteger(value.invalidGlobalLimit),
    invalidGlobalWindowSeconds: readNonNegativeInteger(
      value.invalidGlobalWindowSeconds
    ),
    knownCredentialLimit: readNonNegativeInteger(value.knownCredentialLimit),
    knownCredentialWindowSeconds: readNonNegativeInteger(
      value.knownCredentialWindowSeconds
    ),
    rateLimitedRequestsLast24Hours: readNonNegativeInteger(
      value.rateLimitedRequestsLast24Hours
    ),
    rateLimitedRequestsLast60Minutes: readNonNegativeInteger(
      value.rateLimitedRequestsLast60Minutes
    )
  };
}

function readNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

export type SecurityOperationsService = {
  readonly getEncryptionKeyHealth: () => Promise<EncryptionKeyHealth>;
};

export type SecurityOperationsServiceErrorCode =
  | "SECURITY_OPERATIONS_SESSION_REQUIRED"
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
  getEncryptionKeyHealth: () =>
    getDefaultSecurityOperationsService().getEncryptionKeyHealth()
};

export function createSupabaseSecurityOperationsService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): SecurityOperationsService {
  return {
    async getEncryptionKeyHealth() {
      const { data: sessionData, error: sessionError } =
        await client.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new SecurityOperationsServiceError(
          "SECURITY_OPERATIONS_SESSION_REQUIRED",
          { message: sessionError?.message }
        );
      }

      const { data, error } = await client.functions.invoke(
        "encryption-key-health",
        {
          body: {},
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`
          }
        }
      );

      if (error || !isRecord(data) || !isRecord(data.health)) {
        throw new SecurityOperationsServiceError(
          "ENCRYPTION_KEY_HEALTH_READ_FAILED",
          { data, message: error?.message }
        );
      }

      return toEncryptionKeyHealth(data.health);
    }
  };
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

function readNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

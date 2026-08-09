import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type EvaluationRetentionPolicy = {
  readonly automaticPurgeEnabled: boolean;
  readonly lastPurgeCompletedAt: string | null;
  readonly lastPurgeCutoffOn: string | null;
  readonly legalHold: boolean;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly policyVersion: number;
  readonly retentionDays: number;
  readonly updatedAt: string;
};

export type UpdateEvaluationRetentionPolicyInput = {
  readonly automaticPurgeEnabled: boolean;
  readonly legalHold: boolean;
  readonly organizationId: string;
  readonly retentionDays: number;
};

export type EvaluationRetentionService = {
  readonly listPolicies: () => Promise<readonly EvaluationRetentionPolicy[]>;
  readonly updatePolicy: (
    input: UpdateEvaluationRetentionPolicyInput
  ) => Promise<EvaluationRetentionPolicy>;
};

export type EvaluationRetentionServiceErrorCode =
  | "EVALUATION_RETENTION_SESSION_REQUIRED"
  | "EVALUATION_RETENTION_LIST_FAILED"
  | "EVALUATION_RETENTION_UPDATE_FAILED";

export class EvaluationRetentionServiceError extends Error {
  constructor(
    readonly code: EvaluationRetentionServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "EvaluationRetentionServiceError";
  }
}

let cachedEvaluationRetentionService: EvaluationRetentionService | null = null;

export const browserEvaluationRetentionService: EvaluationRetentionService = {
  listPolicies: () => getDefaultService().listPolicies(),
  updatePolicy: (input) => getDefaultService().updatePolicy(input)
};

export function createSupabaseEvaluationRetentionService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): EvaluationRetentionService {
  return {
    async listPolicies() {
      const data = await invokeRetentionFunction(
        client,
        { action: "list_retention_policies" },
        "EVALUATION_RETENTION_LIST_FAILED"
      );

      return readArray(data.policies).map(toEvaluationRetentionPolicy);
    },

    async updatePolicy(input) {
      const data = await invokeRetentionFunction(
        client,
        { action: "update_retention_policy", payload: input },
        "EVALUATION_RETENTION_UPDATE_FAILED"
      );
      const policy = toEvaluationRetentionPolicy(data);

      return {
        ...policy,
        organizationName: policy.organizationName || input.organizationId
      };
    }
  };
}

async function invokeRetentionFunction(
  client: SupabaseClient<Database>,
  body: Record<string, unknown>,
  errorCode: Exclude<
    EvaluationRetentionServiceErrorCode,
    "EVALUATION_RETENTION_SESSION_REQUIRED"
  >
): Promise<Record<string, unknown>> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new EvaluationRetentionServiceError(
      "EVALUATION_RETENTION_SESSION_REQUIRED",
      { message: sessionError?.message }
    );
  }

  const { data, error } = await client.functions.invoke(
    "evaluation-retention-administration",
    {
      body,
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    }
  );
  const response = readRecord(data);

  if (error || !isRecord(response.data)) {
    throw new EvaluationRetentionServiceError(errorCode, {
      data,
      message: error?.message
    });
  }

  return response.data;
}

function getDefaultService(): EvaluationRetentionService {
  if (!cachedEvaluationRetentionService) {
    cachedEvaluationRetentionService =
      createSupabaseEvaluationRetentionService();
  }

  return cachedEvaluationRetentionService;
}

function toEvaluationRetentionPolicy(
  value: unknown
): EvaluationRetentionPolicy {
  const record = readRecord(value);

  return {
    automaticPurgeEnabled: record.automaticPurgeEnabled === true,
    lastPurgeCompletedAt: readNullableString(record.lastPurgeCompletedAt),
    lastPurgeCutoffOn: readNullableString(record.lastPurgeCutoffOn),
    legalHold: record.legalHold === true,
    organizationId: readString(record.organizationId),
    organizationName: readString(record.organizationName),
    policyVersion: readPositiveInteger(record.policyVersion),
    retentionDays: readPositiveInteger(record.retentionDays),
    updatedAt: readString(record.updatedAt)
  };
}

function readPositiveInteger(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : 0;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

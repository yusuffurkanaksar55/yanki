import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type PlatformTenantInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

export type PlatformTenant = {
  readonly administratorDisplayName: string | null;
  readonly administratorEmail: string | null;
  readonly bootstrapManaged: boolean;
  readonly createdAt: string;
  readonly invitationExpiresAt: string | null;
  readonly invitationStatus: PlatformTenantInvitationStatus | null;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly organizationStatus: "ACTIVE" | "ARCHIVED";
  readonly requestId: string | null;
};

export type PlatformTenantDraft = {
  readonly administratorDisplayName: string;
  readonly administratorEmail: string;
  readonly initialUnitName: string;
  readonly invitationExpiresInDays: number;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly requestId: string;
};

export type PlatformTenantCreationResult = {
  readonly organizationId: string;
  readonly organizationSlug: string;
  readonly replayed: boolean;
  readonly requestId: string;
};

export type PlatformTenantService = {
  readonly createTenant: (
    draft: PlatformTenantDraft
  ) => Promise<{
    readonly result: PlatformTenantCreationResult;
    readonly tenants: readonly PlatformTenant[];
  }>;
  readonly listTenants: () => Promise<readonly PlatformTenant[]>;
  readonly reissueInitialInvitation: (
    requestId: string,
    invitationExpiresInDays: number
  ) => Promise<readonly PlatformTenant[]>;
};

export type PlatformTenantServiceErrorCode =
  | "PLATFORM_TENANT_SESSION_REQUIRED"
  | "PLATFORM_TENANT_LIST_FAILED"
  | "PLATFORM_TENANT_CREATE_FAILED"
  | "PLATFORM_TENANT_REISSUE_FAILED";

export class PlatformTenantServiceError extends Error {
  constructor(
    readonly code: PlatformTenantServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "PlatformTenantServiceError";
  }
}

let cachedPlatformTenantService: PlatformTenantService | null = null;

export const browserPlatformTenantService: PlatformTenantService = {
  createTenant: (draft) => getDefaultService().createTenant(draft),
  listTenants: () => getDefaultService().listTenants(),
  reissueInitialInvitation: (requestId, invitationExpiresInDays) =>
    getDefaultService().reissueInitialInvitation(
      requestId,
      invitationExpiresInDays
    )
};

export function createSupabasePlatformTenantService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): PlatformTenantService {
  return {
    async createTenant(draft) {
      const response = await invokePlatformTenantAdministration(
        client,
        { action: "create_tenant", payload: draft },
        "PLATFORM_TENANT_CREATE_FAILED"
      );

      return {
        result: toCreationResult(response.result),
        tenants: readArray(response.tenants).map(toPlatformTenant)
      };
    },

    async listTenants() {
      const response = await invokePlatformTenantAdministration(
        client,
        { action: "list_tenants" },
        "PLATFORM_TENANT_LIST_FAILED"
      );

      return readArray(response.tenants).map(toPlatformTenant);
    },

    async reissueInitialInvitation(requestId, invitationExpiresInDays) {
      const response = await invokePlatformTenantAdministration(
        client,
        {
          action: "reissue_initial_invitation",
          payload: { invitationExpiresInDays, requestId }
        },
        "PLATFORM_TENANT_REISSUE_FAILED"
      );

      return readArray(response.tenants).map(toPlatformTenant);
    }
  };
}

function getDefaultService(): PlatformTenantService {
  if (!cachedPlatformTenantService) {
    cachedPlatformTenantService = createSupabasePlatformTenantService();
  }

  return cachedPlatformTenantService;
}

async function invokePlatformTenantAdministration(
  client: SupabaseClient<Database>,
  body: Record<string, unknown>,
  errorCode: PlatformTenantServiceErrorCode
): Promise<Record<string, unknown>> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new PlatformTenantServiceError(
      "PLATFORM_TENANT_SESSION_REQUIRED",
      { message: sessionError?.message }
    );
  }

  const { data, error } = await client.functions.invoke(
    "platform-tenant-administration",
    {
      body,
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    }
  );

  if (error) {
    throw new PlatformTenantServiceError(errorCode, {
      message: error.message
    });
  }

  return readRecord(data);
}

function toPlatformTenant(value: unknown): PlatformTenant {
  const record = readRecord(value);
  const invitationStatus = readNullableString(record.invitationStatus);
  const organizationStatus = readString(record.organizationStatus);

  return {
    administratorDisplayName: readNullableString(
      record.administratorDisplayName
    ),
    administratorEmail: readNullableString(record.administratorEmail),
    bootstrapManaged: record.bootstrapManaged === true,
    createdAt: readString(record.createdAt),
    invitationExpiresAt: readNullableString(record.invitationExpiresAt),
    invitationStatus: isInvitationStatus(invitationStatus)
      ? invitationStatus
      : null,
    organizationId: readString(record.organizationId),
    organizationName: readString(record.organizationName),
    organizationSlug: readString(record.organizationSlug),
    organizationStatus: organizationStatus === "ARCHIVED"
      ? "ARCHIVED"
      : "ACTIVE",
    requestId: readNullableString(record.requestId)
  };
}

function toCreationResult(value: unknown): PlatformTenantCreationResult {
  const record = readRecord(value);

  return {
    organizationId: readString(record.organizationId),
    organizationSlug: readString(record.organizationSlug),
    replayed: record.replayed === true,
    requestId: readString(record.requestId)
  };
}

function isInvitationStatus(
  value: string | null
): value is PlatformTenantInvitationStatus {
  return value !== null
    && ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"].includes(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

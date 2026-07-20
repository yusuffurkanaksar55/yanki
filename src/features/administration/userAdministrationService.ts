import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type InvitationRoleCode =
  | "SYSTEM_ADMIN"
  | "EMPLOYEE"
  | "TEAM_LEADER"
  | "C_LEVEL_REVIEWER"
  | "BOARD_REVIEWER";

export type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

export type AdministrationOrganization = {
  readonly id: string;
  readonly name: string;
};

export type AdministrationUnit = {
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
  readonly unitType: string;
};

export type AdministrationMember = {
  readonly displayName: string | null;
  readonly email: string;
  readonly organizationId: string;
  readonly userId: string;
};

export type ManagedInvitation = {
  readonly createdAt: string;
  readonly displayName: string | null;
  readonly email: string;
  readonly expiresAt: string;
  readonly id: string;
  readonly organizationId: string | null;
  readonly roleCode: string;
  readonly scopeType: string;
  readonly status: InvitationStatus;
  readonly unitId: string | null;
};

export type UserAdministrationData = {
  readonly invitations: readonly ManagedInvitation[];
  readonly members: readonly AdministrationMember[];
  readonly organizations: readonly AdministrationOrganization[];
  readonly units: readonly AdministrationUnit[];
};

export type UserInvitationDraft = {
  readonly displayName: string;
  readonly email: string;
  readonly expiresInDays: number;
  readonly managerUserId: string | null;
  readonly organizationId: string;
  readonly roleCode: InvitationRoleCode;
  readonly unitId: string;
};

export type UserAdministrationService = {
  readonly createInvitation: (
    draft: UserInvitationDraft
  ) => Promise<ManagedInvitation>;
  readonly listUserAdministration: () => Promise<UserAdministrationData>;
  readonly revokeInvitation: (
    invitationId: string
  ) => Promise<ManagedInvitation>;
};

export type UserAdministrationServiceErrorCode =
  | "USER_ADMINISTRATION_SESSION_REQUIRED"
  | "USER_ADMINISTRATION_LIST_FAILED"
  | "USER_INVITATION_CREATE_FAILED"
  | "USER_INVITATION_REVOKE_FAILED";

export class UserAdministrationServiceError extends Error {
  constructor(
    readonly code: UserAdministrationServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "UserAdministrationServiceError";
  }
}

let cachedUserAdministrationService: UserAdministrationService | null = null;

export const browserUserAdministrationService: UserAdministrationService = {
  createInvitation: (draft) =>
    getDefaultUserAdministrationService().createInvitation(draft),
  listUserAdministration: () =>
    getDefaultUserAdministrationService().listUserAdministration(),
  revokeInvitation: (invitationId) =>
    getDefaultUserAdministrationService().revokeInvitation(invitationId)
};

export function createSupabaseUserAdministrationService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): UserAdministrationService {
  return {
    async createInvitation(draft) {
      const data = await invokeUserOnboarding(
        client,
        {
          action: "create_invitation",
          payload: draft
        },
        "USER_INVITATION_CREATE_FAILED"
      );

      return toManagedInvitation(data.invitation);
    },

    async listUserAdministration() {
      const response = await invokeUserOnboarding(
        client,
        { action: "list_user_administration" },
        "USER_ADMINISTRATION_LIST_FAILED"
      );
      const data = readRecord(response.data);

      return {
        invitations: readArray(data.invitations).map(toManagedInvitation),
        members: readArray(data.members).map(toAdministrationMember),
        organizations: readArray(data.organizations).map(
          toAdministrationOrganization
        ),
        units: readArray(data.units).map(toAdministrationUnit)
      };
    },

    async revokeInvitation(invitationId) {
      const data = await invokeUserOnboarding(
        client,
        {
          action: "revoke_invitation",
          payload: { invitationId }
        },
        "USER_INVITATION_REVOKE_FAILED"
      );

      return toManagedInvitation(data.invitation);
    }
  };
}

function getDefaultUserAdministrationService(): UserAdministrationService {
  if (!cachedUserAdministrationService) {
    cachedUserAdministrationService = createSupabaseUserAdministrationService();
  }

  return cachedUserAdministrationService;
}

async function invokeUserOnboarding(
  client: SupabaseClient<Database>,
  body: Record<string, unknown>,
  errorCode: UserAdministrationServiceErrorCode
): Promise<Record<string, unknown>> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new UserAdministrationServiceError(
      "USER_ADMINISTRATION_SESSION_REQUIRED",
      { message: sessionError?.message }
    );
  }

  const { data, error } = await client.functions.invoke("user-onboarding", {
    body,
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`
    }
  });

  if (error) {
    throw new UserAdministrationServiceError(errorCode, {
      message: error.message
    });
  }

  return readRecord(data);
}

function toAdministrationOrganization(
  value: unknown
): AdministrationOrganization {
  const record = readRecord(value);

  return {
    id: readString(record.id),
    name: readString(record.name)
  };
}

function toAdministrationUnit(value: unknown): AdministrationUnit {
  const record = readRecord(value);

  return {
    id: readString(record.id),
    name: readString(record.name),
    organizationId: readString(record.organizationId),
    unitType: readString(record.unitType)
  };
}

function toAdministrationMember(value: unknown): AdministrationMember {
  const record = readRecord(value);

  return {
    displayName: readNullableString(record.displayName),
    email: readString(record.email),
    organizationId: readString(record.organizationId),
    userId: readString(record.userId)
  };
}

function toManagedInvitation(value: unknown): ManagedInvitation {
  const record = readRecord(value);
  const status = readString(record.status);

  return {
    createdAt: readString(record.createdAt),
    displayName: readNullableString(record.displayName),
    email: readString(record.email),
    expiresAt: readString(record.expiresAt),
    id: readString(record.id),
    organizationId: readNullableString(record.organizationId),
    roleCode: readString(record.roleCode),
    scopeType: readString(record.scopeType),
    status: isInvitationStatus(status) ? status : "PENDING",
    unitId: readNullableString(record.unitId)
  };
}

function isInvitationStatus(value: string): value is InvitationStatus {
  return ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"].includes(value);
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
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

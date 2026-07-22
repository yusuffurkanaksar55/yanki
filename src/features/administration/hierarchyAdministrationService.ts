import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type HierarchyRoleCode =
  | "SYSTEM_ADMIN"
  | "EMPLOYEE"
  | "TEAM_LEADER"
  | "C_LEVEL_REVIEWER"
  | "BOARD_REVIEWER";

export type HierarchyMembershipKind = "MEMBER" | "LEADER";
export type HierarchyUnitStatus = "ACTIVE" | "ARCHIVED";
export type HierarchyUnitType = "DEPARTMENT" | "UNIT" | "TEAM" | "CUSTOM";

export type HierarchyOrganization = {
  readonly id: string;
  readonly name: string;
};

export type HierarchyUnit = {
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
  readonly parentUnitId: string | null;
  readonly slug: string;
  readonly status: HierarchyUnitStatus;
  readonly unitType: HierarchyUnitType;
};

export type HierarchyRoleAssignment = {
  readonly id: string;
  readonly roleCode: HierarchyRoleCode;
  readonly scopeId: string | null;
  readonly scopeType: string;
};

export type HierarchyMember = {
  readonly displayName: string | null;
  readonly email: string;
  readonly managerUserId: string | null;
  readonly membershipKind: HierarchyMembershipKind;
  readonly organizationId: string;
  readonly primaryUnitId: string;
  readonly roles: readonly HierarchyRoleAssignment[];
  readonly userId: string;
};

export type HierarchyAdministrationData = {
  readonly members: readonly HierarchyMember[];
  readonly organizations: readonly HierarchyOrganization[];
  readonly units: readonly HierarchyUnit[];
};

export type OrganizationUnitDraft = {
  readonly name: string;
  readonly organizationId: string;
  readonly parentUnitId: string | null;
  readonly slug: string;
  readonly status: HierarchyUnitStatus;
  readonly unitId: string | null;
  readonly unitType: HierarchyUnitType;
};

export type UserHierarchyContextDraft = {
  readonly managerUserId: string | null;
  readonly membershipKind: HierarchyMembershipKind;
  readonly organizationId: string;
  readonly primaryUnitId: string;
  readonly userId: string;
};

export type UserRoleAssignmentDraft = {
  readonly organizationId: string;
  readonly roleCode: HierarchyRoleCode;
  readonly unitId: string | null;
  readonly userId: string;
};

export type HierarchyAdministrationService = {
  readonly assignRole: (
    draft: UserRoleAssignmentDraft
  ) => Promise<HierarchyAdministrationData>;
  readonly endRole: (
    organizationId: string,
    roleAssignmentId: string
  ) => Promise<HierarchyAdministrationData>;
  readonly list: () => Promise<HierarchyAdministrationData>;
  readonly saveUnit: (
    draft: OrganizationUnitDraft
  ) => Promise<HierarchyAdministrationData>;
  readonly setUserContext: (
    draft: UserHierarchyContextDraft
  ) => Promise<HierarchyAdministrationData>;
};

export type HierarchyAdministrationErrorCode =
  | "HIERARCHY_ADMINISTRATION_SESSION_REQUIRED"
  | "HIERARCHY_ADMINISTRATION_LIST_FAILED"
  | "HIERARCHY_UNIT_SAVE_FAILED"
  | "HIERARCHY_CONTEXT_SAVE_FAILED"
  | "HIERARCHY_ROLE_ASSIGN_FAILED"
  | "HIERARCHY_ROLE_END_FAILED";

export class HierarchyAdministrationServiceError extends Error {
  constructor(
    readonly code: HierarchyAdministrationErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "HierarchyAdministrationServiceError";
  }
}

let cachedService: HierarchyAdministrationService | null = null;

export const browserHierarchyAdministrationService: HierarchyAdministrationService = {
  assignRole: (draft) => getDefaultService().assignRole(draft),
  endRole: (organizationId, roleAssignmentId) =>
    getDefaultService().endRole(organizationId, roleAssignmentId),
  list: () => getDefaultService().list(),
  saveUnit: (draft) => getDefaultService().saveUnit(draft),
  setUserContext: (draft) => getDefaultService().setUserContext(draft)
};

export function createSupabaseHierarchyAdministrationService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): HierarchyAdministrationService {
  return {
    assignRole: (draft) => invokeForData(
      client,
      { action: "assign_user_role", payload: draft },
      "HIERARCHY_ROLE_ASSIGN_FAILED"
    ),
    endRole: (organizationId, roleAssignmentId) => invokeForData(
      client,
      {
        action: "end_user_role",
        payload: { organizationId, roleAssignmentId }
      },
      "HIERARCHY_ROLE_END_FAILED"
    ),
    list: () => invokeForData(
      client,
      { action: "list_hierarchy_administration" },
      "HIERARCHY_ADMINISTRATION_LIST_FAILED"
    ),
    saveUnit: (draft) => invokeForData(
      client,
      { action: "save_organization_unit", payload: draft },
      "HIERARCHY_UNIT_SAVE_FAILED"
    ),
    setUserContext: (draft) => invokeForData(
      client,
      { action: "set_user_hierarchy_context", payload: draft },
      "HIERARCHY_CONTEXT_SAVE_FAILED"
    )
  };
}

function getDefaultService(): HierarchyAdministrationService {
  if (!cachedService) {
    cachedService = createSupabaseHierarchyAdministrationService();
  }

  return cachedService;
}

async function invokeForData(
  client: SupabaseClient<Database>,
  body: Record<string, unknown>,
  errorCode: HierarchyAdministrationErrorCode
): Promise<HierarchyAdministrationData> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new HierarchyAdministrationServiceError(
      "HIERARCHY_ADMINISTRATION_SESSION_REQUIRED",
      { message: sessionError?.message }
    );
  }

  const { data, error } = await client.functions.invoke(
    "organization-administration",
    {
      body,
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    }
  );

  if (error) {
    throw new HierarchyAdministrationServiceError(errorCode, {
      message: error.message
    });
  }

  return toHierarchyAdministrationData(readRecord(data).data);
}

function toHierarchyAdministrationData(
  value: unknown
): HierarchyAdministrationData {
  const record = readRecord(value);

  return {
    members: readArray(record.members).map(toHierarchyMember),
    organizations: readArray(record.organizations).map((item) => {
      const organization = readRecord(item);
      return {
        id: readString(organization.id),
        name: readString(organization.name)
      };
    }),
    units: readArray(record.units).map(toHierarchyUnit)
  };
}

function toHierarchyUnit(value: unknown): HierarchyUnit {
  const record = readRecord(value);
  const status = readString(record.status);
  const unitType = readString(record.unitType);

  return {
    id: readString(record.id),
    name: readString(record.name),
    organizationId: readString(record.organizationId),
    parentUnitId: readNullableString(record.parentUnitId),
    slug: readString(record.slug),
    status: status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
    unitType: isUnitType(unitType) ? unitType : "UNIT"
  };
}

function toHierarchyMember(value: unknown): HierarchyMember {
  const record = readRecord(value);
  const membershipKind = readString(record.membershipKind);

  return {
    displayName: readNullableString(record.displayName),
    email: readString(record.email),
    managerUserId: readNullableString(record.managerUserId),
    membershipKind: membershipKind === "LEADER" ? "LEADER" : "MEMBER",
    organizationId: readString(record.organizationId),
    primaryUnitId: readString(record.primaryUnitId),
    roles: readArray(record.roles).map(toHierarchyRoleAssignment),
    userId: readString(record.userId)
  };
}

function toHierarchyRoleAssignment(value: unknown): HierarchyRoleAssignment {
  const record = readRecord(value);
  const roleCode = readString(record.roleCode);

  return {
    id: readString(record.id),
    roleCode: isRoleCode(roleCode) ? roleCode : "EMPLOYEE",
    scopeId: readNullableString(record.scopeId),
    scopeType: readString(record.scopeType)
  };
}

function isUnitType(value: string): value is HierarchyUnitType {
  return ["DEPARTMENT", "UNIT", "TEAM", "CUSTOM"].includes(value);
}

function isRoleCode(value: string): value is HierarchyRoleCode {
  return [
    "SYSTEM_ADMIN",
    "EMPLOYEE",
    "TEAM_LEADER",
    "C_LEVEL_REVIEWER",
    "BOARD_REVIEWER"
  ].includes(value);
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

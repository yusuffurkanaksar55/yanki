import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type WorkspaceRole = {
  readonly roleCode: string;
  readonly scopeType: string;
  readonly scopeId: string | null;
};

export type WorkspaceMembership = {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly unitId: string;
  readonly unitName: string;
  readonly unitType: string;
  readonly membershipKind: string;
  readonly isPrimary: boolean;
};

export type WorkspaceManager = {
  readonly managerUserId: string;
  readonly managerDisplayName: string | null;
  readonly managerEmail: string | null;
  readonly relationshipType: string;
};

export type WorkspaceContext = {
  readonly roles: readonly WorkspaceRole[];
  readonly memberships: readonly WorkspaceMembership[];
  readonly managers: readonly WorkspaceManager[];
};

export type WorkspaceContextService = {
  readonly getMyWorkspaceContext: () => Promise<WorkspaceContext>;
};

export type WorkspaceContextServiceErrorCode = "WORKSPACE_CONTEXT_READ_FAILED";

export class WorkspaceContextServiceError extends Error {
  constructor(
    readonly code: WorkspaceContextServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "WorkspaceContextServiceError";
  }
}

let cachedWorkspaceContextService: WorkspaceContextService | null = null;

export const browserWorkspaceContextService: WorkspaceContextService = {
  getMyWorkspaceContext: () =>
    getDefaultWorkspaceContextService().getMyWorkspaceContext()
};

export function createSupabaseWorkspaceContextService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): WorkspaceContextService {
  return {
    async getMyWorkspaceContext() {
      const { data, error } = await client.rpc("get_my_workspace_context");

      if (error) {
        throw new WorkspaceContextServiceError(
          "WORKSPACE_CONTEXT_READ_FAILED",
          {
            code: error.code,
            message: error.message
          }
        );
      }

      return normalizeWorkspaceContext(data);
    }
  };
}

function getDefaultWorkspaceContextService(): WorkspaceContextService {
  if (!cachedWorkspaceContextService) {
    cachedWorkspaceContextService = createSupabaseWorkspaceContextService();
  }

  return cachedWorkspaceContextService;
}

function normalizeWorkspaceContext(value: unknown): WorkspaceContext {
  const record = isRecord(value) ? value : {};

  return {
    roles: readArray(record.roles).map(toWorkspaceRole),
    memberships: readArray(record.memberships).map(toWorkspaceMembership),
    managers: readArray(record.managers).map(toWorkspaceManager)
  };
}

function toWorkspaceRole(value: unknown): WorkspaceRole {
  const record = isRecord(value) ? value : {};

  return {
    roleCode: readString(record.role_code),
    scopeType: readString(record.scope_type),
    scopeId: readNullableString(record.scope_id)
  };
}

function toWorkspaceMembership(value: unknown): WorkspaceMembership {
  const record = isRecord(value) ? value : {};

  return {
    organizationId: readString(record.organization_id),
    organizationName: readString(record.organization_name),
    unitId: readString(record.unit_id),
    unitName: readString(record.unit_name),
    unitType: readString(record.unit_type),
    membershipKind: readString(record.membership_kind),
    isPrimary: record.is_primary === true
  };
}

function toWorkspaceManager(value: unknown): WorkspaceManager {
  const record = isRecord(value) ? value : {};

  return {
    managerUserId: readString(record.manager_user_id),
    managerDisplayName: readNullableString(record.manager_display_name),
    managerEmail: readNullableString(record.manager_email),
    relationshipType: readString(record.relationship_type)
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

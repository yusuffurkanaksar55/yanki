import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";

type AppRole = {
  readonly role_code: string;
  readonly scope_type: string;
  readonly scope_id: string | null;
};

type ManageableRoleCode =
  | "SYSTEM_ADMIN"
  | "EMPLOYEE"
  | "TEAM_LEADER"
  | "C_LEVEL_REVIEWER"
  | "BOARD_REVIEWER";

type MembershipKind = "MEMBER" | "LEADER";
type UnitStatus = "ACTIVE" | "ARCHIVED";
type UnitType = "DEPARTMENT" | "UNIT" | "TEAM" | "CUSTOM";

const manageableRoleCodes: readonly ManageableRoleCode[] = [
  "SYSTEM_ADMIN",
  "EMPLOYEE",
  "TEAM_LEADER",
  "C_LEVEL_REVIEWER",
  "BOARD_REVIEWER"
];

const unitScopedRoleCodes: readonly ManageableRoleCode[] = [
  "EMPLOYEE",
  "TEAM_LEADER"
];

const unitTypes: readonly UnitType[] = [
  "DEPARTMENT",
  "UNIT",
  "TEAM",
  "CUSTOM"
];

const corsHeaders = {
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const authorizationHeader = request.headers.get("authorization");
    const environment = readEnvironment();
    const userClient = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: { persistSession: false },
        global: {
          headers: authorizationHeader
            ? { Authorization: authorizationHeader }
            : {}
        }
      }
    );
    const serviceClient = createClient(
      environment.supabaseUrl,
      environment.serviceRoleKey,
      { auth: { persistSession: false } }
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "AUTHENTICATION_REQUIRED" }, 401);
    }

    if (!(await readHasActiveProfile(serviceClient, userData.user.id))) {
      return jsonResponse({ error: "ACTIVE_PROFILE_REQUIRED" }, 403);
    }

    const roles = await readActiveRoles(serviceClient, userData.user.id);

    if (!hasSystemAdministrationRole(roles)) {
      return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
    }

    const body = await readJsonBody(request);

    if (body.action === "list_hierarchy_administration") {
      return jsonResponse({
        data: await listHierarchyAdministration(serviceClient, roles)
      });
    }

    const payload = readRecord(body.payload);
    const organizationId = readUuid(
      payload.organizationId,
      "ORGANIZATION_ID_INVALID"
    );

    if (!canManageOrganization(roles, organizationId)) {
      return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
    }

    if (body.action === "save_organization_unit") {
      await saveOrganizationUnit(
        serviceClient,
        userData.user.id,
        parseUnitRequest(payload, organizationId)
      );
    } else if (body.action === "set_user_hierarchy_context") {
      await setUserHierarchyContext(
        serviceClient,
        userData.user.id,
        parseHierarchyContextRequest(payload, organizationId)
      );
    } else if (body.action === "assign_user_role") {
      await assignUserRole(
        serviceClient,
        userData.user.id,
        parseRoleAssignmentRequest(payload, organizationId)
      );
    } else if (body.action === "end_user_role") {
      await endUserRole(
        serviceClient,
        userData.user.id,
        organizationId,
        readUuid(payload.roleAssignmentId, "ROLE_ASSIGNMENT_ID_INVALID")
      );
    } else {
      return jsonResponse({ error: "UNKNOWN_ACTION" }, 400);
    }

    return jsonResponse({
      data: await listHierarchyAdministration(serviceClient, roles)
    });
  } catch (error) {
    const status = error instanceof AuthorizationError
      ? 403
      : error instanceof RequestValidationError
        ? 400
        : 500;
    const message = error instanceof AuthorizationError
      || error instanceof RequestValidationError
      ? error.message
      : "ORGANIZATION_ADMINISTRATION_FAILED";

    return jsonResponse({ error: message }, status);
  }
});

async function readHasActiveProfile(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await serviceClient
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("onboarding_status", "ACTIVE")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function readActiveRoles(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<AppRole[]> {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient
    .from("user_role_assignments")
    .select("role_code,scope_type,scope_id")
    .eq("user_id", userId)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listHierarchyAdministration(
  serviceClient: ReturnType<typeof createClient>,
  roles: readonly AppRole[]
) {
  const platformAdmin = roles.some((role) =>
    role.role_code === "SYSTEM_ADMIN" && role.scope_type === "PLATFORM"
  );
  const scopedOrganizationIds = uniqueStrings(
    roles
      .filter((role) =>
        role.role_code === "SYSTEM_ADMIN"
        && role.scope_type === "ORGANIZATION"
        && role.scope_id
      )
      .map((role) => role.scope_id as string)
  );
  let organizationsQuery = serviceClient
    .from("organizations")
    .select("id,name")
    .eq("status", "ACTIVE")
    .order("name", { ascending: true });

  if (!platformAdmin) {
    organizationsQuery = organizationsQuery.in("id", scopedOrganizationIds);
  }

  const { data: organizations, error: organizationsError } =
    await organizationsQuery;

  if (organizationsError) {
    throw organizationsError;
  }

  const organizationIds = (organizations ?? []).map((item) => item.id);

  if (organizationIds.length === 0) {
    return { members: [], organizations: [], units: [] };
  }

  const now = new Date().toISOString();
  const [unitsResult, membershipsResult, managersResult] = await Promise.all([
    serviceClient
      .from("organization_units")
      .select("id,organization_id,parent_unit_id,unit_type,name,slug,status")
      .in("organization_id", organizationIds)
      .order("name", { ascending: true }),
    serviceClient
      .from("organization_unit_memberships")
      .select("organization_id,unit_id,user_id,membership_kind,is_primary")
      .in("organization_id", organizationIds)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`),
    serviceClient
      .from("manager_assignments")
      .select("organization_id,manager_user_id,direct_report_user_id")
      .in("organization_id", organizationIds)
      .eq("relationship_type", "DIRECT_MANAGER")
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
  ]);

  if (unitsResult.error) {
    throw unitsResult.error;
  }

  if (membershipsResult.error) {
    throw membershipsResult.error;
  }

  if (managersResult.error) {
    throw managersResult.error;
  }

  const units = unitsResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const userIds = uniqueStrings(memberships.map((row) => row.user_id));
  const [profiles, roleAssignments] = userIds.length > 0
    ? await Promise.all([
      readActiveProfiles(serviceClient, userIds),
      readManageableRoleAssignments(serviceClient, userIds, now)
    ])
    : [[], []];
  const profilesById = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );
  const unitOrganizationById = new Map(
    units.map((unit) => [unit.id, unit.organization_id])
  );
  const memberGroups = new Map<string, typeof memberships>();

  for (const membership of memberships) {
    const key = `${membership.organization_id}:${membership.user_id}`;
    memberGroups.set(key, [
      ...(memberGroups.get(key) ?? []),
      membership
    ]);
  }

  const members = Array.from(memberGroups.values()).flatMap((memberRows) => {
    const firstMembership = memberRows[0];
    const profile = profilesById.get(firstMembership.user_id);

    if (!profile) {
      return [];
    }

    const primaryMembership = memberRows.find((row) => row.is_primary)
      ?? firstMembership;
    const organizationId = firstMembership.organization_id;
    const manager = (managersResult.data ?? []).find((row) =>
      row.organization_id === organizationId
      && row.direct_report_user_id === firstMembership.user_id
    );
    const memberRoles = roleAssignments.filter((role) => {
      if (role.user_id !== firstMembership.user_id) {
        return false;
      }

      if (role.scope_type === "ORGANIZATION") {
        return role.scope_id === organizationId;
      }

      return role.scope_id
        ? unitOrganizationById.get(role.scope_id) === organizationId
        : false;
    });

    return [{
      displayName: profile.display_name,
      email: profile.email,
      managerUserId: manager?.manager_user_id ?? null,
      membershipKind: primaryMembership.membership_kind,
      organizationId,
      primaryUnitId: primaryMembership.unit_id,
      roles: memberRoles.map((role) => ({
        id: role.id,
        roleCode: role.role_code,
        scopeId: role.scope_id,
        scopeType: role.scope_type
      })),
      userId: firstMembership.user_id
    }];
  });

  members.sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "tr")
  );

  return {
    members,
    organizations: (organizations ?? []).map((organization) => ({
      id: organization.id,
      name: organization.name
    })),
    units: units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      organizationId: unit.organization_id,
      parentUnitId: unit.parent_unit_id,
      slug: unit.slug,
      status: unit.status,
      unitType: unit.unit_type
    }))
  };
}

async function readActiveProfiles(
  serviceClient: ReturnType<typeof createClient>,
  userIds: readonly string[]
) {
  const { data, error } = await serviceClient
    .from("user_profiles")
    .select("user_id,email,display_name")
    .in("user_id", userIds)
    .eq("onboarding_status", "ACTIVE");

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function readManageableRoleAssignments(
  serviceClient: ReturnType<typeof createClient>,
  userIds: readonly string[],
  now: string
) {
  const { data, error } = await serviceClient
    .from("user_role_assignments")
    .select("id,user_id,role_code,scope_type,scope_id")
    .in("user_id", userIds)
    .in("role_code", manageableRoleCodes)
    .neq("scope_type", "PLATFORM")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function saveOrganizationUnit(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  input: ReturnType<typeof parseUnitRequest>
) {
  const { error } = await serviceClient.rpc("admin_upsert_organization_unit", {
    actor_user_id: actorUserId,
    managed_organization_id: input.organizationId,
    managed_parent_unit_id: input.parentUnitId,
    managed_status: input.status,
    managed_unit_id: input.unitId,
    managed_unit_type: input.unitType,
    unit_name: input.name,
    unit_slug: input.slug
  });

  if (error) {
    throwDatabaseError(error.message);
  }
}

async function setUserHierarchyContext(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  input: ReturnType<typeof parseHierarchyContextRequest>
) {
  const { error } = await serviceClient.rpc(
    "admin_set_user_hierarchy_context",
    {
      actor_user_id: actorUserId,
      direct_manager_user_id: input.managerUserId,
      managed_organization_id: input.organizationId,
      primary_membership_kind: input.membershipKind,
      primary_unit_id: input.primaryUnitId,
      target_user_id: input.userId
    }
  );

  if (error) {
    throwDatabaseError(error.message);
  }
}

async function assignUserRole(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  input: ReturnType<typeof parseRoleAssignmentRequest>
) {
  const { error } = await serviceClient.rpc("admin_assign_user_role", {
    actor_user_id: actorUserId,
    assigned_role_code: input.roleCode,
    assigned_unit_id: input.unitId,
    managed_organization_id: input.organizationId,
    target_user_id: input.userId
  });

  if (error) {
    throwDatabaseError(error.message);
  }
}

async function endUserRole(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  organizationId: string,
  roleAssignmentId: string
) {
  const { error } = await serviceClient.rpc("admin_end_user_role", {
    actor_user_id: actorUserId,
    managed_organization_id: organizationId,
    role_assignment_id: roleAssignmentId
  });

  if (error) {
    throwDatabaseError(error.message);
  }
}

function parseUnitRequest(
  value: Record<string, unknown>,
  organizationId: string
) {
  const unitId = readNullableUuid(value.unitId, "UNIT_ID_INVALID");
  const parentUnitId = readNullableUuid(
    value.parentUnitId,
    "PARENT_UNIT_ID_INVALID"
  );
  const unitType = readString(value.unitType) as UnitType;
  const status = readString(value.status) as UnitStatus;
  const name = readString(value.name).trim();
  const slug = readString(value.slug).trim().toLowerCase();

  if (!unitTypes.includes(unitType)) {
    throw new RequestValidationError("UNIT_TYPE_INVALID");
  }

  if (status !== "ACTIVE" && status !== "ARCHIVED") {
    throw new RequestValidationError("UNIT_STATUS_INVALID");
  }

  if (name.length < 2 || name.length > 120) {
    throw new RequestValidationError("UNIT_NAME_INVALID");
  }

  if (!unitId && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new RequestValidationError("UNIT_SLUG_INVALID");
  }

  if (unitId && parentUnitId === unitId) {
    throw new RequestValidationError("UNIT_PARENT_SELF_REFERENCE");
  }

  return {
    name,
    organizationId,
    parentUnitId,
    slug,
    status,
    unitId,
    unitType
  };
}

function parseHierarchyContextRequest(
  value: Record<string, unknown>,
  organizationId: string
) {
  const membershipKind = readString(value.membershipKind) as MembershipKind;

  if (membershipKind !== "MEMBER" && membershipKind !== "LEADER") {
    throw new RequestValidationError("MEMBERSHIP_KIND_INVALID");
  }

  return {
    managerUserId: readNullableUuid(
      value.managerUserId,
      "MANAGER_USER_ID_INVALID"
    ),
    membershipKind,
    organizationId,
    primaryUnitId: readUuid(value.primaryUnitId, "PRIMARY_UNIT_ID_INVALID"),
    userId: readUuid(value.userId, "TARGET_USER_ID_INVALID")
  };
}

function parseRoleAssignmentRequest(
  value: Record<string, unknown>,
  organizationId: string
) {
  const roleCode = readString(value.roleCode) as ManageableRoleCode;
  const unitId = readNullableUuid(value.unitId, "ROLE_UNIT_ID_INVALID");

  if (!manageableRoleCodes.includes(roleCode)) {
    throw new RequestValidationError("ROLE_NOT_MANAGEABLE");
  }

  if (unitScopedRoleCodes.includes(roleCode) && !unitId) {
    throw new RequestValidationError("ROLE_UNIT_MEMBERSHIP_REQUIRED");
  }

  return {
    organizationId,
    roleCode,
    unitId,
    userId: readUuid(value.userId, "TARGET_USER_ID_INVALID")
  };
}

function hasSystemAdministrationRole(roles: readonly AppRole[]): boolean {
  return roles.some((role) =>
    role.role_code === "SYSTEM_ADMIN"
    && (role.scope_type === "PLATFORM" || role.scope_type === "ORGANIZATION")
  );
}

function canManageOrganization(
  roles: readonly AppRole[],
  organizationId: string
): boolean {
  return roles.some((role) =>
    role.role_code === "SYSTEM_ADMIN"
    && (
      role.scope_type === "PLATFORM"
      || (role.scope_type === "ORGANIZATION" && role.scope_id === organizationId)
    )
  );
}

function throwDatabaseError(message: string): never {
  const knownCodes = [
    "ADMINISTRATION_SCOPE_DENIED",
    "ORGANIZATION_NOT_ACTIVE",
    "UNIT_NAME_INVALID",
    "UNIT_TYPE_INVALID",
    "UNIT_STATUS_INVALID",
    "NEW_UNIT_STATUS_INVALID",
    "UNIT_SLUG_INVALID",
    "UNIT_NOT_FOUND",
    "UNIT_ARCHIVE_BLOCKED",
    "UNIT_PARENT_SELF_REFERENCE",
    "UNIT_PARENT_NOT_FOUND",
    "UNIT_PARENT_ORGANIZATION_MISMATCH",
    "UNIT_PARENT_NOT_ACTIVE",
    "UNIT_HIERARCHY_CYCLE",
    "MEMBERSHIP_KIND_INVALID",
    "TARGET_USER_NOT_ACTIVE",
    "TARGET_USER_OUTSIDE_ORGANIZATION",
    "PRIMARY_UNIT_INVALID",
    "MANAGER_NOT_ACTIVE_IN_ORGANIZATION",
    "DIRECT_REPORT_NOT_ACTIVE_IN_ORGANIZATION",
    "MANAGER_ASSIGNMENT_CYCLE",
    "MANAGER_HIERARCHY_DEPTH_EXCEEDED",
    "ROLE_NOT_MANAGEABLE",
    "ROLE_UNIT_MEMBERSHIP_REQUIRED",
    "ROLE_ASSIGNMENT_NOT_FOUND",
    "LAST_SYSTEM_ADMIN_REQUIRED"
  ];
  const knownCode = knownCodes.find((code) => message.includes(code));

  if (knownCode === "ADMINISTRATION_SCOPE_DENIED") {
    throw new AuthorizationError(knownCode);
  }

  throw new RequestValidationError(
    knownCode ?? "ORGANIZATION_ADMINISTRATION_MUTATION_FAILED"
  );
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    throw new RequestValidationError("INVALID_JSON_BODY");
  }
}

function readEnvironment() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("ORGANIZATION_ADMINISTRATION_ENVIRONMENT_INVALID");
  }

  return { serviceRoleKey, supabaseAnonKey, supabaseUrl };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableUuid(value: unknown, errorCode: string): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return readUuid(value, errorCode);
}

function readUuid(value: unknown, errorCode: string): string {
  const result = readString(value).trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new RequestValidationError(errorCode);
  }

  return result;
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

class RequestValidationError extends Error {}
class AuthorizationError extends Error {}

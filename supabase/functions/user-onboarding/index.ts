import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";

type AppRole = {
  readonly role_code: string;
  readonly scope_type: string;
  readonly scope_id: string | null;
};

type InvitationRoleCode =
  | "SYSTEM_ADMIN"
  | "EMPLOYEE"
  | "TEAM_LEADER"
  | "C_LEVEL_REVIEWER"
  | "BOARD_REVIEWER";

type InvitationScopeType =
  | "ORGANIZATION"
  | "DEPARTMENT"
  | "UNIT"
  | "TEAM";

type CreateInvitationRequest = {
  readonly displayName: string;
  readonly email: string;
  readonly expiresInDays: number;
  readonly managerUserId: string | null;
  readonly organizationId: string;
  readonly roleCode: InvitationRoleCode;
  readonly unitId: string;
};

type OrganizationUnitRecord = {
  readonly id: string;
  readonly organization_id: string;
  readonly name: string;
  readonly unit_type: string;
};

type InvitationSummary = {
  readonly id: string;
  readonly displayName: string | null;
  readonly email: string;
  readonly organizationId: string | null;
  readonly unitId: string | null;
  readonly roleCode: string;
  readonly scopeType: string;
  readonly expiresAt: string;
  readonly status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  readonly createdAt: string;
};

const invitationRoleCodes: readonly InvitationRoleCode[] = [
  "SYSTEM_ADMIN",
  "EMPLOYEE",
  "TEAM_LEADER",
  "C_LEVEL_REVIEWER",
  "BOARD_REVIEWER"
];

const organizationScopedRoles: readonly InvitationRoleCode[] = [
  "SYSTEM_ADMIN",
  "C_LEVEL_REVIEWER",
  "BOARD_REVIEWER"
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

    const body = await readJsonBody(request);

    if (body.action === "accept_invitation") {
      if (!userData.user.email_confirmed_at) {
        return jsonResponse({ error: "INVITATION_EMAIL_NOT_VERIFIED" }, 403);
      }

      const profile = await acceptInvitation(
        serviceClient,
        userData.user.id
      );

      return jsonResponse({ profile });
    }

    if (!(await readHasActiveProfile(serviceClient, userData.user.id))) {
      return jsonResponse({ error: "ACTIVE_PROFILE_REQUIRED" }, 403);
    }

    const roles = await readActiveRoles(serviceClient, userData.user.id);

    if (!hasSystemAdministrationRole(roles)) {
      return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
    }

    if (body.action === "list_user_administration") {
      return jsonResponse({
        data: await listUserAdministration(serviceClient, roles)
      });
    }

    if (body.action === "create_invitation") {
      const input = parseCreateInvitationRequest(body.payload);

      if (!canManageOrganization(roles, input.organizationId)) {
        return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
      }

      const invitation = await createInvitation(
        serviceClient,
        userData.user.id,
        input
      );

      return jsonResponse({ invitation }, 201);
    }

    if (body.action === "revoke_invitation") {
      const invitationId = readUuid(
        readRecord(body.payload).invitationId,
        "INVITATION_ID_INVALID"
      );
      const invitation = await readInvitationForRevocation(
        serviceClient,
        invitationId
      );

      if (
        !invitation.organization_id
        || !canManageOrganization(roles, invitation.organization_id)
      ) {
        return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
      }

      return jsonResponse({
        invitation: await revokeInvitation(
          serviceClient,
          userData.user.id,
          invitation
        )
      });
    }

    return jsonResponse({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const message = error instanceof RequestValidationError
      || error instanceof AuthorizationError
      ? error.message
      : "USER_ONBOARDING_FAILED";

    return jsonResponse(
      { error: message },
      error instanceof AuthorizationError
        ? 403
        : error instanceof RequestValidationError
          ? 400
          : 500
    );
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

async function listUserAdministration(
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
    return { invitations: [], members: [], organizations: [], units: [] };
  }

  const now = new Date().toISOString();
  const [unitsResult, membershipsResult, invitationsResult] = await Promise.all([
    serviceClient
      .from("organization_units")
      .select("id,organization_id,name,unit_type")
      .in("organization_id", organizationIds)
      .eq("status", "ACTIVE")
      .order("name", { ascending: true }),
    serviceClient
      .from("organization_unit_memberships")
      .select("organization_id,user_id")
      .in("organization_id", organizationIds)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`),
    serviceClient
      .from("user_invitations")
      .select(
        "id,email,display_name,organization_id,unit_id,invited_role_code,invited_scope_type,expires_at,accepted_at,revoked_at,created_at"
      )
      .in("organization_id", organizationIds)
      .order("created_at", { ascending: false })
      .limit(100)
  ]);

  if (unitsResult.error) {
    throw unitsResult.error;
  }

  if (membershipsResult.error) {
    throw membershipsResult.error;
  }

  if (invitationsResult.error) {
    throw invitationsResult.error;
  }

  const membershipRows = membershipsResult.data ?? [];
  const userIds = uniqueStrings(membershipRows.map((row) => row.user_id));
  const profiles = userIds.length > 0
    ? await readActiveProfiles(serviceClient, userIds)
    : [];
  const profilesById = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );
  const memberKeys = new Set<string>();
  const members = membershipRows.flatMap((membership) => {
    const profile = profilesById.get(membership.user_id);
    const key = `${membership.organization_id}:${membership.user_id}`;

    if (!profile || memberKeys.has(key)) {
      return [];
    }

    memberKeys.add(key);

    return [{
      displayName: profile.display_name,
      email: profile.email,
      organizationId: membership.organization_id,
      userId: membership.user_id
    }];
  });

  return {
    invitations: (invitationsResult.data ?? []).map(toInvitationSummary),
    members,
    organizations: (organizations ?? []).map((organization) => ({
      id: organization.id,
      name: organization.name
    })),
    units: (unitsResult.data ?? []).map((unit) => ({
      id: unit.id,
      name: unit.name,
      organizationId: unit.organization_id,
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
    .eq("onboarding_status", "ACTIVE")
    .order("email", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function createInvitation(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  input: CreateInvitationRequest
): Promise<InvitationSummary> {
  const unit = await readInvitationUnit(
    serviceClient,
    input.organizationId,
    input.unitId
  );
  await requireManagerInOrganization(
    serviceClient,
    input.organizationId,
    input.managerUserId
  );
  await requireNoOpenInvitation(serviceClient, input.email);

  const scopeType = toInvitationScopeType(input.roleCode, unit.unit_type);
  const scopeId = scopeType === "ORGANIZATION"
    ? input.organizationId
    : input.unitId;
  const membershipKind = input.roleCode === "TEAM_LEADER"
    ? "LEADER"
    : "MEMBER";
  const { data: invitedUserData, error: invitedUserError } =
    await serviceClient.auth.admin.inviteUserByEmail(input.email, {
      data: { display_name: input.displayName }
    });

  if (invitedUserError || !invitedUserData.user) {
    throw new RequestValidationError("INVITATION_AUTH_DELIVERY_FAILED");
  }

  const invitedUser = invitedUserData.user;

  let invitationId: string | null = null;

  try {
    const { error: profileError } = await serviceClient
      .from("user_profiles")
      .upsert({
        display_name: input.displayName,
        email: input.email,
        onboarding_status: "INVITED",
        user_id: invitedUser.id
      }, { onConflict: "user_id" });

    if (profileError) {
      throw profileError;
    }

    const expiresAt = new Date(
      Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: invitation, error: invitationError } = await serviceClient
      .from("user_invitations")
      .insert({
        display_name: input.displayName,
        email: input.email,
        expires_at: expiresAt,
        invited_auth_user_id: invitedUser.id,
        invited_by_user_id: actorUserId,
        invited_role_code: input.roleCode,
        invited_scope_id: scopeId,
        invited_scope_type: scopeType,
        manager_user_id: input.managerUserId,
        membership_kind: membershipKind,
        organization_id: input.organizationId,
        token_hash: await createServerCorrelationHash(),
        unit_id: input.unitId
      })
      .select(
        "id,email,display_name,organization_id,unit_id,invited_role_code,invited_scope_type,expires_at,accepted_at,revoked_at,created_at"
      )
      .single();

    if (invitationError) {
      throw invitationError;
    }

    invitationId = invitation.id;

    await writeAuditEvent(
      serviceClient,
      actorUserId,
      input.organizationId,
      invitation.id,
      input.roleCode,
      scopeType
    );

    return toInvitationSummary(invitation);
  } catch (error) {
    if (invitationId) {
      await serviceClient
        .from("user_invitations")
        .delete()
        .eq("id", invitationId);
    }

    await serviceClient.auth.admin.deleteUser(invitedUser.id);
    throw error;
  }
}

async function readInvitationForRevocation(
  serviceClient: ReturnType<typeof createClient>,
  invitationId: string
) {
  const { data, error } = await serviceClient
    .from("user_invitations")
    .select(
      "id,email,display_name,organization_id,unit_id,invited_role_code,invited_scope_type,invited_auth_user_id,expires_at,accepted_at,revoked_at,created_at"
    )
    .eq("id", invitationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new RequestValidationError("INVITATION_NOT_FOUND");
  }

  return data;
}

async function revokeInvitation(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  invitation: Record<string, unknown>
): Promise<InvitationSummary> {
  if (invitation.accepted_at) {
    throw new RequestValidationError("INVITATION_ALREADY_ACCEPTED");
  }

  if (invitation.revoked_at) {
    throw new RequestValidationError("INVITATION_ALREADY_REVOKED");
  }

  const { data: revokedInvitation, error: revokeError } = await serviceClient
    .from("user_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", readString(invitation.id))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select(
      "id,email,display_name,organization_id,unit_id,invited_role_code,invited_scope_type,expires_at,accepted_at,revoked_at,created_at"
    )
    .single();

  if (revokeError) {
    throw revokeError;
  }

  const invitedAuthUserId = readNullableString(invitation.invited_auth_user_id);

  if (invitedAuthUserId) {
    const { data: profile, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("onboarding_status")
      .eq("user_id", invitedAuthUserId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.onboarding_status === "INVITED") {
      const { error: deleteError } = await serviceClient.auth.admin.deleteUser(
        invitedAuthUserId
      );

      if (deleteError) {
        throw deleteError;
      }
    }
  }

  const organizationId = readString(invitation.organization_id);
  const { error: auditError } = await serviceClient.from("audit_events").insert({
    actor_user_id: actorUserId,
    event_scope_id: organizationId,
    event_scope_type: "ORGANIZATION",
    event_type: "USER_INVITATION_REVOKED",
    safe_metadata: {
      invitationId: readString(invitation.id)
    }
  });

  if (auditError) {
    throw auditError;
  }

  return toInvitationSummary(revokedInvitation);
}

async function readInvitationUnit(
  serviceClient: ReturnType<typeof createClient>,
  organizationId: string,
  unitId: string
): Promise<OrganizationUnitRecord> {
  const { data, error } = await serviceClient
    .from("organization_units")
    .select("id,organization_id,name,unit_type")
    .eq("id", unitId)
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new RequestValidationError("INVITATION_UNIT_INVALID");
  }

  return data;
}

async function requireManagerInOrganization(
  serviceClient: ReturnType<typeof createClient>,
  organizationId: string,
  managerUserId: string | null
) {
  if (!managerUserId) {
    return;
  }

  const now = new Date().toISOString();
  const { data, error } = await serviceClient
    .from("organization_unit_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", managerUserId)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new RequestValidationError("INVITATION_MANAGER_INVALID");
  }
}

async function requireNoOpenInvitation(
  serviceClient: ReturnType<typeof createClient>,
  email: string
) {
  const { data, error } = await serviceClient
    .from("user_invitations")
    .select("id")
    .ilike("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (error) {
    throw error;
  }

  if (data && data.length > 0) {
    throw new RequestValidationError("INVITATION_ALREADY_OPEN");
  }
}

async function acceptInvitation(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
) {
  const { data: invitations, error: invitationError } = await serviceClient
    .from("user_invitations")
    .select("id")
    .eq("invited_auth_user_id", userId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (invitationError) {
    throw invitationError;
  }

  const invitation = invitations?.[0];

  if (!invitation) {
    throw new AuthorizationError("INVITATION_NOT_AVAILABLE");
  }

  const { data: profile, error: acceptanceError } = await serviceClient.rpc(
    "accept_user_invitation",
    {
      accepting_user_id: userId,
      invitation_id: invitation.id
    }
  );

  if (acceptanceError) {
    throw new AuthorizationError(
      readInvitationAcceptanceError(acceptanceError.message)
    );
  }

  return profile;
}

async function writeAuditEvent(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  organizationId: string,
  invitationId: string,
  roleCode: string,
  scopeType: string
) {
  const { error } = await serviceClient.from("audit_events").insert({
    actor_user_id: actorUserId,
    event_scope_id: organizationId,
    event_scope_type: "ORGANIZATION",
    event_type: "USER_INVITATION_CREATED",
    safe_metadata: {
      invitationId,
      roleCode,
      scopeType
    }
  });

  if (error) {
    throw error;
  }
}

function toInvitationScopeType(
  roleCode: InvitationRoleCode,
  unitType: string
): InvitationScopeType {
  if (organizationScopedRoles.includes(roleCode)) {
    return "ORGANIZATION";
  }

  if (unitType === "DEPARTMENT" || unitType === "TEAM") {
    return unitType;
  }

  return "UNIT";
}

function toInvitationSummary(value: Record<string, unknown>): InvitationSummary {
  const acceptedAt = readNullableString(value.accepted_at);
  const revokedAt = readNullableString(value.revoked_at);
  const expiresAt = readString(value.expires_at);

  return {
    createdAt: readString(value.created_at),
    displayName: readNullableString(value.display_name),
    email: readString(value.email),
    expiresAt,
    id: readString(value.id),
    organizationId: readNullableString(value.organization_id),
    roleCode: readString(value.invited_role_code),
    scopeType: readString(value.invited_scope_type),
    status: acceptedAt
      ? "ACCEPTED"
      : revokedAt
        ? "REVOKED"
        : new Date(expiresAt).getTime() <= Date.now()
          ? "EXPIRED"
          : "PENDING",
    unitId: readNullableString(value.unit_id)
  };
}

function parseCreateInvitationRequest(value: unknown): CreateInvitationRequest {
  const record = isRecord(value) ? value : {};
  const roleCode = readString(record.roleCode) as InvitationRoleCode;
  const expiresInDays = readNumber(record.expiresInDays);

  if (!invitationRoleCodes.includes(roleCode)) {
    throw new RequestValidationError("INVITATION_ROLE_INVALID");
  }

  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
    throw new RequestValidationError("INVITATION_EXPIRY_INVALID");
  }

  const email = readString(record.email).trim().toLowerCase();
  const displayName = readString(record.displayName).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RequestValidationError("INVITATION_EMAIL_INVALID");
  }

  if (displayName.length < 2 || displayName.length > 120) {
    throw new RequestValidationError("INVITATION_DISPLAY_NAME_INVALID");
  }

  return {
    displayName,
    email,
    expiresInDays,
    managerUserId: readNullableString(record.managerUserId),
    organizationId: readUuid(record.organizationId, "INVITATION_ORGANIZATION_INVALID"),
    roleCode,
    unitId: readUuid(record.unitId, "INVITATION_UNIT_INVALID")
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

async function createServerCorrelationHash(): Promise<string> {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const digest = await crypto.subtle.digest("SHA-256", secret);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readInvitationAcceptanceError(message: string): string {
  const codes = [
    "INVITATION_NOT_FOUND",
    "INVITATION_ALREADY_ACCEPTED",
    "INVITATION_REVOKED",
    "INVITATION_EXPIRED",
    "INVITATION_USER_MISMATCH",
    "INVITATION_EMAIL_MISMATCH",
    "INVITATION_CONTEXT_INCOMPLETE",
    "INVITATION_CONTEXT_INACTIVE",
    "INVITATION_MANAGER_INACTIVE"
  ];

  return codes.find((code) => message.includes(code))
    ?? "INVITATION_ACCEPTANCE_FAILED";
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
    throw new Error("USER_ONBOARDING_ENVIRONMENT_INVALID");
  }

  return { serviceRoleKey, supabaseAnonKey, supabaseUrl };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import {
  readJsonBodyWithLimit,
  RequestPayloadTooLargeError
} from "../_shared/requestBody.ts";

type AppRole = {
  readonly role_code: string;
  readonly scope_id: string | null;
  readonly scope_type: string;
};

type TenantDraft = {
  readonly administratorDisplayName: string;
  readonly administratorEmail: string;
  readonly initialUnitName: string;
  readonly initialUnitSlug: string;
  readonly invitationExpiresInDays: number;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly requestId: string;
};

const maximumRequestBodyBytes = 16 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
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
    const environment = readEnvironment();
    const authorizationHeader = request.headers.get("authorization");
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

    if (!(await hasActiveProfile(serviceClient, userData.user.id))) {
      return jsonResponse({ error: "ACTIVE_PROFILE_REQUIRED" }, 403);
    }

    const roles = await readActiveRoles(serviceClient, userData.user.id);

    if (!hasPlatformSystemAdministratorRole(roles)) {
      return jsonResponse({ error: "PLATFORM_ADMINISTRATION_SCOPE_DENIED" }, 403);
    }

    const body = readRecord(
      await readJsonBodyWithLimit(request, maximumRequestBodyBytes)
    );

    if (body.action === "list_tenants") {
      return jsonResponse({
        tenants: await listTenants(serviceClient, userData.user.id)
      });
    }

    if (body.action === "create_tenant") {
      const draft = parseTenantDraft(body.payload);
      const result = await createTenant(
        serviceClient,
        userData.user.id,
        draft
      );

      return jsonResponse({
        result: toSafeBootstrapResult(result),
        tenants: await listTenants(serviceClient, userData.user.id)
      }, 201);
    }

    if (body.action === "reissue_initial_invitation") {
      const payload = readRecord(body.payload);
      const requestId = readUuid(
        payload.requestId,
        "TENANT_BOOTSTRAP_REQUEST_INVALID"
      );
      const invitationExpiresInDays = readInteger(
        payload.invitationExpiresInDays,
        "TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID"
      );

      if (invitationExpiresInDays < 1 || invitationExpiresInDays > 30) {
        throw new RequestValidationError(
          "TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID"
        );
      }

      await reissueInitialInvitation(
        serviceClient,
        userData.user.id,
        requestId,
        invitationExpiresInDays
      );

      return jsonResponse({
        tenants: await listTenants(serviceClient, userData.user.id)
      });
    }

    return jsonResponse({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const code = readErrorCode(error);
    const status = error instanceof RequestPayloadTooLargeError
      ? 413
      : error instanceof AuthorizationError
        ? 403
        : error instanceof ConflictError
          ? 409
          : error instanceof RequestValidationError
            ? 400
            : 500;

    return jsonResponse({ error: code }, status);
  }
});

async function hasActiveProfile(
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

function hasPlatformSystemAdministratorRole(
  roles: readonly AppRole[]
): boolean {
  return roles.some((role) =>
    role.role_code === "SYSTEM_ADMIN"
    && role.scope_type === "PLATFORM"
    && role.scope_id === null
  );
}

async function listTenants(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string
): Promise<unknown[]> {
  const { data, error } = await serviceClient.rpc(
    "list_platform_organization_tenants",
    { actor_user_id: actorUserId }
  );

  if (error) {
    throwDatabaseError(error.message);
  }

  return Array.isArray(data) ? data : [];
}

async function createTenant(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  draft: TenantDraft
): Promise<Record<string, unknown>> {
  const requestFingerprint = await createRequestFingerprint(draft);
  const existingUser = await findUserByEmail(
    serviceClient,
    draft.administratorEmail
  );

  if (
    existingUser
    && existingUser.app_metadata?.tenant_bootstrap_request_id !== draft.requestId
  ) {
    throw new ConflictError("TENANT_BOOTSTRAP_ADMIN_EMAIL_ALREADY_EXISTS");
  }

  let administratorUser = existingUser;
  let createdUserInThisRequest = false;

  try {
    if (!administratorUser) {
      const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(
        draft.administratorEmail,
        {
          data: {
            display_name: draft.administratorDisplayName,
            requires_password_setup: true
          }
        }
      );

      if (error || !data.user) {
        throw new RequestValidationError(
          "TENANT_BOOTSTRAP_INVITATION_DELIVERY_FAILED"
        );
      }

      administratorUser = data.user;
      createdUserInThisRequest = true;

      const { data: markedUserData, error: markerError } =
        await serviceClient.auth.admin.updateUserById(administratorUser.id, {
          app_metadata: {
            ...administratorUser.app_metadata,
            tenant_bootstrap_request_id: draft.requestId
          }
        });

      if (markerError || !markedUserData.user) {
        throw new Error("TENANT_BOOTSTRAP_AUTH_MARKER_WRITE_FAILED");
      }

      administratorUser = markedUserData.user;
    }

    const { data, error } = await serviceClient.rpc(
      "platform_bootstrap_organization_tenant",
      {
        actor_user_id: actorUserId,
        administrator_display_name: draft.administratorDisplayName,
        administrator_email: draft.administratorEmail,
        bootstrap_administrator_user_id: administratorUser.id,
        bootstrap_request_id: draft.requestId,
        expected_request_fingerprint: requestFingerprint,
        initial_unit_name: draft.initialUnitName,
        initial_unit_slug: draft.initialUnitSlug,
        invitation_expires_in_days: draft.invitationExpiresInDays,
        organization_name: draft.organizationName,
        organization_slug: draft.organizationSlug
      }
    );

    if (error) {
      throwDatabaseError(error.message);
    }

    return readRecord(data);
  } catch (error) {
    if (createdUserInThisRequest && administratorUser) {
      const { error: deletionError } = await serviceClient.auth.admin.deleteUser(
        administratorUser.id
      );

      if (deletionError) {
        throw new Error("TENANT_BOOTSTRAP_COMPENSATION_FAILED", {
          cause: error
        });
      }
    }

    throw error;
  }
}

async function reissueInitialInvitation(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  requestId: string,
  invitationExpiresInDays: number
): Promise<void> {
  const { data, error } = await serviceClient.rpc(
    "platform_renew_tenant_bootstrap_invitation",
    {
      actor_user_id: actorUserId,
      bootstrap_request_id: requestId,
      invitation_expires_in_days: invitationExpiresInDays
    }
  );

  if (error) {
    throwDatabaseError(error.message);
  }

  const administratorEmail = readString(
    readRecord(data).administratorEmail,
    "TENANT_BOOTSTRAP_ADMINISTRATOR_EMAIL_INVALID"
  );
  const { error: deliveryError } = await serviceClient.auth
    .resetPasswordForEmail(administratorEmail);

  if (deliveryError) {
    throw new Error("TENANT_BOOTSTRAP_RECOVERY_DELIVERY_FAILED");
  }
}

async function findUserByEmail(
  serviceClient: ReturnType<typeof createClient>,
  email: string
) {
  let page = 1;

  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      throw new Error("TENANT_BOOTSTRAP_AUTH_LOOKUP_FAILED");
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email
    );

    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }
}

function parseTenantDraft(value: unknown): TenantDraft {
  const payload = readRecord(value);
  const organizationName = readTrimmedString(
    payload.organizationName,
    2,
    120,
    "TENANT_BOOTSTRAP_ORGANIZATION_NAME_INVALID"
  );
  const organizationSlug = readSlug(
    payload.organizationSlug,
    3,
    "TENANT_BOOTSTRAP_ORGANIZATION_SLUG_INVALID"
  );
  const administratorEmail = readTrimmedString(
    payload.administratorEmail,
    3,
    320,
    "TENANT_BOOTSTRAP_ADMINISTRATOR_EMAIL_INVALID"
  ).toLowerCase();
  const administratorDisplayName = readTrimmedString(
    payload.administratorDisplayName,
    2,
    120,
    "TENANT_BOOTSTRAP_ADMINISTRATOR_NAME_INVALID"
  );
  const initialUnitName = readTrimmedString(
    payload.initialUnitName,
    2,
    120,
    "TENANT_BOOTSTRAP_UNIT_NAME_INVALID"
  );
  const initialUnitSlug = toSlug(initialUnitName);

  if (
    initialUnitSlug.length < 2
    || initialUnitSlug.length > 63
    || !slugPattern.test(initialUnitSlug)
  ) {
    throw new RequestValidationError("TENANT_BOOTSTRAP_UNIT_SLUG_INVALID");
  }
  const invitationExpiresInDays = readInteger(
    payload.invitationExpiresInDays,
    "TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID"
  );

  if (!emailPattern.test(administratorEmail)) {
    throw new RequestValidationError(
      "TENANT_BOOTSTRAP_ADMINISTRATOR_EMAIL_INVALID"
    );
  }

  if (invitationExpiresInDays < 1 || invitationExpiresInDays > 30) {
    throw new RequestValidationError(
      "TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID"
    );
  }

  return {
    administratorDisplayName,
    administratorEmail,
    initialUnitName,
    initialUnitSlug,
    invitationExpiresInDays,
    organizationName,
    organizationSlug,
    requestId: readUuid(
      payload.requestId,
      "TENANT_BOOTSTRAP_REQUEST_INVALID"
    )
  };
}

async function createRequestFingerprint(draft: TenantDraft): Promise<string> {
  const bytes = new TextEncoder().encode([
    draft.organizationName,
    draft.organizationSlug,
    draft.administratorEmail,
    draft.administratorDisplayName,
    draft.initialUnitName,
    draft.initialUnitSlug,
    String(draft.invitationExpiresInDays)
  ].join("\n"));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));

  return Array.from(digest, (value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function toSlug(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 63);
}

function toSafeBootstrapResult(value: Record<string, unknown>) {
  return {
    organizationId: readString(
      value.organizationId,
      "PLATFORM_TENANT_ADMINISTRATION_RESULT_INVALID"
    ),
    organizationSlug: readString(
      value.organizationSlug,
      "PLATFORM_TENANT_ADMINISTRATION_RESULT_INVALID"
    ),
    requestId: readString(
      value.requestId,
      "PLATFORM_TENANT_ADMINISTRATION_RESULT_INVALID"
    ),
    replayed: value.replayed === true
  };
}

function throwDatabaseError(message: string): never {
  const knownCodes = [
    "PLATFORM_ADMINISTRATION_SCOPE_DENIED",
    "TENANT_BOOTSTRAP_ADMINISTRATOR_ALREADY_CONFIGURED",
    "TENANT_BOOTSTRAP_ADMINISTRATOR_EMAIL_INVALID",
    "TENANT_BOOTSTRAP_ADMINISTRATOR_NAME_INVALID",
    "TENANT_BOOTSTRAP_AUTH_MARKER_INVALID",
    "TENANT_BOOTSTRAP_AUTH_USER_INVALID",
    "TENANT_BOOTSTRAP_FINGERPRINT_INVALID",
    "TENANT_BOOTSTRAP_INVITATION_ALREADY_ACCEPTED",
    "TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID",
    "TENANT_BOOTSTRAP_INVITATION_REVOKED",
    "TENANT_BOOTSTRAP_ORGANIZATION_NAME_INVALID",
    "TENANT_BOOTSTRAP_ORGANIZATION_SLUG_EXISTS",
    "TENANT_BOOTSTRAP_ORGANIZATION_SLUG_INVALID",
    "TENANT_BOOTSTRAP_REQUEST_INVALID",
    "TENANT_BOOTSTRAP_REQUEST_NOT_FOUND",
    "TENANT_BOOTSTRAP_UNIT_NAME_INVALID",
    "TENANT_BOOTSTRAP_UNIT_SLUG_INVALID"
  ];
  const code = knownCodes.find((candidate) => message.includes(candidate));

  if (code === "PLATFORM_ADMINISTRATION_SCOPE_DENIED") {
    throw new AuthorizationError(code);
  }

  if (
    code === "TENANT_BOOTSTRAP_ORGANIZATION_SLUG_EXISTS"
    || code === "TENANT_BOOTSTRAP_ADMINISTRATOR_ALREADY_CONFIGURED"
  ) {
    throw new ConflictError(code);
  }

  if (code) {
    throw new RequestValidationError(code);
  }

  throw new Error("PLATFORM_TENANT_ADMINISTRATION_FAILED");
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RequestValidationError(code);
  }

  return value.trim();
}

function readTrimmedString(
  value: unknown,
  minimumLength: number,
  maximumLength: number,
  code: string
): string {
  const result = readString(value, code);

  if (result.length < minimumLength || result.length > maximumLength) {
    throw new RequestValidationError(code);
  }

  return result;
}

function readSlug(value: unknown, minimumLength: number, code: string): string {
  const result = readTrimmedString(value, minimumLength, 63, code)
    .toLowerCase();

  if (!slugPattern.test(result)) {
    throw new RequestValidationError(code);
  }

  return result;
}

function readUuid(value: unknown, code: string): string {
  const result = readString(value, code);

  if (!uuidPattern.test(result)) {
    throw new RequestValidationError(code);
  }

  return result;
}

function readInteger(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new RequestValidationError(code);
  }

  return value;
}

function readEnvironment() {
  return {
    serviceRoleKey: readEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAnonKey: readEnvironmentValue("SUPABASE_ANON_KEY"),
    supabaseUrl: readEnvironmentValue("SUPABASE_URL")
  };
}

function readEnvironmentValue(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error("PLATFORM_TENANT_ADMINISTRATION_CONFIGURATION_INVALID");
  }

  return value;
}

function readErrorCode(error: unknown): string {
  if (
    error instanceof AuthorizationError
    || error instanceof ConflictError
    || error instanceof RequestValidationError
    || error instanceof RequestPayloadTooLargeError
  ) {
    return error.message;
  }

  return error instanceof Error
    && error.message.startsWith("TENANT_BOOTSTRAP_")
    ? error.message
    : error instanceof Error
      && error.message.startsWith("PLATFORM_TENANT_ADMINISTRATION_")
      ? error.message
      : "PLATFORM_TENANT_ADMINISTRATION_FAILED";
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

class AuthorizationError extends Error {}
class ConflictError extends Error {}
class RequestValidationError extends Error {}

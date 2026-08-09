import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import {
  readJsonBodyWithLimit,
  RequestPayloadTooLargeError
} from "../_shared/requestBody.ts";
import { readRequiredEnvironmentValue } from
  "../_shared/evaluationSubmission.ts";

type AppRole = {
  readonly role_code: string;
  readonly scope_type: string;
  readonly scope_id: string | null;
};

const maximumRequestBodyBytes = 16384;
const corsHeaders = {
  "Access-Control-Allow-Headers":
    "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store"
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

    if (!await hasActiveProfile(serviceClient, userData.user.id)) {
      return jsonResponse({ error: "ACTIVE_PROFILE_REQUIRED" }, 403);
    }

    const roles = await readActiveRoles(serviceClient, userData.user.id);

    if (!hasSystemAdminRole(roles)) {
      return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
    }

    const body = readRecord(
      await readJsonBodyWithLimit(request, maximumRequestBodyBytes)
    );

    if (body.action === "list_retention_policies") {
      const { data, error } = await serviceClient.rpc(
        "list_manageable_evaluation_retention_policies",
        { actor_user_id: userData.user.id }
      );

      if (error) {
        throw error;
      }

      return jsonResponse({ data: readRecord(data) });
    }

    if (body.action === "update_retention_policy") {
      const payload = readRecord(body.payload);
      const organizationId = readUuid(payload.organizationId);

      if (!canManageOrganization(roles, organizationId)) {
        return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
      }

      const { data, error } = await serviceClient.rpc(
        "admin_update_evaluation_retention_policy",
        {
          actor_user_id: userData.user.id,
          managed_automatic_purge_enabled: readBoolean(
            payload.automaticPurgeEnabled
          ),
          managed_legal_hold: readBoolean(payload.legalHold),
          managed_organization_id: organizationId,
          managed_retention_days: readRetentionDays(payload.retentionDays)
        }
      );

      if (error) {
        throw error;
      }

      return jsonResponse({ data: readRecord(data) });
    }

    return jsonResponse({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    if (error instanceof RequestPayloadTooLargeError) {
      return jsonResponse({ error: "REQUEST_PAYLOAD_TOO_LARGE" }, 413);
    }

    if (error instanceof RequestValidationError) {
      return jsonResponse({ error: error.message }, 400);
    }

    const databaseError = readDatabaseError(error);
    const status = databaseError === "ADMINISTRATION_SCOPE_DENIED"
      || databaseError === "ACTIVE_PROFILE_REQUIRED"
      ? 403
      : 500;

    return jsonResponse(
      { error: databaseError ?? "EVALUATION_RETENTION_ADMINISTRATION_FAILED" },
      status
    );
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

function hasSystemAdminRole(roles: readonly AppRole[]): boolean {
  return roles.some((role) => role.role_code === "SYSTEM_ADMIN");
}

function canManageOrganization(
  roles: readonly AppRole[],
  organizationId: string
): boolean {
  return roles.some((role) =>
    role.role_code === "SYSTEM_ADMIN"
    && (
      (role.scope_type === "PLATFORM" && role.scope_id === null)
      || (
        role.scope_type === "ORGANIZATION"
        && role.scope_id === organizationId
      )
    )
  );
}

function readEnvironment() {
  return {
    serviceRoleKey: readRequiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAnonKey: readRequiredEnvironmentValue("SUPABASE_ANON_KEY"),
    supabaseUrl: readRequiredEnvironmentValue("SUPABASE_URL")
  };
}

function readRetentionDays(value: unknown): number {
  if (
    typeof value !== "number"
    || !Number.isInteger(value)
    || value < 30
    || value > 3650
  ) {
    throw new RequestValidationError("EVALUATION_RETENTION_DAYS_INVALID");
  }

  return value;
}

function readBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new RequestValidationError("EVALUATION_RETENTION_POLICY_INVALID");
  }

  return value;
}

function readUuid(value: unknown): string {
  if (
    typeof value !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value
    )
  ) {
    throw new RequestValidationError("ORGANIZATION_ID_INVALID");
  }

  return value;
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readDatabaseError(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }

  const message = String(error.message);
  const supportedCodes = [
    "ACTIVE_PROFILE_REQUIRED",
    "ADMINISTRATION_SCOPE_DENIED",
    "EVALUATION_RETENTION_DAYS_INVALID",
    "EVALUATION_RETENTION_POLICY_INVALID",
    "ORGANIZATION_NOT_FOUND"
  ];

  return supportedCodes.find((code) => message.includes(code)) ?? null;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

class RequestValidationError extends Error {}

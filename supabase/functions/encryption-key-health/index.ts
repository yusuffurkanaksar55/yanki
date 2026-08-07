import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import { inspectEvaluationEncryptionKeyring } from
  "../_shared/encryptionKeyring.ts";
import { readRequiredEnvironmentValue } from
  "../_shared/evaluationSubmission.ts";

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

    if (!await hasActiveSystemAdminRole(serviceClient, userData.user.id)) {
      return jsonResponse({ error: "SYSTEM_ADMIN_REQUIRED" }, 403);
    }

    const { data, error } = await serviceClient.rpc(
      "list_referenced_evaluation_encryption_key_versions"
    );

    if (error) {
      throw error;
    }

    const health = inspectEvaluationEncryptionKeyring(
      Deno.env.toObject(),
      readStringArray(data)
    );

    return jsonResponse({
      health: {
        activeKeyConfigured: health.activeKeyConfigured,
        allReferencedKeysConfigured: health.allReferencedKeysConfigured,
        configurationValid: health.configurationValid,
        configuredKeyCount: health.configuredKeyCount,
        referencedKeyCount: health.referencedKeyCount,
        status: health.healthy ? "HEALTHY" : "UNHEALTHY"
      }
    });
  } catch {
    return jsonResponse({ error: "ENCRYPTION_KEY_HEALTH_READ_FAILED" }, 500);
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

async function hasActiveSystemAdminRole(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient
    .from("user_role_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("role_code", "SYSTEM_ADMIN")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

function readEnvironment() {
  return {
    serviceRoleKey: readRequiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAnonKey: readRequiredEnvironmentValue("SUPABASE_ANON_KEY"),
    supabaseUrl: readRequiredEnvironmentValue("SUPABASE_URL")
  };
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("ENCRYPTION_KEY_USAGE_INVALID");
  }

  return value;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

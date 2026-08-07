import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import {
  readNumber,
  readRecord,
  readRequiredEnvironmentValue
} from "../_shared/evaluationSubmission.ts";

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

    if (!await hasActiveSystemAdmin(serviceClient, userData.user.id)) {
      return jsonResponse({ error: "SYSTEM_ADMIN_REQUIRED" }, 403);
    }

    const { data, error } = await serviceClient.rpc(
      "get_anonymous_submission_abuse_summary",
      { actor_user_id: userData.user.id }
    );

    if (error) {
      throw error;
    }

    const summary = readRecord(data);

    return jsonResponse({
      summary: {
        counterRetentionDays: readNumber(summary.counter_retention_days),
        invalidCredentialAttemptsLast24Hours: readNumber(
          summary.invalid_credential_attempts_last_24_hours
        ),
        invalidCredentialAttemptsLast60Minutes: readNumber(
          summary.invalid_credential_attempts_last_60_minutes
        ),
        invalidGlobalLimit: readNumber(summary.invalid_global_limit),
        invalidGlobalWindowSeconds: readNumber(
          summary.invalid_global_window_seconds
        ),
        knownCredentialLimit: readNumber(summary.known_credential_limit),
        knownCredentialWindowSeconds: readNumber(
          summary.known_credential_window_seconds
        ),
        rateLimitedRequestsLast24Hours: readNumber(
          summary.rate_limited_requests_last_24_hours
        ),
        rateLimitedRequestsLast60Minutes: readNumber(
          summary.rate_limited_requests_last_60_minutes
        )
      }
    });
  } catch (error) {
    const message = readDatabaseError(error)
      ?? "SECURITY_ABUSE_MONITORING_READ_FAILED";
    const status = message === "SECURITY_MONITORING_ACCESS_DENIED" ? 403 : 500;

    return jsonResponse({ error: message }, status);
  }
});

async function hasActiveSystemAdmin(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const { data: profile, error: profileError } = await serviceClient
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("onboarding_status", "ACTIVE")
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return false;
  }

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

function readDatabaseError(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }

  const message = String(error.message);

  return message.includes("SECURITY_MONITORING_ACCESS_DENIED")
    ? "SECURITY_MONITORING_ACCESS_DENIED"
    : null;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

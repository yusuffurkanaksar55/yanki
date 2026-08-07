import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import {
  createAnonymousCredential,
  readArray,
  readBoolean,
  readNumber,
  readOptionalString,
  readRecord,
  readRequiredEnvironmentValue,
  readRequiredString,
  readRequiredUuid,
  RequestValidationError
} from "../_shared/evaluationSubmission.ts";
import {
  readJsonBodyWithLimit,
  RequestPayloadTooLargeError
} from "../_shared/requestBody.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store"
};

const maximumRequestBodyBytes = 16384;

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

    const body = readRecord(
      await readJsonBodyWithLimit(request, maximumRequestBodyBytes)
    );
    const assignmentId = readRequiredUuid(
      body.assignmentId,
      "EVALUATION_ASSIGNMENT_ID_INVALID"
    );
    const credential = await createAnonymousCredential();
    const { data, error } = await serviceClient.rpc(
      "issue_anonymous_submission_credential",
      {
        actor_user_id: userData.user.id,
        credential_digest_hex: credential.digestHex,
        managed_assignment_id: assignmentId
      }
    );

    if (error) {
      throw error;
    }

    return jsonResponse({
      credential: credential.token,
      submission: toPreparedSubmission(data)
    });
  } catch (error) {
    const message = error instanceof RequestPayloadTooLargeError
      ? error.message
      : error instanceof RequestValidationError
        ? error.message
        : readDatabaseError(error) ?? "EVALUATION_SUBMISSION_PREPARATION_FAILED";
    const status = error instanceof RequestPayloadTooLargeError
      ? 413
      : message === "EVALUATION_ASSIGNMENT_NOT_FOUND"
      || message === "ACTIVE_ORGANIZATION_MEMBERSHIP_REQUIRED"
      || message === "ACTIVE_PROFILE_REQUIRED"
      ? 403
      : error instanceof RequestValidationError || message !== "EVALUATION_SUBMISSION_PREPARATION_FAILED"
        ? 400
        : 500;

    return jsonResponse({ error: message }, status);
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

function toPreparedSubmission(value: unknown): Record<string, unknown> {
  const record = readRecord(value);

  return {
    evaluationCycleId: readRequiredUuid(
      record.evaluation_cycle_id,
      "EVALUATION_CYCLE_ID_MISSING"
    ),
    evaluationCycleName: readRequiredString(
      record.evaluation_cycle_name,
      "EVALUATION_CYCLE_NAME_MISSING"
    ),
    expiresAt: readRequiredString(
      record.expires_at,
      "ANONYMOUS_CREDENTIAL_EXPIRY_MISSING"
    ),
    organizationId: readRequiredUuid(
      record.organization_id,
      "ORGANIZATION_ID_MISSING"
    ),
    organizationName: readRequiredString(
      record.organization_name,
      "ORGANIZATION_NAME_MISSING"
    ),
    projectCode: readOptionalString(record.project_code),
    projectId: readOptionalString(record.project_id),
    projectName: readOptionalString(record.project_name),
    questions: readArray(record.questions).map(toPreparedQuestion),
    subjectDisplayName: readOptionalString(record.subject_display_name),
    subjectEmail: readRequiredString(
      record.subject_email,
      "SUBJECT_EMAIL_MISSING"
    ),
    templateName: readRequiredString(
      record.template_name,
      "TEMPLATE_NAME_MISSING"
    ),
    templateVersionId: readRequiredUuid(
      record.template_version_id,
      "TEMPLATE_VERSION_ID_MISSING"
    ),
    templateVersionNumber: readNumber(record.template_version_number)
  };
}

function toPreparedQuestion(value: unknown): Record<string, unknown> {
  const record = readRecord(value);

  return {
    id: readRequiredUuid(record.id, "TEMPLATE_QUESTION_ID_MISSING"),
    isRequired: readBoolean(record.is_required),
    options: readArray(record.options).map((option) => String(option)),
    position: readNumber(record.position),
    prompt: readRequiredString(
      record.prompt,
      "TEMPLATE_QUESTION_PROMPT_MISSING"
    ),
    questionType: readRequiredString(
      record.question_type,
      "TEMPLATE_QUESTION_TYPE_MISSING"
    )
  };
}

function readEnvironment() {
  return {
    serviceRoleKey: readRequiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAnonKey: readRequiredEnvironmentValue("SUPABASE_ANON_KEY"),
    supabaseUrl: readRequiredEnvironmentValue("SUPABASE_URL")
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function readDatabaseError(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }

  const message = String(error.message);
  const knownErrors = [
    "ACTIVE_ORGANIZATION_MEMBERSHIP_REQUIRED",
    "ACTIVE_PROFILE_REQUIRED",
    "ACTIVE_SUBJECT_MEMBERSHIP_REQUIRED",
    "EVALUATION_ASSIGNMENT_NOT_FOUND",
    "EVALUATION_ASSIGNMENT_NOT_PENDING",
    "EVALUATION_WINDOW_NOT_OPEN",
    "PUBLISHED_TEMPLATE_VERSION_REQUIRED",
    "TEMPLATE_QUESTION_REQUIRED"
  ];

  return knownErrors.find((code) => message.includes(code)) ?? null;
}

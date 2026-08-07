import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import {
  decryptEvaluationPayload,
  readArray,
  readNumber,
  readOptionalString,
  readRecord,
  readRequiredEnvironmentValue,
  readRequiredString,
  readRequiredUuid,
  RequestValidationError,
  type EncryptionContext
} from "../_shared/evaluationSubmission.ts";
import {
  aggregateEvaluationPayloads,
  type DecryptedEvaluationPayload,
  type ReportingQuestion,
  type ReportingQuestionType
} from "../_shared/evaluationReporting.ts";

const reportingQuestionTypes: readonly ReportingQuestionType[] = [
  "RATING_1_TO_5",
  "RATING_1_TO_10",
  "YES_NO",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "SHORT_TEXT",
  "LONG_TEXT",
  "TAG_SELECTION"
];

const corsHeaders = {
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
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

    const body = readRecord(await request.json().catch(() => null));

    if (body.action === "list_targets") {
      const { data, error } = await serviceClient.rpc(
        "list_my_evaluation_report_targets",
        { actor_user_id: userData.user.id }
      );

      if (error) {
        throw error;
      }

      const result = readRecord(data);

      return jsonResponse({
        targets: readArray(result.targets).map(toReportTarget)
      });
    }

    if (body.action === "get_report") {
      const payload = readRecord(body.payload);
      const evaluationCycleId = readRequiredUuid(
        payload.evaluationCycleId,
        "EVALUATION_CYCLE_ID_INVALID"
      );
      const subjectUserId = readRequiredUuid(
        payload.subjectUserId,
        "REPORT_SUBJECT_ID_INVALID"
      );
      const { data, error } = await serviceClient.rpc(
        "get_encrypted_evaluation_report_batch",
        {
          actor_user_id: userData.user.id,
          managed_evaluation_cycle_id: evaluationCycleId,
          managed_subject_user_id: subjectUserId
        }
      );

      if (error) {
        throw error;
      }

      return jsonResponse({ report: await createReport(data) });
    }

    return jsonResponse({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const message = error instanceof RequestValidationError
      ? error.message
      : readDatabaseError(error)
        ?? readReportingProcessingError(error)
        ?? "EVALUATION_REPORT_FAILED";

    return jsonResponse({ error: message }, toErrorStatus(message, error));
  }
});

async function createReport(value: unknown): Promise<Record<string, unknown>> {
  const batch = readRecord(value);
  const target = toReportTarget(batch);
  const status = readRequiredString(batch.status, "REPORT_STATUS_MISSING");

  if (status === "WITHHELD") {
    return {
      ...target,
      status,
      submissionCount: null,
      questions: []
    };
  }

  if (status !== "AVAILABLE") {
    throw new Error("EVALUATION_REPORT_DATA_INVALID");
  }

  const threshold = readNumber(batch.anonymity_threshold);
  const submissionCount = readNumber(batch.submission_count);
  const questions = readArray(batch.questions).map(toReportingQuestion);
  const encryptedSubmissions = readArray(batch.submissions).map((submission) =>
    readRecord(submission)
  );

  if (
    threshold < 4
    || submissionCount < threshold
    || encryptedSubmissions.length !== submissionCount
    || questions.length === 0
  ) {
    throw new Error("EVALUATION_REPORT_DATA_INVALID");
  }

  const payloads: DecryptedEvaluationPayload[] = [];

  for (const encrypted of encryptedSubmissions) {
    if (
      readNumber(encrypted.encryption_context_version) !== 1
      || readNumber(encrypted.payload_schema_version) !== 1
    ) {
      throw new Error("EVALUATION_REPORT_DATA_INVALID");
    }

    const decrypted = await decryptEvaluationPayload(
      {
        ciphertextHex: readRequiredString(
          encrypted.encrypted_payload_hex,
          "ENCRYPTED_PAYLOAD_MISSING"
        ),
        keyVersion: readRequiredString(
          encrypted.encryption_key_version,
          "ENCRYPTION_KEY_VERSION_MISSING"
        ),
        nonceHex: readRequiredString(
          encrypted.encryption_nonce_hex,
          "ENCRYPTION_NONCE_MISSING"
        )
      },
      toEncryptionContext(encrypted)
    );

    payloads.push({
      answers: readArray(decrypted.answers),
      payloadSchemaVersion: readNumber(decrypted.payloadSchemaVersion)
    });
  }

  return {
    ...target,
    questions: aggregateEvaluationPayloads(questions, payloads),
    status,
    submissionCount
  };
}

function toEncryptionContext(record: Record<string, unknown>): EncryptionContext {
  return {
    assignmentKind: readRequiredString(
      record.assignment_kind,
      "ASSIGNMENT_KIND_MISSING"
    ),
    evaluationCycleId: readRequiredUuid(
      record.evaluation_cycle_id,
      "EVALUATION_CYCLE_ID_MISSING"
    ),
    organizationId: readRequiredUuid(
      record.organization_id,
      "ORGANIZATION_ID_MISSING"
    ),
    projectId: readOptionalString(record.project_id),
    subjectUserId: readRequiredUuid(
      record.subject_user_id,
      "SUBJECT_USER_ID_MISSING"
    ),
    templateVersionId: readRequiredUuid(
      record.template_version_id,
      "TEMPLATE_VERSION_ID_MISSING"
    )
  };
}

function toReportingQuestion(value: unknown): ReportingQuestion {
  const record = readRecord(value);
  const questionType = readRequiredString(
    record.question_type,
    "TEMPLATE_QUESTION_TYPE_MISSING"
  );

  if (!reportingQuestionTypes.includes(questionType as ReportingQuestionType)) {
    throw new Error("TEMPLATE_QUESTION_TYPE_INVALID");
  }

  return {
    id: readRequiredUuid(record.id, "TEMPLATE_QUESTION_ID_MISSING"),
    options: readArray(record.options).map(String),
    position: readNumber(record.position),
    prompt: readRequiredString(record.prompt, "TEMPLATE_QUESTION_PROMPT_MISSING"),
    questionType: questionType as ReportingQuestionType
  };
}

function toReportTarget(value: unknown): Record<string, unknown> {
  const record = readRecord(value);

  return {
    anonymityThreshold: readNumber(record.anonymity_threshold),
    closedAt: readRequiredString(record.closed_at ?? record.closes_at, "REPORT_CLOSE_MISSING"),
    evaluationCycleId: readRequiredUuid(
      record.evaluation_cycle_id,
      "EVALUATION_CYCLE_ID_MISSING"
    ),
    evaluationCycleName: readRequiredString(
      record.evaluation_cycle_name,
      "EVALUATION_CYCLE_NAME_MISSING"
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
    subjectDisplayName: readOptionalString(record.subject_display_name),
    subjectEmail: readRequiredString(record.subject_email, "SUBJECT_EMAIL_MISSING"),
    subjectUserId: readRequiredUuid(
      record.subject_user_id,
      "SUBJECT_USER_ID_MISSING"
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
  const knownErrors = [
    "ACTIVE_PROFILE_REQUIRED",
    "REPORT_SELF_ACCESS_DENIED",
    "REPORTING_ACCESS_DENIED",
    "REPORT_TARGET_NOT_FOUND",
    "REPORT_WINDOW_NOT_CLOSED"
  ];

  return knownErrors.find((code) => message.includes(code)) ?? null;
}

function readReportingProcessingError(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }

  const message = String(error.message);

  if (message.includes("EVALUATION_ENCRYPTION_KEY_VERSION_UNAVAILABLE")) {
    return "EVALUATION_REPORT_KEY_UNAVAILABLE";
  }

  const knownErrors = [
    "EVALUATION_ENCRYPTION_KEY_VERSION_INVALID",
    "EVALUATION_ENCRYPTION_KEYRING_INVALID",
    "EVALUATION_ENCRYPTION_KEY_INVALID",
    "EVALUATION_ENCRYPTED_PAYLOAD_INVALID",
    "EVALUATION_PAYLOAD_DECRYPTION_FAILED",
    "EVALUATION_DECRYPTED_PAYLOAD_INVALID",
    "EVALUATION_REPORT_DATA_INVALID"
  ];

  return knownErrors.some((code) => message.includes(code))
    ? "EVALUATION_REPORT_PROCESSING_FAILED"
    : null;
}

function toErrorStatus(message: string, error: unknown): number {
  if (message === "AUTHENTICATION_REQUIRED") {
    return 401;
  }

  if (
    message === "ACTIVE_PROFILE_REQUIRED"
    || message === "REPORT_SELF_ACCESS_DENIED"
    || message === "REPORTING_ACCESS_DENIED"
  ) {
    return 403;
  }

  if (message === "REPORT_TARGET_NOT_FOUND") {
    return 404;
  }

  if (
    error instanceof RequestValidationError
    || message === "REPORT_WINDOW_NOT_CLOSED"
  ) {
    return 400;
  }

  return 500;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

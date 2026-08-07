import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";
import {
  encryptEvaluationPayload,
  encryptionContextVersion,
  hashAnonymousCredential,
  isRecord,
  payloadSchemaVersion,
  readArray,
  readBoolean,
  readOptionalString,
  readRecord,
  readRequiredEnvironmentValue,
  readRequiredString,
  readRequiredUuid,
  RequestValidationError,
  type EncryptionContext
} from "../_shared/evaluationSubmission.ts";
import {
  readJsonBodyWithLimit,
  RequestPayloadTooLargeError
} from "../_shared/requestBody.ts";

type QuestionType =
  | "RATING_1_TO_5"
  | "RATING_1_TO_10"
  | "YES_NO"
  | "SINGLE_SELECT"
  | "MULTI_SELECT"
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "TAG_SELECTION";

type SubmissionQuestion = {
  readonly id: string;
  readonly isRequired: boolean;
  readonly options: readonly string[];
  readonly position: number;
  readonly questionType: QuestionType;
};

const questionTypes: readonly QuestionType[] = [
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
  "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Retry-After",
  "Cache-Control": "no-store"
};

const maximumRequestBodyBytes = 262144;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const body = readRecord(
      await readJsonBodyWithLimit(request, maximumRequestBodyBytes)
    );
    const credential = readRequiredString(
      body.credential,
      "ANONYMOUS_CREDENTIAL_INVALID"
    );
    const digestHex = await hashAnonymousCredential(credential);
    const serviceClient = createClient(
      readRequiredEnvironmentValue("SUPABASE_URL"),
      readRequiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );
    const { data: rateLimitData, error: rateLimitError } =
      await serviceClient.rpc("consume_anonymous_submission_request", {
        credential_digest_hex: digestHex
      });

    if (rateLimitError) {
      throw rateLimitError;
    }

    const rateLimitDecision = readRecord(rateLimitData);

    if (rateLimitDecision.allowed !== true) {
      const errorCode = readRequiredString(
        rateLimitDecision.error_code,
        "ANONYMOUS_RATE_LIMIT_DECISION_INVALID"
      );
      const retryAfterSeconds = typeof rateLimitDecision.retry_after_seconds
        === "number"
        ? Math.max(1, Math.ceil(rateLimitDecision.retry_after_seconds))
        : null;

      return jsonResponse(
        { error: errorCode },
        errorCode === "ANONYMOUS_RATE_LIMIT_EXCEEDED"
          ? 429
          : errorCode === "ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED"
            ? 409
            : 400,
        retryAfterSeconds === null
          ? {}
          : { "Retry-After": String(retryAfterSeconds) }
      );
    }

    const { data: contextData, error: contextError } = await serviceClient.rpc(
      "get_anonymous_submission_context",
      { credential_digest_hex: digestHex }
    );

    if (contextError) {
      throw contextError;
    }

    const contextRecord = readRecord(contextData);
    const questions = readArray(contextRecord.questions).map(toSubmissionQuestion);
    const answers = normalizeAnswers(questions, readArray(body.answers));
    const context = toEncryptionContext(contextRecord);
    const encrypted = await encryptEvaluationPayload(
      {
        answers,
        payloadSchemaVersion
      },
      context
    );
    const { data: redemptionData, error: redemptionError } = await serviceClient.rpc(
      "redeem_anonymous_submission_credential",
      {
        credential_digest_hex: digestHex,
        encrypted_payload_hex: encrypted.ciphertextHex,
        encryption_nonce_hex: encrypted.nonceHex,
        managed_encryption_context_version: encryptionContextVersion,
        managed_encryption_key_version: encrypted.keyVersion,
        managed_payload_schema_version: payloadSchemaVersion
      }
    );

    if (redemptionError) {
      throw redemptionError;
    }

    const redemption = readRecord(redemptionData);

    if (redemption.accepted !== true) {
      throw new Error("ANONYMOUS_EVALUATION_SUBMISSION_FAILED");
    }

    return jsonResponse({ accepted: true }, 201);
  } catch (error) {
    const encryptionConfigurationError = readEncryptionConfigurationError(error);
    const message = error instanceof RequestPayloadTooLargeError
      ? error.message
      : error instanceof RequestValidationError
        ? error.message
        : readDatabaseError(error)
          ?? encryptionConfigurationError
          ?? "ANONYMOUS_EVALUATION_SUBMISSION_FAILED";
    const status = error instanceof RequestPayloadTooLargeError
      ? 413
      : message === "ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED"
      ? 409
      : encryptionConfigurationError
        ? 500
        : error instanceof RequestValidationError || message !== "ANONYMOUS_EVALUATION_SUBMISSION_FAILED"
        ? 400
        : 500;

    return jsonResponse({ error: message }, status);
  }
});

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

function toSubmissionQuestion(value: unknown): SubmissionQuestion {
  const record = readRecord(value);
  const questionType = readRequiredString(
    record.question_type,
    "TEMPLATE_QUESTION_TYPE_MISSING"
  );

  if (!questionTypes.includes(questionType as QuestionType)) {
    throw new Error("TEMPLATE_QUESTION_TYPE_INVALID");
  }

  return {
    id: readRequiredUuid(record.id, "TEMPLATE_QUESTION_ID_MISSING"),
    isRequired: readBoolean(record.is_required),
    options: readArray(record.options).map((option) => String(option)),
    position: typeof record.position === "number" ? record.position : 0,
    questionType: questionType as QuestionType
  };
}

function normalizeAnswers(
  questions: readonly SubmissionQuestion[],
  values: readonly unknown[]
): readonly Record<string, unknown>[] {
  if (questions.length === 0 || values.length > questions.length) {
    throw new RequestValidationError("EVALUATION_ANSWERS_INVALID");
  }

  const submittedAnswers = new Map<string, unknown>();

  for (const value of values) {
    if (!isRecord(value)) {
      throw new RequestValidationError("EVALUATION_ANSWERS_INVALID");
    }

    const questionId = readRequiredUuid(
      value.questionId,
      "EVALUATION_QUESTION_ID_INVALID"
    );

    if (submittedAnswers.has(questionId)) {
      throw new RequestValidationError("EVALUATION_ANSWER_DUPLICATE");
    }

    submittedAnswers.set(questionId, value.value);
  }

  const knownQuestionIds = new Set(questions.map((question) => question.id));

  if ([...submittedAnswers.keys()].some((id) => !knownQuestionIds.has(id))) {
    throw new RequestValidationError("EVALUATION_QUESTION_UNKNOWN");
  }

  return [...questions]
    .sort((left, right) => left.position - right.position)
    .map((question) => ({
      questionId: question.id,
      questionType: question.questionType,
      value: normalizeAnswerValue(question, submittedAnswers.get(question.id))
    }));
}

function normalizeAnswerValue(
  question: SubmissionQuestion,
  value: unknown
): unknown {
  if (value === undefined || value === null || value === "") {
    if (question.isRequired) {
      throw new RequestValidationError("EVALUATION_REQUIRED_ANSWER_MISSING");
    }

    return null;
  }

  if (question.questionType === "RATING_1_TO_5") {
    return readIntegerInRange(value, 1, 5);
  }

  if (question.questionType === "RATING_1_TO_10") {
    return readIntegerInRange(value, 1, 10);
  }

  if (question.questionType === "YES_NO") {
    if (typeof value !== "boolean") {
      throw new RequestValidationError("EVALUATION_ANSWER_INVALID");
    }

    return value;
  }

  if (question.questionType === "SINGLE_SELECT") {
    if (typeof value !== "string" || !question.options.includes(value)) {
      throw new RequestValidationError("EVALUATION_ANSWER_INVALID");
    }

    return value;
  }

  if (
    question.questionType === "MULTI_SELECT"
    || question.questionType === "TAG_SELECTION"
  ) {
    if (
      !Array.isArray(value)
      || value.length === 0
      || value.some((option) => typeof option !== "string")
      || new Set(value).size !== value.length
      || value.some((option) => !question.options.includes(String(option)))
    ) {
      throw new RequestValidationError("EVALUATION_ANSWER_INVALID");
    }

    return value;
  }

  if (question.questionType === "SHORT_TEXT") {
    return readTextAnswer(value, 500);
  }

  return readTextAnswer(value, 5000);
}

function readIntegerInRange(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new RequestValidationError("EVALUATION_ANSWER_INVALID");
  }

  return Number(value);
}

function readTextAnswer(value: unknown, maximumLength: number): string {
  if (typeof value !== "string") {
    throw new RequestValidationError("EVALUATION_ANSWER_INVALID");
  }

  const text = value.trim();

  if (text.length === 0 || text.length > maximumLength) {
    throw new RequestValidationError("EVALUATION_ANSWER_INVALID");
  }

  return text;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      ...additionalHeaders,
      "Content-Type": "application/json"
    },
    status
  });
}

function readDatabaseError(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }

  const message = String(error.message);
  const knownErrors = [
    "ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED",
    "ANONYMOUS_CREDENTIAL_INVALID_OR_EXPIRED",
    "ENCRYPTED_EVALUATION_PAYLOAD_INVALID",
    "ENCRYPTION_KEY_VERSION_INVALID",
    "ENCRYPTION_NONCE_INVALID",
    "ENCRYPTION_PAYLOAD_VERSION_INVALID"
  ];

  return knownErrors.find((code) => message.includes(code)) ?? null;
}

function readEncryptionConfigurationError(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }

  const message = String(error.message);
  const knownErrors = [
    "EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION is required.",
    "EVALUATION_ENCRYPTION_KEYRING is required.",
    "EVALUATION_ENCRYPTION_KEY_VERSION_INVALID",
    "EVALUATION_ENCRYPTION_KEYRING_INVALID",
    "EVALUATION_ENCRYPTION_KEY_INVALID"
  ];

  return knownErrors.find((code) => message.includes(code)) ?? null;
}

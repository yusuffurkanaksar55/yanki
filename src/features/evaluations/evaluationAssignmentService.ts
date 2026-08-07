import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readPublicEnvironment,
  type PublicEnvironment
} from "../../config/environment";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type EvaluationAssignmentAvailability =
  | "AVAILABLE"
  | "UPCOMING"
  | "CLOSED"
  | "COMPLETED";

export type EvaluationAssignment = {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly evaluationCycleId: string;
  readonly evaluationCycleName: string;
  readonly cycleStatus: string;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly projectCode: string | null;
  readonly templateVersionId: string;
  readonly templateName: string;
  readonly templateVersionNumber: number;
  readonly subjectDisplayName: string | null;
  readonly subjectEmail: string;
  readonly assignmentKind: string;
  readonly assignmentStatus: string;
  readonly availabilityStatus: EvaluationAssignmentAvailability;
};

export type EvaluationQuestionType =
  | "RATING_1_TO_5"
  | "RATING_1_TO_10"
  | "YES_NO"
  | "SINGLE_SELECT"
  | "MULTI_SELECT"
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "TAG_SELECTION";

export type EvaluationSubmissionQuestion = {
  readonly id: string;
  readonly position: number;
  readonly prompt: string;
  readonly questionType: EvaluationQuestionType;
  readonly isRequired: boolean;
  readonly options: readonly string[];
};

export type PreparedEvaluationSubmission = {
  readonly credential: string;
  readonly expiresAt: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly evaluationCycleId: string;
  readonly evaluationCycleName: string;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly projectCode: string | null;
  readonly subjectDisplayName: string | null;
  readonly subjectEmail: string;
  readonly templateVersionId: string;
  readonly templateName: string;
  readonly templateVersionNumber: number;
  readonly questions: readonly EvaluationSubmissionQuestion[];
};

export type EvaluationSubmissionAnswer = {
  readonly questionId: string;
  readonly value: unknown;
};

export type EvaluationAssignmentService = {
  readonly listMyAssignments: () => Promise<readonly EvaluationAssignment[]>;
  readonly prepareSubmission: (
    assignmentId: string
  ) => Promise<PreparedEvaluationSubmission>;
  readonly submitEvaluation: (
    credential: string,
    answers: readonly EvaluationSubmissionAnswer[]
  ) => Promise<void>;
};

export type EvaluationAssignmentServiceErrorCode =
  | "EVALUATION_ASSIGNMENTS_READ_FAILED"
  | "EVALUATION_SUBMISSION_PREPARATION_FAILED"
  | "EVALUATION_SUBMISSION_FAILED";

export class EvaluationAssignmentServiceError extends Error {
  constructor(
    readonly code: EvaluationAssignmentServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "EvaluationAssignmentServiceError";
  }
}

let cachedService: EvaluationAssignmentService | null = null;

export const browserEvaluationAssignmentService: EvaluationAssignmentService = {
  listMyAssignments: () => getDefaultService().listMyAssignments(),
  prepareSubmission: (assignmentId) =>
    getDefaultService().prepareSubmission(assignmentId),
  submitEvaluation: (credential, answers) =>
    getDefaultService().submitEvaluation(credential, answers)
};

export function createSupabaseEvaluationAssignmentService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient(),
  publicEnvironment: PublicEnvironment = readPublicEnvironment(),
  fetcher: typeof fetch = fetch
): EvaluationAssignmentService {
  return {
    async listMyAssignments() {
      const { data, error } = await client.rpc("get_my_evaluation_assignments");

      if (error) {
        throw new EvaluationAssignmentServiceError(
          "EVALUATION_ASSIGNMENTS_READ_FAILED",
          {
            code: error.code,
            message: error.message
          }
        );
      }

      const record = isRecord(data) ? data : {};

      return readArray(record.assignments).map(toEvaluationAssignment);
    },

    async prepareSubmission(assignmentId) {
      const { data, error } = await client.functions.invoke(
        "evaluation-submission-credentials",
        { body: { assignmentId } }
      );

      if (error) {
        throw new EvaluationAssignmentServiceError(
          "EVALUATION_SUBMISSION_PREPARATION_FAILED",
          { message: error.message }
        );
      }

      return toPreparedEvaluationSubmission(data);
    },

    async submitEvaluation(credential, answers) {
      let response: Response;

      try {
        response = await fetcher(
          `${publicEnvironment.supabaseUrl}/functions/v1/anonymous-evaluation-submissions`,
          {
            body: JSON.stringify({ answers, credential }),
            credentials: "omit",
            headers: {
              apikey: publicEnvironment.supabaseAnonKey,
              "Content-Type": "application/json"
            },
            method: "POST",
            referrerPolicy: "no-referrer"
          }
        );
      } catch (cause) {
        throw new EvaluationAssignmentServiceError(
          "EVALUATION_SUBMISSION_FAILED",
          cause
        );
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);

        throw new EvaluationAssignmentServiceError(
          "EVALUATION_SUBMISSION_FAILED",
          isRecord(body) ? { error: readString(body.error) } : undefined
        );
      }
    }
  };
}

function getDefaultService(): EvaluationAssignmentService {
  if (!cachedService) {
    cachedService = createSupabaseEvaluationAssignmentService();
  }

  return cachedService;
}

function toEvaluationAssignment(value: unknown): EvaluationAssignment {
  const record = isRecord(value) ? value : {};

  return {
    assignmentKind: readString(record.assignment_kind),
    assignmentStatus: readString(record.assignment_status),
    availabilityStatus: toAvailability(record.availability_status),
    closesAt: readString(record.closes_at),
    cycleStatus: readString(record.cycle_status),
    evaluationCycleId: readString(record.evaluation_cycle_id),
    evaluationCycleName: readString(record.evaluation_cycle_name),
    id: readString(record.id),
    opensAt: readString(record.opens_at),
    organizationId: readString(record.organization_id),
    organizationName: readString(record.organization_name),
    projectCode: readNullableString(record.project_code),
    projectId: readNullableString(record.project_id),
    projectName: readNullableString(record.project_name),
    templateName: readString(record.template_name),
    templateVersionId: readString(record.template_version_id),
    templateVersionNumber: readNumber(record.template_version_number),
    subjectDisplayName: readNullableString(record.subject_display_name),
    subjectEmail: readString(record.subject_email)
  };
}

function toPreparedEvaluationSubmission(
  value: unknown
): PreparedEvaluationSubmission {
  const record = isRecord(value) ? value : {};
  const submission = isRecord(record.submission) ? record.submission : {};

  return {
    credential: readString(record.credential),
    evaluationCycleId: readString(submission.evaluationCycleId),
    evaluationCycleName: readString(submission.evaluationCycleName),
    expiresAt: readString(submission.expiresAt),
    organizationId: readString(submission.organizationId),
    organizationName: readString(submission.organizationName),
    projectCode: readNullableString(submission.projectCode),
    projectId: readNullableString(submission.projectId),
    projectName: readNullableString(submission.projectName),
    questions: readArray(submission.questions).map(toEvaluationSubmissionQuestion),
    subjectDisplayName: readNullableString(submission.subjectDisplayName),
    subjectEmail: readString(submission.subjectEmail),
    templateName: readString(submission.templateName),
    templateVersionId: readString(submission.templateVersionId),
    templateVersionNumber: readNumber(submission.templateVersionNumber)
  };
}

function toEvaluationSubmissionQuestion(
  value: unknown
): EvaluationSubmissionQuestion {
  const record = isRecord(value) ? value : {};

  return {
    id: readString(record.id),
    isRequired: record.isRequired === true,
    options: readArray(record.options).map((option) => String(option)),
    position: readNumber(record.position),
    prompt: readString(record.prompt),
    questionType: toQuestionType(record.questionType)
  };
}

function toQuestionType(value: unknown): EvaluationQuestionType {
  if (
    value === "RATING_1_TO_5"
    || value === "RATING_1_TO_10"
    || value === "YES_NO"
    || value === "SINGLE_SELECT"
    || value === "MULTI_SELECT"
    || value === "SHORT_TEXT"
    || value === "LONG_TEXT"
    || value === "TAG_SELECTION"
  ) {
    return value;
  }

  return "SHORT_TEXT";
}

function toAvailability(value: unknown): EvaluationAssignmentAvailability {
  if (
    value === "AVAILABLE"
    || value === "UPCOMING"
    || value === "CLOSED"
    || value === "COMPLETED"
  ) {
    return value;
  }

  return "CLOSED";
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

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

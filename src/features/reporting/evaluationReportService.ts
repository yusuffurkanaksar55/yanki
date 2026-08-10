import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type EvaluationReportTarget = {
  readonly closedAt: string;
  readonly evaluationCycleId: string;
  readonly evaluationCycleName: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly projectCode: string | null;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly subjectDisplayName: string | null;
  readonly subjectEmail: string;
  readonly subjectUserId: string;
  readonly templateName: string;
  readonly templateVersionId: string;
  readonly templateVersionNumber: number;
};

export type EvaluationReportDistributionItem = {
  readonly count: number;
  readonly value: string;
};

export type EvaluationReportQuestion = {
  readonly answeredCount: number;
  readonly id: string;
  readonly position: number;
  readonly prompt: string;
  readonly questionType: string;
  readonly aggregation:
    | {
        readonly kind: "RATING";
        readonly average: number | null;
        readonly distribution: readonly EvaluationReportDistributionItem[];
      }
    | {
        readonly kind: "YES_NO";
        readonly noCount: number;
        readonly yesCount: number;
      }
    | {
        readonly kind: "OPTIONS";
        readonly allowsMultiple: boolean;
        readonly distribution: readonly EvaluationReportDistributionItem[];
      }
    | {
        readonly kind: "TEXT_COMMENTS";
        readonly comments: readonly string[];
      };
};

export type EvaluationReport = EvaluationReportTarget &
  (
    | {
        readonly status: "EMPTY";
        readonly submissionCount: null;
        readonly questions: readonly [];
      }
    | {
        readonly status: "AVAILABLE";
        readonly submissionCount: number;
        readonly questions: readonly EvaluationReportQuestion[];
      }
  );

export type EvaluationReportService = {
  readonly listTargets: () => Promise<readonly EvaluationReportTarget[]>;
  readonly getReport: (
    evaluationCycleId: string,
    subjectUserId: string
  ) => Promise<EvaluationReport>;
};

export class EvaluationReportServiceError extends Error {
  constructor(readonly cause?: unknown) {
    super("EVALUATION_REPORT_FAILED");
    this.name = "EvaluationReportServiceError";
  }
}

let cachedService: EvaluationReportService | null = null;

export const browserEvaluationReportService: EvaluationReportService = {
  listTargets: () => getDefaultService().listTargets(),
  getReport: (evaluationCycleId, subjectUserId) =>
    getDefaultService().getReport(evaluationCycleId, subjectUserId)
};

export function createSupabaseEvaluationReportService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): EvaluationReportService {
  return {
    async listTargets() {
      const { data, error } = await client.functions.invoke(
        "evaluation-reports",
        { body: { action: "list_targets" } }
      );

      if (error) {
        throw new EvaluationReportServiceError({ message: error.message });
      }

      const record = isRecord(data) ? data : {};

      return readArray(record.targets).map(toTarget);
    },

    async getReport(evaluationCycleId, subjectUserId) {
      const { data, error } = await client.functions.invoke(
        "evaluation-reports",
        {
          body: {
            action: "get_report",
            payload: { evaluationCycleId, subjectUserId }
          }
        }
      );

      if (error) {
        throw new EvaluationReportServiceError({ message: error.message });
      }

      const record = isRecord(data) ? data : {};

      return toReport(record.report);
    }
  };
}

function getDefaultService(): EvaluationReportService {
  if (!cachedService) {
    cachedService = createSupabaseEvaluationReportService();
  }

  return cachedService;
}

function toReport(value: unknown): EvaluationReport {
  const record = isRecord(value) ? value : {};
  const target = toTarget(record);

  if (record.status === "EMPTY") {
    return {
      ...target,
      questions: [],
      status: "EMPTY",
      submissionCount: null
    };
  }

  if (record.status !== "AVAILABLE") {
    throw new EvaluationReportServiceError();
  }

  return {
    ...target,
    questions: readArray(record.questions).map(toQuestion),
    status: "AVAILABLE",
    submissionCount: readNumber(record.submissionCount)
  };
}

function toTarget(value: unknown): EvaluationReportTarget {
  const record = isRecord(value) ? value : {};

  return {
    closedAt: readString(record.closedAt),
    evaluationCycleId: readString(record.evaluationCycleId),
    evaluationCycleName: readString(record.evaluationCycleName),
    organizationId: readString(record.organizationId),
    organizationName: readString(record.organizationName),
    projectCode: readNullableString(record.projectCode),
    projectId: readNullableString(record.projectId),
    projectName: readNullableString(record.projectName),
    subjectDisplayName: readNullableString(record.subjectDisplayName),
    subjectEmail: readString(record.subjectEmail),
    subjectUserId: readString(record.subjectUserId),
    templateName: readString(record.templateName),
    templateVersionId: readString(record.templateVersionId),
    templateVersionNumber: readNumber(record.templateVersionNumber)
  };
}

function toQuestion(value: unknown): EvaluationReportQuestion {
  const record = isRecord(value) ? value : {};

  return {
    aggregation: toAggregation(record.aggregation),
    answeredCount: readNumber(record.answeredCount),
    id: readString(record.id),
    position: readNumber(record.position),
    prompt: readString(record.prompt),
    questionType: readString(record.questionType)
  };
}

function toAggregation(
  value: unknown
): EvaluationReportQuestion["aggregation"] {
  const record = isRecord(value) ? value : {};

  if (record.kind === "RATING") {
    return {
      average: typeof record.average === "number" ? record.average : null,
      distribution: readDistribution(record.distribution),
      kind: "RATING"
    };
  }

  if (record.kind === "YES_NO") {
    return {
      kind: "YES_NO",
      noCount: readNumber(record.noCount),
      yesCount: readNumber(record.yesCount)
    };
  }

  if (record.kind === "OPTIONS") {
    return {
      allowsMultiple: record.allowsMultiple === true,
      distribution: readDistribution(record.distribution),
      kind: "OPTIONS"
    };
  }

  if (record.kind === "TEXT_COMMENTS") {
    return {
      comments: readComments(record.comments),
      kind: "TEXT_COMMENTS"
    };
  }

  throw new EvaluationReportServiceError();
}

function readComments(value: unknown): readonly string[] {
  const comments = readArray(value);

  if (comments.some((comment) => (
    typeof comment !== "string"
    || comment.trim().length === 0
    || comment.length > 5000
  ))) {
    throw new EvaluationReportServiceError();
  }

  return comments as string[];
}

function readDistribution(
  value: unknown
): readonly EvaluationReportDistributionItem[] {
  return readArray(value).map((item) => {
    const record = isRecord(item) ? item : {};

    return {
      count: readNumber(record.count),
      value: readString(record.value)
    };
  });
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
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

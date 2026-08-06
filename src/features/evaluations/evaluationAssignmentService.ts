import type { SupabaseClient } from "@supabase/supabase-js";
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
  readonly subjectDisplayName: string | null;
  readonly subjectEmail: string;
  readonly assignmentKind: string;
  readonly assignmentStatus: string;
  readonly availabilityStatus: EvaluationAssignmentAvailability;
};

export type EvaluationAssignmentService = {
  readonly listMyAssignments: () => Promise<readonly EvaluationAssignment[]>;
};

export type EvaluationAssignmentServiceErrorCode =
  "EVALUATION_ASSIGNMENTS_READ_FAILED";

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
  listMyAssignments: () => getDefaultService().listMyAssignments()
};

export function createSupabaseEvaluationAssignmentService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
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
    subjectDisplayName: readNullableString(record.subject_display_name),
    subjectEmail: readString(record.subject_email)
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

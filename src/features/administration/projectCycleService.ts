import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export type ManagedEvaluationCycle = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly projectCompletedOn: string | null;
  readonly anonymityThreshold: number;
  readonly assignmentSummary: EvaluationAssignmentSummary;
};

export type EvaluationAssignmentSummary = {
  readonly total: number;
  readonly pending: number;
  readonly completed: number;
  readonly cancelled: number;
};

export type GenerateProjectAssignmentsResult = {
  readonly evaluationCycleId: string;
  readonly projectId: string;
  readonly participantCount: number;
  readonly candidateCount: number;
  readonly createdCount: number;
  readonly skippedDuplicateCount: number;
  readonly assignmentSummary: EvaluationAssignmentSummary;
};

export type ProjectMembershipKind =
  | "MEMBER"
  | "PROJECT_MANAGER"
  | "SPONSOR"
  | "OBSERVER";

export type ManagedProjectMember = {
  readonly id: string;
  readonly userId: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly membershipKind: ProjectMembershipKind;
  readonly startsAt: string;
  readonly endsAt: string | null;
};

export type ManagedProject = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly code: string | null;
  readonly status: string;
  readonly startsOn: string | null;
  readonly completesOn: string | null;
  readonly projectManagerUserId: string | null;
  readonly cycles: readonly ManagedEvaluationCycle[];
  readonly members: readonly ManagedProjectMember[];
};

export type OrganizationMember = {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly onboardingStatus: string;
};

export type ProjectCycleDraft = {
  readonly organizationId: string;
  readonly projectName: string;
  readonly projectCode: string | null;
  readonly projectCompletedOn: string | null;
  readonly evaluationName: string;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly projectManagerUserId: string | null;
};

export type ProjectMemberDraft = {
  readonly projectId: string;
  readonly userId: string;
  readonly membershipKind: ProjectMembershipKind;
};

export type ProjectDateUpdateDraft = {
  readonly projectId: string;
  readonly evaluationCycleId: string;
  readonly projectCompletedOn: string | null;
  readonly closesAt: string;
};

export type ProjectCycleService = {
  readonly addProjectMember: (
    draft: ProjectMemberDraft
  ) => Promise<ManagedProject>;
  readonly generateProjectAssignments: (
    evaluationCycleId: string
  ) => Promise<GenerateProjectAssignmentsResult>;
  readonly listProjectCycles: () => Promise<readonly ManagedProject[]>;
  readonly listOrganizationMembers: (
    organizationId: string
  ) => Promise<readonly OrganizationMember[]>;
  readonly createProjectCycle: (
    draft: ProjectCycleDraft
  ) => Promise<ManagedProject>;
  readonly updateProjectDates: (
    draft: ProjectDateUpdateDraft
  ) => Promise<ManagedProject>;
};

export type ProjectCycleServiceErrorCode =
  | "PROJECT_CYCLE_SESSION_REQUIRED"
  | "PROJECT_CYCLE_LIST_FAILED"
  | "PROJECT_CYCLE_CREATE_FAILED"
  | "PROJECT_MEMBER_LIST_FAILED"
  | "PROJECT_MEMBER_ADD_FAILED"
  | "PROJECT_ASSIGNMENT_GENERATE_FAILED"
  | "PROJECT_DATE_UPDATE_FAILED";

export class ProjectCycleServiceError extends Error {
  constructor(
    readonly code: ProjectCycleServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "ProjectCycleServiceError";
  }
}

let cachedProjectCycleService: ProjectCycleService | null = null;

export const browserProjectCycleService: ProjectCycleService = {
  addProjectMember: (draft) =>
    getDefaultProjectCycleService().addProjectMember(draft),
  createProjectCycle: (draft) =>
    getDefaultProjectCycleService().createProjectCycle(draft),
  generateProjectAssignments: (evaluationCycleId) =>
    getDefaultProjectCycleService().generateProjectAssignments(
      evaluationCycleId
    ),
  listOrganizationMembers: (organizationId) =>
    getDefaultProjectCycleService().listOrganizationMembers(organizationId),
  listProjectCycles: () => getDefaultProjectCycleService().listProjectCycles(),
  updateProjectDates: (draft) =>
    getDefaultProjectCycleService().updateProjectDates(draft)
};

export function createSupabaseProjectCycleService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): ProjectCycleService {
  return {
    async addProjectMember(draft) {
      const data = await invokeAdminProjectCycles(client, {
        action: "add_project_member",
        payload: draft
      });

      return toManagedProject(data.project);
    },

    async generateProjectAssignments(evaluationCycleId) {
      const data = await invokeAdminProjectCycles(client, {
        action: "generate_project_assignments",
        payload: { evaluationCycleId }
      });

      return toGenerateProjectAssignmentsResult(data.result);
    },

    async listProjectCycles() {
      const data = await invokeAdminProjectCycles(client, {
        action: "list_project_cycles"
      });

      return readArray(data.projects).map(toManagedProject);
    },

    async listOrganizationMembers(organizationId) {
      const data = await invokeAdminProjectCycles(client, {
        action: "list_organization_members",
        payload: { organizationId }
      });

      return readArray(data.members).map(toOrganizationMember);
    },

    async createProjectCycle(draft) {
      const data = await invokeAdminProjectCycles(client, {
        action: "create_project_cycle",
        payload: draft
      });

      return toManagedProject(data.project);
    },

    async updateProjectDates(draft) {
      const data = await invokeAdminProjectCycles(client, {
        action: "update_project_dates",
        payload: draft
      });

      return toManagedProject(data.project);
    }
  };
}

function getDefaultProjectCycleService(): ProjectCycleService {
  if (!cachedProjectCycleService) {
    cachedProjectCycleService = createSupabaseProjectCycleService();
  }

  return cachedProjectCycleService;
}

async function invokeAdminProjectCycles(
  client: SupabaseClient<Database>,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new ProjectCycleServiceError("PROJECT_CYCLE_SESSION_REQUIRED", {
      message: sessionError?.message
    });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const errorCode = toServiceErrorCode(action);
  const { data, error } = await client.functions.invoke("admin-project-cycles", {
    body,
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`
    }
  });

  if (error) {
    throw new ProjectCycleServiceError(errorCode, {
      message: error.message
    });
  }

  return isRecord(data) ? data : {};
}

function toManagedProject(value: unknown): ManagedProject {
  const record = isRecord(value) ? value : {};

  return {
    code: readNullableString(record.code),
    completesOn: readNullableString(record.completesOn),
    cycles: readArray(record.cycles).map(toManagedEvaluationCycle),
    id: readString(record.id),
    members: readArray(record.members).map(toManagedProjectMember),
    name: readString(record.name),
    organizationId: readString(record.organizationId),
    projectManagerUserId: readNullableString(record.projectManagerUserId),
    startsOn: readNullableString(record.startsOn),
    status: readString(record.status)
  };
}

function toManagedProjectMember(value: unknown): ManagedProjectMember {
  const record = isRecord(value) ? value : {};

  return {
    displayName: readNullableString(record.displayName),
    email: readNullableString(record.email),
    endsAt: readNullableString(record.endsAt),
    id: readString(record.id),
    membershipKind: toProjectMembershipKind(record.membershipKind),
    startsAt: readString(record.startsAt),
    userId: readString(record.userId)
  };
}

function toOrganizationMember(value: unknown): OrganizationMember {
  const record = isRecord(value) ? value : {};

  return {
    displayName: readNullableString(record.displayName),
    email: readString(record.email),
    onboardingStatus: readString(record.onboardingStatus),
    userId: readString(record.userId)
  };
}

function toServiceErrorCode(action: string): ProjectCycleServiceErrorCode {
  if (action === "create_project_cycle") {
    return "PROJECT_CYCLE_CREATE_FAILED";
  }

  if (action === "add_project_member") {
    return "PROJECT_MEMBER_ADD_FAILED";
  }

  if (action === "generate_project_assignments") {
    return "PROJECT_ASSIGNMENT_GENERATE_FAILED";
  }

  if (action === "update_project_dates") {
    return "PROJECT_DATE_UPDATE_FAILED";
  }

  if (action === "list_organization_members") {
    return "PROJECT_MEMBER_LIST_FAILED";
  }

  return "PROJECT_CYCLE_LIST_FAILED";
}

function toProjectMembershipKind(value: unknown): ProjectMembershipKind {
  return value === "PROJECT_MANAGER"
      || value === "SPONSOR"
      || value === "OBSERVER"
    ? value
    : "MEMBER";
}

function toManagedEvaluationCycle(value: unknown): ManagedEvaluationCycle {
  const record = isRecord(value) ? value : {};

  return {
    anonymityThreshold:
      typeof record.anonymityThreshold === "number"
        ? record.anonymityThreshold
        : 0,
    closesAt: readString(record.closesAt),
    id: readString(record.id),
    name: readString(record.name),
    opensAt: readString(record.opensAt),
    projectCompletedOn: readNullableString(record.projectCompletedOn),
    status: readString(record.status),
    assignmentSummary: toEvaluationAssignmentSummary(record.assignmentSummary)
  };
}

function toGenerateProjectAssignmentsResult(
  value: unknown
): GenerateProjectAssignmentsResult {
  const record = isRecord(value) ? value : {};

  return {
    assignmentSummary: toEvaluationAssignmentSummary(record.assignmentSummary),
    candidateCount: readNumber(record.candidateCount),
    createdCount: readNumber(record.createdCount),
    evaluationCycleId: readString(record.evaluationCycleId),
    participantCount: readNumber(record.participantCount),
    projectId: readString(record.projectId),
    skippedDuplicateCount: readNumber(record.skippedDuplicateCount)
  };
}

function toEvaluationAssignmentSummary(
  value: unknown
): EvaluationAssignmentSummary {
  const record = isRecord(value) ? value : {};

  return {
    cancelled: readNumber(record.cancelled),
    completed: readNumber(record.completed),
    pending: readNumber(record.pending),
    total: readNumber(record.total)
  };
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

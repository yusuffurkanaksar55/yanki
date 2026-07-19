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

export type ProjectCycleService = {
  readonly listProjectCycles: () => Promise<readonly ManagedProject[]>;
  readonly createProjectCycle: (
    draft: ProjectCycleDraft
  ) => Promise<ManagedProject>;
};

export type ProjectCycleServiceErrorCode =
  | "PROJECT_CYCLE_SESSION_REQUIRED"
  | "PROJECT_CYCLE_LIST_FAILED"
  | "PROJECT_CYCLE_CREATE_FAILED";

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
  createProjectCycle: (draft) =>
    getDefaultProjectCycleService().createProjectCycle(draft),
  listProjectCycles: () => getDefaultProjectCycleService().listProjectCycles()
};

export function createSupabaseProjectCycleService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): ProjectCycleService {
  return {
    async listProjectCycles() {
      const data = await invokeAdminProjectCycles(client, {
        action: "list_project_cycles"
      });

      return readArray(data.projects).map(toManagedProject);
    },

    async createProjectCycle(draft) {
      const data = await invokeAdminProjectCycles(client, {
        action: "create_project_cycle",
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
  const errorCode =
    action === "create_project_cycle"
      ? "PROJECT_CYCLE_CREATE_FAILED"
      : "PROJECT_CYCLE_LIST_FAILED";
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
    name: readString(record.name),
    organizationId: readString(record.organizationId),
    projectManagerUserId: readNullableString(record.projectManagerUserId),
    startsOn: readNullableString(record.startsOn),
    status: readString(record.status)
  };
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
    status: readString(record.status)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

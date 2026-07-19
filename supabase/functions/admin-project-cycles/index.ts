import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";

type AppRole = {
  readonly role_code: string;
  readonly scope_type: string;
  readonly scope_id: string | null;
};

type CreateProjectCycleRequest = {
  readonly organizationId: string;
  readonly projectName: string;
  readonly projectCode?: string | null;
  readonly projectCompletedOn?: string | null;
  readonly evaluationName: string;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly projectManagerUserId?: string | null;
};

type ManagedProject = {
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

type ManagedEvaluationCycle = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly projectCompletedOn: string | null;
  readonly anonymityThreshold: number;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
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
        auth: {
          persistSession: false
        },
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
      {
        auth: {
          persistSession: false
        }
      }
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "AUTHENTICATION_REQUIRED" }, 401);
    }

    const hasActiveProfile = await readHasActiveProfile(
      serviceClient,
      userData.user.id
    );

    if (!hasActiveProfile) {
      return jsonResponse({ error: "ACTIVE_PROFILE_REQUIRED" }, 403);
    }

    const roles = await readActiveRoles(serviceClient, userData.user.id);
    const body = await readJsonBody(request);

    if (body.action === "list_project_cycles") {
      return jsonResponse({
        projects: await listProjectCycles(serviceClient, roles)
      });
    }

    if (body.action === "create_project_cycle") {
      const input = parseCreateProjectCycleRequest(body.payload);

      if (!canManageOrganization(roles, input.organizationId)) {
        return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
      }

      const project = await createProjectCycle(
        serviceClient,
        userData.user.id,
        input
      );

      return jsonResponse({ project }, 201);
    }

    return jsonResponse({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const message = error instanceof RequestValidationError
      ? error.message
      : "ADMIN_PROJECT_CYCLE_FAILED";

    return jsonResponse(
      { error: message },
      error instanceof RequestValidationError ? 400 : 500
    );
  }
});

async function readHasActiveProfile(
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

async function readActiveRoles(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<AppRole[]> {
  const { data, error } = await serviceClient
    .from("user_role_assignments")
    .select("role_code,scope_type,scope_id")
    .eq("user_id", userId)
    .lte("starts_at", new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listProjectCycles(
  serviceClient: ReturnType<typeof createClient>,
  roles: readonly AppRole[]
): Promise<ManagedProject[]> {
  const platformAdmin = roles.some(
    (role) =>
      role.role_code === "SYSTEM_ADMIN" && role.scope_type === "PLATFORM"
  );
  const organizationIds = roles
    .filter((role) =>
      ["SYSTEM_ADMIN", "C_LEVEL_REVIEWER", "BOARD_REVIEWER"].includes(
        role.role_code
      )
      && role.scope_type === "ORGANIZATION"
      && role.scope_id
    )
    .map((role) => role.scope_id as string);
  const projectIds = roles
    .filter((role) =>
      role.role_code === "PROJECT_MANAGER"
      && role.scope_type === "PROJECT"
      && role.scope_id
    )
    .map((role) => role.scope_id as string);

  if (
    !platformAdmin
    && organizationIds.length === 0
    && projectIds.length === 0
  ) {
    return [];
  }

  let query = serviceClient
    .from("projects")
    .select(
      "id,organization_id,name,code,status,starts_on,completes_on,project_manager_user_id,evaluation_cycles(id,name,status,opens_at,closes_at,project_completed_on,anonymity_threshold)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (!platformAdmin) {
    const filters = [
      ...organizationIds.map((id) => `organization_id.eq.${id}`),
      ...projectIds.map((id) => `id.eq.${id}`)
    ];
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toManagedProject);
}

async function createProjectCycle(
  serviceClient: ReturnType<typeof createClient>,
  actorUserId: string,
  input: CreateProjectCycleRequest
): Promise<ManagedProject> {
  const { data: project, error: projectError } = await serviceClient
    .from("projects")
    .insert({
      code: input.projectCode,
      completes_on: input.projectCompletedOn,
      created_by_user_id: actorUserId,
      name: input.projectName,
      organization_id: input.organizationId,
      project_manager_user_id: input.projectManagerUserId,
      status: "ACTIVE"
    })
    .select(
      "id,organization_id,name,code,status,starts_on,completes_on,project_manager_user_id"
    )
    .single();

  if (projectError) {
    throw projectError;
  }

  if (input.projectManagerUserId) {
    await assignProjectManager(
      serviceClient,
      project.id,
      input.projectManagerUserId
    );
  }

  const { data: cycle, error: cycleError } = await serviceClient
    .from("evaluation_cycles")
    .insert({
      anonymity_threshold: 4,
      closes_at: input.closesAt,
      created_by_user_id: actorUserId,
      cycle_type: "PROJECT_COMPLETION",
      name: input.evaluationName,
      opens_at: input.opensAt,
      organization_id: input.organizationId,
      project_completed_on: input.projectCompletedOn,
      project_id: project.id,
      status: "OPEN"
    })
    .select(
      "id,name,status,opens_at,closes_at,project_completed_on,anonymity_threshold"
    )
    .single();

  if (cycleError) {
    throw cycleError;
  }

  return toManagedProject({
    ...project,
    evaluation_cycles: [cycle]
  });
}

async function assignProjectManager(
  serviceClient: ReturnType<typeof createClient>,
  projectId: string,
  projectManagerUserId: string
) {
  const { data: existingRole, error: readRoleError } = await serviceClient
    .from("user_role_assignments")
    .select("id")
    .eq("user_id", projectManagerUserId)
    .eq("role_code", "PROJECT_MANAGER")
    .eq("scope_type", "PROJECT")
    .eq("scope_id", projectId)
    .is("ends_at", null)
    .maybeSingle();

  if (readRoleError) {
    throw readRoleError;
  }

  const { error: roleError } = existingRole
    ? await serviceClient
        .from("user_role_assignments")
        .update({
          role_code: "PROJECT_MANAGER",
          scope_id: projectId,
          scope_type: "PROJECT",
          user_id: projectManagerUserId
        })
        .eq("id", existingRole.id)
    : await serviceClient.from("user_role_assignments").insert({
        role_code: "PROJECT_MANAGER",
        scope_id: projectId,
        scope_type: "PROJECT",
        user_id: projectManagerUserId
      });

  if (roleError) {
    throw roleError;
  }

  const { error: membershipError } = await serviceClient
    .from("project_memberships")
    .insert({
      membership_kind: "PROJECT_MANAGER",
      project_id: projectId,
      user_id: projectManagerUserId
    });

  if (membershipError && membershipError.code !== "23505") {
    throw membershipError;
  }
}

function canManageOrganization(
  roles: readonly AppRole[],
  organizationId: string
): boolean {
  return roles.some((role) =>
    role.role_code === "SYSTEM_ADMIN"
    && (
      role.scope_type === "PLATFORM"
      || (role.scope_type === "ORGANIZATION" && role.scope_id === organizationId)
    )
  );
}

function parseCreateProjectCycleRequest(
  value: unknown
): CreateProjectCycleRequest {
  if (!isRecord(value)) {
    throw new RequestValidationError("REQUEST_PAYLOAD_INVALID");
  }

  const organizationId = readRequiredString(
    value.organizationId,
    "ORGANIZATION_ID_REQUIRED"
  );
  const projectName = readRequiredString(
    value.projectName,
    "PROJECT_NAME_REQUIRED"
  );
  const evaluationName = readRequiredString(
    value.evaluationName,
    "EVALUATION_NAME_REQUIRED"
  );
  const opensAt = readRequiredDateTime(value.opensAt, "OPENS_AT_REQUIRED");
  const closesAt = readRequiredDateTime(value.closesAt, "CLOSES_AT_REQUIRED");
  const projectCompletedOn = readOptionalDate(value.projectCompletedOn);

  if (new Date(closesAt).getTime() <= new Date(opensAt).getTime()) {
    throw new RequestValidationError("CLOSES_AT_MUST_BE_AFTER_OPENS_AT");
  }

  return {
    closesAt,
    evaluationName,
    opensAt,
    organizationId,
    projectCode: readOptionalString(value.projectCode),
    projectCompletedOn,
    projectManagerUserId: readOptionalUuid(value.projectManagerUserId),
    projectName
  };
}

function toManagedProject(record: Record<string, unknown>): ManagedProject {
  return {
    code: readOptionalString(record.code),
    completesOn: readOptionalString(record.completes_on),
    cycles: readArray(record.evaluation_cycles).map(toManagedCycle),
    id: readRequiredString(record.id, "PROJECT_ID_MISSING"),
    name: readRequiredString(record.name, "PROJECT_NAME_MISSING"),
    organizationId: readRequiredString(
      record.organization_id,
      "ORGANIZATION_ID_MISSING"
    ),
    projectManagerUserId: readOptionalString(record.project_manager_user_id),
    startsOn: readOptionalString(record.starts_on),
    status: readRequiredString(record.status, "PROJECT_STATUS_MISSING")
  };
}

function toManagedCycle(record: unknown): ManagedEvaluationCycle {
  const value = isRecord(record) ? record : {};

  return {
    anonymityThreshold: readNumber(value.anonymity_threshold),
    closesAt: readRequiredString(value.closes_at, "CYCLE_CLOSE_MISSING"),
    id: readRequiredString(value.id, "CYCLE_ID_MISSING"),
    name: readRequiredString(value.name, "CYCLE_NAME_MISSING"),
    opensAt: readRequiredString(value.opens_at, "CYCLE_OPEN_MISSING"),
    projectCompletedOn: readOptionalString(value.project_completed_on),
    status: readRequiredString(value.status, "CYCLE_STATUS_MISSING")
  };
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);

  if (!isRecord(body)) {
    throw new RequestValidationError("REQUEST_BODY_INVALID");
  }

  return body;
}

function readEnvironment() {
  return {
    serviceRoleKey: readEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAnonKey: readEnvironmentValue("SUPABASE_ANON_KEY"),
    supabaseUrl: readEnvironmentValue("SUPABASE_URL")
  };
}

function readEnvironmentValue(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    },
    status
  });
}

function readRequiredString(value: unknown, errorCode: string): string {
  const text = readOptionalString(value);

  if (!text) {
    throw new RequestValidationError(errorCode);
  }

  return text;
}

function readRequiredDateTime(value: unknown, errorCode: string): string {
  const text = readRequiredString(value, errorCode);
  const timestamp = new Date(text).getTime();

  if (Number.isNaN(timestamp)) {
    throw new RequestValidationError(errorCode);
  }

  return new Date(timestamp).toISOString();
}

function readOptionalDate(value: unknown): string | null {
  const text = readOptionalString(value);

  if (!text) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new RequestValidationError("PROJECT_COMPLETED_ON_INVALID");
  }

  return text;
}

function readOptionalUuid(value: unknown): string | null {
  const text = readOptionalString(value);

  if (!text) {
    return null;
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text
    )
  ) {
    throw new RequestValidationError("USER_ID_INVALID");
  }

  return text;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class RequestValidationError extends Error {}

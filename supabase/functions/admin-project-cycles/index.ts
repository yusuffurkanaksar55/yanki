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

type ListOrganizationMembersRequest = {
  readonly organizationId: string;
};

type AddProjectMemberRequest = {
  readonly projectId: string;
  readonly userId: string;
  readonly membershipKind: ProjectMembershipKind;
};

type GenerateProjectAssignmentsRequest = {
  readonly evaluationCycleId: string;
};

type EvaluationAssignmentKind =
  | "PROJECT_PEER"
  | "PROJECT_MANAGER_REVIEW"
  | "PROJECT_MEMBER_REVIEW"
  | "CUSTOM";

type EvaluationAssignmentSummary = {
  readonly total: number;
  readonly pending: number;
  readonly completed: number;
  readonly cancelled: number;
};

type GenerateProjectAssignmentsResult = {
  readonly evaluationCycleId: string;
  readonly projectId: string;
  readonly participantCount: number;
  readonly candidateCount: number;
  readonly createdCount: number;
  readonly skippedDuplicateCount: number;
  readonly assignmentSummary: EvaluationAssignmentSummary;
};

type ProjectMembershipKind =
  | "MEMBER"
  | "PROJECT_MANAGER"
  | "SPONSOR"
  | "OBSERVER";

type OrganizationMember = {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly onboardingStatus: string;
};

type ProjectParticipant = {
  readonly userId: string;
  readonly membershipKind: "MEMBER" | "PROJECT_MANAGER";
};

type ManagedProjectMember = {
  readonly id: string;
  readonly userId: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly membershipKind: ProjectMembershipKind;
  readonly startsAt: string;
  readonly endsAt: string | null;
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
  readonly members: readonly ManagedProjectMember[];
};

type ManagedEvaluationCycle = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly projectCompletedOn: string | null;
  readonly anonymityThreshold: number;
  readonly assignmentSummary: EvaluationAssignmentSummary;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
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

    if (body.action === "list_organization_members") {
      const input = parseListOrganizationMembersRequest(body.payload);

      if (!canManageOrganization(roles, input.organizationId)) {
        return jsonResponse({ error: "ADMINISTRATION_SCOPE_DENIED" }, 403);
      }

      return jsonResponse({
        members: await listOrganizationMembers(
          serviceClient,
          input.organizationId
        )
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

    if (body.action === "add_project_member") {
      const input = parseAddProjectMemberRequest(body.payload);
      const project = await addProjectMember(
        serviceClient,
        roles,
        userData.user.id,
        input
      );

      return jsonResponse({ project }, 201);
    }

    if (body.action === "generate_project_assignments") {
      const input = parseGenerateProjectAssignmentsRequest(body.payload);
      const result = await generateProjectAssignments(
        serviceClient,
        roles,
        userData.user.id,
        input
      );

      return jsonResponse({ result }, 201);
    }

    return jsonResponse({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const message = error instanceof RequestValidationError
      || error instanceof AuthorizationError
      ? error.message
      : "ADMIN_PROJECT_CYCLE_FAILED";

    return jsonResponse(
      { error: message },
      error instanceof AuthorizationError
        ? 403
        : error instanceof RequestValidationError
          ? 400
          : 500
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

  return await attachCycleAssignmentSummaries(
    serviceClient,
    await attachProjectMembers(
      serviceClient,
      (data ?? []).map(toManagedProject)
    )
  );
}

async function listOrganizationMembers(
  serviceClient: ReturnType<typeof createClient>,
  organizationId: string
): Promise<OrganizationMember[]> {
  const now = new Date().toISOString();
  const { data: memberships, error: membershipsError } = await serviceClient
    .from("organization_unit_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  if (membershipsError) {
    throw membershipsError;
  }

  const userIds = uniqueStrings(
    (memberships ?? []).map((membership) => membership.user_id)
  );

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await serviceClient
    .from("user_profiles")
    .select("user_id,email,display_name,onboarding_status")
    .in("user_id", userIds)
    .eq("onboarding_status", "ACTIVE")
    .order("email", { ascending: true });

  if (profilesError) {
    throw profilesError;
  }

  return (profiles ?? []).map((profile) => ({
    displayName: profile.display_name,
    email: profile.email,
    onboardingStatus: profile.onboarding_status,
    userId: profile.user_id
  }));
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

  const projectWithCycle = toManagedProject({
    ...project,
    evaluation_cycles: [cycle]
  });
  const [managedProject] = await attachProjectMembers(serviceClient, [
    projectWithCycle
  ]);

  if (!managedProject) {
    throw new Error("Created project could not be read.");
  }

  return managedProject;
}

async function addProjectMember(
  serviceClient: ReturnType<typeof createClient>,
  roles: readonly AppRole[],
  actorUserId: string,
  input: AddProjectMemberRequest
): Promise<ManagedProject> {
  const project = await readProjectRecord(serviceClient, input.projectId);

  if (!canManageOrganization(roles, project.organization_id)) {
    throw new AuthorizationError("ADMINISTRATION_SCOPE_DENIED");
  }

  await requireActiveOrganizationMember(
    serviceClient,
    project.organization_id,
    input.userId
  );

  if (input.membershipKind === "PROJECT_MANAGER") {
    await assignProjectManager(serviceClient, input.projectId, input.userId);
  } else {
    await insertProjectMembership(
      serviceClient,
      input.projectId,
      input.userId,
      input.membershipKind
    );
  }

  await writeAuditEvent(serviceClient, {
    actorUserId,
    eventScopeId: input.projectId,
    eventScopeType: "PROJECT",
    eventType: "PROJECT_MEMBER_ADDED",
    safeMetadata: {}
  });

  return await readManagedProject(serviceClient, input.projectId);
}

async function generateProjectAssignments(
  serviceClient: ReturnType<typeof createClient>,
  roles: readonly AppRole[],
  actorUserId: string,
  input: GenerateProjectAssignmentsRequest
): Promise<GenerateProjectAssignmentsResult> {
  const cycle = await readEvaluationCycleRecord(
    serviceClient,
    input.evaluationCycleId
  );

  if (!cycle.project_id) {
    throw new RequestValidationError("PROJECT_CYCLE_PROJECT_REQUIRED");
  }

  if (!["DRAFT", "OPEN"].includes(cycle.status)) {
    throw new RequestValidationError("PROJECT_CYCLE_NOT_ASSIGNABLE");
  }

  if (!canManageOrganization(roles, cycle.organization_id)) {
    throw new AuthorizationError("ADMINISTRATION_SCOPE_DENIED");
  }

  const participants = await readProjectParticipants(
    serviceClient,
    cycle.project_id
  );
  const candidates = createProjectAssignmentCandidates({
    actorUserId,
    cycle,
    participants
  });
  const existingKeys = await readExistingAssignmentKeys(
    serviceClient,
    cycle.id
  );
  const newAssignments = candidates.filter(
    (candidate) => !existingKeys.has(toAssignmentKey(candidate))
  );

  if (newAssignments.length > 0) {
    const { error } = await serviceClient
      .from("evaluation_assignments")
      .insert(newAssignments);

    if (error) {
      throw error;
    }
  }

  const assignmentSummary = await readAssignmentSummary(
    serviceClient,
    cycle.id
  );

  await writeAuditEvent(serviceClient, {
    actorUserId,
    eventScopeId: cycle.id,
    eventScopeType: "EVALUATION_CYCLE",
    eventType: "EVALUATION_ASSIGNMENTS_GENERATED",
    safeMetadata: {
      candidate_count: candidates.length,
      created_count: newAssignments.length,
      participant_count: participants.length,
      skipped_duplicate_count: candidates.length - newAssignments.length
    }
  });

  return {
    assignmentSummary,
    candidateCount: candidates.length,
    createdCount: newAssignments.length,
    evaluationCycleId: cycle.id,
    participantCount: participants.length,
    projectId: cycle.project_id,
    skippedDuplicateCount: candidates.length - newAssignments.length
  };
}

async function readProjectRecord(
  serviceClient: ReturnType<typeof createClient>,
  projectId: string
): Promise<{ id: string; organization_id: string }> {
  const { data, error } = await serviceClient
    .from("projects")
    .select("id,organization_id")
    .eq("id", projectId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function readEvaluationCycleRecord(
  serviceClient: ReturnType<typeof createClient>,
  evaluationCycleId: string
): Promise<{
  id: string;
  organization_id: string;
  project_id: string | null;
  status: string;
}> {
  const { data, error } = await serviceClient
    .from("evaluation_cycles")
    .select("id,organization_id,project_id,status")
    .eq("id", evaluationCycleId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function readProjectParticipants(
  serviceClient: ReturnType<typeof createClient>,
  projectId: string
): Promise<ProjectParticipant[]> {
  const { data: memberships, error: membershipsError } = await serviceClient
    .from("project_memberships")
    .select("user_id,membership_kind")
    .eq("project_id", projectId)
    .in("membership_kind", ["MEMBER", "PROJECT_MANAGER"])
    .is("ends_at", null);

  if (membershipsError) {
    throw membershipsError;
  }

  const activeUserIds = await readActiveProfileIds(
    serviceClient,
    uniqueStrings((memberships ?? []).map((membership) => membership.user_id))
  );
  const participantsByUserId = new Map<string, ProjectParticipant>();

  for (const membership of memberships ?? []) {
    if (!activeUserIds.has(membership.user_id)) {
      continue;
    }

    const membershipKind =
      membership.membership_kind === "PROJECT_MANAGER"
        ? "PROJECT_MANAGER"
        : "MEMBER";
    const existingParticipant = participantsByUserId.get(membership.user_id);

    participantsByUserId.set(membership.user_id, {
      membershipKind:
        existingParticipant?.membershipKind === "PROJECT_MANAGER"
          || membershipKind === "PROJECT_MANAGER"
          ? "PROJECT_MANAGER"
          : "MEMBER",
      userId: membership.user_id
    });
  }

  return Array.from(participantsByUserId.values());
}

async function readActiveProfileIds(
  serviceClient: ReturnType<typeof createClient>,
  userIds: readonly string[]
): Promise<Set<string>> {
  if (userIds.length === 0) {
    return new Set();
  }

  const { data, error } = await serviceClient
    .from("user_profiles")
    .select("user_id")
    .in("user_id", userIds)
    .eq("onboarding_status", "ACTIVE");

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((profile) => profile.user_id));
}

function createProjectAssignmentCandidates({
  actorUserId,
  cycle,
  participants
}: {
  readonly actorUserId: string;
  readonly cycle: {
    readonly id: string;
    readonly organization_id: string;
    readonly project_id: string | null;
  };
  readonly participants: readonly ProjectParticipant[];
}): Array<Record<string, string>> {
  if (!cycle.project_id) {
    return [];
  }

  const assignments: Array<Record<string, string>> = [];

  for (const evaluator of participants) {
    for (const subject of participants) {
      if (evaluator.userId === subject.userId) {
        continue;
      }

      assignments.push({
        assignment_kind: toProjectAssignmentKind(evaluator, subject),
        created_by_user_id: actorUserId,
        evaluation_cycle_id: cycle.id,
        evaluator_user_id: evaluator.userId,
        organization_id: cycle.organization_id,
        project_id: cycle.project_id,
        status: "PENDING",
        subject_user_id: subject.userId
      });
    }
  }

  return assignments;
}

function toProjectAssignmentKind(
  evaluator: ProjectParticipant,
  subject: ProjectParticipant
): EvaluationAssignmentKind {
  if (subject.membershipKind === "PROJECT_MANAGER") {
    return "PROJECT_MANAGER_REVIEW";
  }

  if (evaluator.membershipKind === "PROJECT_MANAGER") {
    return "PROJECT_MEMBER_REVIEW";
  }

  return "PROJECT_PEER";
}

async function readExistingAssignmentKeys(
  serviceClient: ReturnType<typeof createClient>,
  evaluationCycleId: string
): Promise<Set<string>> {
  const { data, error } = await serviceClient
    .from("evaluation_assignments")
    .select("evaluator_user_id,subject_user_id,assignment_kind")
    .eq("evaluation_cycle_id", evaluationCycleId)
    .neq("status", "CANCELLED");

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map(toAssignmentKey));
}

function toAssignmentKey(record: Record<string, unknown>): string {
  return [
    readOptionalString(record.evaluator_user_id) ?? "",
    readOptionalString(record.subject_user_id) ?? "",
    readOptionalString(record.assignment_kind) ?? ""
  ].join(":");
}

async function readAssignmentSummary(
  serviceClient: ReturnType<typeof createClient>,
  evaluationCycleId: string
): Promise<EvaluationAssignmentSummary> {
  const { data, error } = await serviceClient
    .from("evaluation_assignments")
    .select("status")
    .eq("evaluation_cycle_id", evaluationCycleId);

  if (error) {
    throw error;
  }

  return summarizeAssignments(data ?? []);
}

function summarizeAssignments(
  records: readonly Record<string, unknown>[]
): EvaluationAssignmentSummary {
  let cancelled = 0;
  let completed = 0;
  let pending = 0;

  for (const record of records) {
    const status = readOptionalString(record.status);

    if (status === "PENDING") {
      pending += 1;
    } else if (status === "COMPLETED") {
      completed += 1;
    } else if (status === "CANCELLED") {
      cancelled += 1;
    }
  }

  return {
    cancelled,
    completed,
    pending,
    total: pending + completed + cancelled
  };
}

function createEmptyAssignmentSummary(): EvaluationAssignmentSummary {
  return {
    cancelled: 0,
    completed: 0,
    pending: 0,
    total: 0
  };
}

async function requireActiveOrganizationMember(
  serviceClient: ReturnType<typeof createClient>,
  organizationId: string,
  userId: string
) {
  const now = new Date().toISOString();
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
    throw new RequestValidationError("PROJECT_MEMBER_ACTIVE_PROFILE_REQUIRED");
  }

  const { data: membership, error: membershipError } = await serviceClient
    .from("organization_unit_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    throw new RequestValidationError("PROJECT_MEMBER_ORGANIZATION_REQUIRED");
  }
}

async function insertProjectMembership(
  serviceClient: ReturnType<typeof createClient>,
  projectId: string,
  userId: string,
  membershipKind: ProjectMembershipKind
) {
  const { error } = await serviceClient
    .from("project_memberships")
    .insert({
      membership_kind: membershipKind,
      project_id: projectId,
      user_id: userId
    });

  if (error && error.code !== "23505") {
    throw error;
  }
}

async function writeAuditEvent(
  serviceClient: ReturnType<typeof createClient>,
  {
    actorUserId,
    eventScopeId,
    eventScopeType,
    eventType,
    safeMetadata
  }: {
    readonly actorUserId: string;
    readonly eventScopeId: string;
    readonly eventScopeType: "PROJECT" | "EVALUATION_CYCLE";
    readonly eventType: string;
    readonly safeMetadata: Record<string, number | string | boolean | null>;
  }
) {
  const { error } = await serviceClient.from("audit_events").insert({
    actor_user_id: actorUserId,
    event_scope_id: eventScopeId,
    event_scope_type: eventScopeType,
    event_type: eventType,
    safe_metadata: safeMetadata
  });

  if (error) {
    throw error;
  }
}

async function assignProjectManager(
  serviceClient: ReturnType<typeof createClient>,
  projectId: string,
  projectManagerUserId: string
) {
  const { error: projectError } = await serviceClient
    .from("projects")
    .update({
      project_manager_user_id: projectManagerUserId
    })
    .eq("id", projectId);

  if (projectError) {
    throw projectError;
  }

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

  await insertProjectMembership(
    serviceClient,
    projectId,
    projectManagerUserId,
    "PROJECT_MANAGER"
  );
}

async function readManagedProject(
  serviceClient: ReturnType<typeof createClient>,
  projectId: string
): Promise<ManagedProject> {
  const { data, error } = await serviceClient
    .from("projects")
    .select(
      "id,organization_id,name,code,status,starts_on,completes_on,project_manager_user_id,evaluation_cycles(id,name,status,opens_at,closes_at,project_completed_on,anonymity_threshold)"
    )
    .eq("id", projectId)
    .single();

  if (error) {
    throw error;
  }

  const [project] = await attachCycleAssignmentSummaries(
    serviceClient,
    await attachProjectMembers(serviceClient, [toManagedProject(data)])
  );

  if (!project) {
    throw new Error("Project could not be read.");
  }

  return project;
}

async function attachProjectMembers(
  serviceClient: ReturnType<typeof createClient>,
  projects: readonly ManagedProject[]
): Promise<ManagedProject[]> {
  const projectIds = projects.map((project) => project.id);

  if (projectIds.length === 0) {
    return [];
  }

  const { data: memberships, error: membershipsError } = await serviceClient
    .from("project_memberships")
    .select("id,project_id,user_id,membership_kind,starts_at,ends_at")
    .in("project_id", projectIds)
    .is("ends_at", null)
    .order("created_at", { ascending: true });

  if (membershipsError) {
    throw membershipsError;
  }

  const userIds = uniqueStrings(
    (memberships ?? []).map((membership) => membership.user_id)
  );
  const profilesByUserId = await readProfilesByUserId(serviceClient, userIds);
  const membershipsByProjectId = new Map<string, ManagedProjectMember[]>();

  for (const membership of memberships ?? []) {
    const profile = profilesByUserId.get(membership.user_id);
    const projectMembers =
      membershipsByProjectId.get(membership.project_id) ?? [];

    projectMembers.push({
      displayName: profile?.display_name ?? null,
      email: profile?.email ?? null,
      endsAt: membership.ends_at,
      id: membership.id,
      membershipKind: toProjectMembershipKind(membership.membership_kind),
      startsAt: membership.starts_at,
      userId: membership.user_id
    });
    membershipsByProjectId.set(membership.project_id, projectMembers);
  }

  return projects.map((project) => ({
    ...project,
    members: membershipsByProjectId.get(project.id) ?? []
  }));
}

async function attachCycleAssignmentSummaries(
  serviceClient: ReturnType<typeof createClient>,
  projects: readonly ManagedProject[]
): Promise<ManagedProject[]> {
  const cycleIds = projects.flatMap((project) =>
    project.cycles.map((cycle) => cycle.id)
  );

  if (cycleIds.length === 0) {
    return [...projects];
  }

  const { data, error } = await serviceClient
    .from("evaluation_assignments")
    .select("evaluation_cycle_id,status")
    .in("evaluation_cycle_id", cycleIds);

  if (error) {
    throw error;
  }

  const recordsByCycleId = new Map<string, Record<string, unknown>[]>();

  for (const record of data ?? []) {
    const cycleRecords = recordsByCycleId.get(record.evaluation_cycle_id) ?? [];
    cycleRecords.push(record);
    recordsByCycleId.set(record.evaluation_cycle_id, cycleRecords);
  }

  return projects.map((project) => ({
    ...project,
    cycles: project.cycles.map((cycle) => ({
      ...cycle,
      assignmentSummary: summarizeAssignments(
        recordsByCycleId.get(cycle.id) ?? []
      )
    }))
  }));
}

async function readProfilesByUserId(
  serviceClient: ReturnType<typeof createClient>,
  userIds: readonly string[]
): Promise<Map<string, { email: string; display_name: string | null }>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await serviceClient
    .from("user_profiles")
    .select("user_id,email,display_name")
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((profile) => [
      profile.user_id,
      {
        display_name: profile.display_name,
        email: profile.email
      }
    ])
  );
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

function parseListOrganizationMembersRequest(
  value: unknown
): ListOrganizationMembersRequest {
  if (!isRecord(value)) {
    throw new RequestValidationError("REQUEST_PAYLOAD_INVALID");
  }

  return {
    organizationId: readRequiredUuid(
      value.organizationId,
      "ORGANIZATION_ID_REQUIRED"
    )
  };
}

function parseAddProjectMemberRequest(value: unknown): AddProjectMemberRequest {
  if (!isRecord(value)) {
    throw new RequestValidationError("REQUEST_PAYLOAD_INVALID");
  }

  return {
    membershipKind: readProjectMembershipKind(value.membershipKind),
    projectId: readRequiredUuid(value.projectId, "PROJECT_ID_REQUIRED"),
    userId: readRequiredUuid(value.userId, "USER_ID_REQUIRED")
  };
}

function parseGenerateProjectAssignmentsRequest(
  value: unknown
): GenerateProjectAssignmentsRequest {
  if (!isRecord(value)) {
    throw new RequestValidationError("REQUEST_PAYLOAD_INVALID");
  }

  return {
    evaluationCycleId: readRequiredUuid(
      value.evaluationCycleId,
      "EVALUATION_CYCLE_ID_REQUIRED"
    )
  };
}

function toManagedProject(record: Record<string, unknown>): ManagedProject {
  return {
    code: readOptionalString(record.code),
    completesOn: readOptionalString(record.completes_on),
    cycles: readArray(record.evaluation_cycles).map(toManagedCycle),
    id: readRequiredString(record.id, "PROJECT_ID_MISSING"),
    members: [],
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
    status: readRequiredString(value.status, "CYCLE_STATUS_MISSING"),
    assignmentSummary: createEmptyAssignmentSummary()
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

function readRequiredUuid(value: unknown, errorCode: string): string {
  const uuid = readOptionalUuid(value);

  if (!uuid) {
    throw new RequestValidationError(errorCode);
  }

  return uuid;
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

function readProjectMembershipKind(value: unknown): ProjectMembershipKind {
  const text = readOptionalString(value) ?? "MEMBER";

  if (
    text === "MEMBER"
    || text === "PROJECT_MANAGER"
    || text === "SPONSOR"
    || text === "OBSERVER"
  ) {
    return text;
  }

  throw new RequestValidationError("PROJECT_MEMBERSHIP_KIND_INVALID");
}

function toProjectMembershipKind(value: unknown): ProjectMembershipKind {
  return value === "PROJECT_MANAGER"
      || value === "SPONSOR"
      || value === "OBSERVER"
    ? value
    : "MEMBER";
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

function uniqueStrings(values: readonly unknown[]): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string"))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class RequestValidationError extends Error {}

class AuthorizationError extends Error {}

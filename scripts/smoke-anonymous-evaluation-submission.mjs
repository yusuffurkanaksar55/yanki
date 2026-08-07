const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
);
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const adminEmail = readRequiredEnvironment(
  "SUBMISSION_ADMIN_EMAIL",
  "TEMPLATE_ADMIN_EMAIL"
);
const adminPassword = readRequiredEnvironment(
  "SUBMISSION_ADMIN_PASSWORD",
  "TEMPLATE_ADMIN_PASSWORD"
);
const employeeEmail = readRequiredEnvironment(
  "SUBMISSION_EMPLOYEE_EMAIL",
  "ASSIGNMENT_EMPLOYEE_EMAIL"
);
const employeePassword = readRequiredEnvironment(
  "SUBMISSION_EMPLOYEE_PASSWORD",
  "ASSIGNMENT_EMPLOYEE_PASSWORD"
);

const adminAccessToken = await signIn(adminEmail, adminPassword);
const employeeAccessToken = await signIn(employeeEmail, employeePassword);
let assignments = await listAssignments(employeeAccessToken);
let assignment = assignments.find((candidate) =>
  isRecord(candidate)
  && candidate.availability_status === "AVAILABLE"
  && typeof candidate.id === "string"
);
let syntheticFixtureCreated = false;

if (!assignment) {
  const evaluationCycleId = await createSyntheticAssignment({
    adminAccessToken,
    employeeEmail
  });

  assignments = await listAssignments(employeeAccessToken);
  assignment = assignments.find((candidate) =>
    isRecord(candidate)
    && candidate.evaluation_cycle_id === evaluationCycleId
    && candidate.availability_status === "AVAILABLE"
    && typeof candidate.id === "string"
  );
  syntheticFixtureCreated = true;
}

if (!assignment || typeof assignment.id !== "string") {
  throw new Error("No available employee assignment could be prepared.");
}

const prepared = await callFunction(
  "evaluation-submission-credentials",
  { assignmentId: assignment.id },
  employeeAccessToken
);

if (
  typeof prepared.credential !== "string"
  || !isRecord(prepared.submission)
  || !Array.isArray(prepared.submission.questions)
) {
  throw new Error("The prepared anonymous submission is invalid.");
}

const answers = prepared.submission.questions.map(createSyntheticAnswer);
const submissionRequest = {
  answers,
  credential: prepared.credential
};
const accepted = await invokeAnonymousSubmission(submissionRequest);

if (accepted.response.status !== 201 || accepted.body.accepted !== true) {
  throw new Error(
    `Anonymous submission failed: ${accepted.response.status} ${readError(accepted.body)}`
  );
}

const replay = await invokeAnonymousSubmission(submissionRequest);

if (
  replay.response.status !== 409
  || replay.body.error !== "ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED"
) {
  throw new Error("The one-time anonymous credential was not replay-safe.");
}

const oversized = await invokeAnonymousSubmission({
  answers: [{ questionId: crypto.randomUUID(), value: "x".repeat(270000) }],
  credential: "invalid"
});

if (
  oversized.response.status !== 413
  || oversized.body.error !== "REQUEST_PAYLOAD_TOO_LARGE"
) {
  throw new Error(
    `The anonymous request body limit was not enforced: ${oversized.response.status} ${readError(oversized.body)}`
  );
}

for (let requestNumber = 3; requestNumber <= 12; requestNumber += 1) {
  const repeatedReplay = await invokeAnonymousSubmission(submissionRequest);

  if (
    repeatedReplay.response.status !== 409
    || repeatedReplay.body.error !== "ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED"
  ) {
    throw new Error(
      `Credential replay ${requestNumber} did not preserve the safe conflict response.`
    );
  }
}

const rateLimited = await invokeAnonymousSubmission(submissionRequest);

if (
  rateLimited.response.status !== 429
  || rateLimited.body.error !== "ANONYMOUS_RATE_LIMIT_EXCEEDED"
  || !rateLimited.response.headers.get("retry-after")
) {
  throw new Error("The isolated anonymous credential quota was not enforced.");
}

const monitoring = await callFunction(
  "security-abuse-monitoring",
  {},
  adminAccessToken
);
const abuseSummary = readRecord(monitoring.summary);

if (
  typeof abuseSummary.invalidCredentialAttemptsLast60Minutes !== "number"
  || abuseSummary.invalidCredentialAttemptsLast60Minutes < 12
  || typeof abuseSummary.rateLimitedRequestsLast60Minutes !== "number"
  || abuseSummary.rateLimitedRequestsLast60Minutes < 1
) {
  throw new Error("The aggregate abuse monitoring summary is incomplete.");
}

const deniedMonitoring = await invokeAuthenticatedFunction(
  "security-abuse-monitoring",
  {},
  employeeAccessToken
);

if (deniedMonitoring.response.status !== 403) {
  throw new Error("A non-admin could read anonymous abuse counters.");
}

assignments = await listAssignments(employeeAccessToken);
const completedAssignment = assignments.find((candidate) =>
  isRecord(candidate) && candidate.id === assignment.id
);

if (
  !isRecord(completedAssignment)
  || completedAssignment.assignment_status !== "COMPLETED"
  || completedAssignment.availability_status !== "COMPLETED"
) {
  throw new Error("The submitted assignment was not completed atomically.");
}

console.log(JSON.stringify({
  answerCount: answers.length,
  anonymousBodyLimitEnforced: true,
  anonymousCredentialQuotaEnforced: true,
  assignmentCompleted: true,
  identifierFreeMonitoringAvailable: true,
  encryptedSubmissionAccepted: true,
  nonAdminMonitoringDenied: true,
  oneTimeCredentialReplayDenied: true,
  syntheticFixtureCreated
}, null, 2));

async function createSyntheticAssignment({ adminAccessToken, employeeEmail }) {
  const workspace = await callRpc(
    adminAccessToken,
    "get_my_workspace_context",
    {}
  );
  const memberships = Array.isArray(workspace.memberships)
    ? workspace.memberships
    : [];
  const organizationId = memberships.find((membership) =>
    isRecord(membership)
    && membership.is_primary === true
    && typeof membership.organization_id === "string"
  )?.organization_id
    ?? memberships.find((membership) =>
      isRecord(membership) && typeof membership.organization_id === "string"
    )?.organization_id;

  if (typeof organizationId !== "string") {
    throw new Error("The smoke-test admin has no organization membership.");
  }

  const templateResponse = await callFunction(
    "evaluation-templates",
    { action: "list_templates" },
    adminAccessToken
  );
  const templates = Array.isArray(templateResponse.templates)
    ? templateResponse.templates
    : [];
  const publishedVersion = templates
    .flatMap((template) =>
      isRecord(template) && Array.isArray(template.versions)
        ? template.versions
        : []
    )
    .find((version) =>
      isRecord(version)
      && version.status === "PUBLISHED"
      && typeof version.id === "string"
    );

  if (!isRecord(publishedVersion) || typeof publishedVersion.id !== "string") {
    throw new Error("A published evaluation template is required.");
  }

  const memberResponse = await callFunction(
    "admin-project-cycles",
    {
      action: "list_organization_members",
      payload: { organizationId }
    },
    adminAccessToken
  );
  const members = Array.isArray(memberResponse.members)
    ? memberResponse.members
    : [];
  const employee = members.find((member) =>
    isRecord(member)
    && typeof member.email === "string"
    && member.email.toLowerCase() === employeeEmail.toLowerCase()
    && typeof member.userId === "string"
  );
  const subject = members.find((member) =>
    isRecord(member)
    && typeof member.userId === "string"
    && (!isRecord(employee) || member.userId !== employee.userId)
  );

  if (
    !isRecord(employee)
    || typeof employee.userId !== "string"
    || !isRecord(subject)
    || typeof subject.userId !== "string"
  ) {
    throw new Error("Two active organization members are required.");
  }

  const now = new Date();
  const closesAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const uniqueSuffix = `${now.toISOString().replace(/\D/g, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
  const createResponse = await callFunction(
    "admin-project-cycles",
    {
      action: "create_project_cycle",
      payload: {
        closesAt: closesAt.toISOString(),
        evaluationName: `Anonymous submission smoke ${uniqueSuffix}`,
        opensAt: new Date(now.getTime() - 60 * 1000).toISOString(),
        organizationId,
        projectCode: `SUB-${uniqueSuffix}`,
        projectCompletedOn: now.toISOString().slice(0, 10),
        projectManagerUserId: subject.userId,
        projectName: `Anonymous submission smoke ${uniqueSuffix}`,
        templateVersionId: publishedVersion.id
      }
    },
    adminAccessToken
  );
  const project = readRecord(createResponse.project);
  const cycle = Array.isArray(project.cycles) ? project.cycles[0] : null;

  if (
    typeof project.id !== "string"
    || !isRecord(cycle)
    || typeof cycle.id !== "string"
  ) {
    throw new Error("The synthetic project cycle was not created.");
  }

  await callFunction(
    "admin-project-cycles",
    {
      action: "add_project_member",
      payload: {
        membershipKind: "MEMBER",
        projectId: project.id,
        userId: employee.userId
      }
    },
    adminAccessToken
  );
  await callFunction(
    "admin-project-cycles",
    {
      action: "generate_project_assignments",
      payload: { evaluationCycleId: cycle.id }
    },
    adminAccessToken
  );

  return cycle.id;
}

function createSyntheticAnswer(question) {
  if (!isRecord(question) || typeof question.id !== "string") {
    throw new Error("A prepared question is invalid.");
  }

  const type = question.questionType;
  let value;

  if (type === "RATING_1_TO_5") {
    value = 4;
  } else if (type === "RATING_1_TO_10") {
    value = 8;
  } else if (type === "YES_NO") {
    value = true;
  } else if (type === "SINGLE_SELECT") {
    value = readFirstOption(question);
  } else if (type === "MULTI_SELECT" || type === "TAG_SELECTION") {
    value = [readFirstOption(question)];
  } else if (type === "SHORT_TEXT" || type === "LONG_TEXT") {
    value = "Synthetic smoke-test response.";
  } else {
    throw new Error(`Unsupported question type: ${String(type)}`);
  }

  return { questionId: question.id, value };
}

function readFirstOption(question) {
  const option = Array.isArray(question.options) ? question.options[0] : null;

  if (typeof option !== "string") {
    throw new Error("A selectable smoke-test question has no options.");
  }

  return option;
}

async function signIn(email, password) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      body: JSON.stringify({ email, password }),
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );
  const body = await readResponseBody(response);

  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(`Smoke-test authentication failed: ${response.status}`);
  }

  return body.access_token;
}

async function listAssignments(accessToken) {
  const body = await callRpc(
    accessToken,
    "get_my_evaluation_assignments",
    {}
  );

  return Array.isArray(body.assignments) ? body.assignments : [];
}

async function callFunction(functionName, body, accessToken) {
  const result = await invokeAuthenticatedFunction(
    functionName,
    body,
    accessToken
  );
  const { response, responseBody } = result;

  if (!response.ok) {
    throw new Error(
      `${functionName} failed: ${response.status} ${readError(responseBody)}`
    );
  }

  return responseBody;
}

async function invokeAuthenticatedFunction(functionName, body, accessToken) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      body: JSON.stringify(body),
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );
  const responseBody = await readResponseBody(response);

  return { response, responseBody };
}

async function invokeAnonymousSubmission(body) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/anonymous-evaluation-submissions`,
    {
      body: JSON.stringify(body),
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );

  return {
    body: await readResponseBody(response),
    response
  };
}

async function callRpc(accessToken, functionName, body) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${functionName}`,
    {
      body: JSON.stringify(body),
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );
  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(`${functionName} RPC failed: ${response.status}`);
  }

  return responseBody;
}

async function readResponseBody(response) {
  const body = await response.json().catch(() => ({}));

  return isRecord(body) ? body : {};
}

function readError(body) {
  return typeof body.error === "string" ? body.error : "UNKNOWN";
}

function readRequiredEnvironment(name, fallbackName) {
  const value = process.env[name]?.trim()
    || (fallbackName ? process.env[fallbackName]?.trim() : null);

  if (!value) {
    throw new Error(
      `${name}${fallbackName ? ` or ${fallbackName}` : ""} is required.`
    );
  }

  return value;
}

function readRecord(value) {
  return isRecord(value) ? value : {};
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
);
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const adminAccount = readAccount("REPORT_ADMIN");
const reviewerAccount = readAccount("REPORT_REVIEWER");
const subjectAccount = readAccount("REPORT_SUBJECT");
const evaluatorAccounts = [
  reviewerAccount,
  readAccount("REPORT_EMPLOYEE_1"),
  readAccount("REPORT_EMPLOYEE_2"),
  readAccount("REPORT_EMPLOYEE_3")
];

const adminToken = await signIn(adminAccount);
const reviewerToken = await signIn(reviewerAccount);
const subjectToken = await signIn(subjectAccount);
const evaluatorTokens = await Promise.all(evaluatorAccounts.map(signIn));
const workspace = await callRpc(adminToken, "get_my_workspace_context", {});
const organizationId = readOrganizationId(workspace);
const templatesResponse = await callFunction(
  "evaluation-templates",
  { action: "list_templates" },
  adminToken
);
const templateVersionId = readPublishedTemplateVersionId(templatesResponse);
const membersResponse = await callFunction(
  "admin-project-cycles",
  { action: "list_organization_members", payload: { organizationId } },
  adminToken
);
const members = readArray(membersResponse.members);
const subject = findMember(members, subjectAccount.email);
const evaluators = evaluatorAccounts.map((account) =>
  findMember(members, account.email)
);
const now = new Date();
const uniqueSuffix = `${now.toISOString().replace(/\D/gu, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}`;
const created = await callFunction(
  "admin-project-cycles",
  {
    action: "create_project_cycle",
    payload: {
      closesAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      evaluationName: `Threshold reporting smoke ${uniqueSuffix}`,
      opensAt: new Date(now.getTime() - 60 * 1000).toISOString(),
      organizationId,
      projectCode: `RPT-${uniqueSuffix}`,
      projectCompletedOn: now.toISOString().slice(0, 10),
      projectManagerUserId: subject.userId,
      projectName: `Threshold reporting smoke ${uniqueSuffix}`,
      templateVersionId
    }
  },
  adminToken
);
const project = readRecord(created.project);
const cycle = readRecord(readArray(project.cycles)[0]);

if (typeof project.id !== "string" || typeof cycle.id !== "string") {
  throw new Error("The synthetic reporting project was not created.");
}

for (const evaluator of evaluators) {
  await callFunction(
    "admin-project-cycles",
    {
      action: "add_project_member",
      payload: {
        membershipKind: "MEMBER",
        projectId: project.id,
        userId: evaluator.userId
      }
    },
    adminToken
  );
}

await callFunction(
  "admin-project-cycles",
  {
    action: "generate_project_assignments",
    payload: { evaluationCycleId: cycle.id }
  },
  adminToken
);

const prematureReport = await invokeFunction(
  "evaluation-reports",
  {
    action: "get_report",
    payload: {
      evaluationCycleId: cycle.id,
      subjectUserId: subject.userId
    }
  },
  reviewerToken
);

assertFunctionError(
  prematureReport,
  400,
  "REPORT_WINDOW_NOT_CLOSED",
  "A report was available before the evaluation window closed."
);

const rawTextMarkers = [];

for (let index = 0; index < evaluatorTokens.length; index += 1) {
  const token = evaluatorTokens[index];
  const assignmentResponse = await callRpc(
    token,
    "get_my_evaluation_assignments",
    {}
  );
  const assignment = readArray(assignmentResponse.assignments).find((candidate) =>
    isRecord(candidate)
    && candidate.evaluation_cycle_id === cycle.id
    && candidate.subject_email === subjectAccount.email
    && candidate.availability_status === "AVAILABLE"
  );

  if (!isRecord(assignment) || typeof assignment.id !== "string") {
    throw new Error(`Evaluator ${index + 1} has no reporting smoke assignment.`);
  }

  const prepared = await callFunction(
    "evaluation-submission-credentials",
    { assignmentId: assignment.id },
    token
  );
  const submission = readRecord(prepared.submission);
  const marker = `REPORT-SMOKE-RAW-TEXT-${uniqueSuffix}-${index + 1}`;
  const answers = readArray(submission.questions).map((question) =>
    createSyntheticAnswer(question, index + 2, marker)
  );

  rawTextMarkers.push(marker);

  const accepted = await invokeFunction(
    "anonymous-evaluation-submissions",
    { answers, credential: prepared.credential },
    null
  );

  if (accepted.status !== 201 || accepted.body.accepted !== true) {
    throw new Error(`Encrypted evaluator submission ${index + 1} failed.`);
  }
}

await callFunction(
  "admin-project-cycles",
  {
    action: "update_project_dates",
    payload: {
      closesAt: new Date(Date.now() - 1000).toISOString(),
      evaluationCycleId: cycle.id,
      projectCompletedOn: now.toISOString().slice(0, 10),
      projectId: project.id
    }
  },
  adminToken
);

const targets = await callFunction(
  "evaluation-reports",
  { action: "list_targets" },
  reviewerToken
);
const target = readArray(targets.targets).find((candidate) =>
  isRecord(candidate)
  && candidate.evaluationCycleId === cycle.id
  && candidate.subjectUserId === subject.userId
);

if (!isRecord(target)) {
  throw new Error("The authorized closed report target was not listed.");
}

if (
  Object.hasOwn(target, "submissionCount")
  || Object.hasOwn(target, "submissions")
  || Object.hasOwn(target, "questions")
) {
  throw new Error("Report target discovery leaked participation or content data.");
}

const reportResponse = await invokeFunction(
  "evaluation-reports",
  {
    action: "get_report",
    payload: {
      evaluationCycleId: cycle.id,
      subjectUserId: subject.userId
    }
  },
  reviewerToken
);

if (reportResponse.status !== 200) {
  throw new Error(`Available report failed: ${readError(reportResponse.body)}.`);
}

const report = readRecord(reportResponse.body.report);

if (report.status !== "AVAILABLE" || report.submissionCount !== 4) {
  throw new Error("The report did not become available at the threshold of four.");
}

const ratingQuestions = readArray(report.questions).filter((question) =>
  isRecord(question) && readRecord(question.aggregation).kind === "RATING"
);

if (
  ratingQuestions.length === 0
  || ratingQuestions.some((question) =>
    readRecord(readRecord(question).aggregation).average !== 3.5
  )
) {
  throw new Error("The trusted rating aggregate is incorrect.");
}

const serializedReport = JSON.stringify(report);

if (
  rawTextMarkers.some((marker) => serializedReport.includes(marker))
  || serializedReport.includes("ciphertext")
  || serializedReport.includes("encryptedPayload")
) {
  throw new Error("The aggregate report leaked raw text or ciphertext.");
}

const adminDenied = await invokeFunction(
  "evaluation-reports",
  {
    action: "get_report",
    payload: {
      evaluationCycleId: cycle.id,
      subjectUserId: subject.userId
    }
  },
  adminToken
);
assertFunctionError(
  adminDenied,
  403,
  "REPORTING_ACCESS_DENIED",
  "A system administrator could read the report."
);

const selfDenied = await invokeFunction(
  "evaluation-reports",
  {
    action: "get_report",
    payload: {
      evaluationCycleId: cycle.id,
      subjectUserId: subject.userId
    }
  },
  subjectToken
);
assertFunctionError(
  selfDenied,
  403,
  "REPORT_SELF_ACCESS_DENIED",
  "The report subject could read their own report."
);

const employeeDenied = await invokeFunction(
  "evaluation-reports",
  {
    action: "get_report",
    payload: {
      evaluationCycleId: cycle.id,
      subjectUserId: subject.userId
    }
  },
  evaluatorTokens[1]
);
assertFunctionError(
  employeeDenied,
  403,
  "REPORTING_ACCESS_DENIED",
  "An employee could read the report."
);

const anonymousDenied = await invokeFunction(
  "evaluation-reports",
  { action: "list_targets" },
  null
);
assertFunctionError(
  anonymousDenied,
  401,
  "AUTHENTICATION_REQUIRED",
  "Anonymous report access was allowed."
);

console.log(JSON.stringify({
  aggregateSubmissionCount: report.submissionCount,
  anonymousAccessDenied: true,
  employeeAccessDenied: true,
  prematureAccessDenied: true,
  rawTextWithheld: true,
  ratingAverage: 3.5,
  selfAccessDenied: true,
  systemAdminAccessDenied: true
}, null, 2));

function createSyntheticAnswer(questionValue, rating, marker) {
  const question = readRecord(questionValue);
  const questionId = readRequiredString(question.id, "Question ID");
  const type = question.questionType;
  let value;

  if (type === "RATING_1_TO_5" || type === "RATING_1_TO_10") {
    value = rating;
  } else if (type === "YES_NO") {
    value = rating % 2 === 0;
  } else if (type === "SINGLE_SELECT") {
    value = readFirstOption(question);
  } else if (type === "MULTI_SELECT" || type === "TAG_SELECTION") {
    value = [readFirstOption(question)];
  } else if (type === "SHORT_TEXT" || type === "LONG_TEXT") {
    value = marker;
  } else {
    throw new Error(`Unsupported question type: ${String(type)}.`);
  }

  return { questionId, value };
}

function readFirstOption(question) {
  return readRequiredString(readArray(question.options)[0], "Question option");
}

function readOrganizationId(workspace) {
  const memberships = readArray(readRecord(workspace).memberships);
  const primary = memberships.find((membership) =>
    isRecord(membership) && membership.is_primary === true
  );
  const fallback = memberships[0];

  return readRequiredString(
    readRecord(primary ?? fallback).organization_id,
    "Organization ID"
  );
}

function readPublishedTemplateVersionId(response) {
  const version = readArray(readRecord(response).templates)
    .flatMap((template) => readArray(readRecord(template).versions))
    .find((candidate) =>
      isRecord(candidate)
      && candidate.status === "PUBLISHED"
      && typeof candidate.id === "string"
    );

  return readRequiredString(readRecord(version).id, "Published template version ID");
}

function findMember(members, email) {
  const member = members.find((candidate) =>
    isRecord(candidate)
    && typeof candidate.email === "string"
    && candidate.email.toLowerCase() === email.toLowerCase()
  );

  return {
    userId: readRequiredString(readRecord(member).userId, `Member ${email}`)
  };
}

async function signIn(account) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      body: JSON.stringify(account),
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );
  const body = await readResponseBody(response);

  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(`Smoke authentication failed for ${account.email}.`);
  }

  return body.access_token;
}

async function callFunction(functionName, body, accessToken) {
  const result = await invokeFunction(functionName, body, accessToken);

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `${functionName} failed: ${result.status} ${readError(result.body)}`
    );
  }

  return result.body;
}

async function invokeFunction(functionName, body, accessToken) {
  const headers = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    { body: JSON.stringify(body), headers, method: "POST" }
  );

  return { body: await readResponseBody(response), status: response.status };
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
    throw new Error(`${functionName} RPC failed: ${response.status}.`);
  }

  return responseBody;
}

function assertFunctionError(result, status, code, failureMessage) {
  if (result.status !== status || result.body.error !== code) {
    throw new Error(
      `${failureMessage} Received ${result.status} ${readError(result.body)}.`
    );
  }
}

async function readResponseBody(response) {
  const body = await response.json().catch(() => ({}));

  return isRecord(body) ? body : {};
}

function readAccount(prefix) {
  return {
    email: readRequiredEnvironment(`${prefix}_EMAIL`).toLowerCase(),
    password: readRequiredEnvironment(`${prefix}_PASSWORD`)
  };
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

function readRequiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is missing.`);
  }

  return value;
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function readRecord(value) {
  return isRecord(value) ? value : {};
}

function readError(body) {
  return typeof body.error === "string" ? body.error : "UNKNOWN";
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

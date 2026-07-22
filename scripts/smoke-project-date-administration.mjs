const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
);
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const adminEmail = readRequiredEnvironment("HIERARCHY_ADMIN_EMAIL");
const adminPassword = readRequiredEnvironment("HIERARCHY_ADMIN_PASSWORD");
const projectManagerEmail = readRequiredEnvironment("PROJECT_MANAGER_EMAIL");
const projectManagerPassword = readRequiredEnvironment(
  "PROJECT_MANAGER_PASSWORD"
);
const employeeEmail = readRequiredEnvironment("HIERARCHY_EMPLOYEE_EMAIL");
const employeePassword = readRequiredEnvironment("HIERARCHY_EMPLOYEE_PASSWORD");

const adminToken = await signIn(adminEmail, adminPassword);
const projectManagerToken = await signIn(
  projectManagerEmail,
  projectManagerPassword
);
const employeeToken = await signIn(employeeEmail, employeePassword);
const managerProjects = await callFunction(projectManagerToken, {
  action: "list_project_cycles"
});
const project = managerProjects.projects.find((candidate) =>
  candidate.cycles.some((cycle) => ["DRAFT", "OPEN"].includes(cycle.status))
);
const cycle = project?.cycles.find((candidate) =>
  ["DRAFT", "OPEN"].includes(candidate.status)
);

if (!project || !cycle) {
  throw new Error("No editable project cycle was returned for the project manager.");
}

const originalProjectCompletedOn = cycle.projectCompletedOn;
const originalClosesAt = cycle.closesAt;
const smokeClosesAt = new Date(
  new Date(originalClosesAt).getTime() + 60 * 60 * 1000
).toISOString();

const updated = await callFunction(projectManagerToken, {
  action: "update_project_dates",
  payload: {
    closesAt: smokeClosesAt,
    evaluationCycleId: cycle.id,
    projectCompletedOn: originalProjectCompletedOn,
    projectId: project.id
  }
});
const updatedCycle = updated.project.cycles.find(
  (candidate) => candidate.id === cycle.id
);

let smokeFailure;

try {
  if (!isSameInstant(updatedCycle?.closesAt, smokeClosesAt)) {
    throw new Error("The project-manager date update was not returned.");
  }

  await expectFunctionError(
    employeeToken,
    {
      action: "update_project_dates",
      payload: {
        closesAt: smokeClosesAt,
        evaluationCycleId: cycle.id,
        projectCompletedOn: originalProjectCompletedOn,
        projectId: project.id
      }
    },
    "ADMINISTRATION_SCOPE_DENIED",
    403
  );
} catch (error) {
  smokeFailure = error;
}

const restored = await callFunction(adminToken, {
  action: "update_project_dates",
  payload: {
    closesAt: originalClosesAt,
    evaluationCycleId: cycle.id,
    projectCompletedOn: originalProjectCompletedOn,
    projectId: project.id
  }
});
const restoredCycle = restored.project.cycles.find(
  (candidate) => candidate.id === cycle.id
);

if (!isSameInstant(restoredCycle?.closesAt, originalClosesAt)) {
  throw new Error("The system administrator did not restore the original date.");
}

if (smokeFailure) {
  throw smokeFailure;
}

await expectFunctionError(
  null,
  { action: "list_project_cycles" },
  "AUTHENTICATION_REQUIRED",
  401
);

console.log(JSON.stringify({
  adminRestorePassed: true,
  employeeDenied: true,
  projectId: project.id,
  projectManagerUpdatePassed: true,
  unauthenticatedDenied: true
}, null, 2));

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
    throw new Error(`Authentication failed for ${email}: ${response.status}`);
  }

  return body.access_token;
}

async function callFunction(accessToken, body) {
  const result = await invokeFunction(accessToken, body);

  if (!result.response.ok) {
    throw new Error(
      `Function request failed: ${result.response.status} ${result.body.error ?? "UNKNOWN"}`
    );
  }

  return result.body;
}

async function expectFunctionError(
  accessToken,
  body,
  expectedCode,
  expectedStatus
) {
  const result = await invokeFunction(accessToken, body);

  if (
    result.response.status !== expectedStatus
    || result.body.error !== expectedCode
  ) {
    throw new Error(
      `Expected ${expectedStatus} ${expectedCode}, received ${result.response.status} ${result.body.error ?? "UNKNOWN"}.`
    );
  }
}

async function invokeFunction(accessToken, body) {
  const headers = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/admin-project-cycles`,
    {
      body: JSON.stringify(body),
      headers,
      method: "POST"
    }
  );

  return {
    body: await readResponseBody(response),
    response
  };
}

async function readResponseBody(response) {
  const body = await response.json();

  return typeof body === "object" && body !== null ? body : {};
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

function isSameInstant(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  return new Date(left).getTime() === new Date(right).getTime();
}

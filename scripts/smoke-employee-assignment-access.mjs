const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
);
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const employeeEmail = readRequiredEnvironment("ASSIGNMENT_EMPLOYEE_EMAIL");
const employeePassword = readRequiredEnvironment(
  "ASSIGNMENT_EMPLOYEE_PASSWORD"
);

const accessToken = await signIn(employeeEmail, employeePassword);
const authenticatedResult = await invokeAssignmentRpc(accessToken);

if (!authenticatedResult.response.ok) {
  throw new Error(
    `Assignment RPC failed: ${authenticatedResult.response.status}`
  );
}

const assignments = Array.isArray(authenticatedResult.body.assignments)
  ? authenticatedResult.body.assignments
  : [];

if (assignments.length === 0) {
  throw new Error("The smoke-test employee has no visible assignments.");
}

const forbiddenKeys = [
  "evaluator_user_id",
  "score",
  "comment",
  "payload",
  "credential"
];

if (
  assignments.some((assignment) =>
    isRecord(assignment)
    && forbiddenKeys.some((key) => Object.hasOwn(assignment, key))
  )
) {
  throw new Error("The assignment response contains a forbidden field.");
}

const unauthenticatedResult = await invokeAssignmentRpc(null);

if (unauthenticatedResult.response.ok) {
  throw new Error("Anonymous assignment RPC access was unexpectedly allowed.");
}

const availabilityCounts = assignments.reduce((counts, assignment) => {
  const availability = isRecord(assignment)
    && typeof assignment.availability_status === "string"
    ? assignment.availability_status
    : "UNKNOWN";

  counts[availability] = (counts[availability] ?? 0) + 1;

  return counts;
}, {});

console.log(JSON.stringify({
  anonymousAccessDenied: true,
  assignmentCount: assignments.length,
  availabilityCounts,
  forbiddenFieldsAbsent: true
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
    throw new Error(`Employee authentication failed: ${response.status}`);
  }

  return body.access_token;
}

async function invokeAssignmentRpc(accessToken) {
  const headers = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_my_evaluation_assignments`,
    {
      body: "{}",
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
  const body = await response.json().catch(() => ({}));

  return isRecord(body) ? body : {};
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

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

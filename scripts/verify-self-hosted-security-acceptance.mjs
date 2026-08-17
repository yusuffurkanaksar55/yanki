const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
).replace(/\/$/u, "");
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const userEmail = readRequiredEnvironment("SECURITY_ACCEPTANCE_USER_EMAIL");
const userPassword = readRequiredEnvironment(
  "SECURITY_ACCEPTANCE_USER_PASSWORD"
);

const applicationTables = [
  "anonymous_submission_credentials",
  "app_roles",
  "audit_events",
  "encrypted_evaluation_submissions",
  "evaluation_assignments",
  "evaluation_cycles",
  "evaluation_encryption_recovery_canaries",
  "evaluation_template_questions",
  "evaluation_template_versions",
  "evaluation_templates",
  "manager_assignments",
  "organization_evaluation_retention_policies",
  "organization_unit_memberships",
  "organization_units",
  "organizations",
  "project_memberships",
  "projects",
  "scope_types",
  "security_abuse_event_counters",
  "security_rate_limit_buckets",
  "tenant_bootstrap_operations",
  "user_invitations",
  "user_profiles",
  "user_role_assignments"
];

const sensitiveTables = new Set([
  "anonymous_submission_credentials",
  "encrypted_evaluation_submissions",
  "evaluation_encryption_recovery_canaries",
  "organization_evaluation_retention_policies",
  "security_abuse_event_counters",
  "security_rate_limit_buckets",
  "tenant_bootstrap_operations"
]);

assertSelfHostedUrl(supabaseUrl);

const anonymousDeniedTables = await verifyTableDenials(null, applicationTables);
const session = await signIn(userEmail, userPassword);
const authenticatedDeniedTables = await verifyTableDenials(
  session.accessToken,
  applicationTables.filter((tableName) => tableName !== "user_profiles")
);
const profileRows = await readOwnProfile(session.accessToken);

if (
  profileRows.length !== 1
  || profileRows[0]?.user_id !== session.userId
) {
  throw new Error("Authenticated profile access was not limited to the caller.");
}

const workspace = await invokeRpc(
  "get_my_workspace_context",
  {},
  session.accessToken
);
assertOk(workspace, "Workspace context RPC");

const assignments = await invokeRpc(
  "get_my_evaluation_assignments",
  {},
  session.accessToken
);
assertOk(assignments, "Evaluation assignments RPC");

for (const functionName of [
  "get_my_workspace_context",
  "get_my_evaluation_assignments",
  "get_anonymous_submission_abuse_summary_for_operator",
  "rls_auto_enable"
]) {
  const anonymousResult = await invokeRpc(functionName, {}, null);
  assertDenied(anonymousResult, `Anonymous ${functionName} RPC`);
}

const serviceOnlyResult = await invokeRpc(
  "get_anonymous_submission_abuse_summary_for_operator",
  {},
  session.accessToken
);
assertDenied(serviceOnlyResult, "Authenticated service-role-only RPC");

console.log(JSON.stringify({
  anonymousDirectTableDenials: anonymousDeniedTables,
  authenticatedDirectTableDenials: authenticatedDeniedTables,
  authenticatedProfileRows: profileRows.length,
  authenticatedRpcs: [
    "get_my_workspace_context",
    "get_my_evaluation_assignments"
  ],
  loginFlow: "PASS",
  sensitiveDirectTableDenials: [...sensitiveTables].length,
  serviceRoleOnlyRpcDenied: true,
  target: supabaseUrl
}, null, 2));

async function verifyTableDenials(accessToken, tableNames) {
  for (const tableName of tableNames) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`,
      { headers: createHeaders(accessToken) }
    );

    assertDenied(
      { body: await readResponseBody(response), response },
      `${accessToken ? "Authenticated" : "Anonymous"} ${tableName} SELECT`
    );
  }

  return tableNames.length;
}

async function readOwnProfile(accessToken) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?select=user_id`,
    { headers: createHeaders(accessToken) }
  );
  const body = await readResponseBody(response);

  if (!response.ok || !Array.isArray(body)) {
    throw new Error(`Own-profile SELECT failed with ${response.status}.`);
  }

  return body;
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

  if (
    !response.ok
    || !isRecord(body)
    || typeof body.access_token !== "string"
    || !isRecord(body.user)
    || typeof body.user.id !== "string"
  ) {
    throw new Error(`Self-hosted sign-in failed with ${response.status}.`);
  }

  return { accessToken: body.access_token, userId: body.user.id };
}

async function invokeRpc(functionName, body, accessToken) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    body: JSON.stringify(body),
    headers: createHeaders(accessToken),
    method: "POST"
  });

  return { body: await readResponseBody(response), response };
}

function createHeaders(accessToken) {
  const headers = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json"
  };

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return headers;
}

function assertOk(result, label) {
  if (!result.response.ok) {
    throw new Error(`${label} failed with ${result.response.status}.`);
  }
}

function assertDenied(result, label) {
  if (result.response.ok) {
    throw new Error(`${label} was unexpectedly allowed.`);
  }

  if (![401, 403, 404].includes(result.response.status)) {
    throw new Error(`${label} returned ${result.response.status}, not an authorization denial.`);
  }
}

async function readResponseBody(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function assertSelfHostedUrl(value) {
  const url = new URL(value);

  if (
    url.protocol !== "http:"
    || !["localhost", "127.0.0.1"].includes(url.hostname)
    || url.port !== "8080"
  ) {
    throw new Error("Security acceptance must target http://localhost:8080.");
  }
}

function readRequiredEnvironment(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) return value;
  }

  throw new Error(`${names.join(" or ")} is required.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

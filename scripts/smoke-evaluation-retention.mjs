const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
);
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const adminToken = await signIn(
  readRequiredEnvironment("RETENTION_ADMIN_EMAIL", "KEY_HEALTH_ADMIN_EMAIL"),
  readRequiredEnvironment(
    "RETENTION_ADMIN_PASSWORD",
    "KEY_HEALTH_ADMIN_PASSWORD"
  )
);
const employeeToken = await signIn(
  readRequiredEnvironment(
    "RETENTION_EMPLOYEE_EMAIL",
    "KEY_HEALTH_EMPLOYEE_EMAIL"
  ),
  readRequiredEnvironment(
    "RETENTION_EMPLOYEE_PASSWORD",
    "KEY_HEALTH_EMPLOYEE_PASSWORD"
  )
);
const initialData = await callFunction(adminToken, {
  action: "list_retention_policies"
});
const policy = Array.isArray(initialData.policies)
  ? initialData.policies[0]
  : null;

if (!isRecord(policy) || typeof policy.organizationId !== "string") {
  throw new Error("No manageable retention policy was returned.");
}

const updatedPolicy = await callFunction(adminToken, {
  action: "update_retention_policy",
  payload: {
    automaticPurgeEnabled: policy.automaticPurgeEnabled === true,
    legalHold: policy.legalHold === true,
    organizationId: policy.organizationId,
    retentionDays: policy.retentionDays
  }
});

if (
  updatedPolicy.organizationId !== policy.organizationId
  || updatedPolicy.retentionDays !== policy.retentionDays
  || !Number.isInteger(updatedPolicy.policyVersion)
) {
  throw new Error("The retention policy update response is invalid.");
}

await expectFunctionError(
  employeeToken,
  { action: "list_retention_policies" },
  "ADMINISTRATION_SCOPE_DENIED",
  403
);
await expectFunctionError(
  null,
  { action: "list_retention_policies" },
  null,
  401
);

const serializedData = JSON.stringify({ initialData, updatedPolicy });

if (/submission|encryptedPayload|content|subjectUserId/iu.test(serializedData)) {
  throw new Error("Retention administration exposed evaluation-domain data.");
}

console.log(JSON.stringify({
  nonAdminDenied: true,
  organizationId: policy.organizationId,
  policyVersion: updatedPolicy.policyVersion,
  retentionDays: updatedPolicy.retentionDays,
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

  if (!result.response.ok || !isRecord(result.body.data)) {
    throw new Error(
      `Function request failed: ${result.response.status} `
        + `${result.body.error ?? "UNKNOWN"}`
    );
  }

  return result.body.data;
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
    || (expectedCode && result.body.error !== expectedCode)
  ) {
    throw new Error(
      `Expected ${expectedStatus} ${expectedCode ?? "gateway denial"}, received `
        + `${result.response.status} ${result.body.error ?? "UNKNOWN"}.`
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
    `${supabaseUrl}/functions/v1/evaluation-retention-administration`,
    {
      body: JSON.stringify(body),
      headers,
      method: "POST"
    }
  );

  return { body: await readResponseBody(response), response };
}

async function readResponseBody(response) {
  const body = await response.json();

  return isRecord(body) ? body : {};
}

function readRequiredEnvironment(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  throw new Error(`${names.join(" or ")} is required.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

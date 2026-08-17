import { createClient } from "@supabase/supabase-js";

const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
).replace(/\/$/u, "");
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const serviceRoleKey = readRequiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const adminAccount = readAccount("EDGE_ADMIN");
const reviewerAccount = readAccount("EDGE_REVIEWER");
const employeeAccount = readAccount("EDGE_EMPLOYEE");

assertSelfHostedUrl(supabaseUrl);

const adminToken = await signIn(adminAccount);
const reviewerToken = await signIn(reviewerAccount);
const employeeToken = await signIn(employeeAccount);
const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const successfulFunctions = [];
const syntheticPlatformEmail =
  `codex-platform-${crypto.randomUUID()}@example.com`;
const syntheticPlatformPassword =
  `Yanki-${crypto.randomUUID()}-Aa1!`;
let syntheticPlatformUserId = null;
let encryptionHealth;

try {
  await expectFunctionSuccess(
    "organization-administration",
    { action: "list_hierarchy_administration" },
    adminToken
  );
  successfulFunctions.push("organization-administration");

  await expectFunctionSuccess(
    "user-onboarding",
    { action: "list_user_administration" },
    adminToken
  );
  successfulFunctions.push("user-onboarding");

  await expectFunctionSuccess(
    "admin-project-cycles",
    { action: "list_project_cycles" },
    adminToken
  );
  successfulFunctions.push("admin-project-cycles");

  await expectFunctionSuccess(
    "evaluation-templates",
    { action: "list_templates" },
    adminToken
  );
  successfulFunctions.push("evaluation-templates");

  await expectFunctionSuccess(
    "evaluation-retention-administration",
    { action: "list_retention_policies" },
    adminToken
  );
  successfulFunctions.push("evaluation-retention-administration");

  await expectFunctionSuccess(
    "evaluation-reports",
    { action: "list_targets" },
    reviewerToken
  );
  successfulFunctions.push("evaluation-reports");

  await expectFunctionDenied(
    "organization-administration",
    { action: "list_hierarchy_administration" },
    employeeToken,
    403
  );

  syntheticPlatformUserId = await createPlatformAdministrator(
    serviceClient,
    syntheticPlatformEmail,
    syntheticPlatformPassword
  );
  const platformToken = await signIn({
    email: syntheticPlatformEmail,
    password: syntheticPlatformPassword
  });

  await expectFunctionSuccess(
    "platform-tenant-administration",
    { action: "list_tenants" },
    platformToken
  );
  successfulFunctions.push("platform-tenant-administration");

  await expectFunctionSuccess(
    "security-abuse-monitoring",
    {},
    platformToken
  );
  successfulFunctions.push("security-abuse-monitoring");

  const healthResponse = await expectFunctionSuccess(
    "encryption-key-health",
    {},
    platformToken
  );
  encryptionHealth = readRecord(readRecord(healthResponse).health);

  if (
    encryptionHealth.activeKeyConfigured !== true
    || encryptionHealth.configurationValid !== true
    || encryptionHealth.allReferencedKeysConfigured !== false
    || encryptionHealth.configuredKeyCount !== 1
    || encryptionHealth.referencedKeyCount !== 2
    || encryptionHealth.status !== "UNHEALTHY"
  ) {
    throw new Error("Encryption health did not reflect the active and legacy key state.");
  }
  successfulFunctions.push("encryption-key-health");

  const helloResponse = await invokeFunction("hello", {}, platformToken);

  if (helloResponse.response.ok) {
    throw new Error("The repository-external hello function is still exposed.");
  }
} finally {
  if (syntheticPlatformUserId) {
    await deleteSyntheticPlatformAdministrator(
      serviceClient,
      syntheticPlatformUserId
    );
  }
}

const { data: residualUsers, error: residualUserError } =
  await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

if (residualUserError) throw residualUserError;

if (
  residualUsers.users.some((user) =>
    user.email?.toLowerCase() === syntheticPlatformEmail.toLowerCase()
  )
) {
  throw new Error("The synthetic platform administrator was not removed.");
}

console.log(JSON.stringify({
  employeeAdministrationDenied: true,
  encryptionHealth,
  helloExampleRemoved: true,
  successfulFunctions,
  syntheticPlatformFixtureCleaned: true,
  target: supabaseUrl
}, null, 2));

async function createPlatformAdministrator(client, email, password) {
  const { data: authData, error: authError } =
    await client.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { display_name: "Codex Platform Acceptance" }
    });

  if (authError || !authData.user) {
    throw authError ?? new Error("Synthetic Auth user was not created.");
  }

  const userId = authData.user.id;
  try {
    const { error: profileError } = await client.from("user_profiles").insert({
      activated_at: new Date().toISOString(),
      display_name: "Codex Platform Acceptance",
      email,
      onboarding_status: "ACTIVE",
      user_id: userId
    });

    if (profileError) throw profileError;

    const { error: roleError } = await client
      .from("user_role_assignments")
      .insert({
        role_code: "SYSTEM_ADMIN",
        scope_id: null,
        scope_type: "PLATFORM",
        user_id: userId
      });

    if (roleError) throw roleError;
  } catch (error) {
    await client.from("user_profiles").delete().eq("user_id", userId);
    await client.auth.admin.deleteUser(userId);
    throw error;
  }

  return userId;
}

async function deleteSyntheticPlatformAdministrator(client, userId) {
  const cleanupSteps = [
    client.from("user_role_assignments").delete().eq("user_id", userId),
    client.from("user_profiles").delete().eq("user_id", userId)
  ];

  for (const step of cleanupSteps) {
    const { error } = await step;

    if (error) throw error;
  }

  const { error: authError } = await client.auth.admin.deleteUser(userId);

  if (authError) throw authError;
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

  if (!response.ok || !isRecord(body) || typeof body.access_token !== "string") {
    throw new Error(`Edge smoke authentication failed with ${response.status}.`);
  }

  return body.access_token;
}

async function expectFunctionSuccess(functionName, body, accessToken) {
  const result = await invokeFunction(functionName, body, accessToken);

  if (!result.response.ok) {
    throw new Error(
      `${functionName} failed with ${result.response.status}: ${readError(result.body)}`
    );
  }

  return result.body;
}

async function expectFunctionDenied(
  functionName,
  body,
  accessToken,
  expectedStatus
) {
  const result = await invokeFunction(functionName, body, accessToken);

  if (result.response.status !== expectedStatus) {
    throw new Error(
      `${functionName} denial returned ${result.response.status}, expected ${expectedStatus}.`
    );
  }
}

async function invokeFunction(functionName, body, accessToken) {
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

  return { body: await readResponseBody(response), response };
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

function readAccount(prefix) {
  return {
    email: readRequiredEnvironment(`${prefix}_EMAIL`),
    password: readRequiredEnvironment(`${prefix}_PASSWORD`)
  };
}

function readError(body) {
  if (isRecord(body) && typeof body.error === "string") return body.error;
  if (typeof body === "string") return body.slice(0, 160);
  return "UNKNOWN";
}

function readRecord(value) {
  return isRecord(value) ? value : {};
}

function assertSelfHostedUrl(value) {
  const url = new URL(value);

  if (
    url.protocol !== "http:"
    || !["localhost", "127.0.0.1"].includes(url.hostname)
    || url.port !== "8080"
  ) {
    throw new Error("Edge acceptance must target http://localhost:8080.");
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

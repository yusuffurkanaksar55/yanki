const supabaseUrl = readRequiredEnvironment("SUPABASE_URL");
const supabaseAnonKey = readRequiredEnvironment("SUPABASE_ANON_KEY");
const adminEmail = readRequiredEnvironment("HIERARCHY_ADMIN_EMAIL");
const adminPassword = readRequiredEnvironment("HIERARCHY_ADMIN_PASSWORD");
const employeeEmail = readRequiredEnvironment("HIERARCHY_EMPLOYEE_EMAIL");
const employeePassword = readRequiredEnvironment("HIERARCHY_EMPLOYEE_PASSWORD");

const adminToken = await signIn(adminEmail, adminPassword);
const initialData = await callFunction(
  adminToken,
  { action: "list_hierarchy_administration" }
);
const organization = initialData.organizations[0];

if (!organization) {
  throw new Error("No manageable organization was returned.");
}

const employee = initialData.members.find((member) =>
  member.organizationId === organization.id
  && member.email.toLowerCase() === employeeEmail.toLowerCase()
);

if (!employee) {
  throw new Error("The smoke-test employee is not an active organization member.");
}

const manager = initialData.members.find((member) =>
  member.organizationId === organization.id
  && member.userId === employee.managerUserId
);

if (!manager) {
  throw new Error("The smoke-test employee must have a direct manager.");
}

const slug = `codex-hierarchy-smoke-${Date.now()}`;
let currentData = await callFunction(adminToken, {
  action: "save_organization_unit",
  payload: {
    name: "Codex Hierarchy Smoke",
    organizationId: organization.id,
    parentUnitId: null,
    slug,
    status: "ACTIVE",
    unitId: null,
    unitType: "CUSTOM"
  }
});
const smokeUnit = currentData.units.find((unit) => unit.slug === slug);

if (!smokeUnit) {
  throw new Error("The temporary hierarchy unit was not returned.");
}

await callFunction(adminToken, {
  action: "set_user_hierarchy_context",
  payload: {
    managerUserId: employee.managerUserId,
    membershipKind: employee.membershipKind,
    organizationId: organization.id,
    primaryUnitId: employee.primaryUnitId,
    userId: employee.userId
  }
});

await expectFunctionError(
  adminToken,
  {
    action: "set_user_hierarchy_context",
    payload: {
      managerUserId: employee.userId,
      membershipKind: manager.membershipKind,
      organizationId: organization.id,
      primaryUnitId: manager.primaryUnitId,
      userId: manager.userId
    }
  },
  "MANAGER_ASSIGNMENT_CYCLE",
  400
);

currentData = await callFunction(adminToken, {
  action: "assign_user_role",
  payload: {
    organizationId: organization.id,
    roleCode: "BOARD_REVIEWER",
    unitId: null,
    userId: employee.userId
  }
});
const temporaryRole = currentData.members
  .find((member) => member.userId === employee.userId)
  ?.roles.find((role) => role.roleCode === "BOARD_REVIEWER");

if (!temporaryRole) {
  throw new Error("The temporary role assignment was not returned.");
}

await callFunction(adminToken, {
  action: "end_user_role",
  payload: {
    organizationId: organization.id,
    roleAssignmentId: temporaryRole.id
  }
});

await callFunction(adminToken, {
  action: "save_organization_unit",
  payload: {
    name: smokeUnit.name,
    organizationId: organization.id,
    parentUnitId: smokeUnit.parentUnitId,
    slug: smokeUnit.slug,
    status: "ARCHIVED",
    unitId: smokeUnit.id,
    unitType: smokeUnit.unitType
  }
});

const employeeToken = await signIn(employeeEmail, employeePassword);
await expectFunctionError(
  employeeToken,
  { action: "list_hierarchy_administration" },
  "ADMINISTRATION_SCOPE_DENIED",
  403
);
await expectFunctionError(
  null,
  { action: "list_hierarchy_administration" },
  "AUTHENTICATION_REQUIRED",
  401
);

console.log(JSON.stringify({
  archivedTemporaryUnit: true,
  organizationCount: initialData.organizations.length,
  organizationId: organization.id,
  organizationMemberCount: initialData.members.filter((member) =>
    member.organizationId === organization.id
  ).length,
  roleAssignmentEnded: true,
  unauthorizedEmployeeDenied: true,
  unauthenticatedDenied: true,
  managerCycleDenied: true
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
  const response = await invokeFunction(accessToken, body);

  if (!response.response.ok) {
    throw new Error(
      `Function request failed: ${response.response.status} ${response.body.error ?? "UNKNOWN"}`
    );
  }

  return response.body.data;
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
    `${supabaseUrl}/functions/v1/organization-administration`,
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

function readRequiredEnvironment(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

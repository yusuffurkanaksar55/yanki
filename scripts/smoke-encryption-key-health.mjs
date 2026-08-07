const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
);
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const adminToken = await signIn(
  readRequiredEnvironment("KEY_HEALTH_ADMIN_EMAIL"),
  readRequiredEnvironment("KEY_HEALTH_ADMIN_PASSWORD")
);
const employeeToken = await signIn(
  readRequiredEnvironment("KEY_HEALTH_EMPLOYEE_EMAIL"),
  readRequiredEnvironment("KEY_HEALTH_EMPLOYEE_PASSWORD")
);

const adminResponse = await invokeHealth(adminToken);

if (!adminResponse.response.ok) {
  throw new Error(
    `The system administrator health check failed: ${adminResponse.response.status} ${JSON.stringify(adminResponse.body)}`
  );
}

const health = readRecord(readRecord(adminResponse.body).health);

if (
  health.status !== "HEALTHY"
  || health.activeKeyConfigured !== true
  || health.allReferencedKeysConfigured !== true
  || health.configurationValid !== true
  || !Number.isInteger(health.configuredKeyCount)
  || !Number.isInteger(health.referencedKeyCount)
) {
  throw new Error("The encryption key health response is not healthy.");
}

const employeeResponse = await invokeHealth(employeeToken);

if (
  employeeResponse.response.status !== 403
  || readRecord(employeeResponse.body).error !== "SYSTEM_ADMIN_REQUIRED"
) {
  throw new Error("A non-admin account accessed encryption key health.");
}

console.log(JSON.stringify({
  activeKeyConfigured: true,
  allReferencedKeysConfigured: true,
  configuredKeyCount: health.configuredKeyCount,
  nonAdminDenied: true,
  referencedKeyCount: health.referencedKeyCount,
  status: health.status
}, null, 2));

async function signIn(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    body: JSON.stringify({ email, password }),
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const body = await response.json();

  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(`Sign-in failed for ${email}.`);
  }

  return body.access_token;
}

async function invokeHealth(accessToken) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/encryption-key-health`,
    {
      body: "{}",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );

  return { body: await response.json(), response };
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

function readRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value;
}

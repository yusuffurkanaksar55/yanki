const publicOrigin = readHttpsOrigin(
  "AWS_DEVELOPMENT_PUBLIC_ORIGIN",
  process.env.AWS_DEVELOPMENT_PUBLIC_ORIGIN
);
const anonKey = readRequiredValue(
  "SUPABASE_ANON_KEY",
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
);
const directOrigin = process.env.AWS_DEVELOPMENT_DIRECT_ORIGIN
  ? readLoopbackOrigin(
      "AWS_DEVELOPMENT_DIRECT_ORIGIN",
      process.env.AWS_DEVELOPMENT_DIRECT_ORIGIN
    )
  : null;

const healthResponse = await request(`${publicOrigin}/healthz`);
assertStatus(healthResponse, 200, "Public health endpoint");
assertEqual((await healthResponse.text()).trim(), "ok", "Health body");

const rootResponse = await request(`${publicOrigin}/`);
assertStatus(rootResponse, 200, "Public application");
const rootHtml = await rootResponse.text();
assertIncludes(rootHtml, '<div id="root"></div>', "Application shell");
assertHeader(rootResponse, "strict-transport-security", /max-age=31536000/u);
assertHeader(rootResponse, "x-frame-options", /^DENY$/u);
assertHeader(rootResponse, "x-content-type-options", /^nosniff$/u);
assertHeader(rootResponse, "content-security-policy", /default-src 'self'/u);
assertHeader(rootResponse, "content-security-policy", /frame-ancestors 'none'/u);

const configResponse = await request(`${publicOrigin}/app-config.js`);
assertStatus(configResponse, 200, "Runtime browser configuration");
assertHeader(configResponse, "cache-control", /no-store/u);
const browserConfiguration = await configResponse.text();
assertIncludes(
  browserConfiguration,
  `${publicOrigin}/supabase`,
  "Same-origin Supabase URL"
);
assertIncludes(browserConfiguration, anonKey, "Public anon key");
assertExcludes(
  browserConfiguration,
  [
    "DATABASE_URL",
    "ENCRYPTION_KEY",
    "POSTGRES_PASSWORD",
    "SERVICE_ROLE",
    "YANKI_SENSITIVE_GATEWAY_TOKEN"
  ],
  "Browser configuration"
);

const authHealthResponse = await request(
  `${publicOrigin}/supabase/auth/v1/health`,
  { headers: publicHeaders() }
);
assertStatus(authHealthResponse, 200, "Same-origin Auth health");

const gatewayForwardedResponse = await request(
  `${publicOrigin}/supabase/functions/v1/anonymous-evaluation-submissions`,
  {
    body: "{}",
    headers: publicHeaders({ "content-type": "application/json" }),
    method: "POST"
  }
);
assertStatus(gatewayForwardedResponse, 400, "Gateway-forwarded sensitive request");
const gatewayForwardedBody = await gatewayForwardedResponse.text();
assertNotIncludes(
  gatewayForwardedBody,
  "SENSITIVE_GATEWAY_REQUIRED",
  "Gateway-forwarded response"
);

const oversizedResponse = await request(
  `${publicOrigin}/supabase/functions/v1/anonymous-evaluation-submissions`,
  {
    body: JSON.stringify({ value: "x".repeat(300 * 1024) }),
    headers: publicHeaders({ "content-type": "application/json" }),
    method: "POST"
  }
);
assertStatus(oversizedResponse, 413, "Outer anonymous body limit");

let directSensitiveDenied = null;

if (directOrigin) {
  const directResponse = await request(
    `${directOrigin}/functions/v1/anonymous-evaluation-submissions`,
    {
      body: "{}",
      headers: publicHeaders({ "content-type": "application/json" }),
      method: "POST"
    }
  );
  assertStatus(directResponse, 403, "Direct sensitive Function access");
  assertIncludes(
    await directResponse.text(),
    "SENSITIVE_GATEWAY_REQUIRED",
    "Direct sensitive Function denial"
  );
  directSensitiveDenied = true;
}

console.log(JSON.stringify({
  authHealth: true,
  browserConfigurationPublicOnly: true,
  contentSecurityPolicy: true,
  directSensitiveDenied,
  gatewayForwarding: true,
  hsts: true,
  oversizedRequestDenied: true,
  publicOrigin,
  status: "accepted"
}, null, 2));

function publicHeaders(additionalHeaders = {}) {
  return {
    apikey: anonKey,
    ...additionalHeaders
  };
}

async function request(url, init = {}) {
  return fetch(url, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000)
  });
}

function assertStatus(response, expected, label) {
  assertEqual(response.status, expected, `${label} status`);
}

function assertHeader(response, name, expectation) {
  const value = response.headers.get(name) ?? "";

  if (!expectation.test(value)) {
    throw new Error(`${name} header failed acceptance.`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, received ${actual}.`);
  }
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label} did not contain the required value.`);
  }
}

function assertNotIncludes(value, expected, label) {
  if (value.includes(expected)) {
    throw new Error(`${label} contained a forbidden value.`);
  }
}

function assertExcludes(value, forbiddenValues, label) {
  for (const forbidden of forbiddenValues) {
    assertNotIncludes(value, forbidden, label);
  }
}

function readHttpsOrigin(name, value) {
  const origin = readOrigin(name, value);

  if (origin.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }

  return origin.origin;
}

function readLoopbackOrigin(name, value) {
  const origin = readOrigin(name, value);

  if (!["127.0.0.1", "localhost", "::1"].includes(origin.hostname)) {
    throw new Error(`${name} must be loopback-only.`);
  }

  return origin.origin;
}

function readOrigin(name, value) {
  const requiredValue = readRequiredValue(name, value);
  let parsed;

  try {
    parsed = new URL(requiredValue);
  } catch {
    throw new Error(`${name} must be a valid URL origin.`);
  }

  if (
    parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
  ) {
    throw new Error(`${name} must contain only a URL origin.`);
  }

  if (parsed.hostname.endsWith(".supabase.co")) {
    throw new Error(`${name} must not target Supabase Cloud.`);
  }

  return parsed;
}

function readRequiredValue(name, value) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} is required.`);
  }

  return normalized;
}

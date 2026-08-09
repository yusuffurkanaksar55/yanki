const expectedConfirmation = "RUN_DUE_EVALUATION_RETENTION";
const confirmation = process.env.EVALUATION_RETENTION_EXECUTION_CONFIRM;

if (confirmation !== expectedConfirmation) {
  fail(
    `Set EVALUATION_RETENTION_EXECUTION_CONFIRM=${expectedConfirmation} `
      + "in the trusted operator environment before running retention."
  );
}

const supabaseUrl = readEnvironmentValue(
  "SUPABASE_URL",
  process.env.VITE_SUPABASE_URL
).replace(/\/+$/u, "");
const serviceRoleKey = readEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY");
const response = await fetch(
  `${supabaseUrl}/rest/v1/rpc/execute_due_evaluation_content_retention`,
  {
    body: "{}",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  }
);
const responseBody = await readResponseBody(response);

if (!response.ok) {
  fail(
    `Retention execution failed with HTTP ${response.status}: ${responseBody}`
  );
}

const result = parseResult(responseBody);

console.log(
  `Evaluation retention completed on ${result.executedOn}; `
    + `${result.organizationsProcessed} organization policies processed.`
);
console.log(
  "No submission counts or evaluation content were returned by the operator boundary."
);

function readEnvironmentValue(name, fallback) {
  const value = process.env[name] ?? fallback;

  if (!value || value.trim().length === 0) {
    fail(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

async function readResponseBody(response) {
  const text = await response.text();

  return text.length > 0 ? text : "{}";
}

function parseResult(responseBody) {
  let value;

  try {
    value = JSON.parse(responseBody);
  } catch {
    fail("Retention execution returned invalid JSON.");
  }

  if (
    !value
    || value.executed !== true
    || typeof value.executedOn !== "string"
    || !Number.isInteger(value.organizationsProcessed)
    || value.organizationsProcessed < 0
  ) {
    fail("Retention execution returned an invalid result shape.");
  }

  return value;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

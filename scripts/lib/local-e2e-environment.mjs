import { randomBytes } from "node:crypto";

const localHostnames = new Set(["127.0.0.1", "::1", "localhost"]);

export function parseLocalSupabaseStatus(output) {
  let status;

  try {
    status = JSON.parse(output);
  } catch (cause) {
    throw new Error("Local Supabase status did not return valid JSON.", {
      cause
    });
  }

  const apiUrl = assertLocalHttpUrl(status.API_URL, "Supabase API URL");
  const mailpitUrl = assertLocalHttpUrl(status.MAILPIT_URL, "Mailpit URL");
  const databaseUrl = assertLocalDatabaseUrl(status.DB_URL);
  const anonKey = readRequiredValue(status.ANON_KEY, "Supabase anon key");
  const serviceRoleKey = readRequiredValue(
    status.SERVICE_ROLE_KEY,
    "Supabase service-role key"
  );

  return { anonKey, apiUrl, databaseUrl, mailpitUrl, serviceRoleKey };
}

export function createLocalFunctionSecrets() {
  const keyVersion = "LOCAL_E2E";
  const encryptionKey = randomBytes(32).toString("base64");

  return {
    content: [
      `EVALUATION_ACTIVE_ENCRYPTION_KEY_VERSION=${keyVersion}`,
      `EVALUATION_ENCRYPTION_KEY_VERSION_${keyVersion}=${encryptionKey}`,
      ""
    ].join("\n"),
    encryptionKey
  };
}

export function assertLocalHttpUrl(value, label) {
  const requiredValue = readRequiredValue(value, label);
  let url;

  try {
    url = new URL(requiredValue);
  } catch (cause) {
    throw new Error(`${label} is invalid.`, { cause });
  }

  if (url.protocol !== "http:" || !localHostnames.has(url.hostname)) {
    throw new Error(`${label} must use HTTP on a loopback hostname.`);
  }

  return url.origin;
}

export function assertLocalDatabaseUrl(value) {
  const requiredValue = readRequiredValue(value, "Supabase database URL");
  let url;

  try {
    url = new URL(requiredValue);
  } catch (cause) {
    throw new Error("Supabase database URL is invalid.", { cause });
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || !localHostnames.has(url.hostname)
  ) {
    throw new Error(
      "Supabase database URL must use PostgreSQL on a loopback hostname."
    );
  }

  return requiredValue;
}

export function redactSecret(value, secret) {
  return secret ? value.replaceAll(secret, "[REDACTED]") : value;
}

function readRequiredValue(value, label) {
  const result = typeof value === "string" ? value.trim() : "";

  if (!result) {
    throw new Error(`${label} is required.`);
  }

  return result;
}

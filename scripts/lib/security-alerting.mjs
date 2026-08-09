import {
  mkdir,
  readFile,
  rename,
  writeFile
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const localWebhookAcceptanceConfirmation =
  "ALLOW_LOCAL_SECURITY_ALERT_WEBHOOK_FOR_ACCEPTANCE";

const maximumResponseBytes = 16 * 1024;
const stateSchemaVersion = 1;

export async function readSecurityAlertConfiguration(
  environment = process.env
) {
  const environmentId = readEnvironmentId(
    environment.SECURITY_ALERT_ENVIRONMENT_ID
  );
  const supabaseUrl = readServiceUrl(environment.SUPABASE_URL);
  const serviceRoleKey = readSecret(
    environment.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY"
  );
  const webhookUrl = readWebhookUrl(environment);
  const webhookBearerToken = await readSecretValueOrFile(
    environment.SECURITY_ALERT_WEBHOOK_BEARER_TOKEN,
    environment.SECURITY_ALERT_WEBHOOK_BEARER_TOKEN_FILE,
    "SECURITY_ALERT_WEBHOOK_BEARER_TOKEN",
    "SECURITY_ALERT_WEBHOOK_BEARER_TOKEN_FILE"
  );
  const statePath = readStatePath(environment.SECURITY_ALERT_STATE_PATH);

  return Object.freeze({
    environmentId,
    invalidCredentialThreshold: readPositiveInteger(
      environment.SECURITY_ALERT_INVALID_60M_THRESHOLD,
      "SECURITY_ALERT_INVALID_60M_THRESHOLD",
      1_000_000
    ),
    rateLimitedThreshold: readPositiveInteger(
      environment.SECURITY_ALERT_RATE_LIMITED_60M_THRESHOLD,
      "SECURITY_ALERT_RATE_LIMITED_60M_THRESHOLD",
      1_000_000
    ),
    reminderMinutes: readPositiveInteger(
      environment.SECURITY_ALERT_REMINDER_MINUTES,
      "SECURITY_ALERT_REMINDER_MINUTES",
      10_080
    ),
    serviceRoleKey,
    statePath,
    supabaseUrl,
    webhookBearerToken,
    webhookUrl
  });
}

export async function readAbuseSummary(
  configuration,
  fetchImplementation = fetch
) {
  const response = await fetchImplementation(
    `${configuration.supabaseUrl}/rest/v1/rpc/get_anonymous_submission_abuse_summary_for_operator`,
    {
      body: "{}",
      headers: {
        apikey: configuration.serviceRoleKey,
        Authorization: `Bearer ${configuration.serviceRoleKey}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Security monitoring read failed with HTTP ${response.status}.`
    );
  }

  const value = await readBoundedJson(response);

  return Object.freeze({
    invalidCredentialAttemptsLast60Minutes: readSummaryInteger(
      value.invalid_credential_attempts_last_60_minutes
    ),
    rateLimitedRequestsLast60Minutes: readSummaryInteger(
      value.rate_limited_requests_last_60_minutes
    )
  });
}

export function selectSecurityAlertTransition(
  summary,
  previousState,
  configuration,
  observedAt = new Date()
) {
  const active =
    summary.invalidCredentialAttemptsLast60Minutes
      >= configuration.invalidCredentialThreshold
    || summary.rateLimitedRequestsLast60Minutes
      >= configuration.rateLimitedThreshold;
  const previousActive = previousState?.status === "ALERT";
  let notificationType = null;

  if (active && !previousActive) {
    notificationType = "ALERT";
  } else if (!active && previousActive) {
    notificationType = "RECOVERED";
  } else if (
    active
    && isReminderDue(
      previousState?.lastDeliveredAt,
      observedAt,
      configuration.reminderMinutes
    )
  ) {
    notificationType = "ALERT_REMINDER";
  }

  return Object.freeze({
    active,
    notificationType
  });
}

export function createSecurityAlertPayload({
  configuration,
  notificationType,
  observedAt,
  summary
}) {
  return Object.freeze({
    environmentId: configuration.environmentId,
    eventType: "YANKI_ANONYMOUS_ABUSE",
    metrics: {
      invalidCredentialAttemptsLast60Minutes:
        summary.invalidCredentialAttemptsLast60Minutes,
      rateLimitedRequestsLast60Minutes:
        summary.rateLimitedRequestsLast60Minutes
    },
    observedAt: observedAt.toISOString(),
    schemaVersion: 1,
    status: notificationType,
    thresholds: {
      invalidCredentialAttemptsLast60Minutes:
        configuration.invalidCredentialThreshold,
      rateLimitedRequestsLast60Minutes:
        configuration.rateLimitedThreshold
    }
  });
}

export async function deliverSecurityAlert(
  configuration,
  payload,
  fetchImplementation = fetch
) {
  const response = await fetchImplementation(configuration.webhookUrl, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${configuration.webhookBearerToken}`,
      "Content-Type": "application/json",
      "User-Agent": "yanki-security-alerts/1"
    },
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(
      `Security alert delivery failed with HTTP ${response.status}.`
    );
  }
}

export async function readSecurityAlertState(statePath, environmentId) {
  let contents;

  try {
    contents = await readFile(statePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw new Error("Security alert state could not be read.", {
      cause: error
    });
  }

  if (Buffer.byteLength(contents, "utf8") > 4096) {
    throw new Error("Security alert state is too large.");
  }

  let state;

  try {
    state = JSON.parse(contents);
  } catch {
    throw new Error("Security alert state is invalid.");
  }

  if (
    !isRecord(state)
    || state.schemaVersion !== stateSchemaVersion
    || state.environmentId !== environmentId
    || !["ALERT", "HEALTHY"].includes(state.status)
    || (
      state.lastDeliveredAt !== null
      && !isIsoDate(state.lastDeliveredAt)
    )
  ) {
    throw new Error("Security alert state is invalid.");
  }

  return Object.freeze(state);
}

export async function writeSecurityAlertState(
  statePath,
  environmentId,
  active,
  lastDeliveredAt
) {
  const nextState = {
    environmentId,
    lastDeliveredAt,
    schemaVersion: stateSchemaVersion,
    status: active ? "ALERT" : "HEALTHY"
  };
  const temporaryPath = `${statePath}.${process.pid}.tmp`;

  process.umask(0o077);
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(
    temporaryPath,
    `${JSON.stringify(nextState, null, 2)}\n`,
    { mode: 0o600 }
  );
  await rename(temporaryPath, statePath);

  return Object.freeze(nextState);
}

function readEnvironmentId(value) {
  if (
    typeof value !== "string"
    || !/^[a-z0-9][a-z0-9_-]{2,63}$/u.test(value)
  ) {
    throw new Error("SECURITY_ALERT_ENVIRONMENT_ID is invalid.");
  }

  return value;
}

function readServiceUrl(value) {
  const url = readUrl(value, "SUPABASE_URL");

  if (url.protocol !== "https:" && !isLoopbackHostname(url.hostname)) {
    throw new Error("SUPABASE_URL must use HTTPS outside local development.");
  }

  return url.toString().replace(/\/$/u, "");
}

function readWebhookUrl(environment) {
  const url = readUrl(
    environment.SECURITY_ALERT_WEBHOOK_URL,
    "SECURITY_ALERT_WEBHOOK_URL"
  );
  const localAcceptance =
    environment.SECURITY_ALERT_ALLOW_LOCAL_WEBHOOK
      === localWebhookAcceptanceConfirmation;

  if (
    url.protocol !== "https:"
    && !(localAcceptance && isLoopbackHostname(url.hostname))
  ) {
    throw new Error(
      "The security alert webhook must use HTTPS outside explicit local acceptance."
    );
  }

  return url.toString();
}

function readUrl(value, name) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} is invalid.`);
  }

  if (
    !["http:", "https:"].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error(`${name} is invalid.`);
  }

  return url;
}

function readSecret(value, name) {
  if (
    typeof value !== "string"
    || value.length < 20
    || value.length > 8192
    || /[\r\n\0]/u.test(value)
  ) {
    throw new Error(`${name} is missing or invalid.`);
  }

  return value;
}

async function readSecretValueOrFile(value, filePath, valueName, fileName) {
  const directValue = value?.trim();
  const configuredFilePath = filePath?.trim();

  if (Boolean(directValue) === Boolean(configuredFilePath)) {
    throw new Error(`Configure exactly one of ${valueName} or ${fileName}.`);
  }

  if (directValue) {
    return readBearerToken(directValue, valueName);
  }

  let contents;

  try {
    contents = (await readFile(configuredFilePath, "utf8")).trim();
  } catch {
    throw new Error(`${fileName} could not be read.`);
  }

  return readBearerToken(contents, fileName);
}

function readBearerToken(value, name) {
  if (
    value.length < 20
    || value.length > 4096
    || !/^[\x21-\x7e]+$/u.test(value)
  ) {
    throw new Error(`${name} is invalid.`);
  }

  return value;
}

function readStatePath(value) {
  if (
    typeof value !== "string"
    || value.trim().length === 0
    || value.includes("\0")
  ) {
    throw new Error("SECURITY_ALERT_STATE_PATH is invalid.");
  }

  return resolve(value.trim());
}

function readPositiveInteger(value, name, maximum) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/u.test(value)) {
    throw new Error(`${name} must be a positive integer.`);
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number > maximum) {
    throw new Error(`${name} exceeds its supported maximum.`);
  }

  return number;
}

async function readBoundedJson(response) {
  const text = await response.text();

  if (Buffer.byteLength(text, "utf8") > maximumResponseBytes) {
    throw new Error("Security monitoring response is too large.");
  }

  try {
    const value = JSON.parse(text);

    if (!isRecord(value)) {
      throw new Error();
    }

    return value;
  } catch {
    throw new Error("Security monitoring response is invalid.");
  }
}

function readSummaryInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Security monitoring response is invalid.");
  }

  return value;
}

function isReminderDue(lastDeliveredAt, observedAt, reminderMinutes) {
  if (!lastDeliveredAt) {
    return true;
  }

  return observedAt.getTime() - Date.parse(lastDeliveredAt)
    >= reminderMinutes * 60 * 1000;
}

function isIsoDate(value) {
  return typeof value === "string"
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function isLoopbackHostname(hostname) {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

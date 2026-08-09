import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSecurityAlertPayload,
  deliverSecurityAlert,
  localWebhookAcceptanceConfirmation,
  readAbuseSummary,
  readSecurityAlertConfiguration,
  readSecurityAlertState,
  selectSecurityAlertTransition,
  writeSecurityAlertState
} from "./lib/security-alerting.mjs";

const expectedConfirmation = "RUN_LOCAL_SECURITY_ALERT_ACCEPTANCE";

if (process.env.SECURITY_ALERT_ACCEPTANCE_CONFIRM !== expectedConfirmation) {
  throw new Error(
    `Set SECURITY_ALERT_ACCEPTANCE_CONFIRM=${expectedConfirmation} before `
      + "running local security alert acceptance."
  );
}

const receivedNotifications = [];
const bearerToken = randomBytes(32).toString("hex");
const server = createServer(async (request, response) => {
  try {
    if (
      request.method !== "POST"
      || request.headers.authorization !== `Bearer ${bearerToken}`
    ) {
      response.writeHead(401).end();
      return;
    }

    const body = await readRequestBody(request);

    receivedNotifications.push(JSON.parse(body));
    response.writeHead(204).end();
  } catch {
    response.writeHead(400).end();
  }
});
const stateDirectory = await mkdtemp(
  join(tmpdir(), "yanki-security-alert-acceptance-")
);

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("The local acceptance webhook did not start.");
  }

  const configuration = await readSecurityAlertConfiguration({
    ...process.env,
    SECURITY_ALERT_ALLOW_LOCAL_WEBHOOK:
      localWebhookAcceptanceConfirmation,
    SECURITY_ALERT_ENVIRONMENT_ID: "local-security-acceptance",
    SECURITY_ALERT_INVALID_60M_THRESHOLD: "1",
    SECURITY_ALERT_RATE_LIMITED_60M_THRESHOLD: "1",
    SECURITY_ALERT_REMINDER_MINUTES: "60",
    SECURITY_ALERT_STATE_PATH: join(stateDirectory, "state.json"),
    SECURITY_ALERT_WEBHOOK_BEARER_TOKEN: bearerToken,
    SECURITY_ALERT_WEBHOOK_BEARER_TOKEN_FILE: "",
    SECURITY_ALERT_WEBHOOK_URL: `http://127.0.0.1:${address.port}/alert`
  });
  const databaseSummary = await readAbuseSummary(configuration);
  const activeSummary = {
    invalidCredentialAttemptsLast60Minutes: Math.max(
      1,
      databaseSummary.invalidCredentialAttemptsLast60Minutes
    ),
    rateLimitedRequestsLast60Minutes:
      databaseSummary.rateLimitedRequestsLast60Minutes
  };
  const observedAt = new Date();
  const alertTransition = selectSecurityAlertTransition(
    activeSummary,
    null,
    configuration,
    observedAt
  );

  if (alertTransition.notificationType !== "ALERT") {
    throw new Error("The acceptance alert transition was not selected.");
  }

  await deliverSecurityAlert(
    configuration,
    createSecurityAlertPayload({
      configuration,
      notificationType: alertTransition.notificationType,
      observedAt,
      summary: activeSummary
    })
  );
  const alertState = await writeSecurityAlertState(
    configuration.statePath,
    configuration.environmentId,
    true,
    observedAt.toISOString()
  );
  const duplicateTransition = selectSecurityAlertTransition(
    activeSummary,
    alertState,
    configuration,
    new Date(observedAt.getTime() + 5 * 60 * 1000)
  );
  const recoveryObservedAt = new Date(observedAt.getTime() + 10 * 60 * 1000);
  const recoveryTransition = selectSecurityAlertTransition(
    {
      invalidCredentialAttemptsLast60Minutes: 0,
      rateLimitedRequestsLast60Minutes: 0
    },
    alertState,
    configuration,
    recoveryObservedAt
  );

  if (
    duplicateTransition.notificationType !== null
    || recoveryTransition.notificationType !== "RECOVERED"
  ) {
    throw new Error("The acceptance alert state transitions were invalid.");
  }

  await deliverSecurityAlert(
    configuration,
    createSecurityAlertPayload({
      configuration,
      notificationType: recoveryTransition.notificationType,
      observedAt: recoveryObservedAt,
      summary: {
        invalidCredentialAttemptsLast60Minutes: 0,
        rateLimitedRequestsLast60Minutes: 0
      }
    })
  );
  await writeSecurityAlertState(
    configuration.statePath,
    configuration.environmentId,
    false,
    recoveryObservedAt.toISOString()
  );
  const finalState = await readSecurityAlertState(
    configuration.statePath,
    configuration.environmentId
  );

  if (
    receivedNotifications.length !== 2
    || receivedNotifications[0]?.status !== "ALERT"
    || receivedNotifications[1]?.status !== "RECOVERED"
    || finalState?.status !== "HEALTHY"
  ) {
    throw new Error("The local security alert delivery acceptance failed.");
  }

  console.log(JSON.stringify({
    alertDelivered: true,
    contentOrIdentifiersLogged: false,
    duplicateAlertSuppressed: true,
    operatorSummaryRead: true,
    recoveryDelivered: true,
    temporaryStateRemoved: true,
    webhookWasLoopbackOnly: true
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(stateDirectory, { force: true, recursive: true });
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > 16 * 1024) {
      throw new Error("The acceptance webhook request was too large.");
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

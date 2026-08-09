import {
  createSecurityAlertPayload,
  deliverSecurityAlert,
  readAbuseSummary,
  readSecurityAlertConfiguration,
  readSecurityAlertState,
  selectSecurityAlertTransition,
  writeSecurityAlertState
} from "./lib/security-alerting.mjs";

const expectedConfirmation = "DELIVER_CONTENT_FREE_SECURITY_ALERTS";

if (process.env.SECURITY_ALERT_DELIVERY_CONFIRM !== expectedConfirmation) {
  throw new Error(
    `Set SECURITY_ALERT_DELIVERY_CONFIRM=${expectedConfirmation} before `
      + "running scheduled security alert delivery."
  );
}

const configuration = await readSecurityAlertConfiguration();
const previousState = await readSecurityAlertState(
  configuration.statePath,
  configuration.environmentId
);
const summary = await readAbuseSummary(configuration);
const observedAt = new Date();
const transition = selectSecurityAlertTransition(
  summary,
  previousState,
  configuration,
  observedAt
);
let notificationDelivered = false;

if (transition.notificationType) {
  await deliverSecurityAlert(
    configuration,
    createSecurityAlertPayload({
      configuration,
      notificationType: transition.notificationType,
      observedAt,
      summary
    })
  );
  notificationDelivered = true;
}

const lastDeliveredAt = notificationDelivered
  ? observedAt.toISOString()
  : previousState?.lastDeliveredAt ?? null;

await writeSecurityAlertState(
  configuration.statePath,
  configuration.environmentId,
  transition.active,
  lastDeliveredAt
);

console.log(JSON.stringify({
  alertActive: transition.active,
  contentOrIdentifiersLogged: false,
  monitoringRead: true,
  notificationDelivered,
  notificationType: transition.notificationType,
  stateUpdated: true,
  webhookLocatorLogged: false
}, null, 2));

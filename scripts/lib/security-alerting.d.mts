export type SecurityAlertConfiguration = Readonly<{
  environmentId: string;
  invalidCredentialThreshold: number;
  rateLimitedThreshold: number;
  reminderMinutes: number;
  serviceRoleKey: string;
  statePath: string;
  supabaseUrl: string;
  webhookBearerToken: string;
  webhookUrl: string;
}>;

export type AbuseSummary = Readonly<{
  invalidCredentialAttemptsLast60Minutes: number;
  rateLimitedRequestsLast60Minutes: number;
}>;

export type SecurityAlertState = Readonly<{
  environmentId: string;
  lastDeliveredAt: string | null;
  schemaVersion: 1;
  status: "ALERT" | "HEALTHY";
}>;

export const localWebhookAcceptanceConfirmation: string;

export function readSecurityAlertConfiguration(
  environment?: NodeJS.ProcessEnv
): Promise<SecurityAlertConfiguration>;
export function readAbuseSummary(
  configuration: SecurityAlertConfiguration,
  fetchImplementation?: typeof fetch
): Promise<AbuseSummary>;
export function selectSecurityAlertTransition(
  summary: AbuseSummary,
  previousState: SecurityAlertState | null,
  configuration: SecurityAlertConfiguration,
  observedAt?: Date
): Readonly<{
  active: boolean;
  notificationType: "ALERT" | "ALERT_REMINDER" | "RECOVERED" | null;
}>;
export function createSecurityAlertPayload(input: {
  configuration: SecurityAlertConfiguration;
  notificationType: "ALERT" | "ALERT_REMINDER" | "RECOVERED";
  observedAt: Date;
  summary: AbuseSummary;
}): Readonly<Record<string, unknown>>;
export function deliverSecurityAlert(
  configuration: SecurityAlertConfiguration,
  payload: Record<string, unknown>,
  fetchImplementation?: typeof fetch
): Promise<void>;
export function readSecurityAlertState(
  statePath: string,
  environmentId: string
): Promise<SecurityAlertState | null>;
export function writeSecurityAlertState(
  statePath: string,
  environmentId: string,
  active: boolean,
  lastDeliveredAt: string | null
): Promise<SecurityAlertState>;

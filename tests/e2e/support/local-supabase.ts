import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Client as PostgresClient } from "pg";
import type { Database } from "../../../src/types/supabase";

export type E2ECredentials = {
  readonly email: string;
  readonly password: string;
};

export type E2EAccount = E2ECredentials & {
  readonly displayName: string;
  readonly userId: string;
};

export type E2EFixture = {
  readonly admin: E2EAccount;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly reviewer: E2EAccount;
  readonly runId: string;
  readonly subject: E2EAccount;
  readonly unitId: string;
};

type Environment = {
  readonly anonKey: string;
  readonly databaseUrl: string;
  readonly mailpitUrl: string;
  readonly serviceRoleKey: string;
  readonly supabaseUrl: string;
};

export async function provisionE2EFixture(): Promise<E2EFixture> {
  const environment = readEnvironment();
  const client = createClient<Database>(
    environment.supabaseUrl,
    environment.serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );
  const runId = `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const organizationName = `Yanki E2E ${runId}`;
  const database = new PostgresClient({
    connectionString: environment.databaseUrl
  });

  await database.connect();

  try {
    await database.query("begin");
    const organizationResult = await database.query<{ id: string }>(
      `insert into public.organizations (name, slug, status)
       values ($1, $2, 'ACTIVE')
       returning id`,
      [organizationName, `yanki-e2e-${runId}`]
    );
    const organizationId = requireRow(organizationResult.rows).id;
    const unitResult = await database.query<{ id: string }>(
      `insert into public.organization_units
         (organization_id, name, slug, unit_type, status)
       values ($1, 'E2E Product Team', $2, 'TEAM', 'ACTIVE')
       returning id`,
      [organizationId, `e2e-product-${runId}`]
    );
    const unitId = requireRow(unitResult.rows).id;
    const admin = await createAccount({
      client,
      database,
      displayName: `E2E HR Admin ${runId}`,
      email: `e2e-admin-${runId}@example.test`,
      membershipKind: "MEMBER",
      organizationId,
      roleCode: "SYSTEM_ADMIN",
      scopeId: organizationId,
      scopeType: "ORGANIZATION",
      unitId
    });
    const reviewer = await createAccount({
      client,
      database,
      displayName: `E2E Executive ${runId}`,
      email: `e2e-reviewer-${runId}@example.test`,
      membershipKind: "LEADER",
      organizationId,
      roleCode: "C_LEVEL_REVIEWER",
      scopeId: organizationId,
      scopeType: "ORGANIZATION",
      unitId
    });
    const subject = await createAccount({
      client,
      database,
      displayName: `E2E Team Leader ${runId}`,
      email: `e2e-leader-${runId}@example.test`,
      membershipKind: "LEADER",
      organizationId,
      roleCode: "TEAM_LEADER",
      scopeId: unitId,
      scopeType: "TEAM",
      unitId
    });

    await database.query("commit");

    return {
      admin,
      organizationId,
      organizationName,
      reviewer,
      runId,
      subject,
      unitId
    };
  } catch (error) {
    await database.query("rollback");
    throw error;
  } finally {
    await database.end();
  }
}

export async function readActiveUserIdByEmail(email: string): Promise<string> {
  const environment = readEnvironment();
  const database = new PostgresClient({
    connectionString: environment.databaseUrl
  });

  await database.connect();

  try {
    const result = await database.query<{ user_id: string }>(
      `select user_id
       from public.user_profiles
       where email = $1 and onboarding_status = 'ACTIVE'`,
      [email]
    );

    return requireRow(result.rows).user_id;
  } finally {
    await database.end();
  }
}

export async function waitForInvitationLink(
  email: string,
  timeoutMs = 20_000
): Promise<string> {
  const { mailpitUrl } = readEnvironment();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${mailpitUrl}/api/v1/messages`);

    if (!response.ok) {
      throw new Error(`Mailpit list request failed with ${response.status}.`);
    }

    const body = readRecord(await response.json());
    const messages = readArray(body.messages);

    for (const messageValue of messages) {
      const message = readRecord(messageValue);

      if (!JSON.stringify(message).toLowerCase().includes(email.toLowerCase())) {
        continue;
      }

      const messageId = readString(message.ID) || readString(message.id);

      if (!messageId) {
        continue;
      }

      const detailResponse = await fetch(
        `${mailpitUrl}/api/v1/message/${encodeURIComponent(messageId)}`
      );

      if (!detailResponse.ok) {
        continue;
      }

      const link = extractInvitationLink(await detailResponse.json());

      if (link) {
        return link;
      }
    }

    await delay(250);
  }

  throw new Error(`No local invitation email arrived for ${email}.`);
}

export async function redeemLocalInvitationLink(
  invitationLink: string
): Promise<string> {
  const environment = readEnvironment();
  const verificationUrl = new URL(invitationLink);

  if (
    verificationUrl.origin !== environment.supabaseUrl
    || verificationUrl.pathname !== "/auth/v1/verify"
  ) {
    throw new Error("The invitation link does not target local Supabase Auth.");
  }

  const response = await fetch(verificationUrl, { redirect: "manual" });
  const location = response.headers.get("location");

  if (response.status < 300 || response.status >= 400 || !location) {
    throw new Error(
      `Local invitation verification failed with ${response.status}.`
    );
  }

  const callbackUrl = new URL(location);
  const e2eBaseUrl = new URL(readLocalUrl("E2E_BASE_URL"));

  if (
    !["127.0.0.1", "::1", "localhost"].includes(callbackUrl.hostname)
    || !callbackUrl.hash.includes("type=invite")
  ) {
    throw new Error("Local invitation verification returned an invalid callback.");
  }

  callbackUrl.protocol = e2eBaseUrl.protocol;
  callbackUrl.host = e2eBaseUrl.host;
  return callbackUrl.toString();
}

export async function invokeReportAs(
  credentials: E2ECredentials,
  evaluationCycleId: string,
  subjectUserId: string
): Promise<number> {
  const environment = readEnvironment();
  const authClient = createClient<Database>(
    environment.supabaseUrl,
    environment.anonKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await authClient.auth.signInWithPassword(credentials);

  if (error || !data.session?.access_token) {
    throw error ?? new Error("The E2E report actor could not sign in.");
  }

  const response = await fetch(
    `${environment.supabaseUrl}/functions/v1/evaluation-reports`,
    {
      body: JSON.stringify({
        action: "get_report",
        payload: { evaluationCycleId, subjectUserId }
      }),
      headers: {
        apikey: environment.anonKey,
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );

  return response.status;
}

async function createAccount({
  client,
  database,
  displayName,
  email,
  membershipKind,
  organizationId,
  roleCode,
  scopeId,
  scopeType,
  unitId
}: {
  readonly client: SupabaseClient<Database>;
  readonly database: PostgresClient;
  readonly displayName: string;
  readonly email: string;
  readonly membershipKind: "LEADER" | "MEMBER";
  readonly organizationId: string;
  readonly roleCode: "C_LEVEL_REVIEWER" | "SYSTEM_ADMIN" | "TEAM_LEADER";
  readonly scopeId: string;
  readonly scopeType: "ORGANIZATION" | "TEAM";
  readonly unitId: string;
}): Promise<E2EAccount> {
  const password = createPassword();
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { display_name: displayName }
  });

  if (error || !data.user) {
    throw error ?? new Error(`The local Auth user ${email} was not created.`);
  }

  const userId = data.user.id;
  await database.query(
    `insert into public.user_profiles
       (user_id, email, display_name, onboarding_status, activated_at)
     values ($1, $2, $3, 'ACTIVE', now())`,
    [userId, email, displayName]
  );
  await database.query(
    `insert into public.organization_unit_memberships
       (organization_id, unit_id, user_id, membership_kind, is_primary)
     values ($1, $2, $3, $4, true)`,
    [organizationId, unitId, userId, membershipKind]
  );
  await database.query(
    `insert into public.user_role_assignments
       (user_id, role_code, scope_type, scope_id)
     values ($1, $2, $3, $4)`,
    [userId, roleCode, scopeType, scopeId]
  );

  return { displayName, email, password, userId };
}

function extractInvitationLink(value: unknown): string | null {
  const strings = collectStrings(value);

  for (const text of strings) {
    const normalized = text
      .replaceAll("&amp;", "&")
      .replaceAll("&#x3D;", "=")
      .replaceAll("=\r\n", "")
      .replaceAll("=\n", "");
    const links = normalized.match(/https?:\/\/[^\s"'<>]+/gu) ?? [];
    const invitationLink = links.find((link) =>
      link.includes("/auth/v1/verify") && link.includes("type=invite")
    );

    if (invitationLink) {
      return invitationLink.replace(/[),.;]+$/u, "");
    }
  }

  return null;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

function createPassword(): string {
  return `Yanki-${randomBytes(15).toString("base64url")}!Aa1`;
}

function readEnvironment(): Environment {
  return {
    anonKey: readRequiredEnvironment("E2E_SUPABASE_ANON_KEY"),
    databaseUrl: readLocalDatabaseUrl(),
    mailpitUrl: readLocalUrl("E2E_MAILPIT_URL"),
    serviceRoleKey: readRequiredEnvironment(
      "E2E_SUPABASE_SERVICE_ROLE_KEY"
    ),
    supabaseUrl: readLocalUrl("E2E_SUPABASE_URL")
  };
}

function readLocalDatabaseUrl(): string {
  const value = readRequiredEnvironment("E2E_DATABASE_URL");
  const url = new URL(value);

  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || !["127.0.0.1", "::1", "localhost"].includes(url.hostname)
  ) {
    throw new Error(
      "E2E_DATABASE_URL must target a loopback PostgreSQL service."
    );
  }

  return value;
}

function readLocalUrl(name: string): string {
  const value = readRequiredEnvironment(name);
  const url = new URL(value);

  if (
    url.protocol !== "http:"
    || !["127.0.0.1", "::1", "localhost"].includes(url.hostname)
  ) {
    throw new Error(`${name} must target a loopback HTTP service.`);
  }

  return url.origin;
}

function readRequiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required. Run npm run e2e:local.`);
  }

  return value;
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requireRow<T>(rows: readonly T[]): T {
  const row = rows[0];

  if (!row) {
    throw new Error("The local E2E fixture query returned no row.");
  }

  return row;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

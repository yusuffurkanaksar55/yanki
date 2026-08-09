import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const executionConfirmation = "CREATE_PRODUCTION_TENANT";
const recoveryConfirmation = "REISSUE_BOOTSTRAP_INVITATION";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function readBootstrapConfiguration(environment = process.env) {
  const configuration = {
    administratorDisplayName: readRequired(
      environment,
      "TENANT_BOOTSTRAP_ADMIN_DISPLAY_NAME"
    ),
    administratorEmail: readRequired(
      environment,
      "TENANT_BOOTSTRAP_ADMIN_EMAIL"
    ).toLowerCase(),
    initialUnitName:
      environment.TENANT_BOOTSTRAP_INITIAL_UNIT_NAME?.trim()
      || "Administration",
    initialUnitSlug:
      environment.TENANT_BOOTSTRAP_INITIAL_UNIT_SLUG?.trim().toLowerCase()
      || "administration",
    invitationExpiresInDays: readInteger(
      environment.TENANT_BOOTSTRAP_INVITATION_EXPIRY_DAYS ?? "7"
    ),
    organizationName: readRequired(
      environment,
      "TENANT_BOOTSTRAP_ORGANIZATION_NAME"
    ),
    organizationSlug: readRequired(
      environment,
      "TENANT_BOOTSTRAP_ORGANIZATION_SLUG"
    ).toLowerCase(),
    redirectUrl: readRequired(environment, "TENANT_BOOTSTRAP_REDIRECT_URL"),
    requestId: readRequired(environment, "TENANT_BOOTSTRAP_REQUEST_ID"),
    serviceRoleKey: readRequired(environment, "SUPABASE_SERVICE_ROLE_KEY"),
    supabaseUrl: readRequired(environment, "SUPABASE_URL")
  };

  validateBootstrapConfiguration(configuration);

  return {
    ...configuration,
    requestFingerprint: createBootstrapFingerprint(configuration)
  };
}

export function createBootstrapFingerprint(configuration) {
  return createHash("sha256")
    .update([
      configuration.organizationName,
      configuration.organizationSlug,
      configuration.administratorEmail,
      configuration.administratorDisplayName,
      configuration.initialUnitName,
      configuration.initialUnitSlug,
      String(configuration.invitationExpiresInDays)
    ].join("\n"), "utf8")
    .digest("hex");
}

export function validateBootstrapConfiguration(configuration) {
  requireLength(
    configuration.organizationName,
    2,
    120,
    "TENANT_BOOTSTRAP_ORGANIZATION_NAME_INVALID"
  );
  requireSlug(
    configuration.organizationSlug,
    3,
    "TENANT_BOOTSTRAP_ORGANIZATION_SLUG_INVALID"
  );

  if (
    configuration.administratorEmail.length > 320
    || !emailPattern.test(configuration.administratorEmail)
  ) {
    throw new BootstrapError("TENANT_BOOTSTRAP_ADMINISTRATOR_EMAIL_INVALID");
  }

  requireLength(
    configuration.administratorDisplayName,
    2,
    120,
    "TENANT_BOOTSTRAP_ADMINISTRATOR_NAME_INVALID"
  );
  requireLength(
    configuration.initialUnitName,
    2,
    120,
    "TENANT_BOOTSTRAP_UNIT_NAME_INVALID"
  );
  requireSlug(
    configuration.initialUnitSlug,
    2,
    "TENANT_BOOTSTRAP_UNIT_SLUG_INVALID"
  );

  if (
    configuration.invitationExpiresInDays < 1
    || configuration.invitationExpiresInDays > 30
  ) {
    throw new BootstrapError("TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID");
  }

  if (!uuidPattern.test(configuration.requestId)) {
    throw new BootstrapError("TENANT_BOOTSTRAP_REQUEST_INVALID");
  }

  requireUrl(configuration.supabaseUrl, "TENANT_BOOTSTRAP_SUPABASE_URL_INVALID");
  requireUrl(configuration.redirectUrl, "TENANT_BOOTSTRAP_REDIRECT_URL_INVALID");
}

export async function runBootstrap({
  checkOnly = false,
  recover = false,
  environment = process.env,
  client: providedClient
} = {}) {
  const configuration = readBootstrapConfiguration(environment);
  const client = providedClient ?? createClient(
    configuration.supabaseUrl,
    configuration.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const existingOperation = await readExistingOperation(client, configuration);

  if (existingOperation.found) {
    if (checkOnly) {
      return {
        ...toSafeResult(existingOperation),
        status: "already_completed"
      };
    }

    if (recover) {
      return recoverBootstrapInvitation(
        client,
        configuration,
        existingOperation,
        environment
      );
    }

    return {
      ...toSafeResult(existingOperation),
      status: "already_completed"
    };
  }

  if (recover) {
    throw new BootstrapError("TENANT_BOOTSTRAP_REQUEST_NOT_FOUND");
  }

  const existingUser = await findUserByEmail(
    client,
    configuration.administratorEmail
  );

  if (existingUser && !hasExactBootstrapMarker(
    existingUser,
    configuration.requestId
  )) {
    throw new BootstrapError("TENANT_BOOTSTRAP_ADMIN_EMAIL_ALREADY_EXISTS");
  }

  if (checkOnly) {
    return {
      administratorIdentity: existingUser ? "resumable" : "available",
      requestId: configuration.requestId,
      status: "ready"
    };
  }

  if (environment.TENANT_BOOTSTRAP_CONFIRM !== executionConfirmation) {
    throw new BootstrapError("TENANT_BOOTSTRAP_CONFIRMATION_REQUIRED");
  }

  let administratorUser = existingUser;
  let createdUserInThisRun = false;

  try {
    if (!administratorUser) {
      administratorUser = await inviteBootstrapAdministrator(
        client,
        configuration
      );
      createdUserInThisRun = true;
    }

    const { data, error } = await client.rpc("bootstrap_organization_tenant", {
      administrator_display_name: configuration.administratorDisplayName,
      administrator_email: configuration.administratorEmail,
      bootstrap_administrator_user_id: administratorUser.id,
      bootstrap_request_id: configuration.requestId,
      expected_request_fingerprint: configuration.requestFingerprint,
      initial_unit_name: configuration.initialUnitName,
      initial_unit_slug: configuration.initialUnitSlug,
      invitation_expires_in_days: configuration.invitationExpiresInDays,
      organization_name: configuration.organizationName,
      organization_slug: configuration.organizationSlug
    });

    if (error) {
      throw new BootstrapError(readDatabaseErrorCode(error.message));
    }

    return {
      ...toSafeResult(data),
      invitationDelivery: createdUserInThisRun
        ? "requested"
        : "previously_requested",
      status: data?.replayed ? "already_completed" : "created"
    };
  } catch (error) {
    if (createdUserInThisRun && administratorUser) {
      const { error: compensationError } = await client.auth.admin.deleteUser(
        administratorUser.id
      );

      if (compensationError) {
        throw new BootstrapError("TENANT_BOOTSTRAP_COMPENSATION_FAILED");
      }
    }

    throw error;
  }
}

async function recoverBootstrapInvitation(
  client,
  configuration,
  existingOperation,
  environment
) {
  if (existingOperation.invitationAccepted) {
    throw new BootstrapError("TENANT_BOOTSTRAP_INVITATION_ALREADY_ACCEPTED");
  }

  if (existingOperation.invitationRevoked) {
    throw new BootstrapError("TENANT_BOOTSTRAP_INVITATION_REVOKED");
  }

  if (environment.TENANT_BOOTSTRAP_RECOVERY_CONFIRM !== recoveryConfirmation) {
    throw new BootstrapError("TENANT_BOOTSTRAP_RECOVERY_CONFIRMATION_REQUIRED");
  }

  const { error: renewalError } = await client.rpc(
    "renew_tenant_bootstrap_invitation",
    {
      bootstrap_request_id: configuration.requestId,
      expected_request_fingerprint: configuration.requestFingerprint,
      invitation_expires_in_days: configuration.invitationExpiresInDays
    }
  );

  if (renewalError) {
    throw new BootstrapError(readDatabaseErrorCode(renewalError.message));
  }

  const { error: deliveryError } = await client.auth.resetPasswordForEmail(
    configuration.administratorEmail,
    { redirectTo: configuration.redirectUrl }
  );

  if (deliveryError) {
    throw new BootstrapError("TENANT_BOOTSTRAP_RECOVERY_DELIVERY_FAILED");
  }

  return {
    ...toSafeResult(existingOperation),
    invitationDelivery: "recovery_requested",
    status: "invitation_reissued"
  };
}

async function readExistingOperation(client, configuration) {
  const { data, error } = await client.rpc("get_tenant_bootstrap_operation", {
    bootstrap_request_id: configuration.requestId,
    expected_request_fingerprint: configuration.requestFingerprint
  });

  if (error) {
    throw new BootstrapError(readDatabaseErrorCode(error.message));
  }

  return isRecord(data) ? data : { found: false };
}

async function inviteBootstrapAdministrator(client, configuration) {
  const { data, error } = await client.auth.admin.inviteUserByEmail(
    configuration.administratorEmail,
    {
      data: {
        display_name: configuration.administratorDisplayName,
        requires_password_setup: true
      },
      redirectTo: configuration.redirectUrl
    }
  );

  if (error || !data.user) {
    throw new BootstrapError("TENANT_BOOTSTRAP_INVITATION_DELIVERY_FAILED");
  }

  const invitedUser = data.user;
  const { data: markedUserData, error: markerError } =
    await client.auth.admin.updateUserById(invitedUser.id, {
      app_metadata: {
        ...invitedUser.app_metadata,
        tenant_bootstrap_request_id: configuration.requestId
      }
    });

  if (markerError || !markedUserData.user) {
    await client.auth.admin.deleteUser(invitedUser.id);
    throw new BootstrapError("TENANT_BOOTSTRAP_AUTH_MARKER_WRITE_FAILED");
  }

  return markedUserData.user;
}

async function findUserByEmail(client, email) {
  let page = 1;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      throw new BootstrapError("TENANT_BOOTSTRAP_AUTH_LOOKUP_FAILED");
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email
    );

    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }
}

function hasExactBootstrapMarker(user, requestId) {
  return user.app_metadata?.tenant_bootstrap_request_id === requestId;
}

function toSafeResult(value) {
  const record = isRecord(value) ? value : {};

  return {
    administratorUserId: readString(record.administratorUserId),
    completedAt: readString(record.completedAt),
    initialUnitId: readString(record.initialUnitId),
    invitationAccepted: Boolean(record.invitationAccepted),
    invitationExpired: Boolean(record.invitationExpired),
    invitationId: readString(record.invitationId),
    invitationRevoked: Boolean(record.invitationRevoked),
    organizationId: readString(record.organizationId),
    organizationSlug: readString(record.organizationSlug),
    requestId: readString(record.requestId)
  };
}

function readDatabaseErrorCode(message) {
  return message.match(/TENANT_BOOTSTRAP_[A-Z_]+/u)?.[0]
    ?? "TENANT_BOOTSTRAP_DATABASE_FAILED";
}

function requireLength(value, minimum, maximum, errorCode) {
  if (value.length < minimum || value.length > maximum) {
    throw new BootstrapError(errorCode);
  }
}

function requireSlug(value, minimum, errorCode) {
  if (value.length < minimum || value.length > 63 || !slugPattern.test(value)) {
    throw new BootstrapError(errorCode);
  }
}

function requireUrl(value, errorCode) {
  try {
    const url = new URL(value);
    const localHostnames = new Set(["127.0.0.1", "::1", "localhost"]);

    if (
      (url.protocol !== "https:"
        && !(url.protocol === "http:" && localHostnames.has(url.hostname)))
      || url.username
      || url.password
    ) {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new BootstrapError(errorCode);
  }
}

function readRequired(environment, name) {
  const value = environment[name]?.trim();

  if (!value) {
    throw new BootstrapError(`${name}_REQUIRED`);
  }

  return value;
}

function readInteger(value) {
  if (!/^\d+$/u.test(value)) {
    throw new BootstrapError("TENANT_BOOTSTRAP_INVITATION_EXPIRY_INVALID");
  }

  return Number(value);
}

function readString(value) {
  return typeof value === "string" ? value : "";
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class BootstrapError extends Error {
  constructor(code) {
    super(code);
    this.name = "BootstrapError";
  }
}

async function runFromCommandLine() {
  try {
    const result = await runBootstrap({
      checkOnly: process.argv.includes("--check"),
      recover: process.argv.includes("--recover")
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const code = error instanceof BootstrapError
      ? error.message
      : "TENANT_BOOTSTRAP_FAILED";
    console.error(JSON.stringify({ error: code }));
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  await runFromCommandLine();
}

import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import net from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanupLocalE2EFixtures } from "./lib/local-e2e-cleanup.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configOnly = readExecutionMode(process.argv.slice(2));
const toolsRoot = join(repositoryRoot, ".tools");
const checkoutRoot = join(toolsRoot, "supabase-self-hosted");
const stagingRoot = join(toolsRoot, `self-hosted-staging-${process.pid}`);
const dockerRoot = join(stagingRoot, "docker");
const environmentPath = join(dockerRoot, ".env");
const baseComposePath = join(dockerRoot, "docker-compose.yml");
const overrideComposePath = join(
  repositoryRoot,
  "deploy",
  "staging",
  "docker-compose.override.yml"
);
const lockPath = join(
  repositoryRoot,
  "deploy",
  "staging",
  "supabase.lock.json"
);
const reportPath = join(
  toolsRoot,
  "self-hosted-staging-last-report.json"
);
const failureLogPath = join(
  toolsRoot,
  "self-hosted-staging-last-failure.log"
);
const playwrightCli = join(
  repositoryRoot,
  "node_modules",
  "@playwright",
  "test",
  "cli.js"
);
const supabaseCli = join(
  repositoryRoot,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js"
);
const backupAcceptanceScript = join(
  repositoryRoot,
  "scripts",
  "verify-backup-restore-acceptance.mjs"
);
const projectName = "yanki-self-hosted-staging";
const ports = {
  app: 55430,
  api: 55431,
  database: 55432,
  poolerSession: 55433,
  mailpit: 55434,
  poolerTransaction: 55435
};
const appBaseUrl = `http://127.0.0.1:${ports.app}`;
const directApiUrl = `http://127.0.0.1:${ports.api}`;
const mailpitUrl = `http://127.0.0.1:${ports.mailpit}`;
const reservedContainerNames = [
  "realtime-dev.supabase-realtime",
  "supabase-auth",
  "supabase-db",
  "supabase-edge-functions",
  "supabase-envoy",
  "supabase-imgproxy",
  "supabase-meta",
  "supabase-pooler",
  "supabase-rest",
  "supabase-storage",
  "supabase-studio",
  "yanki-staging-mailpit",
  "yanki-staging-web"
];
const dockerCommand = resolveDockerCommand();
const gitCommand = resolveGitCommand();
const dockerBinDirectory = dirname(dockerCommand);
const childPath = `${dockerBinDirectory};${process.env.PATH ?? ""}`;
let composeAttempted = false;
let databaseUrl;
let generatedSecretValues = [];
let acceptanceError = null;

acceptance: try {
  if (
    !configOnly
    && process.env.SELF_HOSTED_STAGING_ACCEPTANCE_CONFIRM
      !== "RUN_FULL_SELF_HOSTED_STAGING_ACCEPTANCE"
  ) {
    throw new Error(
      "Set SELF_HOSTED_STAGING_ACCEPTANCE_CONFIRM="
        + "RUN_FULL_SELF_HOSTED_STAGING_ACCEPTANCE only on a staging host with "
        + "at least 20 GB of verified free Docker storage."
    );
  }

  console.log("[staging] Docker Engine preflight");
  run(dockerCommand, ["info", "--format", "{{.ServerVersion}}"], {
    captureOutput: true,
    label: "Docker Engine preflight"
  });

  if (!configOnly) {
    await assertPortsAvailable(Object.values(ports));
    assertReservedContainersAvailable();
  }

  console.log("[staging] Pinned official Supabase source verification");
  const lock = await readJson(lockPath);
  await preparePinnedCheckout(lock);
  await verifyPinnedFiles(lock);

  await rm(stagingRoot, { force: true, recursive: true });
  await mkdir(stagingRoot, { recursive: true });
  await cp(join(checkoutRoot, lock.sparsePath), dockerRoot, {
    recursive: true
  });
  await copyApplicationFunctions();

  const generated = await createStagingEnvironment();
  databaseUrl = generated.databaseUrl;
  generatedSecretValues = generated.secretValues;

  console.log("[staging] Isolated Compose configuration validation");
  runCompose(["config", "--quiet"], { label: "Docker Compose config" });

  if (configOnly) {
    await writeFile(reportPath, `${JSON.stringify({
      completedAt: new Date().toISOString(),
      officialSupabaseCommit: lock.commit,
      passedChecks: [
        "pinned-source-integrity",
        "compose-validation",
        "generated-secret-replacement"
      ],
      scope: "configuration-only"
    }, null, 2)}\n`, "utf8");
    await rm(failureLogPath, { force: true });
    console.log("[staging] Pinned self-hosted configuration passed");
    break acceptance;
  }

  console.log("[staging] Starting production-like self-hosted stack");
  composeAttempted = true;
  runCompose([
    "up",
    "--detach",
    "--wait",
    "--wait-timeout",
    "600",
    "--build",
    "--pull",
    "missing"
  ], { label: "Docker Compose startup" });

  await waitForHttp(`${appBaseUrl}/healthz`, 30_000);
  verifyContainerIsolation();

  console.log("[staging] Applying migrations to disposable PostgreSQL");
  runNodeCli(supabaseCli, [
    "db",
    "push",
    "--db-url",
    databaseUrl,
    "--include-all",
    "--yes"
  ], { label: "Supabase migration push" });

  console.log("[staging] Running database lint and pgTAP suites");
  runNodeCli(supabaseCli, ["db", "lint", "--db-url", databaseUrl], {
    label: "Supabase database lint"
  });
  runNodeCli(supabaseCli, ["test", "db", "--db-url", databaseUrl], {
    label: "Supabase pgTAP tests"
  });

  await verifyRuntimeConfiguration(generated);

  console.log("[staging] Running browser lifecycle through the Nginx gateway");
  try {
    runNodeCli(playwrightCli, ["test"], {
      environment: {
        E2E_APP_RUNTIME: "self-hosted-container",
        E2E_BASE_URL: appBaseUrl,
        E2E_DATABASE_URL: databaseUrl,
        E2E_DIRECT_SUPABASE_URL: directApiUrl,
        E2E_EXPECT_GATEWAY_REQUIRED: "true",
        E2E_EXTERNAL_WEB_SERVER: "true",
        E2E_MAILPIT_URL: mailpitUrl,
        E2E_SUPABASE_ANON_KEY: generated.anonKey,
        E2E_SUPABASE_SERVICE_ROLE_KEY: generated.serviceRoleKey,
        E2E_SUPABASE_URL: `${appBaseUrl}/supabase`
      },
      label: "Playwright self-hosted acceptance"
    });
  } finally {
    if (databaseUrl) {
      const cleanup = await cleanupLocalE2EFixtures(databaseUrl);
      console.log(
        `[staging] Removed ${cleanup.organizationCount} synthetic tenant(s) and ${cleanup.userCount} synthetic user(s)`
      );
    }
  }

  console.log("[staging] Running streamed backup and restore acceptance");
  runNodeCli(backupAcceptanceScript, [], {
    environment: {
      BACKUP_ACCEPTANCE_DATABASE_USER: "postgres",
      BACKUP_ACCEPTANCE_DB_CONTAINER: "supabase-db",
      BACKUP_RESTORE_ACCEPTANCE_CONFIRM:
        "RUN_DISPOSABLE_BACKUP_RESTORE_ACCEPTANCE"
    },
    label: "Backup restore acceptance"
  });

  const serviceNames = runCompose(["config", "--services"], {
    captureOutput: true,
    label: "Docker Compose service inventory"
  }).stdout.trim().split(/\r?\n/u).filter(Boolean);
  const migrationNames = (await readdir(join(repositoryRoot, "supabase", "migrations")))
    .filter((name) => name.endsWith(".sql"));
  const report = {
    completedAt: new Date().toISOString(),
    dockerEngine: run(dockerCommand, [
      "version",
      "--format",
      "{{.Server.Version}}"
    ], {
      captureOutput: true,
      label: "Docker Engine version"
    }).stdout.trim(),
    loopbackOnlyPortBindings: true,
    migrationCount: migrationNames.length,
    officialSupabaseCommit: lock.commit,
    passedChecks: [
      "pinned-source-integrity",
      "compose-validation",
      "container-health",
      "loopback-network-isolation",
      "database-migrations",
      "database-lint",
      "database-pgtap",
      "same-origin-runtime-config",
      "playwright-critical-lifecycle",
      "playwright-accessibility",
      "streamed-backup-restore"
    ],
    serviceCount: serviceNames.length
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rm(failureLogPath, { force: true });
  console.log(`[staging] Acceptance passed (${report.serviceCount} services)`);
} catch (error) {
  acceptanceError = error;

  if (composeAttempted) {
    await writeFailureDiagnostics(error);
  }
} finally {
  if (composeAttempted) {
    console.log("[staging] Removing disposable containers and volumes");
    runCompose(["down", "--volumes", "--remove-orphans"], {
      allowFailure: true,
      label: "Docker Compose cleanup"
    });
  }

  await rm(stagingRoot, { force: true, recursive: true });
}

if (acceptanceError) {
  throw acceptanceError;
}

async function createStagingEnvironment() {
  const template = await readFile(join(dockerRoot, ".env.example"), "utf8");
  const jwtSecret = randomBytes(48).toString("base64url");
  const anonKey = createLegacyApiKey(jwtSecret, "anon");
  const serviceRoleKey = createLegacyApiKey(jwtSecret, "service_role");
  const postgresPassword = `Yanki_${randomBytes(32).toString("base64url")}`;
  const gatewayToken = randomBytes(48).toString("base64url");
  const evaluationEncryptionKey = randomBytes(32).toString("base64");
  const replacements = {
    ADDITIONAL_REDIRECT_URLS: `${appBaseUrl}/**`,
    ANON_KEY: anonKey,
    API_EXTERNAL_URL: `${appBaseUrl}/supabase/auth/v1`,
    API_GW_HTTP_PORT: String(ports.api),
    DASHBOARD_PASSWORD: `Yanki_${randomBytes(30).toString("base64url")}!1Aa`,
    DASHBOARD_USERNAME: "yanki-staging-operator",
    DISABLE_SIGNUP: "true",
    ENABLE_ANONYMOUS_USERS: "false",
    ENABLE_EMAIL_AUTOCONFIRM: "false",
    ENABLE_EMAIL_SIGNUP: "true",
    ENABLE_PHONE_AUTOCONFIRM: "false",
    ENABLE_PHONE_SIGNUP: "false",
    FUNCTIONS_VERIFY_JWT: "false",
    JWT_SECRET: jwtSecret,
    LOGFLARE_PRIVATE_ACCESS_TOKEN: randomBytes(36).toString("base64url"),
    LOGFLARE_PUBLIC_ACCESS_TOKEN: randomBytes(36).toString("base64url"),
    MINIO_ROOT_PASSWORD: randomBytes(32).toString("base64url"),
    OPENAI_API_KEY: "",
    PG_META_CRYPTO_KEY: randomBytes(32).toString("base64url"),
    POOLER_PROXY_PORT_TRANSACTION: "6543",
    POOLER_TENANT_ID: randomUUID(),
    POSTGRES_PASSWORD: postgresPassword,
    REALTIME_DB_ENC_KEY: randomBytes(8).toString("hex"),
    S3_PROTOCOL_ACCESS_KEY_ID: randomBytes(16).toString("hex"),
    S3_PROTOCOL_ACCESS_KEY_SECRET: randomBytes(32).toString("hex"),
    SECRET_KEY_BASE: randomBytes(64).toString("base64"),
    SERVICE_ROLE_KEY: serviceRoleKey,
    SITE_URL: appBaseUrl,
    SMTP_ADMIN_EMAIL: "staging-operator@example.test",
    SMTP_HOST: "mailpit",
    SMTP_PASS: randomBytes(24).toString("base64url"),
    SMTP_PORT: "1025",
    SMTP_SENDER_NAME: "Yanki Staging",
    SMTP_USER: randomBytes(18).toString("base64url"),
    SUPABASE_PUBLIC_URL: `${appBaseUrl}/supabase`,
    VAULT_ENC_KEY: randomBytes(16).toString("hex"),
    YANKI_REPOSITORY_ROOT: repositoryRoot.replaceAll("\\", "/"),
    YANKI_SENSITIVE_GATEWAY_TOKEN: gatewayToken,
    YANKI_STAGING_API_PORT: String(ports.api),
    YANKI_STAGING_APP_PORT: String(ports.app),
    YANKI_STAGING_DATABASE_PORT: String(ports.database),
    YANKI_STAGING_EVALUATION_ENCRYPTION_KEY: evaluationEncryptionKey,
    YANKI_STAGING_MAILPIT_PORT: String(ports.mailpit),
    YANKI_STAGING_POOLER_SESSION_PORT: String(ports.poolerSession),
    YANKI_STAGING_POOLER_TRANSACTION_PORT: String(ports.poolerTransaction),
    YANKI_STAGING_WEB_IMAGE: `yanki-self-hosted-staging:${process.pid}`
  };
  const content = replaceEnvironmentValues(template, replacements);

  await writeFile(environmentPath, content, { encoding: "utf8", mode: 0o600 });

  return {
    anonKey,
    databaseUrl: createDatabaseUrl(postgresPassword),
    gatewayToken,
    secretValues: [
      ...Object.values(replacements).filter((value) => value.length >= 24),
      postgresPassword,
      evaluationEncryptionKey
    ],
    serviceRoleKey
  };
}

async function preparePinnedCheckout(lock) {
  let checkoutCreated = false;

  if (!existsSync(join(checkoutRoot, ".git"))) {
    await mkdir(toolsRoot, { recursive: true });
    run(gitCommand, [
      "clone",
      "--filter=blob:none",
      "--no-checkout",
      lock.repository,
      checkoutRoot
    ], { label: "Pinned Supabase clone" });
    runCheckoutGit(["sparse-checkout", "set", lock.sparsePath], {
      label: "Pinned Supabase sparse checkout"
    });
    checkoutCreated = true;
  }

  const currentCommit = runCheckoutGit(["rev-parse", "HEAD"], {
    allowFailure: true,
    captureOutput: true,
    label: "Pinned Supabase revision"
  }).stdout.trim();

  if (checkoutCreated || currentCommit !== lock.commit) {
    const objectAvailable = runCheckoutGit([
      "cat-file",
      "-e",
      `${lock.commit}^{commit}`
    ], {
      allowFailure: true,
      captureOutput: true,
      label: "Pinned Supabase object lookup"
    }).status === 0;

    if (!objectAvailable) {
      runCheckoutGit(["fetch", "--depth=1", "origin", lock.commit], {
        label: "Pinned Supabase fetch"
      });
    }

    runCheckoutGit(["checkout", "--detach", lock.commit], {
      label: "Pinned Supabase checkout"
    });
  }
}

async function verifyPinnedFiles(lock) {
  const currentCommit = runCheckoutGit(["rev-parse", "HEAD"], {
    captureOutput: true,
    label: "Pinned Supabase revision verification"
  }).stdout.trim();

  if (currentCommit !== lock.commit) {
    throw new Error("The official Supabase checkout does not match its lock.");
  }

  for (const [relativePath, expectedHash] of Object.entries(lock.files)) {
    const content = await readFile(join(checkoutRoot, relativePath));
    const actualHash = createHash("sha256").update(content).digest("hex");

    if (actualHash !== expectedHash) {
      throw new Error(`Pinned Supabase file integrity failed: ${relativePath}`);
    }
  }
}

async function copyApplicationFunctions() {
  const sourceRoot = join(repositoryRoot, "supabase", "functions");
  const targetRoot = join(dockerRoot, "volumes", "functions");
  const entries = await readdir(sourceRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    await cp(join(sourceRoot, entry.name), join(targetRoot, entry.name), {
      recursive: true
    });
  }
}

function createLegacyApiKey(secret, role) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const payload = encodeJson({
    exp: now + (10 * 365 * 24 * 60 * 60),
    iat: now - 60,
    iss: "yanki-self-hosted-staging",
    role
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function replaceEnvironmentValues(template, replacements) {
  const pending = new Map(Object.entries(replacements));
  const lines = template.split(/\r?\n/u).map((line) => {
    const match = /^([A-Z][A-Z0-9_]*)=/u.exec(line);

    if (!match || !pending.has(match[1])) {
      return line;
    }

    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return `${match[1]}=${value}`;
  });

  if (pending.size > 0) {
    lines.push("", "# Yanki self-hosted staging acceptance");

    for (const [name, value] of pending) {
      lines.push(`${name}=${value}`);
    }
  }

  return `${lines.join("\n").replace(/\n+$/u, "")}\n`;
}

function createDatabaseUrl(password) {
  const url = new URL(`postgresql://postgres@127.0.0.1:${ports.database}/postgres`);
  url.password = password;
  return url.toString();
}

function assertReservedContainersAvailable() {
  const names = run(dockerCommand, [
    "ps",
    "--all",
    "--format",
    "{{.Names}}"
  ], {
    captureOutput: true,
    label: "Docker container name preflight"
  }).stdout.split(/\r?\n/u).filter(Boolean);
  const conflicts = reservedContainerNames.filter((name) => names.includes(name));

  if (conflicts.length > 0) {
    throw new Error(
      `Reserved self-hosted staging containers already exist: ${conflicts.join(", ")}`
    );
  }
}

function verifyContainerIsolation() {
  const containerIds = runCompose(["ps", "--quiet"], {
    captureOutput: true,
    label: "Docker Compose container inventory"
  }).stdout.split(/\r?\n/u).filter(Boolean);

  if (containerIds.length === 0) {
    throw new Error("The self-hosted staging stack has no running containers.");
  }

  for (const containerId of containerIds) {
    const inspected = JSON.parse(run(dockerCommand, [
      "inspect",
      containerId
    ], {
      captureOutput: true,
      label: "Docker container isolation inspection"
    }).stdout)[0];
    const state = inspected?.State;

    if (state?.Status !== "running") {
      throw new Error(`A staging container is not running: ${inspected?.Name}`);
    }

    if (state.Health && state.Health.Status !== "healthy") {
      throw new Error(`A staging container is not healthy: ${inspected?.Name}`);
    }

    for (const bindings of Object.values(inspected?.NetworkSettings?.Ports ?? {})) {
      for (const binding of bindings ?? []) {
        if (!isLoopbackAddress(binding.HostIp)) {
          throw new Error(
            `A staging port is not loopback-only: ${inspected?.Name}`
          );
        }
      }
    }
  }
}

async function verifyRuntimeConfiguration(generated) {
  const response = await fetch(`${appBaseUrl}/app-config.js`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("The application runtime configuration is unavailable.");
  }

  const content = await response.text();

  if (
    !content.includes(`${appBaseUrl}/supabase`)
    || !content.includes(generated.anonKey)
    || content.includes(generated.serviceRoleKey)
    || content.includes(generated.gatewayToken)
  ) {
    throw new Error("The application runtime secret boundary is invalid.");
  }

  const authHealth = await fetch(`${appBaseUrl}/supabase/auth/v1/health`, {
    cache: "no-store"
  });

  if (!authHealth.ok) {
    throw new Error("The same-origin Supabase Auth route is unhealthy.");
  }
}

async function assertPortsAvailable(portValues) {
  for (const port of portValues) {
    await new Promise((resolvePromise, rejectPromise) => {
      const server = net.createServer();

      server.once("error", () => {
        rejectPromise(new Error(`Loopback staging port ${port} is already in use.`));
      });
      server.listen(port, "127.0.0.1", () => {
        server.close(resolvePromise);
      });
    });
  }
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: "no-store" });

      if (response.ok) {
        return;
      }
    } catch {
      // Services can refuse connections while Compose health checks settle.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function writeFailureDiagnostics(error) {
  const status = runCompose(["ps", "--all"], {
    allowFailure: true,
    captureOutput: true,
    label: "Docker Compose failure status"
  });
  const logs = runCompose(["logs", "--no-color", "--tail", "120"], {
    allowFailure: true,
    captureOutput: true,
    label: "Docker Compose failure logs"
  });
  const raw = [
    `Acceptance error: ${error instanceof Error ? error.message : String(error)}`,
    "",
    "Compose status:",
    status.stdout,
    status.stderr,
    "",
    "Compose logs:",
    logs.stdout,
    logs.stderr
  ].join("\n");
  const redacted = generatedSecretValues.reduce(
    (value, secret) => secret ? value.replaceAll(secret, "[REDACTED]") : value,
    raw
  );

  await writeFile(failureLogPath, redacted.slice(-200_000), "utf8");
}

function runCompose(argumentsList, options = {}) {
  return run(dockerCommand, [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    environmentPath,
    "--file",
    baseComposePath,
    "--file",
    overrideComposePath,
    ...argumentsList
  ], options);
}

function runCheckoutGit(argumentsList, options = {}) {
  return run(gitCommand, [
    "-c",
    `safe.directory=${checkoutRoot.replaceAll("\\", "/")}`,
    "-C",
    checkoutRoot,
    ...argumentsList
  ], options);
}

function runNodeCli(cliPath, argumentsList, options = {}) {
  return run(process.execPath, [cliPath, ...argumentsList], options);
}

function run(executable, argumentsList, options = {}) {
  const result = spawnSync(executable, argumentsList, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: childPath,
      ...options.environment
    },
    maxBuffer: 1024 * 1024 * 32,
    stdio: options.captureOutput ? "pipe" : "inherit",
    windowsHide: true
  });

  if (result.error) {
    throw new Error(`${options.label ?? executable} could not start.`, {
      cause: result.error
    });
  }

  if (result.status !== 0 && !options.allowFailure) {
    const output = options.captureOutput
      ? `\n${result.stderr || result.stdout}`
      : "";
    throw new Error(`${options.label ?? executable} failed.${output}`);
  }

  return result;
}

function resolveDockerCommand() {
  if (process.platform !== "win32") {
    return "docker";
  }

  const candidates = [
    process.env.LOCALAPPDATA
      ? join(
          process.env.LOCALAPPDATA,
          "Programs",
          "DockerDesktop",
          "resources",
          "bin",
          "docker.exe"
        )
      : null,
    process.env.ProgramFiles
      ? join(
          process.env.ProgramFiles,
          "Docker",
          "Docker",
          "resources",
          "bin",
          "docker.exe"
        )
      : null
  ];

  return candidates.find((candidate) => candidate && existsSync(candidate))
    ?? "docker.exe";
}

function resolveGitCommand() {
  if (process.platform !== "win32") {
    return "git";
  }

  const candidates = [
    "D:\\Git\\cmd\\git.exe",
    process.env.ProgramFiles
      ? join(process.env.ProgramFiles, "Git", "cmd", "git.exe")
      : null
  ];

  return candidates.find((candidate) => candidate && existsSync(candidate))
    ?? "git.exe";
}

function isLoopbackAddress(value) {
  return value === "127.0.0.1" || value === "::1";
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function readExecutionMode(args) {
  if (args.length === 0) {
    return false;
  }

  if (args.length === 1 && args[0] === "--config-only") {
    return true;
  }

  throw new Error(
    "Usage: node scripts/run-self-hosted-staging-acceptance.mjs [--config-only]"
  );
}

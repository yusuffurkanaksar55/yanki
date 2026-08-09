import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createLocalFunctionSecrets,
  parseLocalSupabaseStatus,
  redactSecret
} from "./lib/local-e2e-environment.mjs";
import { cleanupLocalE2EFixtures } from "./lib/local-e2e-cleanup.mjs";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
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
const secretFilePath = join(
  repositoryRoot,
  ".supabase",
  "e2e-functions.env"
);
const useContainer = readExecutionMode(process.argv.slice(2));
const e2eBaseUrl = useContainer
  ? "http://127.0.0.1:4174"
  : "http://127.0.0.1:4173";
const dockerResources = useContainer
  ? createDockerResources(process.pid)
  : null;
let functionServer = null;
let localDatabaseUrl = null;

try {
  const statusResult = runNodeCli(supabaseCli, "Supabase status", [
    "status",
    "--output",
    "json"
  ], { captureOutput: true });
  const local = parseLocalSupabaseStatus(statusResult.stdout);
  localDatabaseUrl = local.databaseUrl;
  const functionSecrets = createLocalFunctionSecrets({
    requireSensitiveGateway: useContainer
  });

  await mkdir(dirname(secretFilePath), { recursive: true });
  await writeFile(secretFilePath, functionSecrets.content, {
    encoding: "utf8",
    mode: 0o600
  });

  functionServer = await startFunctionServer(
    functionSecrets.encryptionKey
  );

  if (dockerResources) {
    await startApplicationContainer(
      dockerResources,
      e2eBaseUrl,
      local,
      functionSecrets.gatewayToken
    );
  }

  const result = runNodeCli(playwrightCli, "Playwright test", ["test"], {
    environment: {
      E2E_APP_RUNTIME: useContainer ? "container" : "vite",
      E2E_BASE_URL: e2eBaseUrl,
      E2E_DATABASE_URL: local.databaseUrl,
      E2E_EXPECT_GATEWAY_REQUIRED: useContainer ? "true" : "false",
      E2E_EXTERNAL_WEB_SERVER: useContainer ? "true" : "false",
      E2E_MAILPIT_URL: local.mailpitUrl,
      E2E_SUPABASE_ANON_KEY: local.anonKey,
      E2E_SUPABASE_SERVICE_ROLE_KEY: local.serviceRoleKey,
      E2E_SUPABASE_URL: local.apiUrl,
      VITE_SUPABASE_ANON_KEY: local.anonKey,
      VITE_SUPABASE_URL: local.apiUrl
    }
  });

  process.exitCode = result.status ?? 1;
} finally {
  cleanupDockerResources(dockerResources);
  stopFunctionServer(functionServer);

  try {
    await rm(secretFilePath, { force: true });
  } catch (cleanupError) {
    console.error("[e2e] Temporary Function secret cleanup failed.", cleanupError);
    process.exitCode = 1;
  }

  if (localDatabaseUrl) {
    try {
      const cleanup = await cleanupLocalE2EFixtures(localDatabaseUrl);

      if (cleanup.organizationCount > 0) {
        console.log(
          `[e2e] Removed ${cleanup.organizationCount} synthetic tenant(s) and ${cleanup.userCount} synthetic user(s).`
        );
      }
    } catch (cleanupError) {
      console.error("[e2e] Synthetic fixture cleanup failed.", cleanupError);
      process.exitCode = 1;
    }
  }
}

function runNodeCli(cliPath, label, args, options = {}) {
  return runExecutable(process.execPath, label, [cliPath, ...args], options);
}

function runExecutable(executable, label, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, ...options.environment },
    stdio: options.captureOutput ? "pipe" : "inherit",
    windowsHide: true
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = options.captureOutput
      ? `\n${result.stderr || result.stdout}`
      : "";
    throw new Error(`${label} failed.${details}`);
  }

  return result;
}

async function startApplicationContainer(
  resources,
  baseUrl,
  local,
  gatewayToken
) {
  if (!gatewayToken) {
    throw new Error("Container E2E requires a generated gateway token.");
  }

  runExecutable(resources.dockerCommand, "Docker E2E image build", [
    "build",
    "--tag",
    resources.imageName,
    "."
  ]);

  const upstreamUrl = new URL(local.apiUrl);
  upstreamUrl.hostname = "host.docker.internal";
  runExecutable(resources.dockerCommand, "Docker E2E container start", [
    "run",
    "--detach",
    "--name",
    resources.containerName,
    "--add-host",
    "host.docker.internal:host-gateway",
    "--publish",
    "127.0.0.1:4174:8080",
    "--env",
    "SUPABASE_PUBLIC_URL",
    "--env",
    "SUPABASE_UPSTREAM_URL",
    "--env",
    "SUPABASE_ANON_KEY",
    "--env",
    "YANKI_SENSITIVE_GATEWAY_TOKEN",
    "--pull",
    "never",
    resources.imageName
  ], {
    captureOutput: true,
    environment: {
      SUPABASE_ANON_KEY: local.anonKey,
      SUPABASE_PUBLIC_URL: `${baseUrl}/supabase`,
      SUPABASE_UPSTREAM_URL: upstreamUrl.origin,
      YANKI_SENSITIVE_GATEWAY_TOKEN: gatewayToken
    }
  });

  try {
    await waitForHttp(`${baseUrl}/healthz`, 60_000);
  } catch (cause) {
    const logs = runBestEffort(resources.dockerCommand, [
      "logs",
      resources.containerName
    ], { captureOutput: true });
    const output = redactSecret(
      `${logs.stdout ?? ""}${logs.stderr ?? ""}`,
      gatewayToken
    );

    throw new Error(`Docker E2E container did not become healthy.\n${output}`, {
      cause
    });
  }
}

function createDockerResources(processId) {
  return {
    containerName: `yanki-e2e-${processId}`,
    dockerCommand: resolveDockerCommand(),
    imageName: `yanki-e2e:${processId}`
  };
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

function cleanupDockerResources(resources) {
  if (!resources) {
    return;
  }

  runBestEffort(resources.dockerCommand, [
    "rm",
    "--force",
    resources.containerName
  ]);
  runBestEffort(resources.dockerCommand, [
    "image",
    "rm",
    "--force",
    resources.imageName
  ]);
}

function runBestEffort(executable, args, options = {}) {
  return spawnSync(executable, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.captureOutput ? "pipe" : "ignore",
    windowsHide: true
  });
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
      // The container may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

function readExecutionMode(args) {
  if (args.length === 0) {
    return false;
  }

  if (args.length === 1 && args[0] === "--container") {
    return true;
  }

  throw new Error("Usage: node scripts/run-local-e2e.mjs [--container]");
}

async function startFunctionServer(encryptionKey) {
  const child = spawn(
    process.execPath,
    [
      supabaseCli,
      "functions",
      "serve",
      "--env-file",
      secretFilePath
    ],
    {
      cwd: repositoryRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    }
  );
  let output = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output = keepTail(output + chunk);
  });
  child.stderr.on("data", (chunk) => {
    output = keepTail(output + chunk);
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) {
        resolve();
        return;
      }

      reject(new Error(
        `Local Edge Functions did not stay running.\n${redactSecret(output, encryptionKey)}`
      ));
    }, 4_000);

    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(
        `Local Edge Functions exited with code ${code}.\n${redactSecret(output, encryptionKey)}`
      ));
    });
  });

  return child;
}

function keepTail(value) {
  return value.slice(-4_000);
}

function stopFunctionServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill.exe", [
      "/pid",
      String(child.pid),
      "/t",
      "/f"
    ], {
      stdio: "ignore",
      windowsHide: true
    });
    return;
  }

  child.kill("SIGTERM");
}

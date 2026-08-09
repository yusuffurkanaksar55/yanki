import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createLocalFunctionSecrets,
  parseLocalSupabaseStatus,
  redactSecret
} from "./lib/local-e2e-environment.mjs";

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
let functionServer = null;

try {
  const statusResult = runCli(supabaseCli, "Supabase", [
    "status",
    "--output",
    "json"
  ], { captureOutput: true });
  const local = parseLocalSupabaseStatus(statusResult.stdout);
  const functionSecrets = createLocalFunctionSecrets();

  await mkdir(dirname(secretFilePath), { recursive: true });
  await writeFile(secretFilePath, functionSecrets.content, {
    encoding: "utf8",
    mode: 0o600
  });

  functionServer = await startFunctionServer(
    functionSecrets.encryptionKey
  );

  const result = runCli(playwrightCli, "Playwright", ["test"], {
    environment: {
      E2E_BASE_URL: "http://127.0.0.1:4173",
      E2E_DATABASE_URL: local.databaseUrl,
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
  stopFunctionServer(functionServer);
  await rm(secretFilePath, { force: true });
}

function runCli(cliPath, label, args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
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
    throw new Error(`${label} ${args.join(" ")} failed.${details}`);
  }

  return result;
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

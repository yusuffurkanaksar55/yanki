import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = join(
  repositoryRoot,
  ".tools",
  "docker-acceptance-last-report.json"
);
const dockerCommand = resolveDockerCommand();
const childPath = `${dirname(dockerCommand)};${process.env.PATH ?? ""}`;
const supabaseCli = join(
  repositoryRoot,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js"
);
const checks = [
  {
    argumentsList: [join(repositoryRoot, "scripts", "validate-compose-config.mjs")],
    name: "application-compose-config"
  },
  {
    argumentsList: [
      join(repositoryRoot, "scripts", "run-self-hosted-staging-acceptance.mjs"),
      "--config-only"
    ],
    name: "pinned-self-hosted-compose-config"
  },
  {
    argumentsList: [supabaseCli, "db", "lint", "--local"],
    name: "local-database-lint"
  },
  {
    argumentsList: [supabaseCli, "test", "db"],
    name: "local-database-pgtap"
  },
  {
    argumentsList: [
      join(repositoryRoot, "scripts", "run-local-e2e.mjs"),
      "--container"
    ],
    name: "production-container-playwright"
  },
  {
    argumentsList: [
      join(repositoryRoot, "scripts", "verify-backup-restore-acceptance.mjs")
    ],
    environment: {
      BACKUP_RESTORE_ACCEPTANCE_CONFIRM:
        "RUN_DISPOSABLE_BACKUP_RESTORE_ACCEPTANCE"
    },
    name: "streamed-backup-restore"
  }
];
const passedChecks = [];

run(dockerCommand, ["info", "--format", "{{.ServerVersion}}"], {
  captureOutput: true,
  label: "Docker Engine preflight"
});

for (const check of checks) {
  console.log(`[docker-acceptance] Running ${check.name}`);
  run(process.execPath, check.argumentsList, {
    environment: check.environment,
    label: check.name
  });
  passedChecks.push(check.name);
}

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
  passedChecks,
  reusedExistingLocalSupabase: true
};

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`[docker-acceptance] Passed ${passedChecks.length} checks`);

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

  if (result.status !== 0) {
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

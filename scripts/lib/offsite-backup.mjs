import { spawn, spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";

export const expectedResticVersion = "0.19.1";
export const localRepositoryAcceptanceConfirmation =
  "ALLOW_LOCAL_ENCRYPTED_REPOSITORY_FOR_ACCEPTANCE";

const remoteRepositoryPattern =
  /^(?:azure|b2|gs|rclone|rest|s3|sftp|swift):/iu;
const maximumOutputBytes = 1024 * 1024;

export async function readOffsiteBackupConfiguration(
  environment = process.env
) {
  const environmentId = readEnvironmentId(environment.BACKUP_ENVIRONMENT_ID);
  const resticCommand = readOptionalCommand(
    environment.BACKUP_RESTIC_COMMAND,
    "restic"
  );
  const repositoryLocator = await readExclusiveValueOrFile(
    environment.RESTIC_REPOSITORY,
    environment.RESTIC_REPOSITORY_FILE,
    "RESTIC_REPOSITORY",
    "RESTIC_REPOSITORY_FILE"
  );
  await assertResticPasswordConfigured(environment);
  const remoteRepository = remoteRepositoryPattern.test(repositoryLocator);

  if (
    !remoteRepository
    && environment.OFFSITE_BACKUP_ALLOW_LOCAL_REPOSITORY
      !== localRepositoryAcceptanceConfirmation
  ) {
    throw new Error(
      "A local Restic repository is allowed only for explicit acceptance testing."
    );
  }

  const stdinFilename = `yanki-postgresql-${environmentId}.dump`;
  const tags = [
    "yanki-postgres",
    `environment:${environmentId}`,
    "format:pgdump-custom-v1"
  ];

  return Object.freeze({
    environmentId,
    resticCommand,
    remoteRepository,
    stdinFilename,
    tags: Object.freeze(tags)
  });
}

export function createBackupSource(environment = process.env) {
  const mode = environment.BACKUP_SOURCE_MODE?.trim().toUpperCase();

  if (mode === "DOCKER") {
    const containerName = readSafeName(
      environment.BACKUP_SOURCE_DB_CONTAINER,
      "BACKUP_SOURCE_DB_CONTAINER"
    );
    const databaseUser = readSafeName(
      environment.BACKUP_SOURCE_DATABASE_USER,
      "BACKUP_SOURCE_DATABASE_USER"
    );
    const databaseName = readSafeName(
      environment.BACKUP_SOURCE_DATABASE,
      "BACKUP_SOURCE_DATABASE"
    );

    return {
      command: "docker",
      argumentsList: [
        "exec",
        containerName,
        "pg_dump",
        "--format=custom",
        "--compress=0",
        "--no-owner",
        "--username",
        databaseUser,
        databaseName
      ],
      environment: { ...environment },
      mode
    };
  }

  if (mode === "DATABASE_URL") {
    const databaseUrl = environment.BACKUP_DATABASE_URL?.trim();

    if (
      !databaseUrl
      || !/^postgres(?:ql)?:\/\//u.test(databaseUrl)
    ) {
      throw new Error("BACKUP_DATABASE_URL must be a PostgreSQL URL.");
    }

    return {
      command: readOptionalCommand(
        environment.BACKUP_PG_DUMP_COMMAND,
        "pg_dump"
      ),
      argumentsList: [
        "--format=custom",
        "--compress=0",
        "--no-owner",
        "--no-password"
      ],
      environment: {
        ...environment,
        PGDATABASE: databaseUrl
      },
      mode
    };
  }

  throw new Error("BACKUP_SOURCE_MODE must be DOCKER or DATABASE_URL.");
}

export function buildResticBackupArguments(configuration, source) {
  const argumentsList = [
    "backup",
    "--json",
    "--compression",
    "max",
    "--host",
    configuration.environmentId,
    "--stdin-filename",
    configuration.stdinFilename
  ];

  for (const tag of configuration.tags) {
    argumentsList.push("--tag", tag);
  }

  argumentsList.push(
    "--stdin-from-command",
    "--",
    source.command,
    ...source.argumentsList
  );

  return argumentsList;
}

export function readRetentionPolicy(environment = process.env) {
  const policy = {
    daily: readRetentionCount(environment.BACKUP_KEEP_DAILY, "BACKUP_KEEP_DAILY"),
    weekly: readRetentionCount(
      environment.BACKUP_KEEP_WEEKLY,
      "BACKUP_KEEP_WEEKLY"
    ),
    monthly: readRetentionCount(
      environment.BACKUP_KEEP_MONTHLY,
      "BACKUP_KEEP_MONTHLY"
    ),
    yearly: readRetentionCount(
      environment.BACKUP_KEEP_YEARLY,
      "BACKUP_KEEP_YEARLY"
    )
  };

  if (Object.values(policy).every((value) => value === 0)) {
    throw new Error("At least one off-site backup retention tier is required.");
  }

  return Object.freeze(policy);
}

export function buildResticRetentionArguments(configuration, policy) {
  return [
    "forget",
    "--json",
    "--prune",
    "--host",
    configuration.environmentId,
    "--tag",
    configuration.tags.join(","),
    "--group-by",
    "host,paths,tags",
    "--keep-daily",
    String(policy.daily),
    "--keep-weekly",
    String(policy.weekly),
    "--keep-monthly",
    String(policy.monthly),
    "--keep-yearly",
    String(policy.yearly)
  ];
}

export function readIntegritySubset(value) {
  const subset = value?.trim() || "5%";

  if (
    !/^(?:(?:100|[1-9]?[0-9](?:\.[0-9]+)?)%|[1-9][0-9]*\/[1-9][0-9]*|[1-9][0-9]*[KMGT])$/u.test(subset)
  ) {
    throw new Error("BACKUP_CHECK_READ_DATA_SUBSET is invalid.");
  }

  if (subset.includes("/")) {
    const [part, total] = subset.split("/").map(Number);

    if (part > total) {
      throw new Error("The integrity subset part cannot exceed its total.");
    }
  }

  if (subset.endsWith("%") && Number(subset.slice(0, -1)) <= 0) {
    throw new Error("The integrity subset percentage must be greater than zero.");
  }

  return subset;
}

export function assertSnapshotMatches(
  snapshot,
  configuration,
  expectedSnapshotId
) {
  if (
    typeof snapshot !== "object"
    || snapshot === null
    || Array.isArray(snapshot)
    || snapshot.id !== expectedSnapshotId
    || snapshot.hostname !== configuration.environmentId
    || !Array.isArray(snapshot.tags)
    || !configuration.tags.every((tag) => snapshot.tags.includes(tag))
    || !Array.isArray(snapshot.paths)
    || !snapshot.paths.some((path) => (
      typeof path === "string"
      && path.replaceAll("\\", "/").split("/").at(-1)
        === configuration.stdinFilename
    ))
  ) {
    throw new Error(
      "The selected snapshot does not match the expected backup environment."
    );
  }

  return true;
}

export function parseBackupSummary(output) {
  const messages = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const summary = messages.findLast((message) => (
    message.message_type === "summary"
  ));

  if (
    !summary
    || typeof summary.snapshot_id !== "string"
    || !/^[a-f0-9]{64}$/u.test(summary.snapshot_id)
  ) {
    throw new Error("Restic did not return a valid backup snapshot summary.");
  }

  return {
    snapshotId: summary.snapshot_id,
    sourceBytes: readNonNegativeInteger(summary.total_bytes_processed),
    repositoryBytesAdded: readNonNegativeInteger(summary.data_added)
  };
}

export function assertResticVersion(command, environment = process.env) {
  const result = spawnSync(command, ["version"], {
    encoding: "utf8",
    env: environment,
    windowsHide: true
  });

  if (result.error || result.status !== 0) {
    throw new Error("The pinned Restic backup tool is unavailable.");
  }

  const version = result.stdout.match(/^restic ([0-9]+\.[0-9]+\.[0-9]+)/u)?.[1];

  if (version !== expectedResticVersion) {
    throw new Error(`Restic ${expectedResticVersion} is required.`);
  }
}

export function runRestic(command, argumentsList, environment = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      encoding: "utf8",
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (stdout.length < maximumOutputBytes) {
        stdout += chunk.slice(0, maximumOutputBytes - stdout.length);
      }
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < maximumOutputBytes) {
        stderr += chunk.slice(0, maximumOutputBytes - stderr.length);
      }
    });
    child.once("error", () => {
      reject(new Error("The Restic process could not start."));
    });
    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(`The Restic operation failed with exit code ${code}.`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function readEnvironmentId(value) {
  if (
    typeof value !== "string"
    || !/^[a-z0-9][a-z0-9_-]{2,63}$/u.test(value)
  ) {
    throw new Error("BACKUP_ENVIRONMENT_ID is invalid.");
  }

  return value;
}

function readSafeName(value, name) {
  if (
    typeof value !== "string"
    || !/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/u.test(value)
  ) {
    throw new Error(`${name} is invalid.`);
  }

  return value;
}

function readOptionalCommand(value, fallback) {
  const command = value?.trim() || fallback;

  if (command.includes("\0") || command.length > 1024) {
    throw new Error("A backup tool command path is invalid.");
  }

  return command;
}

async function readExclusiveValueOrFile(value, filePath, valueName, fileName) {
  const directValue = value?.trim();
  const configuredFilePath = filePath?.trim();

  if (Boolean(directValue) === Boolean(configuredFilePath)) {
    throw new Error(`Configure exactly one of ${valueName} or ${fileName}.`);
  }

  if (directValue) {
    return directValue;
  }

  const contents = (await readFile(configuredFilePath, "utf8")).trim();

  if (!contents) {
    throw new Error(`${fileName} points to an empty file.`);
  }

  return contents;
}

async function assertResticPasswordConfigured(environment) {
  const password = environment.RESTIC_PASSWORD;
  const passwordFile = environment.RESTIC_PASSWORD_FILE?.trim();

  if (Boolean(password) === Boolean(passwordFile)) {
    throw new Error(
      "Configure exactly one of RESTIC_PASSWORD or RESTIC_PASSWORD_FILE."
    );
  }

  if (password && Buffer.byteLength(password, "utf8") < 20) {
    throw new Error("The Restic repository password must be at least 20 bytes.");
  }

  if (passwordFile) {
    const file = await stat(passwordFile);

    if (!file.isFile() || file.size < 20) {
      throw new Error("RESTIC_PASSWORD_FILE is invalid or too short.");
    }
  }
}

function readRetentionCount(value, name) {
  if (typeof value !== "string" || !/^[0-9]{1,4}$/u.test(value)) {
    throw new Error(`${name} must be an integer from 0 to 3650.`);
  }

  const count = Number(value);

  if (count > 3650) {
    throw new Error(`${name} must be an integer from 0 to 3650.`);
  }

  return count;
}

function readNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

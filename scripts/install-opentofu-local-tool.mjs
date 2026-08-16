import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const version = "1.12.1";
const archiveSha256 =
  "a6d8fd924753ab6d3d4f0143d29214a31679a5fca8bfb59f5edde263b3a1c3fc";
const executableSha256 =
  "2e195e0648c4bc4087d3e9012cac9b7a51f73adb51478df6200a2516aa91fecd";
const archiveName = `tofu_${version}_windows_amd64.zip`;
const downloadUrl =
  `https://github.com/opentofu/opentofu/releases/download/v${version}/${archiveName}`;

if (process.platform !== "win32" || process.arch !== "x64") {
  throw new Error(
    "The local installer supports Windows x64 only; install OpenTofu 1.12.1 through the approved host package process."
  );
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const toolDirectory = resolve(repositoryRoot, ".tools", "opentofu");
const archivePath = resolve(toolDirectory, archiveName);
const extractedPath = resolve(toolDirectory, "tofu.exe");
const stagedDirectory = resolve(toolDirectory, `.extract-${process.pid}`);
const stagedExecutablePath = resolve(stagedDirectory, "tofu.exe");
const existingVersion = spawnSync(extractedPath, ["version"], {
  encoding: "utf8",
  windowsHide: true
});
const existingSha256 = await hashFile(extractedPath);

if (
  existingVersion.status === 0
  && existingVersion.stdout.startsWith(`OpenTofu v${version}`)
  && existingSha256 === executableSha256
) {
  printResult(false);
  process.exit(0);
}

process.umask(0o077);
await mkdir(toolDirectory, { recursive: true });

const response = await fetch(downloadUrl, { redirect: "follow" });

if (!response.ok) {
  throw new Error(`OpenTofu download failed with status ${response.status}.`);
}

const archive = Buffer.from(await response.arrayBuffer());
const actualSha256 = createHash("sha256").update(archive).digest("hex");

if (actualSha256 !== archiveSha256) {
  throw new Error(
    "The OpenTofu archive checksum does not match the pinned release."
  );
}

await writeFile(archivePath, archive, { mode: 0o600 });

try {
  await rm(stagedDirectory, { recursive: true, force: true });
  await mkdir(stagedDirectory, { recursive: true });
  const extraction = spawnSync(
    "tar.exe",
    ["-xf", archivePath, "-C", stagedDirectory],
    { encoding: "utf8", windowsHide: true }
  );

  if (extraction.error || extraction.status !== 0) {
    throw new Error("The pinned OpenTofu archive could not be extracted.");
  }

  const stagedVersion = spawnSync(stagedExecutablePath, ["version"], {
    encoding: "utf8",
    windowsHide: true
  });

  if (
    stagedVersion.status !== 0
    || !stagedVersion.stdout.startsWith(`OpenTofu v${version}`)
    || await hashFile(stagedExecutablePath) !== executableSha256
  ) {
    throw new Error(
      "The staged OpenTofu binary did not pass its version check."
    );
  }

  await rm(extractedPath, { force: true });
  await rename(stagedExecutablePath, extractedPath);
} finally {
  await rm(archivePath, { force: true });
  await rm(stagedDirectory, { recursive: true, force: true });
}

const installedVersion = spawnSync(extractedPath, ["version"], {
  encoding: "utf8",
  windowsHide: true
});

if (
  installedVersion.status !== 0
  || !installedVersion.stdout.startsWith(`OpenTofu v${version}`)
) {
  throw new Error(
    "The installed OpenTofu binary did not pass its version check."
  );
}

printResult(true);

function printResult(installed) {
  console.log(JSON.stringify({
    archiveSha256Pinned: true,
    executableSha256Verified: true,
    installed,
    relativeExecutable: ".tools/opentofu/tofu.exe",
    version
  }, null, 2));
}

async function hashFile(path) {
  try {
    return createHash("sha256").update(await readFile(path)).digest("hex");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

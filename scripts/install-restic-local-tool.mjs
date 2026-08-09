import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { resolve } from "node:path";

const version = "0.19.1";
const archiveSha256 =
  "da948ad707ed690426473aaba2046cd61f8f90f6f0e7dab6be0d5796531de67d";
const archiveName = `restic_${version}_windows_amd64.zip`;
const binaryName = `restic_${version}_windows_amd64.exe`;
const downloadUrl =
  `https://github.com/restic/restic/releases/download/v${version}/${archiveName}`;

if (process.platform !== "win32" || process.arch !== "x64") {
  throw new Error(
    "The local installer supports Windows x64 only; install the pinned Restic version through the production host package process."
  );
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const toolDirectory = resolve(repositoryRoot, ".tools", "restic");
const archivePath = resolve(toolDirectory, archiveName);
const extractedPath = resolve(toolDirectory, binaryName);
const executablePath = resolve(toolDirectory, "restic.exe");
const existingVersion = spawnSync(executablePath, ["version"], {
  encoding: "utf8",
  windowsHide: true
});

if (
  existingVersion.status === 0
  && existingVersion.stdout.startsWith(`restic ${version} `)
) {
  printResult(false);
  process.exit(0);
}

process.umask(0o077);
await mkdir(toolDirectory, { recursive: true });

const response = await fetch(downloadUrl, { redirect: "follow" });

if (!response.ok) {
  throw new Error(`Restic download failed with status ${response.status}.`);
}

const archive = Buffer.from(await response.arrayBuffer());
const actualSha256 = createHash("sha256").update(archive).digest("hex");

if (actualSha256 !== archiveSha256) {
  throw new Error("The Restic archive checksum does not match the pinned release.");
}

await writeFile(archivePath, archive, { mode: 0o600 });

try {
  const extraction = spawnSync(
    "tar.exe",
    ["-xf", archivePath, "-C", toolDirectory],
    { encoding: "utf8", windowsHide: true }
  );

  if (extraction.error || extraction.status !== 0) {
    throw new Error("The pinned Restic archive could not be extracted.");
  }

  await rm(executablePath, { force: true });
  await rename(extractedPath, executablePath);
} finally {
  await rm(archivePath, { force: true });
}

const installedVersion = spawnSync(executablePath, ["version"], {
  encoding: "utf8",
  windowsHide: true
});

if (
  installedVersion.status !== 0
  || !installedVersion.stdout.startsWith(`restic ${version} `)
) {
  throw new Error("The installed Restic binary did not pass its version check.");
}

printResult(true);

function printResult(installed) {
  console.log(JSON.stringify({
    installed,
    relativeExecutable: ".tools/restic/restic.exe",
    sha256Verified: true,
    version
  }, null, 2));
}

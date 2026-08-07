import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const windowsCandidates = [
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
].filter((candidate) => typeof candidate === "string");
const dockerCommand = process.platform === "win32"
  ? windowsCandidates.find((candidate) => existsSync(candidate)) ?? "docker.exe"
  : "docker";
const result = spawnSync(
  dockerCommand,
  [
    "compose",
    "--env-file",
    "deploy/compose.env.example",
    "config",
    "--quiet"
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit"
  }
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;

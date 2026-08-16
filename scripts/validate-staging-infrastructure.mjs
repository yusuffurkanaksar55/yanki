import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const infrastructureDirectory = resolve(
  repositoryRoot,
  "deploy",
  "staging",
  "aws"
);
const localExecutable = resolve(
  repositoryRoot,
  ".tools",
  "opentofu",
  process.platform === "win32" ? "tofu.exe" : "tofu"
);
const executable = existsSync(localExecutable) ? localExecutable : "tofu";
const version = run(["version"], "OpenTofu version").stdout
  .split(/\r?\n/u)[0]
  .trim();

run(["fmt", "-check", "-recursive", infrastructureDirectory], "OpenTofu fmt");
run([
  `-chdir=${infrastructureDirectory}`,
  "init",
  "-backend=false",
  "-input=false",
  "-lockfile=readonly",
  "-no-color"
], "OpenTofu init");
run([
  `-chdir=${infrastructureDirectory}`,
  "validate",
  "-no-color"
], "OpenTofu validate");

console.log(JSON.stringify({
  backendInitialized: false,
  checks: ["format", "provider-lock", "configuration"],
  directory: "deploy/staging/aws",
  valid: true,
  version
}, null, 2));

function run(argumentsList, label) {
  const result = spawnSync(executable, argumentsList, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16,
    windowsHide: true
  });

  if (result.error) {
    throw new Error(
      `${label} could not start. Run npm run staging:infra:tool:install first.`,
      { cause: result.error }
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} failed.\n${result.stderr || result.stdout}`
    );
  }

  return result;
}

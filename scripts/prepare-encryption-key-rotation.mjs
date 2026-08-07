import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import {
  assertEncryptionKeyVersion,
  createEncryptionKeyRotationEnvironment
} from "./lib/encryption-key-rotation.mjs";

const version = process.argv[2];

assertEncryptionKeyVersion(version);

const repositoryRoot = resolve(import.meta.dirname, "..");
const secretDirectory = resolve(repositoryRoot, ".secrets");
const outputPath = resolve(
  repositoryRoot,
  process.argv[3] ?? ".secrets/encryption-key-rotation.env"
);
const relativeOutputPath = relative(secretDirectory, outputPath);

if (
  relativeOutputPath === ""
  || relativeOutputPath === ".."
  || relativeOutputPath.startsWith(`..${sep}`)
) {
  throw new Error("The rotation file must be created inside the ignored .secrets directory.");
}

process.umask(0o077);
await mkdir(dirname(outputPath), { recursive: true });

const encodedKey = randomBytes(32).toString("base64");
const contents = createEncryptionKeyRotationEnvironment(version, encodedKey);

await writeFile(outputPath, contents, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600
});

console.log(JSON.stringify({
  keyVersion: version,
  nextStep: "Upload this env file to the secret manager, verify health, then delete it.",
  outputFile: relative(repositoryRoot, outputPath).replaceAll("\\", "/")
}, null, 2));

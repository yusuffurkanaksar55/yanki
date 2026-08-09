import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { sha256File } from "./lib/container-release.mjs";

const releaseDirectory = resolve(
  process.cwd(),
  process.env.YANKI_RELEASE_OUTPUT_DIR ?? "release"
);
const checksumFileName = "SHA256SUMS";
const fileNames = readdirSync(releaseDirectory)
  .filter((fileName) => fileName !== checksumFileName)
  .filter((fileName) => statSync(join(releaseDirectory, fileName)).isFile())
  .sort((left, right) => left.localeCompare(right));

if (fileNames.length === 0) {
  throw new Error("Release directory contains no files to checksum.");
}

const checksumText = fileNames
  .map((fileName) => `${sha256File(join(releaseDirectory, fileName))}  ${fileName}`)
  .join("\n");
writeFileSync(join(releaseDirectory, checksumFileName), `${checksumText}\n`, {
  encoding: "utf8",
  flag: "wx"
});

process.stdout.write(
  `${JSON.stringify({ status: "created", algorithm: "SHA-256", fileCount: fileNames.length })}\n`
);

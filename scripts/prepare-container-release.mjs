import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { basename, join, resolve } from "node:path";

import {
  createReleaseManifest,
  sha256File,
  validateReleaseTag
} from "./lib/container-release.mjs";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const releaseTag = process.env.YANKI_RELEASE_TAG;

if (process.argv.includes("--validate-tag")) {
  const release = validateReleaseTag(releaseTag, packageJson.version);
  process.stdout.write(`${JSON.stringify({ status: "valid", ...release })}\n`);
  process.exit(0);
}

const outputDirectory = resolve(
  root,
  process.env.YANKI_RELEASE_OUTPUT_DIR ?? "release"
);
const imageReference = `${process.env.YANKI_IMAGE_REPOSITORY}@${process.env.YANKI_IMAGE_DIGEST}`;
const releaseFiles = {
  "compose.yaml": join(root, "deploy", "release", "compose.yaml"),
  "verify-release-installation.mjs": join(
    root,
    "scripts",
    "verify-release-installation.mjs"
  )
};

mkdirSync(outputDirectory, { recursive: true });

for (const [fileName, sourcePath] of Object.entries(releaseFiles)) {
  copyFileSync(sourcePath, join(outputDirectory, fileName));
}

const environmentTemplate = readFileSync(
  join(root, "deploy", "release", "compose.env.example"),
  "utf8"
);
if (!environmentTemplate.includes("__YANKI_IMAGE_REFERENCE__")) {
  throw new Error("Release environment template is missing its image placeholder.");
}
writeFileSync(
  join(outputDirectory, "compose.env.example"),
  environmentTemplate.replace("__YANKI_IMAGE_REFERENCE__", imageReference),
  { encoding: "utf8", flag: "wx" }
);

const sbomPath = resolve(root, process.env.YANKI_SBOM_PATH ?? "release/image-sbom.json");
const provenancePath = resolve(
  root,
  process.env.YANKI_PROVENANCE_PATH ?? "release/image-provenance.json"
);
const installationPath = join(outputDirectory, "INSTALLATION.md");
const parsedRelease = validateReleaseTag(releaseTag, packageJson.version);
const installationGuide = `# Yanki ${parsedRelease.tag} Installation\n\n` +
  "This package is installed only by the digest already pinned in `compose.env.example`. " +
  "Do not replace it with a tag.\n\n" +
  "1. Install Docker Engine, Docker Compose v2, Node.js 20 or newer, jq, and Cosign 3.0.6.\n" +
  "2. Keep every downloaded release file in one directory.\n" +
  "3. Follow the independent manifest-signature and verifier-hash bootstrap in the trusted `docs/INSTALLATION_ACCEPTANCE.md` handover copy.\n" +
  "4. Run `YANKI_RELEASE_ACCEPTANCE_CONFIRM=VERIFY_PINNED_YANKI_RELEASE node verify-release-installation.mjs`.\n" +
  "5. Copy `compose.env.example` to a protected deployment environment file and replace only the environment-specific placeholders.\n" +
  "6. Run `docker compose --env-file .env.deploy -f compose.yaml up -d --wait --no-build`.\n\n" +
  "The acceptance command verifies the trusted GitHub Actions identity, manifest-bound file hashes, " +
  "image digest and OCI labels, Nginx configuration, runtime public-config boundary, and container health.\n";
writeFileSync(installationPath, installationGuide, { encoding: "utf8", flag: "wx" });

const artifactPaths = {
  "compose.env.example": join(outputDirectory, "compose.env.example"),
  "compose.yaml": join(outputDirectory, "compose.yaml"),
  "image-provenance.json": provenancePath,
  "image-sbom.json": sbomPath,
  "INSTALLATION.md": installationPath,
  "verify-release-installation.mjs": join(
    outputDirectory,
    "verify-release-installation.mjs"
  )
};
const artifacts = Object.fromEntries(
  Object.entries(artifactPaths).map(([fileName, filePath]) => [
    fileName,
    sha256File(filePath)
  ])
);
const manifest = createReleaseManifest({
  releaseTag,
  packageVersion: packageJson.version,
  sourceCommit: process.env.YANKI_SOURCE_COMMIT,
  imageRepository: process.env.YANKI_IMAGE_REPOSITORY,
  imageDigest: process.env.YANKI_IMAGE_DIGEST,
  artifacts
});
const manifestPath = join(outputDirectory, "release-manifest.json");
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx"
});

process.stdout.write(
  `${JSON.stringify({
    status: "prepared",
    releaseTag: parsedRelease.tag,
    imageReference: manifest.image.reference,
    manifest: basename(manifestPath),
    artifactCount: Object.keys(artifacts).length
  })}\n`
);

import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const TRUSTED_GITHUB_REPOSITORY = "yusuffurkanaksar55/yanki";
const TRUSTED_SOURCE_REPOSITORY = `https://github.com/${TRUSTED_GITHUB_REPOSITORY}`;
const TRUSTED_WORKFLOW_PATH = ".github/workflows/container-release.yml";
const TRUSTED_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const REQUIRED_CONFIRMATION = "VERIFY_PINNED_YANKI_RELEASE";
const EXPECTED_ARTIFACTS = [
  "compose.env.example",
  "compose.yaml",
  "image-provenance.json",
  "image-sbom.json",
  "INSTALLATION.md",
  "verify-release-installation.mjs"
];
const releaseTagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const sourceCommitPattern = /^[0-9a-f]{40}$/;
const imageDigestPattern = /^sha256:[0-9a-f]{64}$/;
const artifactDigestPattern = /^[0-9a-f]{64}$/;
const imageRepositoryPattern = /^ghcr\.io\/[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?\/[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/;

function fail(message) {
  throw new Error(message);
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function runCommand(command, args, label, inheritOutput = false) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: inheritOutput ? "inherit" : "pipe",
    windowsHide: true
  });

  if (result.error) {
    throw new Error(`${label} could not start.`, { cause: result.error });
  }
  if (result.status !== 0) {
    fail(`${label} failed.`);
  }

  return inheritOutput ? "" : result.stdout.trim();
}

function commandCandidates(name, environmentValue, additionalCandidates = []) {
  const candidates = [environmentValue, ...additionalCandidates, name].filter(Boolean);
  return [...new Set(candidates)];
}

function findCommand(name, environmentValue, additionalCandidates = []) {
  for (const candidate of commandCandidates(name, environmentValue, additionalCandidates)) {
    const probe = spawnSync(candidate, ["version"], {
      encoding: "utf8",
      stdio: "ignore",
      windowsHide: true
    });
    if (!probe.error && probe.status === 0) {
      return candidate;
    }
  }

  fail(`${name} is required for release acceptance.`);
}

function readManifest(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  if (manifest?.schemaVersion !== 1 || manifest?.product !== "Yanki") {
    fail("Release manifest schema or product is unsupported.");
  }
  const releaseTag = manifest.release?.tag;
  if (!releaseTagPattern.test(releaseTag)) {
    fail("Release manifest tag is invalid.");
  }
  if (manifest.release?.version !== releaseTag.slice(1)) {
    fail("Release manifest tag and version do not match.");
  }
  if (manifest.release?.sourceRepository !== TRUSTED_SOURCE_REPOSITORY) {
    fail("Release manifest source repository is not trusted.");
  }
  if (!sourceCommitPattern.test(manifest.release?.sourceCommit)) {
    fail("Release manifest source commit is invalid.");
  }

  const imageRepository = manifest.image?.repository;
  const imageDigest = manifest.image?.digest;
  if (!imageRepositoryPattern.test(imageRepository)) {
    fail("Release image repository is invalid.");
  }
  if (!imageDigestPattern.test(imageDigest)) {
    fail("Release image digest is invalid.");
  }
  if (manifest.image?.reference !== `${imageRepository}@${imageDigest}`) {
    fail("Release image is not pinned to its exact digest.");
  }
  if (JSON.stringify(manifest.image?.platforms) !== JSON.stringify(["linux/amd64", "linux/arm64"])) {
    fail("Release image platform set is unsupported.");
  }

  const expectedIdentity = `${TRUSTED_SOURCE_REPOSITORY}/${TRUSTED_WORKFLOW_PATH}@refs/tags/${releaseTag}`;
  if (
    manifest.trust?.signature?.format !== "sigstore-cosign-keyless" ||
    manifest.trust?.signature?.certificateIdentity !== expectedIdentity ||
    manifest.trust?.signature?.oidcIssuer !== TRUSTED_OIDC_ISSUER
  ) {
    fail("Release signature identity is not trusted.");
  }
  if (manifest.trust?.githubAttestation?.repository !== TRUSTED_GITHUB_REPOSITORY) {
    fail("GitHub attestation repository is not trusted.");
  }

  const artifactNames = Object.keys(manifest.artifacts ?? {}).sort();
  if (JSON.stringify(artifactNames) !== JSON.stringify([...EXPECTED_ARTIFACTS].sort())) {
    fail("Release manifest artifact set is incomplete or unexpected.");
  }
  for (const fileName of artifactNames) {
    if (!artifactDigestPattern.test(manifest.artifacts[fileName]?.sha256)) {
      fail(`Release artifact digest is invalid for ${fileName}.`);
    }
  }

  return manifest;
}

function verifyManifestArtifacts(manifest, releaseDirectory) {
  for (const [fileName, artifact] of Object.entries(manifest.artifacts)) {
    const filePath = join(releaseDirectory, fileName);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      fail(`Release artifact is missing: ${fileName}.`);
    }
    if (sha256File(filePath) !== artifact.sha256) {
      fail(`Release artifact checksum mismatch: ${fileName}.`);
    }
  }

  JSON.parse(readFileSync(join(releaseDirectory, "image-sbom.json"), "utf8"));
  JSON.parse(readFileSync(join(releaseDirectory, "image-provenance.json"), "utf8"));
}

function verifyChecksumFile(releaseDirectory) {
  const checksumPath = join(releaseDirectory, "SHA256SUMS");
  if (!existsSync(checksumPath)) {
    fail("SHA256SUMS is missing.");
  }

  const entries = new Map();
  for (const line of readFileSync(checksumPath, "utf8").trim().split("\n")) {
    const match = /^([0-9a-f]{64}) {2}([A-Za-z0-9._-]+)$/.exec(line.trimEnd());
    if (!match || entries.has(match[2]) || match[2] === "SHA256SUMS") {
      fail("SHA256SUMS contains an invalid or duplicate entry.");
    }
    entries.set(match[2], match[1]);
  }

  const actualFiles = readdirSync(releaseDirectory)
    .filter((fileName) => fileName !== "SHA256SUMS")
    .filter((fileName) => statSync(join(releaseDirectory, fileName)).isFile())
    .sort();
  if (JSON.stringify([...entries.keys()].sort()) !== JSON.stringify(actualFiles)) {
    fail("SHA256SUMS does not cover the exact release file set.");
  }

  for (const [fileName, digest] of entries) {
    if (sha256File(join(releaseDirectory, fileName)) !== digest) {
      fail(`SHA256SUMS mismatch: ${fileName}.`);
    }
  }
}

function verifyPinnedEnvironment(manifest, releaseDirectory) {
  const environmentText = readFileSync(
    join(releaseDirectory, "compose.env.example"),
    "utf8"
  );
  const imageLines = environmentText
    .split(/\r?\n/)
    .filter((line) => line.startsWith("YANKI_IMAGE="));

  if (imageLines.length !== 1 || imageLines[0] !== `YANKI_IMAGE=${manifest.image.reference}`) {
    fail("Compose environment does not pin the exact release image digest.");
  }
  if (readFileSync(join(releaseDirectory, "compose.yaml"), "utf8").includes("build:")) {
    fail("Release Compose file must not rebuild application source.");
  }
}

async function waitForHealthyContainer(dockerCommand, containerName) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = runCommand(
      dockerCommand,
      ["inspect", "--format", "{{.State.Health.Status}}", containerName],
      "Container health inspection"
    );
    if (status === "healthy") {
      return;
    }
    if (status === "unhealthy") {
      fail("Release acceptance container became unhealthy.");
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
  }

  fail("Release acceptance container did not become healthy in time.");
}

const manifestArgumentIndex = process.argv.indexOf("--manifest");
const manifestInput = manifestArgumentIndex >= 0
  ? process.argv[manifestArgumentIndex + 1]
  : process.env.YANKI_RELEASE_MANIFEST_PATH ?? "release-manifest.json";
if (!manifestInput) {
  fail("--manifest requires a file path.");
}
const manifestPath = isAbsolute(manifestInput)
  ? manifestInput
  : resolve(process.cwd(), manifestInput);
const releaseDirectory = dirname(manifestPath);
const metadataOnly = process.argv.includes("--metadata-only");
const manifest = readManifest(manifestPath);

verifyManifestArtifacts(manifest, releaseDirectory);
verifyPinnedEnvironment(manifest, releaseDirectory);

if (metadataOnly) {
  process.stdout.write(
    `${JSON.stringify({
      status: "metadata_validated",
      releaseTag: manifest.release.tag,
      imageReference: manifest.image.reference,
      artifactCount: Object.keys(manifest.artifacts).length
    })}\n`
  );
  process.exit(0);
}

if (process.env.YANKI_RELEASE_ACCEPTANCE_CONFIRM !== REQUIRED_CONFIRMATION) {
  fail(`Set YANKI_RELEASE_ACCEPTANCE_CONFIRM=${REQUIRED_CONFIRMATION} to run acceptance.`);
}

verifyChecksumFile(releaseDirectory);

const cosignCommand = findCommand(
  process.platform === "win32" ? "cosign.exe" : "cosign",
  process.env.YANKI_COSIGN_COMMAND
);
const dockerCandidates = process.platform === "win32"
  ? [
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
    ].filter(Boolean)
  : [];
const dockerCommand = findCommand(
  process.platform === "win32" ? "docker.exe" : "docker",
  process.env.YANKI_DOCKER_COMMAND,
  dockerCandidates
);
const certificateIdentity = manifest.trust.signature.certificateIdentity;

runCommand(
  cosignCommand,
  [
    "verify-blob",
    manifestPath,
    "--bundle",
    join(releaseDirectory, "release-manifest.sigstore.json"),
    "--certificate-identity",
    certificateIdentity,
    "--certificate-oidc-issuer",
    TRUSTED_OIDC_ISSUER
  ],
  "Release manifest signature verification",
  true
);
runCommand(
  cosignCommand,
  [
    "verify",
    manifest.image.reference,
    "--certificate-identity",
    certificateIdentity,
    "--certificate-oidc-issuer",
    TRUSTED_OIDC_ISSUER
  ],
  "Container signature verification",
  true
);

runCommand(dockerCommand, ["pull", manifest.image.reference], "Release image pull", true);

const labels = JSON.parse(
  runCommand(
    dockerCommand,
    ["image", "inspect", "--format", "{{json .Config.Labels}}", manifest.image.reference],
    "Release image label inspection"
  )
);
for (const [labelName, labelValue] of Object.entries(manifest.image.requiredLabels)) {
  if (labels?.[labelName] !== labelValue) {
    fail(`Release image label mismatch: ${labelName}.`);
  }
}
const repoDigests = JSON.parse(
  runCommand(
    dockerCommand,
    ["image", "inspect", "--format", "{{json .RepoDigests}}", manifest.image.reference],
    "Release image digest inspection"
  )
);
if (!Array.isArray(repoDigests) || !repoDigests.includes(manifest.image.reference)) {
  fail("Pulled image does not expose the expected repository digest.");
}

const containerName = `yanki-release-acceptance-${randomUUID()}`;
const publicUrl = "http://127.0.0.1/supabase";
const publicKey = "release-acceptance-public-key";
const gatewayToken = "release-acceptance-gateway-token-000000000000";
let containerStarted = false;

try {
  runCommand(
    dockerCommand,
    [
      "run",
      "--detach",
      "--rm",
      "--name",
      containerName,
      "--publish",
      "127.0.0.1::8080",
      "--env",
      `SUPABASE_PUBLIC_URL=${publicUrl}`,
      "--env",
      "SUPABASE_UPSTREAM_URL=https://release-acceptance.invalid",
      "--env",
      `SUPABASE_ANON_KEY=${publicKey}`,
      "--env",
      `YANKI_SENSITIVE_GATEWAY_TOKEN=${gatewayToken}`,
      "--pull",
      "never",
      manifest.image.reference
    ],
    "Release acceptance container start"
  );
  containerStarted = true;
  await waitForHealthyContainer(dockerCommand, containerName);
  runCommand(dockerCommand, ["exec", containerName, "nginx", "-t"], "Nginx configuration test");
  const healthResponse = runCommand(
    dockerCommand,
    ["exec", containerName, "wget", "-qO-", "http://127.0.0.1:8080/healthz"],
    "Container health endpoint"
  );
  if (healthResponse !== "ok") {
    fail("Release health endpoint returned an unexpected response.");
  }
  const runtimeConfiguration = runCommand(
    dockerCommand,
    ["exec", containerName, "wget", "-qO-", "http://127.0.0.1:8080/app-config.js"],
    "Runtime configuration inspection"
  );
  if (
    !runtimeConfiguration.includes(publicUrl) ||
    !runtimeConfiguration.includes(publicKey) ||
    runtimeConfiguration.includes(gatewayToken) ||
    runtimeConfiguration.includes("SERVICE_ROLE") ||
    runtimeConfiguration.includes("ENCRYPTION_KEY")
  ) {
    fail("Runtime browser configuration boundary verification failed.");
  }
} finally {
  if (containerStarted) {
    runCommand(
      dockerCommand,
      ["rm", "--force", containerName],
      "Release acceptance container cleanup"
    );
  }
}

process.stdout.write(
  `${JSON.stringify({
    status: "accepted",
    releaseTag: manifest.release.tag,
    sourceCommit: manifest.release.sourceCommit,
    imageReference: manifest.image.reference,
    signatureVerified: true,
    artifactIntegrityVerified: true,
    imageLabelsVerified: true,
    nginxConfigurationVerified: true,
    runtimeConfigurationBoundaryVerified: true,
    containerHealthVerified: true,
    temporaryContainerRemoved: true
  })}\n`
);

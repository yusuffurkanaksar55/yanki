import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const RELEASE_SCHEMA_VERSION = 1;
export const RELEASE_PLATFORMS = ["linux/amd64", "linux/arm64"];
export const TRUSTED_GITHUB_REPOSITORY = "yusuffurkanaksar55/yanki";
export const TRUSTED_SOURCE_REPOSITORY = `https://github.com/${TRUSTED_GITHUB_REPOSITORY}`;
export const TRUSTED_WORKFLOW_PATH = ".github/workflows/container-release.yml";
export const TRUSTED_OIDC_ISSUER = "https://token.actions.githubusercontent.com";

const releaseTagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const sourceCommitPattern = /^[0-9a-f]{40}$/;
const imageDigestPattern = /^sha256:[0-9a-f]{64}$/;
const artifactDigestPattern = /^[0-9a-f]{64}$/;
const imageRepositoryPattern = /^ghcr\.io\/[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?\/[a-z0-9](?:[a-z0-9._/-]*[a-z0-9])?$/;

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

export function parseReleaseTag(releaseTag) {
  const normalizedTag = requireString(releaseTag, "Release tag");
  const match = releaseTagPattern.exec(normalizedTag);

  if (!match) {
    throw new Error("Release tag must be an exact vMAJOR.MINOR.PATCH SemVer tag.");
  }

  return {
    tag: normalizedTag,
    version: normalizedTag.slice(1)
  };
}

export function validateReleaseTag(releaseTag, packageVersion) {
  const parsed = parseReleaseTag(releaseTag);

  if (parsed.version !== requireString(packageVersion, "Package version")) {
    throw new Error("Release tag must exactly match package.json version.");
  }

  return parsed;
}

export function validateSourceCommit(sourceCommit) {
  const normalizedCommit = requireString(sourceCommit, "Source commit").toLowerCase();

  if (!sourceCommitPattern.test(normalizedCommit)) {
    throw new Error("Source commit must be a full 40-character Git commit SHA.");
  }

  return normalizedCommit;
}

export function validateImageRepository(imageRepository) {
  const normalizedRepository = requireString(
    imageRepository,
    "Image repository"
  ).toLowerCase();

  if (!imageRepositoryPattern.test(normalizedRepository)) {
    throw new Error("Image repository must be a lower-case GHCR repository without a tag or digest.");
  }

  return normalizedRepository;
}

export function validateImageDigest(imageDigest) {
  const normalizedDigest = requireString(imageDigest, "Image digest").toLowerCase();

  if (!imageDigestPattern.test(normalizedDigest)) {
    throw new Error("Image digest must be a sha256 OCI digest.");
  }

  return normalizedDigest;
}

export function validateArtifactDigest(artifactDigest, label = "Artifact digest") {
  const normalizedDigest = requireString(artifactDigest, label).toLowerCase();

  if (!artifactDigestPattern.test(normalizedDigest)) {
    throw new Error(`${label} must be a SHA-256 digest.`);
  }

  return normalizedDigest;
}

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function getCertificateIdentity(releaseTag) {
  const { tag } = parseReleaseTag(releaseTag);

  return `${TRUSTED_SOURCE_REPOSITORY}/${TRUSTED_WORKFLOW_PATH}@refs/tags/${tag}`;
}

export function createReleaseManifest({
  releaseTag,
  packageVersion,
  sourceCommit,
  imageRepository,
  imageDigest,
  artifacts
}) {
  const parsedRelease = validateReleaseTag(releaseTag, packageVersion);
  const normalizedCommit = validateSourceCommit(sourceCommit);
  const normalizedRepository = validateImageRepository(imageRepository);
  const normalizedImageDigest = validateImageDigest(imageDigest);
  const normalizedArtifacts = Object.fromEntries(
    Object.entries(artifacts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([fileName, digest]) => [
        fileName,
        { sha256: validateArtifactDigest(digest, `${fileName} digest`) }
      ])
  );
  const imageReference = `${normalizedRepository}@${normalizedImageDigest}`;

  return {
    schemaVersion: RELEASE_SCHEMA_VERSION,
    product: "Yanki",
    release: {
      tag: parsedRelease.tag,
      version: parsedRelease.version,
      sourceRepository: TRUSTED_SOURCE_REPOSITORY,
      sourceCommit: normalizedCommit
    },
    image: {
      repository: normalizedRepository,
      digest: normalizedImageDigest,
      reference: imageReference,
      platforms: RELEASE_PLATFORMS,
      requiredLabels: {
        "org.opencontainers.image.source": TRUSTED_SOURCE_REPOSITORY,
        "org.opencontainers.image.revision": normalizedCommit,
        "org.opencontainers.image.version": parsedRelease.tag
      }
    },
    trust: {
      signature: {
        format: "sigstore-cosign-keyless",
        certificateIdentity: getCertificateIdentity(parsedRelease.tag),
        oidcIssuer: TRUSTED_OIDC_ISSUER
      },
      githubAttestation: {
        repository: TRUSTED_GITHUB_REPOSITORY,
        availability: "public repositories or enabled GitHub Enterprise private repositories"
      }
    },
    artifacts: normalizedArtifacts
  };
}

export function validateReleaseManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Release manifest must be an object.");
  }

  if (manifest.schemaVersion !== RELEASE_SCHEMA_VERSION || manifest.product !== "Yanki") {
    throw new Error("Release manifest schema or product is unsupported.");
  }

  const parsedRelease = parseReleaseTag(manifest.release?.tag);
  if (manifest.release?.version !== parsedRelease.version) {
    throw new Error("Release manifest tag and version do not match.");
  }

  if (manifest.release?.sourceRepository !== TRUSTED_SOURCE_REPOSITORY) {
    throw new Error("Release manifest source repository is not trusted.");
  }

  const sourceCommit = validateSourceCommit(manifest.release?.sourceCommit);
  const imageRepository = validateImageRepository(manifest.image?.repository);
  const imageDigest = validateImageDigest(manifest.image?.digest);
  const expectedReference = `${imageRepository}@${imageDigest}`;

  if (manifest.image?.reference !== expectedReference) {
    throw new Error("Release image must use the exact immutable digest reference.");
  }

  if (JSON.stringify(manifest.image?.platforms) !== JSON.stringify(RELEASE_PLATFORMS)) {
    throw new Error("Release image platform set is unsupported.");
  }

  const expectedLabels = {
    "org.opencontainers.image.source": TRUSTED_SOURCE_REPOSITORY,
    "org.opencontainers.image.revision": sourceCommit,
    "org.opencontainers.image.version": parsedRelease.tag
  };
  if (JSON.stringify(manifest.image?.requiredLabels) !== JSON.stringify(expectedLabels)) {
    throw new Error("Release image labels do not match trusted source metadata.");
  }

  const expectedIdentity = getCertificateIdentity(parsedRelease.tag);
  if (
    manifest.trust?.signature?.format !== "sigstore-cosign-keyless" ||
    manifest.trust?.signature?.certificateIdentity !== expectedIdentity ||
    manifest.trust?.signature?.oidcIssuer !== TRUSTED_OIDC_ISSUER
  ) {
    throw new Error("Release signature identity is not trusted.");
  }

  if (manifest.trust?.githubAttestation?.repository !== TRUSTED_GITHUB_REPOSITORY) {
    throw new Error("GitHub attestation repository is not trusted.");
  }

  if (!manifest.artifacts || typeof manifest.artifacts !== "object") {
    throw new Error("Release manifest artifacts are required.");
  }

  for (const [fileName, artifact] of Object.entries(manifest.artifacts)) {
    if (
      fileName.length === 0 ||
      fileName.includes("/") ||
      fileName.includes("\\") ||
      fileName === "." ||
      fileName === ".."
    ) {
      throw new Error("Release artifact names must be direct safe file names.");
    }

    validateArtifactDigest(artifact?.sha256, `${fileName} digest`);
  }

  return manifest;
}

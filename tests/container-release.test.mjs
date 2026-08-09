import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createReleaseManifest,
  getCertificateIdentity,
  sha256File,
  validateReleaseManifest,
  validateReleaseTag
} from "../scripts/lib/container-release.mjs";

const root = process.cwd();
const sourceCommit = "1234567890abcdef1234567890abcdef12345678";
const imageDigest = `sha256:${"a".repeat(64)}`;
const imageRepository = "ghcr.io/yusuffurkanaksar55/yanki";

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function createMetadataFixture() {
  const directory = mkdtempSync(join(tmpdir(), "yanki-release-"));
  const imageReference = `${imageRepository}@${imageDigest}`;
  const files = {
    "compose.env.example": `YANKI_IMAGE=${imageReference}\n`,
    "compose.yaml": "services:\n  web:\n    image: ${YANKI_IMAGE}\n",
    "image-provenance.json": "{}\n",
    "image-sbom.json": "{}\n",
    "INSTALLATION.md": "# Installation\n",
    "verify-release-installation.mjs": readProjectFile(
      "scripts/verify-release-installation.mjs"
    )
  };

  for (const [fileName, content] of Object.entries(files)) {
    writeFileSync(join(directory, fileName), content, "utf8");
  }

  const artifacts = Object.fromEntries(
    Object.keys(files).map((fileName) => [
      fileName,
      sha256File(join(directory, fileName))
    ])
  );
  const manifest = createReleaseManifest({
    releaseTag: "v0.1.0",
    packageVersion: "0.1.0",
    sourceCommit,
    imageRepository,
    imageDigest,
    artifacts
  });
  const manifestPath = join(directory, "release-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return { directory, imageReference, manifest, manifestPath };
}

describe("immutable container release contract", () => {
  it("requires an exact SemVer tag matching package metadata", () => {
    expect(validateReleaseTag("v0.1.0", "0.1.0")).toEqual({
      tag: "v0.1.0",
      version: "0.1.0"
    });
    expect(() => validateReleaseTag("latest", "0.1.0")).toThrow(/SemVer/);
    expect(() => validateReleaseTag("v0.1.1", "0.1.0")).toThrow(/exactly match/);
  });

  it("binds source, image digest, OCI labels, artifacts, and signer identity", () => {
    const manifest = createReleaseManifest({
      releaseTag: "v0.1.0",
      packageVersion: "0.1.0",
      sourceCommit,
      imageRepository,
      imageDigest,
      artifacts: { "image-sbom.json": "b".repeat(64) }
    });

    expect(validateReleaseManifest(manifest)).toBe(manifest);
    expect(manifest.image.reference).toBe(`${imageRepository}@${imageDigest}`);
    expect(manifest.image.platforms).toEqual(["linux/amd64", "linux/arm64"]);
    expect(manifest.image.requiredLabels["org.opencontainers.image.revision"]).toBe(
      sourceCommit
    );
    expect(manifest.trust.signature.certificateIdentity).toBe(
      getCertificateIdentity("v0.1.0")
    );

    expect(() =>
      validateReleaseManifest({
        ...manifest,
        image: { ...manifest.image, reference: `${imageRepository}:latest` }
      })
    ).toThrow(/exact immutable digest/);
  });

  it("validates a customer package without contacting Docker in metadata mode", () => {
    const fixture = createMetadataFixture();

    try {
      const result = spawnSync(
        process.execPath,
        [
          join(root, "scripts", "verify-release-installation.mjs"),
          "--metadata-only",
          "--manifest",
          fixture.manifestPath
        ],
        { encoding: "utf8" }
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "metadata_validated",
        releaseTag: "v0.1.0",
        imageReference: fixture.imageReference,
        artifactCount: 6
      });

      writeFileSync(
        join(fixture.directory, "compose.env.example"),
        `YANKI_IMAGE=${imageRepository}:latest\n`,
        "utf8"
      );
      const tamperedResult = spawnSync(
        process.execPath,
        [
          join(root, "scripts", "verify-release-installation.mjs"),
          "--metadata-only",
          "--manifest",
          fixture.manifestPath
        ],
        { encoding: "utf8" }
      );

      expect(tamperedResult.status).not.toBe(0);
      expect(tamperedResult.stderr).toMatch(/checksum mismatch/);
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it("prepares the complete customer package from immutable build metadata", () => {
    const directory = mkdtempSync(join(tmpdir(), "yanki-release-prepare-"));
    const sbomPath = join(directory, "image-sbom.json");
    const provenancePath = join(directory, "image-provenance.json");
    writeFileSync(sbomPath, "{}\n", "utf8");
    writeFileSync(provenancePath, "{}\n", "utf8");

    try {
      const result = spawnSync(
        process.execPath,
        [join(root, "scripts", "prepare-container-release.mjs")],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            YANKI_RELEASE_TAG: "v0.1.0",
            YANKI_SOURCE_COMMIT: sourceCommit,
            YANKI_IMAGE_REPOSITORY: imageRepository,
            YANKI_IMAGE_DIGEST: imageDigest,
            YANKI_RELEASE_OUTPUT_DIR: directory,
            YANKI_SBOM_PATH: sbomPath,
            YANKI_PROVENANCE_PATH: provenancePath
          }
        }
      );
      const manifest = JSON.parse(
        readFileSync(join(directory, "release-manifest.json"), "utf8")
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "prepared",
        releaseTag: "v0.1.0",
        imageReference: `${imageRepository}@${imageDigest}`,
        artifactCount: 6
      });
      expect(validateReleaseManifest(manifest)).toEqual(manifest);
      expect(readFileSync(join(directory, "compose.env.example"), "utf8")).toContain(
        `YANKI_IMAGE=${imageRepository}@${imageDigest}`
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("creates a deterministic checksum inventory for every release file", () => {
    const fixture = createMetadataFixture();

    try {
      writeFileSync(
        join(fixture.directory, "release-manifest.sigstore.json"),
        "{}\n",
        "utf8"
      );
      const result = spawnSync(
        process.execPath,
        [join(root, "scripts", "create-release-checksums.mjs")],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            YANKI_RELEASE_OUTPUT_DIR: fixture.directory
          }
        }
      );
      const checksumLines = readFileSync(
        join(fixture.directory, "SHA256SUMS"),
        "utf8"
      )
        .trim()
        .split("\n");

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: "created",
        algorithm: "SHA-256",
        fileCount: 8
      });
      expect(checksumLines).toHaveLength(8);
      expect(checksumLines.map((line) => line.slice(66))).toEqual(
        checksumLines
          .map((line) => line.slice(66))
          .sort((left, right) => left.localeCompare(right))
      );
      expect(checksumLines.every((line) => /^[0-9a-f]{64} {2}[^/\\]+$/.test(line))).toBe(
        true
      );
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it("pins base images and every workflow action to immutable digests", () => {
    const dockerfile = readProjectFile("Dockerfile");
    const workflow = readProjectFile(".github/workflows/container-release.yml");
    const actionReferences = [...workflow.matchAll(/uses:\s+[^@\s]+@([^\s]+)/g)].map(
      (match) => match[1]
    );

    expect(dockerfile).toMatch(/node:22-alpine@sha256:[0-9a-f]{64}/);
    expect(dockerfile).toMatch(/nginx:1\.28-alpine@sha256:[0-9a-f]{64}/);
    expect(actionReferences.length).toBeGreaterThanOrEqual(8);
    expect(actionReferences.every((reference) => /^[0-9a-f]{40}$/.test(reference))).toBe(
      true
    );
  });

  it("publishes only tag-triggered digest-pinned releases with attestations", () => {
    const workflow = readProjectFile(".github/workflows/container-release.yml");
    const compose = readProjectFile("deploy/release/compose.yaml");
    const acceptanceGuide = readProjectFile("docs/INSTALLATION_ACCEPTANCE.md");

    expect(workflow).toMatch(/tags:\s*\n\s+- "v\*\.\*\.\*"/);
    expect(workflow).toMatch(/npm run check/);
    expect(workflow).toMatch(/provenance: mode=max/);
    expect(workflow).toMatch(/sbom: true/);
    expect(workflow).toMatch(/cosign sign --yes/);
    expect(workflow).toMatch(/cosign verify/);
    expect(workflow).toMatch(/actions\/attest@[0-9a-f]{40}/);
    expect(workflow).toMatch(/refusing to mutate it/);
    expect(workflow).not.toMatch(/:latest/);
    expect(compose).toMatch(/image: \$\{YANKI_IMAGE:/);
    expect(compose).not.toMatch(/build:/);
    expect(acceptanceGuide).toMatch(/cosign verify-blob release-manifest\.json/);
    expect(acceptanceGuide).toMatch(
      /artifacts\["verify-release-installation\.mjs"\]\.sha256/
    );
    expect(acceptanceGuide).toMatch(/Get-FileHash/);
  });
});

# ADR-0029: Publish Digest-Pinned Signed Container Releases

## Status

Accepted

## Context

Shared SaaS and customer-managed installations need the same reviewed frontend image, but a mutable registry tag cannot prove which source commit is running. A customer handover also needs a portable way to verify image origin, included software, build provenance, runtime configuration boundaries, and container health without receiving vendor secrets or rebuilding source.

The release channel must remain useful for private repositories where GitHub artifact attestations may depend on the account plan. It must not make a mutable tag, an unsigned checksum file, or the GitHub Actions user interface the sole trust boundary.

## Decision

- Publish releases only from an exact `vMAJOR.MINOR.PATCH` Git tag that matches `package.json`.
- Build one `linux/amd64` and `linux/arm64` OCI index in GitHub Actions and publish it to GHCR. No `latest` tag is published or accepted for deployment.
- Pin Docker base images and every GitHub Action dependency by immutable digest or full commit SHA.
- Attach BuildKit max-mode SLSA provenance and SPDX SBOM attestations to the image index, and export both as release files.
- Sign the exact image digest and release manifest with Cosign keyless signing. Acceptance requires the exact GitHub repository, workflow path, tag ref, and GitHub Actions OIDC issuer.
- Generate a manifest that binds release version, full source commit, image repository/digest/reference, supported platforms, required OCI labels, and SHA-256 digests for every customer package file.
- Generate `SHA256SUMS` as a portable inventory convenience. The signed manifest, not the checksum file alone, is the trust anchor for package files.
- Publish a release Compose file with no build section. Its generated environment example pins `YANKI_IMAGE` to the exact OCI digest.
- Require an independent Cosign manifest check and verifier hash check before executing downloaded code. After that bootstrap, provide one standalone Node acceptance command that re-verifies the manifest/image signatures, manifest-bound file hashes, checksum inventory, pulled digest, OCI source labels, generated Nginx configuration, public-only runtime config, and real container health. It always removes its temporary container.
- Add GitHub artifact attestations when the repository is public or the private-repository plan explicitly enables them. Cosign verification remains the portable mandatory path.
- Refuse to modify an existing GitHub Release. Operators should also enable GitHub immutable releases and protect version tags in repository settings.

## Alternatives Considered

- Deploy semantic or `latest` tags: rejected because tags can be repointed and do not identify one immutable artifact.
- Ask each customer to build from source: rejected because toolchain, base-image, and dependency drift would create unreviewed customer-specific artifacts.
- Use checksums without signatures: rejected because an attacker controlling the download location could replace both files and checksums.
- Require only GitHub artifact attestations: rejected because availability for private repositories depends on the GitHub plan and customers may not use GitHub CLI.
- Store a long-lived signing private key in GitHub Secrets: rejected for the baseline because GitHub Actions OIDC and short-lived Sigstore certificates avoid another durable release key. A customer-required private signing infrastructure may be added through a separate reviewed decision.

## Consequences

Customers install one digest-pinned image and can produce a content-free acceptance result before deployment. Release tags remain useful locators but are never trusted deployment identities. Keyless Sigstore use records repository/workflow/tag identity in the transparency service; private-source customers requiring a non-public transparency boundary need an approved private Sigstore or customer signing policy. The first real version tag still must exercise the hosted workflow and GHCR permissions before production approval.

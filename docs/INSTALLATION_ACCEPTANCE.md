# Container Release And Installation Acceptance

## Release Contract

The GitHub Actions workflow `.github/workflows/container-release.yml` runs only for an exact `vMAJOR.MINOR.PATCH` tag matching `package.json`. It builds `linux/amd64` and `linux/arm64`, pushes the OCI index to GHCR, attaches BuildKit SBOM and provenance, signs the exact digest and release manifest with Cosign, and creates a GitHub Release without a `latest` tag.

Every release contains:

- `release-manifest.json`: signed source, image, platform, OCI-label, trust-identity, and artifact-hash contract.
- `release-manifest.sigstore.json`: Cosign keyless signature bundle for the manifest.
- `image-sbom.json`: image SPDX SBOM extracted from the OCI attestation.
- `image-provenance.json`: image SLSA provenance extracted from the OCI attestation.
- `SHA256SUMS`: checksum inventory for every other release file.
- `compose.yaml`: deployment Compose file with no source build path.
- `compose.env.example`: exact digest-pinned image plus environment placeholders.
- `verify-release-installation.mjs`: standalone release acceptance command.
- `INSTALLATION.md`: concise customer installation sequence.

The OCI digest in `release-manifest.json` and `compose.env.example` is the deployment identity. Registry tags are navigation aids only and must never replace the digest reference.

## Publisher Sequence

1. Complete the full repository, Docker, database, and security release gates.
2. Update `package.json`, `CHANGELOG.md`, release notes, and deployment compatibility records to the intended stable version.
3. Create one reviewed annotated tag such as `v0.1.0` from the approved commit and push it. Do not delete or recreate a published version tag.
4. Require the `Container release` workflow to pass image signing, package signing, metadata validation, and release creation.
5. Verify the release through its exact digest from a clean operator environment. Record the release tag, source commit, image digest, Supabase self-host release, migrations, and acceptance result.
6. Enable GitHub immutable releases and version-tag protection in repository settings before the first production release. Public repositories receive GitHub artifact attestations automatically; supported private repositories set `YANKI_ENABLE_PRIVATE_GITHUB_ATTESTATIONS=true` as a repository variable only after confirming plan support.

GitHub documents container artifact attestations and `gh attestation verify` at [Using artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations). Docker documents attached SBOM/provenance and inspection at [Build attestations](https://docs.docker.com/build/metadata/attestations/) and [SBOM attestations](https://docs.docker.com/build/metadata/attestations/sbom/). Sigstore documents identity-bound verification at [Verifying signatures](https://docs.sigstore.dev/cosign/verifying/verify/).

## Customer Acceptance

1. Obtain every file from one GitHub Release or the approved customer handover channel. Do not combine files from different releases.
2. Install Docker Engine, Docker Compose v2, Node.js 20 or newer, `jq`, and Cosign `3.0.6` through the customer's approved software channel. Public GHCR packages can be pulled anonymously. For a private package, authenticate Docker/Cosign through the host credential store with a customer-specific read-only package credential delivered through the approved secret channel; never put it in release files or Compose environment values.
3. Before executing a downloaded script, independently verify the manifest with the expected release tag substituted exactly:

```bash
cosign verify-blob release-manifest.json \
  --bundle release-manifest.sigstore.json \
  --certificate-identity "https://github.com/yusuffurkanaksar55/yanki/.github/workflows/container-release.yml@refs/tags/<release-tag>" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
```

Then bind the executable verifier to the already verified manifest:

```bash
jq -r '.artifacts["verify-release-installation.mjs"].sha256 + "  verify-release-installation.mjs"' \
  release-manifest.json | sha256sum --check --strict -
```

PowerShell hash equivalent after the same Cosign verification:

```powershell
$manifest = Get-Content .\release-manifest.json -Raw | ConvertFrom-Json
$expected = $manifest.artifacts.'verify-release-installation.mjs'.sha256
$actual = (Get-FileHash .\verify-release-installation.mjs -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "Release verifier hash mismatch." }
```

4. From the untouched release directory, run:

```bash
YANKI_RELEASE_ACCEPTANCE_CONFIRM=VERIFY_PINNED_YANKI_RELEASE \
  node verify-release-installation.mjs
```

PowerShell execution equivalent:

```powershell
$env:YANKI_RELEASE_ACCEPTANCE_CONFIRM = "VERIFY_PINNED_YANKI_RELEASE"
node .\verify-release-installation.mjs
```

The command requires the exact certificate identity `https://github.com/yusuffurkanaksar55/yanki/.github/workflows/container-release.yml@refs/tags/<release-tag>` and issuer `https://token.actions.githubusercontent.com`. It pulls only the manifest-pinned digest, validates OCI labels, starts a disposable container with synthetic public configuration, runs `nginx -t`, verifies `/healthz` and public-only `/app-config.js`, and removes the container.

5. Accept only a final JSON result with `status: "accepted"` and every verification boolean set to `true`. Archive that content-free result with the release digest and approvals.
6. Copy `compose.env.example` to a mode-`0600` deployment file. Replace environment placeholders through the approved secret channel, but do not change `YANKI_IMAGE`.
7. Validate and start without a source build:

```bash
docker compose --env-file .env.deploy -f compose.yaml config --quiet
docker compose --env-file .env.deploy -f compose.yaml up -d --wait --no-build
```

8. Continue with Supabase migrations, Edge Functions, gateway-token direct-denial, tenant bootstrap, SMTP, backup/recovery, alerting, and application security acceptance in `docs/DEPLOYMENT.md`.

## Failure Rules

- A tag-only image reference, digest mismatch, signature mismatch, unexpected signer identity, artifact hash mismatch, OCI label mismatch, unhealthy container, invalid Nginx configuration, or leaked server-only runtime value fails acceptance.
- Do not execute the downloaded verifier until its hash has been checked against the independently verified manifest. Self-verification alone cannot establish the initial trust in executable code.
- `--metadata-only` validates package structure for CI tests and is not production acceptance.
- Do not bypass Cosign or edit release files to make verification pass. Obtain the package again and investigate the release channel.
- A valid signature proves which approved workflow identity produced the artifact; it does not replace vulnerability review, production configuration, infrastructure hardening, or environment-specific recovery acceptance.
- Direct GHCR pull is the current supported release path. Air-gapped OCI transfer and customer-registry mirroring require a separate procedure that preserves the digest, signatures, SBOM, and provenance and are not yet production-approved.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const infrastructureRoot = join(root, "deploy", "staging", "aws");

function readInfrastructureFile(name) {
  return readFileSync(join(infrastructureRoot, name), "utf8");
}

describe("AWS staging host foundation", () => {
  it("contains a reproducible toolchain and reviewed operator inputs", () => {
    const requiredFiles = [
      ".terraform.lock.hcl",
      "README.md",
      "backend.tf.example",
      "cloud-init.yaml.tftpl",
      "main.tf",
      "outputs.tf",
      "terraform.tfvars.example",
      "variables.tf",
      "versions.tf"
    ];

    expect(requiredFiles.filter((name) =>
      !existsSync(join(infrastructureRoot, name))
    )).toEqual([]);

    const versions = readInfrastructureFile("versions.tf");
    const providerLock = readInfrastructureFile(".terraform.lock.hcl");

    expect(versions).toMatch(/required_version = "= 1\.12\.1"/);
    expect(providerLock).toMatch(/provider "registry\.opentofu\.org\/hashicorp\/aws"/);
    expect(providerLock).toMatch(/version\s+= "6\.60\.0"/);
  });

  it("pins and verifies the local OpenTofu tool without planning or applying", () => {
    const installer = readFileSync(
      join(root, "scripts", "install-opentofu-local-tool.mjs"),
      "utf8"
    );
    const validator = readFileSync(
      join(root, "scripts", "validate-staging-infrastructure.mjs"),
      "utf8"
    );

    expect(installer).toMatch(/const version = "1\.12\.1"/);
    expect(installer).toContain(
      "a6d8fd924753ab6d3d4f0143d29214a31679a5fca8bfb59f5edde263b3a1c3fc"
    );
    expect(installer).toContain(
      "2e195e0648c4bc4087d3e9012cac9b7a51f73adb51478df6200a2516aa91fecd"
    );
    expect(installer).toMatch(
      /https:\/\/github\.com\/opentofu\/opentofu\/releases\/download/
    );
    expect(installer).toMatch(/actualSha256 !== archiveSha256/);
    expect(validator).toContain('"-backend=false"');
    expect(validator).toContain('"-lockfile=readonly"');
    expect(validator).not.toMatch(/"(?:plan|apply)"/);
  });

  it("opens only public web ports and uses SSM instead of SSH", () => {
    const main = readInfrastructureFile("main.tf");

    expect(main).toMatch(/AmazonSSMManagedInstanceCore/);
    expect(main).toMatch(/from_port\s+= 443/);
    expect(main).toMatch(/from_port\s+= 80/);
    expect(main).not.toMatch(/from_port\s+= 22/);
    expect(main).not.toMatch(/key_name\s+=/);
    expect(main).not.toMatch(/3389/);
  });

  it("requires encrypted storage, IMDSv2, monitoring, and termination protection", () => {
    const main = readInfrastructureFile("main.tf");
    const variables = readInfrastructureFile("variables.tf");

    expect(main).toMatch(/encrypted\s+= true/);
    expect(main).toMatch(/kms_key_id\s+= var\.ebs_kms_key_arn/);
    expect(main).toMatch(/http_tokens\s+= "required"/);
    expect(main).toMatch(/http_put_response_hop_limit = 2/);
    expect(main).toMatch(/instance_metadata_tags\s+= "disabled"/);
    expect(main).toMatch(/monitoring\s+= true/);
    expect(main).toMatch(/disable_api_termination\s+= var\.protect_from_termination/);
    expect(variables).toMatch(/root_volume_size_gib >= 80/);
    expect(variables).toMatch(/minimum_free_disk_gib >= 20/);
    expect(variables).toMatch(/minimum_memory_gib >= 8/);
  });

  it("keeps application and infrastructure credentials outside user data", () => {
    const cloudInit = readInfrastructureFile("cloud-init.yaml.tftpl");
    const example = readInfrastructureFile("terraform.tfvars.example");
    const combined = `${cloudInit}\n${example}`;

    expect(combined).not.toMatch(/SERVICE_ROLE_KEY/);
    expect(combined).not.toMatch(/POSTGRES_PASSWORD/);
    expect(combined).not.toMatch(/JWT_SECRET/);
    expect(combined).not.toMatch(/SMTP_PASS/);
    expect(combined).not.toMatch(/YANKI_SENSITIVE_GATEWAY_TOKEN/);
    expect(combined).not.toMatch(/EVALUATION_ENCRYPTION_KEY/);
    expect(cloudInit).toMatch(/staging-host-ready\.json/);
  });

  it("requires encrypted remote state with native locking", () => {
    const backend = readInfrastructureFile("backend.tf.example");

    expect(backend).toMatch(/backend "s3"/);
    expect(backend).toMatch(/encrypt\s+= true/);
    expect(backend).toMatch(/kms_key_id\s+=/);
    expect(backend).toMatch(/use_lockfile\s+= true/);
  });
});

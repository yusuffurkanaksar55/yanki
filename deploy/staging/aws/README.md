# AWS Staging Host Foundation

This root OpenTofu stack creates the first single-host AWS staging foundation for synthetic Yanki acceptance. It does not deploy application secrets, customer data, Supabase, DNS records, certificates, backups, or production resources.

## Created resources

- One EC2 instance in an existing reviewed VPC/subnet and exact zone.
- One customer-KMS-encrypted gp3 root volume with at least 80 GiB capacity.
- One Elastic IPv4 address for stable staging DNS.
- One security group with TCP/443 and optional TCP/80 ingress only.
- One least-privilege EC2 instance profile with `AmazonSSMManagedInstanceCore`.
- Ubuntu cloud-init that installs Docker/Compose, enables unattended updates, applies conservative host sysctls, and writes a content-free readiness record.

No SSH key pair or TCP/22 rule is created. Operators use AWS Systems Manager Session Manager. IMDSv2 is required, container-compatible metadata hop limit `2` is explicit, metadata tags are disabled, detailed EC2 monitoring is enabled, and termination protection defaults to enabled.

## Required decisions

Do not apply this stack until the following values have been reviewed:

1. AWS account and parent region.
2. Exact availability zone or Istanbul Local Zone and its documented data flows.
3. Existing VPC, public subnet, internet route, and network border group when applicable.
4. Exact Ubuntu LTS AMI available in that zone.
5. EC2 type available in that zone with at least 8 GiB memory.
6. Customer-managed EBS KMS key and separate state KMS key.
7. Staging domain, DNS owner, cost owner, and approved operator identities.
8. Encrypted/versioned/private S3 state bucket with least-privilege access and native state locking.

The values in `terraform.tfvars.example` are placeholders, not approved deployment defaults. Never put AWS credentials, application secrets, database passwords, JWT values, SMTP credentials, gateway tokens, webhook tokens, backup credentials, or evaluation keys in OpenTofu files or state.

## Local validation

Install the checksum-pinned OpenTofu binary under ignored `.tools/` and validate without an AWS account:

```bash
npm run staging:infra:tool:install
npm run staging:infra:check
```

The validator runs format, locked-provider initialization with no backend, and configuration validation. It never runs `plan` or `apply`.

## Reviewed plan and apply

On the restricted operator workstation:

1. Copy `backend.tf.example` to ignored `backend.tf` and replace every placeholder.
2. Copy `terraform.tfvars.example` to ignored `terraform.tfvars` and replace every placeholder.
3. Authenticate to the dedicated staging AWS account through the approved short-lived identity flow.
4. Reinitialize the encrypted remote backend:

```bash
.tools/opentofu/tofu -chdir=deploy/staging/aws init -reconfigure
```

5. Produce a saved plan outside Git and obtain a second-person review:

```bash
.tools/opentofu/tofu -chdir=deploy/staging/aws plan \
  -out=../../../.tools/yanki-staging.tfplan
```

6. Review that the plan contains no SSH/RDP ingress, unencrypted volume, unexpected IAM policy, secret value, or resource outside the approved account/region/zone. Apply only that exact reviewed plan:

```bash
.tools/opentofu/tofu -chdir=deploy/staging/aws apply \
  ../../../.tools/yanki-staging.tfplan
```

7. Publish the approved staging DNS record to the `public_ipv4` output. Start an SSM session using the generated command and verify `/var/lib/yanki/staging-host-ready.json` contains `ready: true`.

## Next acceptance boundary

Infrastructure creation alone is not staging approval. After DNS is live, deploy the pinned self-hosted Supabase set and signed Yanki image, terminate public TLS, keep every database/internal port private, configure independent non-production secrets, and run migration, browser, direct-denial, SMTP, alert, backup, and recovery acceptance. Destroy synthetic staging only through a reviewed plan after backups/evidence are no longer required and termination protection has been deliberately disabled.

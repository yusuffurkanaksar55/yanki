# ADR-0035: Provision The Staging Host With Reviewed OpenTofu

## Status

Accepted on 2026-08-16.

## Context

Production-like staging is the next critical gate, but no AWS account, VPC, Local Zone decision, KMS key, domain, or approved operator identity is available in the development workspace. Creating cloud resources manually would make network, storage, IAM, and metadata controls difficult to review or reproduce. Embedding account-specific values or long-lived AWS credentials in the repository would create a new security risk.

The initial staging target is one adequately sized EC2 host running the pinned self-hosted Supabase set and signed Yanki image. This is an acceptance topology, not a claim of high availability.

## Decision

- Define the staging host as an OpenTofu root stack while requiring an existing reviewed VPC, subnet, exact zone, pinned Ubuntu AMI, supported instance type, customer-managed EBS KMS key, and staging domain as operator inputs.
- Pin OpenTofu `1.12.1`, constrain the AWS provider, and commit the generated provider lock file. Install the local Windows tool only under ignored `.tools/` after verifying the official archive SHA-256.
- Create no SSH key or TCP/22 rule. Attach only `AmazonSSMManagedInstanceCore` and use Systems Manager Session Manager for operator access.
- Allow only TCP/443 and optional TCP/80 ingress. Keep database, Studio, Supabase gateway, and application-internal ports absent from the AWS security group.
- Require IMDSv2 with the container-compatible hop limit, disable metadata tags, enable detailed monitoring, use an encrypted gp3 root volume, and enable termination protection by default.
- Use cloud-init only for non-secret host preparation. Application, database, Auth, SMTP, gateway, webhook, backup, and evaluation keys remain outside OpenTofu source, user data, ordinary logs, and browser configuration.
- Do not automate `apply`. Require encrypted remote state, short-lived staging-account identity, a saved plan, and second-person review before resource creation.
- Treat successful infrastructure creation as a prerequisite, not production approval. DNS/TLS, full stack, provider, monitoring, backup, and recovery acceptance remain mandatory.

## Alternatives Considered

- Create EC2 resources through the AWS console: rejected because review and repeatability would be weak.
- Create a complete VPC and data-residency topology now: rejected because account, parent-region, Istanbul Local Zone, routing, and processor decisions are not approved yet.
- Open restricted SSH from an administrator CIDR: rejected because SSM provides controlled access without an inbound management port or shared SSH key.
- Put deployment secrets in cloud-init or OpenTofu variables: rejected because user data and state are not the approved secret-delivery boundary.
- Provision the live environment directly from Codex: rejected because no approved AWS identity or reviewed plan exists and cloud spend/security changes require an explicit operator decision.

## Consequences

The repository can now produce a deterministic staging infrastructure plan without cloud credentials and can validate it locally. The user must later provide only reviewed environment identifiers and approve the exact plan; no application code change will be required to obtain the host. High availability, WAF/load balancer adoption, private endpoints, and multi-host separation remain evidence-driven later decisions.

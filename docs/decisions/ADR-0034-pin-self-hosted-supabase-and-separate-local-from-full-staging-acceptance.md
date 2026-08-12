# ADR-0034: Pin Self-Hosted Supabase And Separate Local From Full Staging Acceptance

## Status

Accepted on 2026-08-12.

## Context

The application must support both central SaaS and customer-controlled dedicated installations. A production-like acceptance environment therefore needs the official Supabase Docker service set, application migrations, repository Edge Functions, the production Nginx image, generated non-default secrets, and recovery tests. At the same time, Docker Desktop stores Linux image layers in a WSL virtual disk. Keeping a second Supabase image set beside the Supabase CLI development stack duplicated several large images and exhausted the workstation's limited system-drive headroom without adding useful daily regression coverage.

Unpinned latest image tags would make dedicated-install evidence irreproducible. Treating a resource-constrained local run as production staging evidence would also overstate what was tested.

## Decision

- Pin the official Supabase repository to an exact commit and verify hashes for the Compose file, environment template, and Functions router before use.
- Layer Yanki-specific loopback bindings, Mailpit, Edge Function secrets, and the production Nginx service over the pinned official Compose project without copying or modifying its source in this repository.
- Require an explicit full-acceptance confirmation and at least 20 GB of verified free Docker storage before downloading and starting the complete isolated stack.
- Use `npm run docker:acceptance` for daily local evidence. It reuses the existing synthetic Supabase CLI stack while validating the pinned full-stack configuration, database lint, all pgTAP suites, the production Nginx container, same-origin gateway denial, browser lifecycle, accessibility, and streamed restore.
- Reserve `npm run staging:self-hosted:acceptance` for an isolated staging host. Local Docker evidence does not satisfy the production staging, TLS/DNS, SMTP, monitoring, capacity, or remote recovery gates.
- Generate every acceptance secret per run, keep it under ignored `.tools/`, and remove disposable containers, bind data, volumes, and secret files after the full run.

## Alternatives Considered

- Vendor the official Supabase Compose project into this repository: rejected because it would create an easily stale fork and obscure upstream security updates.
- Use independent latest image tags: rejected because Supabase tests a coordinated image set and latest tags are not reproducible evidence.
- Run two complete Supabase stacks on every workstation acceptance: rejected because the duplicated image set is unnecessary for daily application regression and unsafe on constrained Docker Desktop storage.
- Call the local CLI stack production-like staging: rejected because it does not prove the exact official deployment set, real network perimeter, providers, or environment operations.

## Consequences

Local Docker checks remain comprehensive for application and database behavior while using one Supabase image set. A properly sized staging host can reproduce the exact official source boundary and run the stricter clean-stack workflow. Production readiness still requires successful full staging evidence and cannot be inferred from configuration-only or local acceptance.

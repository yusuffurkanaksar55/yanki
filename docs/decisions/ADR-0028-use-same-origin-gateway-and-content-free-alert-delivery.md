# ADR-0028: Use A Same-Origin Gateway And Content-Free Alert Delivery

## Status

Accepted

## Context

Application-level anonymous quotas protect encryption and database work, but requests can still consume network, TLS, proxy, and function capacity before those decisions execute. Browser traffic previously addressed Supabase directly, so the portable application container could not enforce an outer baseline. Aggregate abuse counters were visible to system administrators but had no scheduled delivery path.

The protection layer must work for shared SaaS and customer-managed installations, preserve corporate NAT usability, avoid request-level evaluator telemetry, keep server credentials out of the browser, and remain independent of the eventual email, Teams, SIEM, or incident-management provider.

## Decision

- Make the Docker Nginx runtime the same-origin `/supabase` gateway. Browser configuration points to the public application origin plus `/supabase`; Nginx forwards to a separately configured public or private Supabase origin.
- Use runtime DNS resolution through the official Nginx image's local resolver discovery so a temporary upstream DNS failure does not prevent the frontend and health endpoint from starting.
- Apply 256 KiB and 16 KiB outer body limits to anonymous redemption and authenticated credential preparation respectively, matching the trusted application boundaries.
- Limit concurrent connections per source and combine per-source plus deployment-global request zones. Defaults allow corporate NAT bursts while bounding sustained and volumetric traffic; deployments may tighten them only after load and shared-egress review.
- Return gateway rejections as `429`. Keep the application quota as the authoritative credential-aware decision; the gateway does not inspect credentials or evaluation payloads.
- Inject a distinct high-entropy server token into the two sensitive upstream requests. When configured, both Edge Functions compare its SHA-256 digest in constant work and reject direct requests. Production sets `YANKI_SENSITIVE_GATEWAY_REQUIRED=true`, so a missing token fails closed. The token is never part of browser configuration.
- Disable access logs for the two sensitive endpoints. Use `$uri`, never query strings, bodies, Authorization headers, or credentials, in the remaining gateway log format. Suppress request-level limiter messages below the runtime's configured error-log level.
- Add a service-role-only operator RPC that returns the existing identifier-free 60-minute/24-hour aggregate summary without adopting an administrator identity. Direct table and helper-function privileges remain revoked.
- Deliver only alert transitions, daily reminders, and recovery transitions to a generic HTTPS webhook authenticated by a separate bearer token. Persist only environment id, alert/healthy state, and last-delivery time in a mode-`0600` atomic state file.
- Run alert checks every five minutes through a hardened persistent systemd timer. Delivery failure leaves state unchanged and returns non-zero so the operator can retry and alert on the service itself.

## Alternatives Considered

- Rely only on provider WAF products: rejected because dedicated installations need a portable baseline and provider-specific rules would fragment the deployment contract.
- Add IP addresses or request records to the product database: rejected because it would create new correlation and retention risk around anonymous evaluations.
- Send alerts directly from the browser or administrator session: rejected because scheduled delivery must not depend on a person being signed in and browser code cannot hold service or webhook secrets.
- Send every polling result: rejected because it creates alert fatigue and unnecessary operational records. State transitions plus bounded reminders preserve visibility.
- Integrate one mail or collaboration provider now: rejected because the organization has not approved an email/Teams identity integration. A generic authenticated webhook keeps the product provider-neutral.

## Consequences

Docker-based SaaS and dedicated installations share one outer capacity baseline and one content-free alert contract. The production token prevents a public managed-Supabase URL from becoming a bypass route; its rotation requires coordinated gateway and Function configuration. Non-Docker hosting must reproduce the documented endpoint limits and same logging constraints in its CDN/WAF. Production still requires a real receiver acceptance, token/direct-denial acceptance, capacity tuning, host/container availability alerts, and privacy review of any infrastructure outside this repository. Gateway memory uses source addresses transiently for limiting, but the product database and sensitive endpoint logs retain no source identifier.

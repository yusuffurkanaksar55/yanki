# ADR-0023: Use Privacy-Preserving Anonymous Abuse Controls

## Status

Accepted on 2026-08-07. The administrator-scope clause was narrowed by ADR-0033 on 2026-08-12.

## Context

The anonymous submission endpoint intentionally has no user session and handles encrypted employee feedback. It needs protection from credential guessing, repeated replay, oversized requests, and excess encryption/database work without creating request-level records that could weaken evaluator anonymity. A global quota that includes valid credentials would let invalid traffic deny legitimate submissions.

## Decision

- Enforce a 256 KiB anonymous request-body limit before JSON parsing. Limit authenticated credential-preparation bodies to 16 KiB.
- Consume a service-role-only quota decision before anonymous context lookup, answer validation, or encryption.
- Give every recognized credential an isolated limit of 12 requests per 10 minutes. Key the bucket with SHA-256 of the internal random credential row id, not the stored credential digest.
- Put unknown credentials in one global invalid-only bucket limited to 120 requests per minute. Exhausting this bucket must not block recognized credentials.
- Expire operational rate buckets after one day.
- Store invalid-credential and rate-limited events only as five-minute aggregate counters retained for seven days.
- Do not store IP addresses, device/browser fingerprints, users, organizations, assignments, credential digests, request bodies, evaluation content, or submission linkage in abuse-control tables.
- Revoke direct table access from browser roles and `service_role`; expose only narrow service-role RPCs.
- Let authenticated active platform-scoped system administrators view only 60-minute/24-hour aggregate counters and policy constants through `security-abuse-monitoring`. Repeat authorization in Edge and PostgreSQL; deny organization-scoped administrators.
- Return `413` for oversized requests and `429` with `Retry-After` for quota rejection. Keep Turkish user-facing messages centralized.
- Treat reverse-proxy/WAF connection limits, capacity controls, and alert delivery as a separate production deployment layer.

## Alternatives Considered

- Store per-IP or device-fingerprint counters: rejected because these identifiers create privacy, retention, and evaluator-correlation risk.
- Use the credential digest itself as the bucket key: rejected because it would duplicate a sensitive identity-domain value in an operational table.
- Put valid and invalid traffic in one global quota: rejected because attackers could exhaust the quota for legitimate evaluators.
- Rely only on a CDN or WAF: rejected because dedicated installations need a portable application-level baseline and trusted replay protection.
- Keep request-level security events indefinitely: rejected because aggregate short-retention counters are sufficient for current operations.

## Consequences

Repeated anonymous work is bounded without persisting request-level identity metadata, and invalid traffic cannot consume valid-credential quotas. Platform system administrators gain operational visibility without content access. The global invalid-only quota is deliberately coarse and does not provide per-source attribution. Production still requires external gateway/WAF controls, alert delivery, capacity monitoring, and incident procedures for volumetric attacks.

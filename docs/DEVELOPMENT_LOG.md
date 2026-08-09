# Development Log

## 2026-08-09 - Critical Browser Lifecycle Acceptance

### Objective

Add a repeatable browser-level acceptance gate for the highest-risk invitation-to-report workflow while preserving local developer servers, secret boundaries, tenant isolation, and the direct sensitive-table deny model.

### Changes

- Added an isolated Playwright runner for local Supabase, Mailpit, Edge Functions, PostgreSQL, and Vite port `4173`, with strict loopback guards and a process-scoped random E2E encryption key.
- Covered administrator invitation, real local Auth email verification, password setup, atomic onboarding, immutable template publication, project/member/assignment creation, employee submission, immediate reviewer aggregation, administrator/self denial, raw-text withholding, and mobile overflow.
- Preserved the authentication route while Supabase clears invitation/recovery callback parameters and added focused routing regression tests.
- Made pgTAP ciphertext/key-inventory assertions fixture scoped so persistent local demo and E2E data cannot make database tests order-dependent.
- Added ADR-0031 and explicit portable API privileges for own-profile browser reads plus reviewed service-role identity/configuration access.

### Database changes

Applied `20260809223000_explicit_identity_domain_privileges.sql` locally and to linked project `daxaymcmtbmummrxdyjy`. The browser receives only own-profile `SELECT` subject to RLS; trusted service code receives the reviewed identity/configuration table capabilities. Sensitive content and operational tables remain excluded.

### Security impact

Positive. Clean and dedicated installations no longer depend on historical Supabase grants, invitation callback tokens are not retained in Playwright traces/video, the E2E harness rejects non-loopback services, and sensitive-table direct access remains denied. Synthetic local records contain no real employee data.

### Tests performed

- `npm run e2e:local`: one critical Playwright workflow passed end to end, including mobile screenshots and access denials.
- Full `npm run check`: 51 Vitest files and 224 tests, lint, typecheck, production build, and bounded-memory verification.
- `npm run deployment:config`, local/linked schema lint, migration dry-run/list parity, and 185 pgTAP cases across eight suites passed.
- Linked migration `20260809223000` applied successfully; local and remote migration histories match.

### Result

The critical synthetic user journey now has one-command browser acceptance on the local Docker stack, and fresh Supabase deployments receive the same explicit authorization capabilities as the linked project.

### Remaining work

- Run the same synthetic acceptance against a production-like staging deployment with approved SMTP and gateway enforcement.
- Add keyboard/accessibility and deployed-container Playwright coverage.
- Complete the remaining production provider, recovery, monitoring, and first signed-release gates before live employee use.

## 2026-08-09 - Public Product Site And Immediate Aggregate Reporting

### Objective

Introduce a polished public Yankı product experience, improve authentication and responsive navigation, and make authorized aggregate results available after the first evaluation without weakening identity/content separation or server-side authorization.

### Changes

- Added a public Turkish product site at the root route with generated project-owned artwork, workflow, security, deployment, and authenticated workspace entry sections.
- Redesigned the dedicated sign-in route, collapsed password recovery until requested, and added an explicit return path to the public site.
- Replaced clipped mobile workspace navigation with stable equal-width targets and added global horizontal-overflow safeguards.
- Replaced the four-submission/closed-cycle reporting rule with `EMPTY` before participation and `AVAILABLE` after the first encrypted submission, including during active cycles.
- Updated the reporting UI, synthetic fixture/smoke workflow, public claims, focused documentation, ADR-0030, and all relevant security tests.

### Database changes

Applied `20260809210000_immediate_evaluation_reporting.sql` locally and to linked project `daxaymcmtbmummrxdyjy`. Existing cycle compatibility thresholds were normalized to `1`; authorized target discovery now includes every non-draft cycle; trusted batch access preserves system-admin, self, tenant, role, scope, and manager-relationship checks.

### Security impact

Mixed but explicit. Authorization, encryption, evaluator-link separation, direct-table denial, and raw-text withholding remain intact. Removing the group-size threshold creates contextual inference risk for one-person and sparse aggregates, so product and security documentation no longer claims group anonymity from sample size.

### Tests performed

- Full `npm run check`: 49 Vitest files and 216 tests, lint, typecheck, production build, and bounded-memory verification.
- Local migration application, clean local schema lint, and 185 pgTAP cases across eight database suites.
- Linked migration/list verification, clean linked schema lint, and deployments of `evaluation-reports` and `admin-project-cycles`.
- Linked synthetic report acceptance verified active-target discovery, `EMPTY`, first-submission availability, four identity-free submissions, a `3.5` aggregate average, raw-text withholding, and administrator/self/employee/anonymous denial.
- In-app browser verification at 1280x720 and 390x844 covered public, authentication, dashboard, and administration views with no page-level horizontal overflow.

### Result

The root URL now introduces Yankı publicly, `#login` provides a dedicated sign-in experience, and authenticated workspaces remain protected. Authorized reviewers can see active aggregate results after the first encrypted submission, with the remaining sparse-group privacy limitation documented honestly.

### Remaining work

- Add route-level code splitting to remove the current production bundle-size warning.
- Add persistent Playwright visual, keyboard, and authenticated routing regression coverage.
- Complete production provider, invitation-mail, recovery, and environment-specific security acceptance before live employee use.

## 2026-08-09 - Product UI Foundation And Responsive Administration

### Objective

Replace the development-oriented frontend shell with a clear, distinctive, and responsive product interface while preserving the existing authorization and evaluation workflows.

### Changes

- Added a shared responsive application shell with Yankı branding, Lucide navigation, account context, desktop sidebar, and compact mobile navigation.
- Rebuilt the authentication surface around an optimized project-owned visual asset, accessible form controls, password visibility, and non-technical Turkish copy.
- Simplified the employee dashboard to real assignment metrics, tasks, reports, and organization context; removed inactive buttons, implementation readiness lists, and frontend security notes.
- Converted the stacked administration page into permission-aware modules, localized project status/date output, and organization-name selectors for project/template creation.
- Corrected mobile grid minimum sizing and desktop project-layout breakpoints after browser inspection found horizontal overflow and compressed assignment metrics.

### Database changes

None.

### Security impact

Neutral to positive. Existing server and RLS authorization boundaries are unchanged, unauthorized administration modules are no longer presented, and technical infrastructure details are no longer exposed in normal user copy.

### Tests performed

- Full `npm run check`: 49 Vitest files and 215 tests, lint, typecheck, production build, and bounded-memory verification.
- Focused application, authentication, and administration suites passed 11 tests.
- In-app browser verification at 1440x900 and 390x844 covered authentication, dashboard, all six system-administration modules, image loading, horizontal overflow, localized project status, and fresh-load console errors.

### Result

The current authentication, employee, and administration surfaces now share a coherent product identity and remain usable without horizontal page overflow at tested desktop and mobile sizes. Future product features should extend this shell rather than reintroducing standalone page layouts.

### Remaining work

- Add route-level code splitting to reduce the current production bundle warning as the administration surface grows.
- Add persistent Playwright workflows for authenticated visual regression and keyboard navigation.
- Validate final copy and visual identity with representative customer users before production launch.

## 2026-08-09 - Signed Digest-Pinned Container Release Automation

### Objective

Publish one verifiable application image for shared SaaS and customer-managed installations, bind it to exact source and build evidence, and let a customer acceptance-test the package without rebuilding source or receiving vendor secrets.

### Changes

- Added a stable-tag-only GitHub Actions workflow that runs the full quality gate, builds `linux/amd64` and `linux/arm64`, publishes to GHCR, attaches max-mode provenance and SPDX SBOM, signs the image/manifest with Cosign OIDC, conditionally adds GitHub attestations, and refuses to mutate an existing release.
- Pinned Node/Nginx base images by registry digest and every workflow Action by full commit SHA; no `latest` image is produced or accepted.
- Added a signed manifest binding source commit, OCI digest/platforms/labels, signer identity, and every customer artifact hash, plus `SHA256SUMS`, no-build Compose, generated digest-pinned environment example, SBOM, provenance, and installation guide.
- Added an independent pre-execution manifest/verifier bootstrap and a standalone acceptance command that re-verifies signatures, hashes, pulled digest, OCI labels, Nginx, public-only runtime configuration, health, and temporary-container cleanup.
- Added ADR-0029, container release/customer acceptance documentation, package scripts, and focused static/runtime metadata tests.

### Database changes

None. The release workflow has no Supabase service role, database URL, gateway token, webhook credential, SMTP secret, or evaluation-encryption key.

### Security impact

Positive. Customers deploy an immutable digest rather than trusting a tag, package hashes are anchored by an identity-bound signature, build inputs and Actions are immutable, and the acceptance path fails closed on signer, file, image, label, Nginx, runtime-config, or health mismatch. Keyless transparency identity disclosure remains documented for private-source customers.

### Tests performed

- Full `npm run check`: 49 Vitest files and 214 tests, lint, typecheck, production build, and bounded-memory verification.
- Focused release, deployment, and project-memory suites passed 16 tests, including tag/version, digest, signer identity, artifact tampering, package preparation, checksum inventory, full-SHA Action pins, and no-build Compose boundaries.
- `npm run deployment:config` passed against Docker Desktop.
- A real local image built from the pinned Node 22 and Nginx 1.28 manifest digests. OCI source/revision/version labels matched, the container became healthy, `nginx -t` and `/healthz` passed, and `/app-config.js` contained only the synthetic public URL/key. The temporary container and image tag were removed.

### Result

The repository can produce and verify one signed digest-pinned customer package for both deployment topologies. No product version tag was created, so the first hosted GHCR/Cosign/GitHub Release execution remains an explicit release gate.

### Remaining work

- Enable immutable GitHub Releases and version-tag protection, then exercise the first reviewed version tag in the hosted workflow.
- Configure real production custody/off-site and alert providers and complete signed environment acceptance.
- Configure approved invitation email delivery and broader authenticated end-to-end workflows.

## 2026-08-09 - Same-Origin Gateway And Content-Free Alert Delivery

### Objective

Protect anonymous submission capacity before Supabase, route Docker browser traffic through one portable same-origin gateway, and deliver sustained aggregate abuse alerts without storing request-level identifiers, credentials, or evaluation content.

### Changes

- Converted the frontend Nginx runtime into a same-origin `/supabase` gateway with runtime DNS, exact 256 KiB/16 KiB sensitive body limits, per-source/global request zones, bounded connections, `429` rejection, and a server-only direct-bypass token.
- Disabled sensitive endpoint access logs, removed query strings/authorization/body data from the remaining log format, and suppressed request-level limiter messages below the runtime log threshold.
- Added a service-role-only identifier-free operator summary, generic authenticated HTTPS webhook transitions, bounded reminders, recovery delivery, atomic mode-`0600` state, and a hardened five-minute systemd timer.
- Added local loopback alert acceptance, Docker 200/413/429/log-suppression acceptance, ADR-0028, generated types, and SaaS/dedicated operations documentation.

### Database changes

Applied `20260809190000_security_alert_operator_summary.sql` locally and to linked project `daxaymcmtbmummrxdyjy`. It extracts one direct-revoked aggregate builder and adds a service-role-only operator summary while preserving active-system-admin authorization for the browser monitoring path.

### Security impact

Positive. Volumetric and oversized traffic is bounded before trusted Functions, configured production Functions reject direct upstream calls without the gateway token, scheduled alert delivery receives only global aggregate counts, and no new user/tenant/request/source/credential/content record is persisted. The gateway uses source addresses transiently in shared memory only.

### Tests performed

- Full `npm run check`: 48 Vitest files and 207 tests, lint, typecheck, production build, and bounded-memory verification.
- Local migration application, clean schema lint, and 185 pgTAP cases across eight suites; linked migration/list/type generation and linked schema lint also passed.
- Real Docker image build and generated `nginx -t`; temporary gateway returned `200` for application/Supabase health, `413` for 270,000-byte anonymous input, and `429` for 380 of 400 concurrent requests with zero sensitive request/limiter log lines.
- Real local operator RPC plus loopback webhook acceptance delivered alert and recovery transitions, suppressed the duplicate, wrote/removed temporary state, and logged no content or identifiers.
- Linked sensitive Functions were deployed at credential version 8 and anonymous version 11; public no-session boundaries returned `401`/`413` without requiring stored user credentials.

### Result

The portable gateway and content-free alert delivery contract is implemented for shared SaaS and dedicated installations. Production still requires a real receiver, NAT/load tuning, provider-log privacy review, and infrastructure availability alert acceptance.

### Remaining work

- Configure real production custody/off-site and alert providers and complete signed acceptance.
- Configure approved invitation email delivery and test a real mailbox flow.
- Add immutable release publishing and broader Playwright/customer acceptance coverage.

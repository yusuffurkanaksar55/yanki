# Changelog

All notable changes to this project are documented in this file.

## 2026-08-18

### Added

- Added the AWS development production-frontend package with digest-pinned Caddy TLS termination, same-origin Supabase routing, guarded backup-first configuration, and repeatable public acceptance commands.
- Added deployment regression coverage and a restrictive Content Security Policy for the production Nginx runtime.

### Changed

- Deployed and externally accepted the frontend and same-origin gateway enforcement on the canonical AWS self-hosted development host; Auth/public URLs now target the temporary synthetic-development origin.
- Restricted host-published Supabase API, PostgreSQL, and transaction-pooler ports to loopback-only bindings.

### Security

- Activated fail-closed server-only sensitive-gateway token enforcement in development and proved direct sensitive-Function denial without exposing the token.
- Preserved all users, ciphertext, and migration history without schema or data mutation; valid public TLS, direct sensitive-route denial, closed internal ports, and Chromium accessibility/responsive acceptance passed.

## 2026-08-17

### Added

- Added the reviewed AWS self-hosted security ACL reconciliation migration, live authorization acceptance scripts, Edge Function smoke coverage, and a full synthetic credential-to-encrypted-submission-to-report verification path.
- Added a new server-only AWS development AES-256-GCM key version, `AWS_DEV_20260817_01`, through the additive keyring without exposing key material or changing imported ciphertext.

### Changed

- Baselined the 29 imported migration timestamps without replaying SQL and applied the ACL reconciliation as the exact 30th migration.
- Made AWS self-hosted Supabase through `http://localhost:8080` the canonical development and integration-test backend; the former Supabase Cloud project is now explicitly inactive.

### Security

- Removed broad imported table/function/default privileges, preserved only reviewed browser and trusted-service capabilities, and revoked API execution from the orphaned `rls_auto_enable()` helper.
- Preserved all 20 imported legacy ciphertext records while recording their unavailable `DEV_20260807_01` and `development-v1` secrets as an explicit recovery risk.

## 2026-08-16

### Added

- Added a platform-only customer onboarding UI that creates an organization, initial unit, default retention policy, and first organization-administrator invitation through the existing idempotent bootstrap boundary.
- Added service-role-only platform authorization wrappers, the `platform-tenant-administration` Edge Function, typed frontend service, Turkish operational states, invitation renewal, and content-free actor auditing.
- Added database, component, service, security-boundary, and real local Supabase/Edge Function browser coverage for customer onboarding.
- Added 1440, 1024, and 390-pixel page-overflow and clipped-control checks across every administration module plus public, authentication, assignment, evaluation-dialog, dashboard, and report surfaces.
- Added ADR-0036 for the shared-SaaS platform onboarding boundary.

### Fixed

- Unified protected page widths, made the mobile administration module menu fully visible, normalized administration panel spacing, aligned report actions, reset scroll on hash-route changes, and made 1-to-10 rating controls responsive on mobile.
- Updated multi-tenant E2E fixtures to select organizations explicitly and safely clean both the primary and platform-created synthetic tenants.

## 2026-08-12

### Added

- Added a production-readiness assessment for shared SaaS and customer-managed deployments, including the AWS EC2/self-hosted Supabase target, Istanbul Local Zone data-residency caveats, environment separation, and prioritized production gates.
- Added ADR-0033 and regression coverage for the platform-operations versus tenant-administration boundary.
- Added an inventory test that requires RLS on every application table created by migrations and keeps the checked-in browser environment example free of privileged values and development-project coupling.

### Fixed

- Restricted deployment-global encryption-key health and anonymous-abuse diagnostics to exact active platform-scoped system administrators in the UI, Edge Functions, and PostgreSQL.
- Replaced the linked development project URL in `.env.example` with a portable placeholder.

## 2026-08-10

### Added

- Added corporate typography, an expanded public product narrative, a visual reporting hierarchy, and deduplicated role-scope summaries.
- Added authorized identity-separated written comments, independently shuffled per question without evaluator, submission, timestamp, or cross-question linkage metadata.
- Added ADR-0032 and browser/security regression coverage for the qualitative reporting boundary.
- Added protected `#assignments` and `#reports` application routes with active navigation state, explicit report-target selection, assignment filters, and bounded task rendering.
- Added route-level regression coverage plus Vite and production-container Playwright coverage for the separated assignment and reporting views.
- Added production-container Playwright acceptance with a process-only required gateway token, direct sensitive-endpoint `403` verification, and same-origin Supabase browser routing.
- Added automated WCAG 2 A/AA and 2.1/2.2 AA checks for public/auth surfaces plus keyboard-only navigation acceptance.
- Added loopback-only synthetic E2E tenant cleanup with strict organization/user identity validation, dependency-ordered deletion, and outer cleanup on successful or failed runs.

### Fixed

- Split report targeting into evaluated-person search, person selection, and cycle selection; repeated the evaluated person's name in the report summary and every written-comment group.
- Fixed assignment and report links falling through to the public product site, and normalized authenticated visits away from the sign-in hash.
- Simplified invitation administration, collapsed project details until requested, and removed the excessive empty space and long historical-list expansion found in desktop/mobile browser review.
- Corrected the coral design token to pass text contrast requirements across white, mist, and light-red surfaces.
- Removed stale local E2E organizations and Auth users without resetting demo/development data, and ensured future runs leave no synthetic tenant, temporary image, container, listener, or secret file.

## 2026-08-09

### Added

- Added an isolated Docker-backed Playwright acceptance runner covering local Auth invitation delivery, onboarding, immutable-template/project setup, encrypted evaluation submission, immediate aggregate reporting, access denials, and mobile overflow.
- Added explicit portable API privileges for own-profile browser reads and trusted identity/configuration Edge Function access, while preserving direct sensitive-table denial.
- Added local-only environment guards, process-scoped E2E encryption keys, Mailpit invitation verification, and persistent-database-safe pgTAP assertions.
- Added ADR-0031 documenting explicit browser and service-role table capabilities.

- Added a public Turkish Yankı product site with an original full-bleed visual, workflow, security, deployment, and authenticated workspace entry sections.
- Added immediate identity-separated aggregate reporting for active and completed cycles, with a safe `EMPTY` state before the first encrypted submission.
- Added ADR-0030 documenting the removal of the group-size threshold, preserved authorization boundaries, and sparse-group inference risk.
- Added a responsive Yankı application shell, original authentication artwork, Lucide navigation, accessible account controls, and centralized Turkish product copy.
- Added permission-aware administration modules so project, user, hierarchy, template, security, and retention workflows no longer render as one stacked page.
- Added organization-name selectors plus localized project status and date presentation to project and template administration.
- Added a tag-only multi-platform GHCR release workflow with full-SHA Action pins, digest-pinned Node/Nginx bases, max-mode provenance, SPDX SBOM, Cosign keyless image/manifest signatures, and optional GitHub artifact attestations.
- Added a signed release manifest, SHA-256 inventory, no-build customer Compose package, and standalone installation acceptance that verifies origin, integrity, OCI labels, Nginx, runtime public configuration, health, and cleanup.
- Added ADR-0029 plus publisher/customer release and rollback operations documentation.
- Added a same-origin Nginx Supabase gateway with dynamic upstream DNS, matching sensitive body limits, per-source/global request zones, bounded connections, and request-level log suppression.
- Added an environment-specific server token that prevents direct managed-Supabase calls from bypassing sensitive gateway limits, with fail-closed production configuration and constant-work Edge Function verification.
- Added a service-role-only identifier-free operator summary, authenticated HTTPS webhook alert/recovery transitions, daily reminders, atomic deduplication state, and a hardened five-minute systemd schedule.
- Added real Docker 413/429/log-suppression acceptance, local loopback alert-delivery acceptance, gateway/alert boundary tests, and ADR-0028.
- Added pinned Restic 0.19.1 encrypted off-site database snapshots with fail-aware `pg_dump`, remote-repository enforcement, integrity checks, exact-environment retention, and a persistent systemd schedule.
- Added full-snapshot-id off-site restore acceptance that streams directly into a guarded database and reuses database privilege plus encryption-key canary verification.
- Added a checksum-verified D-drive-friendly Windows development installer, operator environment template, backup boundary tests, ADR-0027, and SaaS/dedicated recovery documentation.
- Added a provider-neutral key-custody manifest requiring independent primary/recovery references, one active version, and two distinct custodian roles without storing credentials or key material.
- Added default-deny encrypted synthetic recovery canaries, a narrow service-role refresh RPC, and combined database-plus-key recovery acceptance inside the streaming disposable restore.
- Added custody/canary cryptographic tests, 14 pgTAP recovery cases, ADR-0026, and SaaS/dedicated recovery operations documentation.
- Added a service-role-only, fingerprinted, idempotent tenant bootstrap boundary for shared SaaS and dedicated installations.
- Added a compensated operator command that creates the first Auth invitation, atomically provisions tenant identity/configuration records, and removes only a newly created Auth identity when database provisioning fails.
- Added explicit initial-invitation recovery without raw action-link output, plus a Turkish strong-password setup gate for invitation and password-recovery sessions.
- Added 31 pgTAP bootstrap cases, operator unit tests, authentication component/service tests, ADR-0025, and production operations documentation.

### Fixed

- Preserved the authentication route while Supabase clears invitation/recovery callback parameters, preventing a verified invite from falling back to the public site.
- Scoped database test assertions to their own fixture data so local browser runs and demo tenants do not make pgTAP results order-dependent.

- Redesigned the authentication screen, collapsed password recovery until requested, and added a clear return path to the product site.
- Replaced clipped horizontal mobile workspace navigation with stable equal-width navigation targets and removed remaining horizontal page overflow.
- Removed inactive dashboard actions, implementation-readiness panels, technical frontend notes, and raw API status/date output from user-facing screens.
- Fixed mobile administration overflow and desktop project-metric compression found during responsive browser verification.
- Completed the previously missing browser password-update step after Supabase invitation and password-recovery links.

## 2026-08-08

### Added

- Added tenant-scoped encrypted evaluation-content retention with a 30-to-3650-day policy, disabled-by-default automatic purge, legal hold, versioned configuration, and content-free run metadata.
- Added a trusted retention administration Edge Function, typed service, Turkish system-administrator panel, and service-role-only scheduled cleanup that returns no submission/deletion counts.
- Added an explicit-confirmation operator command shared by SaaS and dedicated deployments.
- Added a disposable Docker backup/restore acceptance command that streams without a host dump file, verifies restored migrations and security privileges, records a stream hash, and removes the temporary database.
- Added 21 pgTAP retention cases, service/component/security tests, ADR-0024, and recovery/retention operations documentation.

### Fixed

- Switched the disposable full-Supabase restore from the non-superuser `postgres` role to local Supabase's `supabase_admin` role after the first drill exposed a protected `realtime` function setting.

## 2026-08-07

### Added

- Added isolated known-credential and invalid-only global quotas before anonymous context resolution or encryption.
- Added bounded request-body parsing, 413/429 Turkish form feedback, `Retry-After`, and a 256 KiB anonymous payload limit.
- Added identifier-free five-minute abuse counters, seven-day counter retention, and a system-admin aggregate monitoring panel.
- Added 19 pgTAP abuse-control cases, request/boundary/service/component tests, ADR-0023, and live body/quota/authorization smoke verification.
- Added backward-compatible additive encryption key rotation with independent per-version server secrets and an active-version selector.
- Added a service-role-only referenced-key inventory, authenticated content-free key health Edge Function, and Turkish system-administrator status panel.
- Added a no-stdout key generation tool, ignored transfer-file workflow, rotation tests, ADR-0022, and live old/new-key compatibility verification.
- Added closed-cycle aggregate reporting with database-enforced role/scope checks, active team-leader relationships, system-admin denial, self-access denial, and a minimum anonymity threshold of four.
- Added trusted AES-GCM decryption and immutable-question validation in `evaluation-reports`, returning only numeric/categorical aggregates and text response counts.
- Added a Turkish reviewer report panel with count-free withheld states and no raw-text response model.
- Added 34 reporting pgTAP cases, aggregate/boundary/component tests, and a live four-user report smoke workflow.
- Added ADR-0021 for fixed-group thresholded trusted reporting.
- Added tenant-scoped one-time anonymous submission credentials stored only as SHA-256 digests in the identity domain.
- Added identity-free AES-256-GCM evaluation persistence with versioned keys, random nonces, authenticated context, and date-only content timestamps.
- Added service-role-only issue, context, and atomic redemption RPCs while revoking direct sensitive-table access from every API role, including `service_role`.
- Added authenticated credential-preparation and anonymous encrypted-submission Edge Functions.
- Added a Turkish typed-question evaluation form connected to the employee assignment inbox.
- Added 29 anonymous-submission pgTAP cases, browser-boundary tests, service/component tests, and live replay-denial smoke testing.
- Added ADR-0020 for one-time digested credentials and encrypted anonymous persistence.

### Fixed

- Prevented oversized anonymous request tests from reaching the hosted gateway timeout by enforcing a smaller application limit before parsing.
- Added non-sensitive cycle-close metadata to the trusted report batch after the live smoke test caught its omission.
- Added the missing tenant composite key required by encrypted submission cycle references.
- Replaced a text-wide migration assertion with an exact anonymous-content column boundary test.
- Added safe operational encryption-configuration error codes without logging sensitive values.

## 2026-08-06

### Added

- Added tenant-scoped evaluation-template roots, editable drafts, immutable published versions, and ordered support for all documented question types.
- Added service-role-only atomic draft-save, publish, and clone functions with safe audit events and database mutation guards.
- Added the `evaluation-templates` trusted Edge Function, typed frontend service, and Turkish system-administrator template management panel.
- Required every evaluation cycle and assignment to preserve the exact published template version; migrated legacy cycles to archived compatibility versions.
- Added a published-template selector to project creation and template metadata to project and employee assignment views.
- Added 17 template lifecycle pgTAP cases, including published-question move protection, focused component tests, and an idempotent live template smoke test.
- Added ADR-0019 for immutable template-version binding.
- Added authenticated employee own-assignment access through a narrowly granted `auth.uid()`-derived RPC while keeping identity tables default-deny.
- Added a Turkish assignment inbox with server-derived availability states and live dashboard counts.
- Added Docker-backed Supabase pgTAP authorization tests, local database lint scripts, and a reusable authenticated assignment smoke test.
- Added ADR-0018 for the employee assignment access boundary.
- Added one-image runtime public configuration for managed and self-hosted Supabase environments.
- Added a multi-stage Dockerfile, Nginx SPA/health configuration, Compose example, and customer deployment guide.
- Added explicit project-membership tenant scope and database tenant-identity validation for project, hierarchy, and evaluation relationships.
- Scoped active direct-manager uniqueness per organization for multi-company identities.
- Added ADR-0016 for shared/dedicated deployments and ADR-0017 for organization tenant integrity.
- Added automatic retention of the latest 5 development/test entries and latest 10 error entries.

## 2026-07-22

### Added

- Added trusted existing-user role, organization-unit, primary-membership, and direct-manager administration.
- Added service-role-only atomic hierarchy mutation functions with manager-cycle, unit-archive, role-scope, and final-system-admin protections.
- Added the Turkish role and hierarchy management panel for organization-scoped system administrators.
- Added reusable authenticated hierarchy smoke testing and focused component/security regression coverage.
- Added ADR-0014 for the atomic organization administration boundary.
- Added service-role-only atomic project completion and evaluation close date updates for system administrators and exact assigned project managers.
- Added a role-aware Turkish project date form while hiding system-administrator-only project, membership, and assignment controls from project managers.
- Added reusable authenticated project-date smoke testing and ADR-0015 for the delegated date administration boundary.

## 2026-07-20

### Added

- Extended `admin-project-cycles` with organization member lookup and project member assignment actions.
- Added project member selection and membership-kind controls to the Turkish administration panel.
- Added project-member metadata to the managed project service model without exposing direct browser table access.
- Added ADR-0011 for project membership management through trusted Edge Function actions.
- Added default-deny `evaluation_assignments` foundation for project-backed assignment planning.
- Extended `admin-project-cycles` with admin-only project assignment generation from active project memberships.
- Added assignment count display and Turkish generation control to the administration panel.
- Added ADR-0012 for default-deny evaluation assignment planning.
- Added Supabase Auth-backed user invitation creation and revocation through `user-onboarding`.
- Added service-role-only atomic invitation acceptance for profile, role, unit membership, manager relationship, and audit records.
- Added Turkish system-administrator invitation management and invited-profile acceptance controls.
- Added ADR-0013 for Supabase Auth-backed invitation onboarding.
- Fixed browser CORS preflight support for Supabase administration Edge Function calls by allowing the SDK `apikey` header.

## 2026-07-16

### Added

- Created persistent project memory foundation.
- Added initial architecture, security, data model, authorization, assumptions, known issues, test report, release notes, and development log documentation.
- Added initial ADRs for the target stack, anonymous identity separation, and server-side encryption.
- Added a lightweight Node test that verifies required documentation exists and contains key security statements.
- Scaffolded React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library.
- Added a Turkish dashboard shell with centralized UI messages.
- Added production build, lint, typecheck, test, and combined check scripts.
- Added package lock for installed application dependencies.
- Added Supabase CLI project setup, frontend env examples, and initial default-deny security migration.
- Applied initial Supabase migration to remote project `daxaymcmtbmummrxdyjy`.
- Added typed Supabase generated database types.
- Added Supabase Auth client foundation with email/password sign-in, password reset request, local sign-out, environment validation, and tests.
- Added user profile and invitation onboarding foundation with own-profile gating, hashed invitation records, generated database types, and tests.
- Added configurable organization hierarchy foundation and service-role-only demo fixture script for synthetic test users.
- Added authenticated own-workspace context RPC, workspace context dashboard panel, and admin-like management entry point.
- Added protected administration shell and default-deny project/evaluation-cycle configuration foundation.
- Added admin project/cycle Edge Function foundation and frontend project management panel.

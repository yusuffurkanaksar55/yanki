# Release Notes

## 2026-08-06 - Employee Assignment Access Foundation

This is not a product release. Authenticated employees can now see only evaluation assignments addressed to them in a Turkish dashboard inbox. The database derives ownership from `auth.uid()`, revalidates active evaluator and subject organization membership, excludes cancelled assignments and draft cycles, and computes availability using the server clock.

Assignment and related identity tables remain default-deny to browser clients. The RPC returns no evaluator identity field, evaluation response, score, comment, anonymous credential, or encrypted payload. Docker-backed pgTAP tests passed 8 authorization cases, linked and local schema lint are clean, and a live synthetic employee received three closed assignments while an anonymous call was denied.

Submission is not implemented. Immutable template binding, anonymous credential issuance, encryption, completion mutation, and reporting remain release blockers.

## 2026-08-06 - Portable Deployment And Tenant Integrity Foundation

This is not a product release. The application now has a multi-stage Docker/Nginx frontend package whose public Supabase configuration is written at container startup. The same reviewed image can target vendor-managed or customer-managed Supabase without embedding customer-specific server secrets.

`organizations.id` is now the documented tenant boundary. The new migration makes project membership scope explicit, requires active matching organization membership for identity-bearing project, hierarchy, and evaluation relationships, and allows one Auth user to have independent direct managers in different companies.

Operational repository memory is bounded to 5 development/test entries and 10 error entries while ADRs and current-context documents preserve durable decisions. Docker Engine was not running during local image verification, and production bootstrap, encrypted evaluation flows, backup automation, and customer acceptance automation remain release blockers.

## 2026-07-22 - Delegated Project Date Administration

This is not a product release. System administrators and exact assigned project managers can now update project completion and evaluation close dates from the Turkish administration UI.

The browser calls `admin-project-cycles`; service-role-only `admin_update_project_dates()` rechecks the active actor and exact scope, locks project/cycle configuration, validates editable status and date order, and updates both records atomically. Project managers do not receive project creation, membership, or assignment-generation controls. No evaluation response content is exposed or stored by this workflow.

Live synthetic verification passed for project-manager update, system-administrator restoration, employee denial, and unauthenticated denial. Desktop and 390-pixel mobile browser checks found no horizontal overflow or console errors. Invitation email delivery remains deferred until an approved mailbox and provider decision are available.

## 2026-07-22 - Existing-User Role And Hierarchy Administration

This is not a product release. System administrators now have a Turkish management panel for organization units, existing-user primary memberships, direct-manager relationships, and scoped role assignments.

All browser operations cross the trusted `organization-administration` Edge Function and service-role-only atomic database functions. Organization scope is revalidated server-side and in the database. Manager cycles, unsafe unit archival, invalid unit-role scope, and removal of the final organization administrator are blocked. No evaluation response content is exposed or stored by this workflow.

Live synthetic verification passed for create/archive unit, idempotent hierarchy update, temporary role assignment/termination, cycle rejection, employee denial, and unauthenticated denial. Invitation email delivery remains deferred until an approved mailbox and provider decision are available.

## 2026-07-20 - Supabase Auth-Backed Invitation Onboarding

This is not a product release. System administrators now have a Turkish invitation management panel backed by the trusted `user-onboarding` Edge Function. They can select an organization, unit, role, optional manager, and invitation lifetime, then create or revoke a Supabase Auth invitation.

Invited-profile acceptance uses a service-role-only atomic database function and does not expose raw custom invitation tokens or privileged table writes to the browser. Real email delivery and invited-user acceptance still require an approved mailbox smoke test before production readiness claims.

Both browser-facing administration Edge Functions now allow the Supabase SDK `apikey` CORS header. Authenticated browser smoke testing confirms that user invitations and the existing project administration data load together on desktop and mobile widths.

## 2026-07-20 - Evaluation Assignment Planning Foundation

This is not a product release. The administration screen can now request project-backed evaluation assignment generation through the trusted `admin-project-cycles` Edge Function and see aggregate assignment counts.

The new `evaluation_assignments` table is identity-domain planning data only. It remains default-deny to frontend clients and stores no scores, comments, lessons learned text, anonymous credential secrets, encrypted payloads, or response content.

## 2026-07-20 - Admin Project Membership Foundation

This is not a product release. The administration screen can now load active organization members through the trusted `admin-project-cycles` Edge Function and add them to projects as members, project managers, sponsors, or observers.

The browser still does not read or write `user_profiles`, organization memberships, or project memberships directly. Sensitive evaluation assignments, anonymous credentials, encrypted submissions, and reporting remain unimplemented.

## 2026-07-19 - Admin Project Cycle Edge Function Foundation

This is not a product release. The administration screen now has a project/evaluation-cycle management panel backed by a trusted `admin-project-cycles` Edge Function. The browser calls the function instead of reading or writing default-deny project tables directly.

The function is deployed and rejects unauthenticated calls. It still needs authenticated live smoke testing with synthetic admin credentials before it is treated as a fully verified remote management path.

## 2026-07-19 - Administration And Project Cycle Foundation

This is not a product release. The project now has a protected administration shell for admin-like roles, default-deny project and evaluation-cycle configuration tables, and a demo fixture that creates a synthetic project with a 2026-07-30 evaluation close date.

No production administration write action, invitation redemption, sensitive evaluation submission, encryption, or reporting workflow is available yet.

## 2026-07-19 - Authenticated Workspace Context Foundation

This is not a product release. Signed-in users can now see their own non-sensitive role, unit, and manager context on the dashboard through a narrow authenticated Supabase RPC. Admin-like roles also see a Turkish administration entry point.

No production administration UI, project/evaluation-date management, sensitive evaluation submission, encryption, or reporting workflow is available yet.

## 2026-07-19 - Organization Hierarchy And Demo Fixture Foundation

This is not a product release. The project now has configurable organization roots, organization units, memberships, manager assignments, explicit record-backed organization scopes, and a local service-role-only demo fixture script for the synthetic CEO/HR/team scenario.

No production hierarchy administration UI, invitation redemption, sensitive evaluation submission, encryption, or reporting workflow is available yet.

## 2026-07-19 - User Profile And Invitation Onboarding Foundation

This is not a product release. The project now has `user_profiles` and `user_invitations` tables, a narrow own-profile read policy, generated Supabase types, an authenticated profile gate, and Turkish onboarding states for users without an active profile.

No production invitation creation/redemption, Microsoft Entra ID, sensitive evaluation submission, encryption, or reporting workflow is available yet.

## 2026-07-19 - Supabase Auth Client Foundation

This is not a product release. The frontend now has a typed Supabase Auth client foundation with email/password sign-in, password reset request, local-session sign-out, session-state gating, runtime public environment validation, and tests.

No production invitation onboarding, Microsoft Entra ID, sensitive evaluation submission, encryption, or reporting workflow is available yet.

## 2026-07-19 - Supabase Security Foundation

This is not a product release. The project is now linked to Supabase project `daxaymcmtbmummrxdyjy` and has an initial default-deny RLS security foundation migration.

No production authentication, anonymous submission, encryption, or reporting workflow is available yet.

## 2026-07-16 - React Vite Application Scaffold

This is not a product release. The project now has a React, TypeScript, Vite, Tailwind CSS, ESLint, Vitest, and React Testing Library foundation with a Turkish dashboard shell.

No production authentication, authorization, Supabase database, anonymous credential, encryption, or reporting workflow is available yet.

## 2026-07-16 - Foundation Documentation

This is not a product release. The repository now contains the first persistent project memory foundation, initial security and architecture documentation, ADRs, and a documentation validation test.

No deployable application is available yet.

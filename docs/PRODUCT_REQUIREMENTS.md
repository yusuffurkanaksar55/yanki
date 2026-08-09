# Product Requirements

## Scope

The platform supports secure, anonymous, company-internal evaluations for employees, teams, leaders, project managers, projects, annual review cycles, project completion, and lessons learned.

## Confirmed Requirements

- Administrators define organizational hierarchy.
- Employees may have a team leader or manager.
- Authenticated employees can view only evaluation assignments addressed to them and their availability windows.
- Teams may have different evaluation questions.
- Evaluation questions support 1-to-5 and 1-to-10 scoring.
- Evaluations may contain written comments.
- Evaluations may be annual or project-based.
- Projects are created by name and assigned members.
- Project participants receive evaluation assignments.
- Project participants may evaluate each other.
- Team leaders and project managers can be evaluated.
- Project completion may trigger lessons learned forms.
- Employees define their own password through Supabase Auth or use company Microsoft accounts.
- Employees cannot view evaluations submitted by themselves.
- Employees cannot view evaluations about themselves.
- Employees cannot view scores or comments belonging to anyone.
- Team leaders may view authorized anonymous results for reports.
- Team leaders cannot view their own results.
- C-Level users may view results within assigned scopes.
- System administrators cannot view evaluation content.
- No reviewer may identify the evaluator.
- Evaluation content must not be readable directly from the database.
- There may be multiple system administrators, C-Level reviewers, project managers, team leaders, and reviewers.
- Administration may use a separate page or management interface from the employee dashboard.
- Evaluation workflows may be opened without a fixed participant count requirement.
- Evaluation workflows are time-bound and may have configurable close dates.
- Administrators, or project managers delegated by administrators, may set project completion dates and evaluation close dates.
- The website interface is Turkish.
- Source code and technical artifacts are English.
- The product supports both vendor-hosted multi-company SaaS and customer-managed dedicated installation.
- Company data is isolated by an explicit tenant boundary even when multiple companies share one database.
- Deployment artifacts must not contain customer server secrets.
- Durable decisions are preserved; operational history is retained within documented bounded limits.
- Eligible employees receive a one-time submission capability only after server-side assignment and time-window validation.
- Evaluation answers are encrypted in trusted server code before persistence and cannot be linked directly to the evaluator in the content domain.
- A successful anonymous redemption completes the identity-domain assignment atomically and cannot be replayed.
- Report discovery must not reveal whether a closed subject group has zero or some below-threshold participation.
- Raw free-text answers are not returned in aggregate reports; only their non-empty response count is exposed after threshold enforcement.
- Anonymous submission abuse controls must protect valid credentials from invalid-traffic exhaustion and must not retain IP, device, user, assignment, credential digest, request body, or evaluation content.
- Active system administrators may see only aggregate invalid-credential and rate-limited request counts, never request-level records or evaluation content.
- Each company may configure how long encrypted evaluation content remains in the live database, within an approved supported range.
- Legal hold must suspend content deletion for the selected company.
- Retention administration and audit output must not reveal submission counts, subjects, evaluator identities, or evaluation content.
- Deletion from the live database must not be represented as immediate erasure from retained backups; backup expiry is an independent infrastructure control.
- Shared SaaS and dedicated installations must create a tenant and its first administrator through the same reviewed server-only bootstrap boundary.
- A repeated bootstrap request must be idempotent and must not adopt or elevate an unrelated existing Auth identity.
- The first administrator receives no organization membership or role until the exact email-verified invitation is accepted.
- Invitation and password-recovery sessions must require a strong user-defined password before the application workspace opens.
- Bootstrap and recovery output must not contain passwords, service-role keys, invitation tokens, or raw action links.

## Roles

- `SYSTEM_ADMIN`
- `EMPLOYEE`
- `TEAM_LEADER`
- `PROJECT_MANAGER`
- `C_LEVEL_REVIEWER`
- `BOARD_REVIEWER`

Users may hold multiple roles. Roles must be scoped to organization, department, unit, team, project, or another explicit authorization boundary.

No role is a singleton. A tenant may have multiple users with the same role when explicitly assigned.

## Evaluation Modes

- Everyone evaluates everyone.
- Employees evaluate a project manager.
- A project manager evaluates project members.
- Selected users evaluate selected users.
- Team members evaluate team leaders.
- Cross-functional peer evaluation.

## Question Types

- `RATING_1_TO_5`
- `RATING_1_TO_10`
- `YES_NO`
- `SINGLE_SELECT`
- `MULTI_SELECT`
- `SHORT_TEXT`
- `LONG_TEXT`
- `TAG_SELECTION`

## Lessons Learned Categories

- `TECHNICAL`
- `COMMUNICATION`
- `PLANNING`
- `RESOURCE_MANAGEMENT`
- `CUSTOMER_MANAGEMENT`
- `TESTING`
- `ANALYSIS`
- `DOCUMENTATION`
- `RISK`
- `OTHER`

## Lessons Learned Entry Types

- `GOOD_PRACTICE`
- `PROBLEM`
- `RISK`
- `RECOMMENDATION`
- `LEARNING`

## Remaining Production Scope

- Additive key rotation, content-free health checks, provider-neutral custody validation, encrypted synthetic recovery canaries, tenant retention automation, pinned encrypted off-site backup scheduling, bounded retention/integrity commands, and exact-snapshot database-plus-key restore automation are complete. Real production custody/off-site provider configuration and a signed production-like isolated recovery acceptance remain deployment gates.
- Application-level anonymous submission quotas and content-free monitoring are complete. Production gateway/WAF limits and alert delivery are not complete.
- Real invitation email delivery awaits an approved provider and mailbox.
- Production bootstrap is implemented; each environment still requires approved SMTP, redirect allow-list, password policy, and first-administrator mailbox acceptance verification.
- The current one-time credential model provides application-level unlinkability; blind-signature cryptographic anonymity is not claimed.

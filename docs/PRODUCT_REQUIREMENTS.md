# Product Requirements

## Scope

The platform supports secure, anonymous, company-internal evaluations for employees, teams, leaders, project managers, projects, annual review cycles, project completion, and lessons learned.

## Confirmed Requirements

- Administrators define organizational hierarchy.
- Employees may have a team leader or manager.
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
- Development history, errors, decisions, and tests are preserved in the repository.

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

## Non-Goals For The Foundation Phase

- No complete application UI.
- No production Supabase schema.
- No encryption implementation.
- No reporting implementation.
- No end-to-end user journey.

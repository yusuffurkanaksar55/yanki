# ADR-0019: Bind Cycles To Immutable Template Versions

## Status

Accepted on 2026-08-06.

## Context

Evaluation questions change over time, but historical assignments and future encrypted submissions must retain the exact meaning presented to evaluators. Updating a shared template in place would silently change old cycles. Relying on UI-only edit restrictions would also leave service-role regressions able to rewrite published configuration.

## Decision

- Separate a tenant-scoped logical template root from version snapshots and ordered questions.
- Allow edits only while a version is `DRAFT`.
- Publish only a non-empty valid draft through a service-role-only atomic function.
- Reject database updates and deletes against every published version and its questions, including attempts to move a published question to a draft parent.
- Create later versions by cloning a published snapshot into the next draft version number.
- Require evaluation cycles to reference one published version in the same organization.
- Copy the cycle's exact version identifier to every assignment and reject drift.
- Keep template tables default-deny to browser clients and route management through an authenticated, scope-checking Edge Function.
- Treat prompts and options as configuration metadata, not employee evaluation response content.

## Alternatives Considered

- Update one template row in place: rejected because historical evaluations would change meaning.
- Copy questions directly onto each cycle: rejected because it duplicates lifecycle logic and makes template reuse and administration harder.
- Enforce immutability only in the Edge Function: rejected because trusted-code regressions or direct service-role maintenance could bypass it.
- Bind the template only when submission begins: rejected because assignment planning and employee display would remain ambiguous.

## Consequences

Published configuration is historically stable and each cycle and assignment identifies its exact question snapshot. Both the old and new parent version are validated when a question identity changes. Administrators must create a new version to change published content. Legacy cycles use archived compatibility versions after migration. This decision does not implement anonymous credentials, encrypted responses, completion mutation, or reporting.

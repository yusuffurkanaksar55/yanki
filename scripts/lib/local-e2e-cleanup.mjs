import { Client as PostgresClient } from "pg";

const organizationSlugPattern =
  /^yanki-e2e(-customer)?-([a-z0-9]+-[a-f0-9]{6})$/u;
const userEmailPattern =
  /^e2e-(?:admin|customer-admin|employee|leader|reviewer)-([a-z0-9]+-[a-f0-9]{6})@example\.test$/u;

export async function cleanupLocalE2EFixtures(databaseUrl) {
  const connectionString = assertLocalE2EDatabaseUrl(databaseUrl);
  const database = new PostgresClient({ connectionString });

  await database.connect();

  try {
    await database.query("begin");
    const organizations = await database.query(
      `select id::text, name, slug
       from public.organizations
       where slug like 'yanki-e2e-%'
       order by created_at`
    );
    const fixtures = [];

    for (const organization of organizations.rows) {
      const runId = parseLocalE2EOrganization(organization);
      const users = await readFixtureUsers(database, organization.id);

      for (const user of users) {
        assertLocalE2EUserEmail(user.email, runId);
      }

      const scopes = await readFixtureScopes(database, organization.id);
      fixtures.push({
        organizationId: organization.id,
        scopeIds: scopes.map((scope) => scope.id),
        userIds: users.map((user) => user.id)
      });
    }

    if (fixtures.length > 0) {
      await setTemplateImmutabilityTriggers(database, "disable");
    }

    for (const fixture of fixtures) {
      await deleteFixture(database, fixture);
    }

    if (fixtures.length > 0) {
      await setTemplateImmutabilityTriggers(database, "enable");
    }

    await database.query(
      `delete from public.security_rate_limit_buckets
       where expires_at <= now()`
    );
    await database.query("commit");

    return {
      organizationCount: fixtures.length,
      userCount: fixtures.reduce(
        (count, fixture) => count + fixture.userIds.length,
        0
      )
    };
  } catch (error) {
    await database.query("rollback");
    throw error;
  } finally {
    await database.end();
  }
}

export function assertLocalE2EDatabaseUrl(value) {
  const url = new URL(value);

  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || !["127.0.0.1", "::1", "localhost"].includes(url.hostname)
  ) {
    throw new Error("Local E2E cleanup requires a loopback PostgreSQL URL.");
  }

  return value;
}

export function parseLocalE2EOrganization({ id, name, slug }) {
  const match = organizationSlugPattern.exec(slug ?? "");
  const isCustomer = match?.[1] === "-customer";
  const runId = match?.[2];
  const expectedName = isCustomer
    ? `Yanki E2E Customer ${runId}`
    : `Yanki E2E ${runId}`;

  if (
    typeof id !== "string"
    || !runId
    || name !== expectedName
  ) {
    throw new Error(
      `Refusing to clean an unrecognized local organization: ${slug ?? "unknown"}.`
    );
  }

  return runId;
}

export function assertLocalE2EUserEmail(email, runId) {
  const match = userEmailPattern.exec(email ?? "");

  if (match?.[1] !== runId) {
    throw new Error(
      `Refusing to clean an unrecognized local E2E user: ${email ?? "unknown"}.`
    );
  }
}

async function readFixtureUsers(database, organizationId) {
  const result = await database.query(
    `select distinct users.id::text, users.email
     from auth.users users
     join (
       select membership.user_id
       from public.organization_unit_memberships membership
       where membership.organization_id = $1
       union
       select invitation.invited_auth_user_id
       from public.user_invitations invitation
       where invitation.organization_id = $1
       union
       select invitation.accepted_by_user_id
       from public.user_invitations invitation
       where invitation.organization_id = $1
       union
       select assignment.evaluator_user_id
       from public.evaluation_assignments assignment
       where assignment.organization_id = $1
       union
       select assignment.subject_user_id
       from public.evaluation_assignments assignment
       where assignment.organization_id = $1
       union
       select submission.subject_user_id
       from public.encrypted_evaluation_submissions submission
       where submission.organization_id = $1
     ) fixture_user on fixture_user.user_id = users.id
     order by users.email`,
    [organizationId]
  );

  return result.rows;
}

async function readFixtureScopes(database, organizationId) {
  const result = await database.query(
    `select $1::uuid as id
     union
     select unit.id
     from public.organization_units unit
     where unit.organization_id = $1
     union
     select project.id
     from public.projects project
     where project.organization_id = $1
     union
     select cycle.id
     from public.evaluation_cycles cycle
     where cycle.organization_id = $1`,
    [organizationId]
  );

  return result.rows;
}

async function deleteFixture(database, fixture) {
  const { organizationId, scopeIds, userIds } = fixture;

  await database.query(
    `delete from public.audit_events
     where actor_user_id = any($1::uuid[])
       or event_scope_id = any($2::uuid[])`,
    [userIds, scopeIds]
  );
  await database.query(
    `delete from public.tenant_bootstrap_operations
     where organization_id = $1`,
    [organizationId]
  );
  await database.query(
    `delete from public.encrypted_evaluation_submissions
     where organization_id = $1`,
    [organizationId]
  );
  await database.query(
    `delete from public.anonymous_submission_credentials
     where organization_id = $1`,
    [organizationId]
  );
  await database.query(
    `delete from public.evaluation_assignments
     where organization_id = $1`,
    [organizationId]
  );
  await database.query(
    `delete from public.evaluation_cycles
     where organization_id = $1`,
    [organizationId]
  );
  await database.query(
    `delete from public.projects
     where organization_id = $1`,
    [organizationId]
  );
  await database.query(
    `delete from public.organizations
     where id = $1`,
    [organizationId]
  );
  await database.query(
    `delete from auth.users
     where id = any($1::uuid[])`,
    [userIds]
  );
}

async function setTemplateImmutabilityTriggers(database, action) {
  if (!["disable", "enable"].includes(action)) {
    throw new Error("Unsupported template-trigger cleanup action.");
  }

  // Published versions remain immutable in the app; only validated local fixtures bypass deletion guards.
  await database.query(
    `alter table public.evaluation_template_questions
     ${action} trigger evaluation_template_questions_validate_mutation`
  );
  await database.query(
    `alter table public.evaluation_template_versions
     ${action} trigger evaluation_template_versions_validate_mutation`
  );
}

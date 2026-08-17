import { createHash } from "node:crypto";
import { Client as PostgresClient } from "pg";

const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
).replace(/\/$/u, "");
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const databaseUrl = readRequiredEnvironment("SELF_HOSTED_DATABASE_URL");
const expectedActiveKeyVersion = readRequiredEnvironment(
  "EXPECTED_ACTIVE_ENCRYPTION_KEY_VERSION"
);
const adminAccount = readAccount("SUBMISSION_ADMIN");
const employeeAccount = readAccount("SUBMISSION_EMPLOYEE");
const reviewerAccount = readAccount("SUBMISSION_REVIEWER");
const subjectEmail = readRequiredEnvironment("SUBMISSION_SUBJECT_EMAIL");
const database = new PostgresClient({ connectionString: databaseUrl });

assertSelfHostedUrl(supabaseUrl);
await database.connect();

let projectId = null;
let cycleId = null;
let assignmentId = null;
let credentialId = null;

try {
  const adminToken = await signIn(adminAccount);
  const employeeToken = await signIn(employeeAccount);
  const reviewerToken = await signIn(reviewerAccount);
  const workspace = await callRpc(
    "get_my_workspace_context",
    {},
    adminToken
  );
  const organizationId = readOrganizationId(workspace);
  const templateResponse = await callFunction(
    "evaluation-templates",
    { action: "list_templates" },
    adminToken
  );
  const templateVersionId = readPublishedTemplateVersionId(templateResponse);
  const membersResponse = await callFunction(
    "admin-project-cycles",
    { action: "list_organization_members", payload: { organizationId } },
    adminToken
  );
  const members = readArray(membersResponse.members);
  const employee = findMember(members, employeeAccount.email);
  const reviewer = findMember(members, reviewerAccount.email);
  const subject = findMember(members, subjectEmail);

  if (
    subject.userId === employee.userId
    || subject.userId === reviewer.userId
  ) throw new Error("Evaluator, reviewer, and subject must be distinct.");

  const suffix = crypto.randomUUID();
  const now = new Date();
  const created = await callFunction(
    "admin-project-cycles",
    {
      action: "create_project_cycle",
      payload: {
        closesAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        evaluationName: `Self-hosted submission acceptance ${suffix}`,
        opensAt: new Date(now.getTime() - 60 * 1000).toISOString(),
        organizationId,
        projectCode: `SHA-${suffix}`,
        projectCompletedOn: now.toISOString().slice(0, 10),
        projectManagerUserId: reviewer.userId,
        projectName: `Self-hosted submission acceptance ${suffix}`,
        templateVersionId
      }
    },
    adminToken
  );
  const project = readRecord(created.project);
  const cycle = readRecord(readArray(project.cycles)[0]);

  projectId = readRequiredString(project.id, "Synthetic project ID");
  cycleId = readRequiredString(cycle.id, "Synthetic cycle ID");

  await callFunction(
    "admin-project-cycles",
    {
      action: "add_project_member",
      payload: {
        membershipKind: "MEMBER",
        projectId,
        userId: employee.userId
      }
    },
    adminToken
  );
  await callFunction(
    "admin-project-cycles",
    {
      action: "add_project_member",
      payload: {
        membershipKind: "MEMBER",
        projectId,
        userId: subject.userId
      }
    },
    adminToken
  );
  await callFunction(
    "admin-project-cycles",
    {
      action: "generate_project_assignments",
      payload: { evaluationCycleId: cycleId }
    },
    adminToken
  );

  const assignments = await callRpc(
    "get_my_evaluation_assignments",
    {},
    employeeToken
  );
  const assignment = readArray(assignments.assignments).find((candidate) =>
    isRecord(candidate)
    && candidate.evaluation_cycle_id === cycleId
    && typeof candidate.subject_email === "string"
    && candidate.subject_email.toLowerCase() === subjectEmail.toLowerCase()
    && candidate.availability_status === "AVAILABLE"
  );

  assignmentId = readRequiredString(
    readRecord(assignment).id,
    "Synthetic assignment ID"
  );

  const prepared = await callFunction(
    "evaluation-submission-credentials",
    { assignmentId },
    employeeToken
  );
  const credential = readRequiredString(
    prepared.credential,
    "Anonymous credential"
  );
  const submission = readRecord(prepared.submission);
  const questions = readArray(submission.questions);
  const credentialRecord = await database.query(
    `select id, status, encode(credential_digest, 'hex') as digest_hex
       from public.anonymous_submission_credentials
      where evaluation_assignment_id = $1`,
    [assignmentId]
  );

  if (credentialRecord.rows.length !== 1) {
    throw new Error("The synthetic credential was not persisted exactly once.");
  }

  credentialId = credentialRecord.rows[0].id;
  const expectedDigest = createHash("sha256")
    .update(Buffer.from(credential, "base64url"))
    .digest("hex");

  if (
    credentialRecord.rows[0].status !== "PENDING"
    || credentialRecord.rows[0].digest_hex !== expectedDigest
  ) {
    throw new Error("Only the expected credential digest was not persisted.");
  }

  const plaintextMarker = `SELF-HOSTED-PLAINTEXT-${suffix}`;
  const answers = questions.map((question) =>
    createSyntheticAnswer(question, plaintextMarker)
  );
  const accepted = await invokeFunction(
    "anonymous-evaluation-submissions",
    { answers, credential },
    null
  );

  if (accepted.response.status !== 201 || accepted.body?.accepted !== true) {
    throw new Error(
      `Anonymous submission failed with ${accepted.response.status}: `
        + `${readSafeError(accepted.body)}.`
    );
  }

  const persistence = await database.query(
    `select
       (select status from public.evaluation_assignments where id = $1)
         as assignment_status,
       (select status from public.anonymous_submission_credentials where id = $2)
         as credential_status,
       count(*)::integer as submission_count,
       min(octet_length(encrypted_payload))::integer as payload_bytes,
       min(octet_length(encryption_nonce))::integer as nonce_bytes,
       min(encryption_key_version) as key_version,
       bool_or(position(convert_to($4, 'UTF8') in encrypted_payload) > 0)
         as plaintext_found
     from public.encrypted_evaluation_submissions
     where project_id = $3`,
    [assignmentId, credentialId, projectId, plaintextMarker]
  );
  const stored = persistence.rows[0];

  if (
    stored.assignment_status !== "COMPLETED"
    || stored.credential_status !== "REDEEMED"
    || stored.submission_count !== 1
    || stored.payload_bytes <= 0
    || stored.nonce_bytes <= 0
    || stored.key_version !== expectedActiveKeyVersion
    || stored.plaintext_found === true
  ) {
    throw new Error("Encrypted submission persistence is incomplete or unsafe.");
  }

  const replay = await invokeFunction(
    "anonymous-evaluation-submissions",
    { answers, credential },
    null
  );

  if (
    replay.response.status !== 409
    || replay.body?.error !== "ANONYMOUS_CREDENTIAL_ALREADY_REDEEMED"
  ) {
    throw new Error("The one-time credential replay was not rejected.");
  }

  const reportResponse = await callFunction(
    "evaluation-reports",
    {
      action: "get_report",
      payload: {
        evaluationCycleId: cycleId,
        subjectUserId: subject.userId
      }
    },
    reviewerToken
  );
  const report = readRecord(reportResponse.report);
  const serializedReport = JSON.stringify(report);

  if (
    report.status !== "AVAILABLE"
    || report.submissionCount !== 1
    || !serializedReport.includes(plaintextMarker)
  ) {
    throw new Error("The authorized reporting path did not decrypt the fixture.");
  }

  console.log(JSON.stringify({
    assignmentCompleted: true,
    credentialDigestOnly: true,
    credentialRedeemed: true,
    encryptedPayloadBytes: stored.payload_bytes,
    encryptionKeyVersion: stored.key_version,
    oneTimeReplayDenied: true,
    plaintextAbsent: true,
    reportingDecryptRoundTrip: true,
    syntheticFixture: true,
    target: supabaseUrl
  }, null, 2));
} finally {
  if (projectId) {
    await cleanupSyntheticProject(database, {
      assignmentId,
      credentialId,
      cycleId,
      projectId
    });
  }
  await database.end();
}

async function cleanupSyntheticProject(client, fixture) {
  await client.query("begin");

  try {
    if (fixture.credentialId) {
      await client.query(
        `delete from public.security_rate_limit_buckets
          where bucket_scope = 'ANONYMOUS_CREDENTIAL'
            and bucket_key_hash = extensions.digest(uuid_send($1::uuid), 'sha256')`,
        [fixture.credentialId]
      );
    }
    await client.query(
      "delete from public.encrypted_evaluation_submissions where project_id = $1",
      [fixture.projectId]
    );
    await client.query(
      `delete from public.anonymous_submission_credentials
        where evaluation_assignment_id in (
          select id from public.evaluation_assignments where project_id = $1
        )`,
      [fixture.projectId]
    );
    await client.query(
      "delete from public.evaluation_assignments where project_id = $1",
      [fixture.projectId]
    );
    await client.query(
      "delete from public.project_memberships where project_id = $1",
      [fixture.projectId]
    );
    await client.query(
      "delete from public.evaluation_cycles where project_id = $1",
      [fixture.projectId]
    );
    await client.query(
      `delete from public.user_role_assignments
        where scope_type = 'PROJECT' and scope_id = $1`,
      [fixture.projectId]
    );
    await client.query(
      `delete from public.audit_events
        where event_scope_id = any($1::uuid[])
           or safe_metadata::text like any($2::text[])`,
      [
        [fixture.projectId, fixture.cycleId, fixture.assignmentId].filter(Boolean),
        [fixture.projectId, fixture.cycleId, fixture.assignmentId]
          .filter(Boolean)
          .map((value) => `%${value}%`)
      ]
    );
    await client.query(
      "delete from public.projects where id = $1",
      [fixture.projectId]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  const residual = await client.query(
    `select
      (select count(*) from public.projects where id = $1)::integer
        as projects,
      (select count(*) from public.evaluation_cycles where project_id = $1)::integer
        as cycles,
      (select count(*) from public.evaluation_assignments where project_id = $1)::integer
        as assignments,
      (select count(*) from public.encrypted_evaluation_submissions where project_id = $1)::integer
        as submissions`,
    [fixture.projectId]
  );

  if (Object.values(residual.rows[0]).some((count) => count !== 0)) {
    throw new Error("The synthetic anonymous-submission fixture was not removed.");
  }
}

function createSyntheticAnswer(questionValue, marker) {
  const question = readRecord(questionValue);
  const questionId = readRequiredString(question.id, "Question ID");
  let value;

  if (question.questionType === "RATING_1_TO_5") value = 4;
  else if (question.questionType === "RATING_1_TO_10") value = 8;
  else if (question.questionType === "YES_NO") value = true;
  else if (question.questionType === "SINGLE_SELECT") {
    value = readRequiredString(readArray(question.options)[0], "Question option");
  } else if (
    question.questionType === "MULTI_SELECT"
    || question.questionType === "TAG_SELECTION"
  ) {
    value = [readRequiredString(readArray(question.options)[0], "Question option")];
  } else if (
    question.questionType === "SHORT_TEXT"
    || question.questionType === "LONG_TEXT"
  ) value = marker;
  else throw new Error(`Unsupported question type: ${String(question.questionType)}.`);

  return { questionId, value };
}

async function signIn(account) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      body: JSON.stringify(account),
      headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
      method: "POST"
    }
  );
  const body = await readResponseBody(response);

  if (!response.ok || !isRecord(body) || typeof body.access_token !== "string") {
    throw new Error(`Submission acceptance sign-in failed with ${response.status}.`);
  }

  return body.access_token;
}

async function callRpc(functionName, body, accessToken) {
  const result = await invokeRest(`rpc/${functionName}`, body, accessToken);

  if (!result.response.ok) {
    throw new Error(`${functionName} RPC failed with ${result.response.status}.`);
  }

  return readRecord(result.body);
}

async function invokeRest(path, body, accessToken) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    body: JSON.stringify(body),
    headers: createHeaders(accessToken),
    method: "POST"
  });

  return { body: await readResponseBody(response), response };
}

async function callFunction(functionName, body, accessToken) {
  const result = await invokeFunction(functionName, body, accessToken);

  if (!result.response.ok) {
    throw new Error(`${functionName} failed with ${result.response.status}.`);
  }

  return readRecord(result.body);
}

async function invokeFunction(functionName, body, accessToken) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    body: JSON.stringify(body),
    headers: createHeaders(accessToken),
    method: "POST"
  });

  return { body: await readResponseBody(response), response };
}

function createHeaders(accessToken) {
  const headers = { apikey: supabaseAnonKey, "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function readOrganizationId(workspace) {
  const memberships = readArray(workspace.memberships);
  const membership = memberships.find((value) =>
    isRecord(value) && value.is_primary === true
  ) ?? memberships[0];
  return readRequiredString(
    readRecord(membership).organization_id,
    "Organization ID"
  );
}

function readPublishedTemplateVersionId(response) {
  const version = readArray(response.templates)
    .flatMap((template) => readArray(readRecord(template).versions))
    .find((value) =>
      isRecord(value)
      && value.status === "PUBLISHED"
      && typeof value.id === "string"
    );
  return readRequiredString(readRecord(version).id, "Published template version ID");
}

function findMember(members, email) {
  const member = members.find((value) =>
    isRecord(value)
    && typeof value.email === "string"
    && value.email.toLowerCase() === email.toLowerCase()
  );

  if (!isRecord(member) || typeof member.userId !== "string") {
    throw new Error(`Active member not found for ${email}.`);
  }

  return member;
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function readAccount(prefix) {
  return {
    email: readRequiredEnvironment(`${prefix}_EMAIL`),
    password: readRequiredEnvironment(`${prefix}_PASSWORD`)
  };
}

function assertSelfHostedUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "http:"
    || !["localhost", "127.0.0.1"].includes(url.hostname)
    || url.port !== "8080"
  ) throw new Error("Submission acceptance must target http://localhost:8080.");
}

function readRequiredEnvironment(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`${names.join(" or ")} is required.`);
}

function readRequiredString(value, label) {
  if (typeof value !== "string" || !value) throw new Error(`${label} is missing.`);
  return value;
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function readRecord(value) {
  return isRecord(value) ? value : {};
}

function readSafeError(value) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "UNKNOWN";
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

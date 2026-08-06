const supabaseUrl = readRequiredEnvironment(
  "SUPABASE_URL",
  "VITE_SUPABASE_URL"
);
const supabaseAnonKey = readRequiredEnvironment(
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY"
);
const adminEmail = readRequiredEnvironment("TEMPLATE_ADMIN_EMAIL");
const adminPassword = readRequiredEnvironment("TEMPLATE_ADMIN_PASSWORD");
const baselineTemplateName = "Genel Proje Değerlendirmesi";

const accessToken = await signIn(adminEmail, adminPassword);
const workspace = await callRpc(accessToken, "get_my_workspace_context", {});
const memberships = Array.isArray(workspace.memberships)
  ? workspace.memberships
  : [];
const organizationId = memberships.find((membership) =>
  isRecord(membership)
  && membership.is_primary === true
  && typeof membership.organization_id === "string"
)?.organization_id
  ?? memberships.find((membership) =>
    isRecord(membership) && typeof membership.organization_id === "string"
  )?.organization_id;

if (typeof organizationId !== "string") {
  throw new Error("The smoke-test admin has no organization membership.");
}

let templates = readTemplates(
  await callFunction(accessToken, "evaluation-templates", {
    action: "list_templates"
  })
);
let baselineTemplate = templates.find((template) =>
  template.name === baselineTemplateName
);
let publishedVersion = baselineTemplate?.versions.find((version) =>
  version.status === "PUBLISHED"
);
let created = false;

if (!publishedVersion) {
  const draftVersion = baselineTemplate?.versions.find((version) =>
    version.status === "DRAFT"
  );
  const saveResult = await callFunction(
    accessToken,
    "evaluation-templates",
    {
      action: "save_draft",
      payload: {
        description:
          "Proje ekipleri için puanlama ve yazılı geri bildirim soruları.",
        name: baselineTemplateName,
        organizationId,
        questions: [
          {
            isRequired: true,
            options: [],
            prompt:
              "Bu kişi proje hedeflerine ulaşmaya ne ölçüde katkı sağladı?",
            questionType: "RATING_1_TO_5"
          },
          {
            isRequired: true,
            options: [],
            prompt:
              "Bu kişinin ekip içi iletişimini nasıl değerlendirirsiniz?",
            questionType: "RATING_1_TO_5"
          },
          {
            isRequired: false,
            options: [],
            prompt: "Bu kişinin öne çıkan güçlü yönü nedir?",
            questionType: "LONG_TEXT"
          },
          {
            isRequired: false,
            options: [],
            prompt:
              "Bu kişinin gelişimi için en önemli öneriniz nedir?",
            questionType: "LONG_TEXT"
          }
        ],
        templateId: baselineTemplate?.id ?? null,
        templateVersionId: draftVersion?.id ?? null
      }
    }
  );
  baselineTemplate = readTemplate(saveResult.template);
  const savedDraft = baselineTemplate.versions.find((version) =>
    version.status === "DRAFT"
  );

  if (!savedDraft) {
    throw new Error("The saved template draft was not returned.");
  }

  const publishResult = await callFunction(
    accessToken,
    "evaluation-templates",
    {
      action: "publish_version",
      payload: { templateVersionId: savedDraft.id }
    }
  );
  baselineTemplate = readTemplate(publishResult.template);
  publishedVersion = baselineTemplate.versions.find((version) =>
    version.status === "PUBLISHED"
  );
  created = true;
}

if (!baselineTemplate || !publishedVersion) {
  throw new Error("The baseline published template was not returned.");
}

if (publishedVersion.questions.length !== 4) {
  throw new Error("The baseline template question snapshot is incomplete.");
}

templates = readTemplates(
  await callFunction(accessToken, "evaluation-templates", {
    action: "list_templates"
  })
);

if (!templates.some((template) => template.id === baselineTemplate.id)) {
  throw new Error("The published template is missing from the management list.");
}

const projectData = await callFunction(
  accessToken,
  "admin-project-cycles",
  { action: "list_project_cycles" }
);
const projects = Array.isArray(projectData.projects) ? projectData.projects : [];
const cycles = projects.flatMap((project) =>
  isRecord(project) && Array.isArray(project.cycles) ? project.cycles : []
);

if (cycles.some((cycle) =>
  !isRecord(cycle)
  || typeof cycle.templateVersionId !== "string"
  || typeof cycle.templateName !== "string"
  || typeof cycle.templateVersionNumber !== "number"
)) {
  throw new Error("A project cycle is missing its immutable template metadata.");
}

const anonymousResponse = await fetch(
  `${supabaseUrl}/functions/v1/evaluation-templates`,
  {
    body: JSON.stringify({ action: "list_templates" }),
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json"
    },
    method: "POST"
  }
);

if (anonymousResponse.ok) {
  throw new Error("Anonymous template administration was unexpectedly allowed.");
}

console.log(JSON.stringify({
  anonymousAccessDenied: true,
  baselineCreated: created,
  cycleCount: cycles.length,
  publishedQuestionCount: publishedVersion.questions.length,
  publishedTemplateVersionId: publishedVersion.id,
  templateCount: templates.length
}, null, 2));

async function signIn(email, password) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      body: JSON.stringify({ email, password }),
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );
  const body = await readResponseBody(response);

  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(`Template admin authentication failed: ${response.status}`);
  }

  return body.access_token;
}

async function callFunction(accessToken, functionName, body) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      body: JSON.stringify(body),
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );
  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      `${functionName} failed: ${response.status} ${responseBody.error ?? "UNKNOWN"}`
    );
  }

  return responseBody;
}

async function callRpc(accessToken, functionName, body) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${functionName}`,
    {
      body: JSON.stringify(body),
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );
  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(`${functionName} RPC failed: ${response.status}`);
  }

  return responseBody;
}

function readTemplates(value) {
  return Array.isArray(value.templates)
    ? value.templates.map(readTemplate)
    : [];
}

function readTemplate(value) {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("Template response is invalid.");
  }

  return {
    ...value,
    versions: Array.isArray(value.versions)
      ? value.versions.map((version) => ({
        ...version,
        questions: isRecord(version) && Array.isArray(version.questions)
          ? version.questions
          : []
      }))
      : []
  };
}

async function readResponseBody(response) {
  const body = await response.json().catch(() => ({}));

  return isRecord(body) ? body : {};
}

function readRequiredEnvironment(name, fallbackName) {
  const value = process.env[name]?.trim()
    || (fallbackName ? process.env[fallbackName]?.trim() : null);

  if (!value) {
    throw new Error(
      `${name}${fallbackName ? ` or ${fallbackName}` : ""} is required.`
    );
  }

  return value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

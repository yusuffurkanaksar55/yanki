import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";

type AppRole = {
  readonly role_code: string;
  readonly scope_type: string;
  readonly scope_id: string | null;
};

type QuestionType =
  | "RATING_1_TO_5"
  | "RATING_1_TO_10"
  | "YES_NO"
  | "SINGLE_SELECT"
  | "MULTI_SELECT"
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "TAG_SELECTION";

type TemplateQuestionInput = {
  readonly prompt: string;
  readonly questionType: QuestionType;
  readonly isRequired: boolean;
  readonly options: readonly string[];
};

type SaveTemplateDraftRequest = {
  readonly organizationId: string;
  readonly templateId: string | null;
  readonly templateVersionId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly questions: readonly TemplateQuestionInput[];
};

type ManagedTemplateQuestion = TemplateQuestionInput & {
  readonly id: string;
  readonly position: number;
};

type ManagedTemplateVersion = {
  readonly id: string;
  readonly versionNumber: number;
  readonly name: string;
  readonly description: string | null;
  readonly status: "DRAFT" | "PUBLISHED";
  readonly publishedAt: string | null;
  readonly questions: readonly ManagedTemplateQuestion[];
};

type ManagedEvaluationTemplate = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: "ACTIVE" | "ARCHIVED";
  readonly versions: readonly ManagedTemplateVersion[];
};

const questionTypes: readonly QuestionType[] = [
  "RATING_1_TO_5",
  "RATING_1_TO_10",
  "YES_NO",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "SHORT_TEXT",
  "LONG_TEXT",
  "TAG_SELECTION"
];

const optionQuestionTypes: readonly QuestionType[] = [
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "TAG_SELECTION"
];

const corsHeaders = {
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const authorizationHeader = request.headers.get("authorization");
    const environment = readEnvironment();
    const userClient = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: { persistSession: false },
        global: {
          headers: authorizationHeader
            ? { Authorization: authorizationHeader }
            : {}
        }
      }
    );
    const serviceClient = createClient(
      environment.supabaseUrl,
      environment.serviceRoleKey,
      { auth: { persistSession: false } }
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "AUTHENTICATION_REQUIRED" }, 401);
    }

    if (!await readHasActiveProfile(serviceClient, userData.user.id)) {
      return jsonResponse({ error: "ACTIVE_PROFILE_REQUIRED" }, 403);
    }

    const roles = await readActiveRoles(serviceClient, userData.user.id);
    const body = await readJsonBody(request);

    if (body.action === "list_templates") {
      return jsonResponse({
        templates: await listTemplates(serviceClient, roles)
      });
    }

    if (body.action === "save_draft") {
      const input = parseSaveTemplateDraftRequest(body.payload);

      requireOrganizationAdministration(roles, input.organizationId);

      const result = await invokeTemplateRpc(
        serviceClient,
        "admin_save_evaluation_template_draft",
        {
          actor_user_id: userData.user.id,
          managed_organization_id: input.organizationId,
          managed_template_id: input.templateId,
          managed_template_version_id: input.templateVersionId,
          template_description: input.description,
          template_name: input.name,
          template_questions: input.questions
        }
      );

      return jsonResponse({
        template: await readTemplate(
          serviceClient,
          readRequiredUuid(result.templateId, "TEMPLATE_ID_MISSING")
        )
      }, 201);
    }

    if (body.action === "publish_version") {
      const templateVersionId = readRequiredUuid(
        readRecord(body.payload).templateVersionId,
        "TEMPLATE_VERSION_ID_INVALID"
      );
      const result = await invokeTemplateRpc(
        serviceClient,
        "admin_publish_evaluation_template_version",
        {
          actor_user_id: userData.user.id,
          managed_template_version_id: templateVersionId
        }
      );

      return jsonResponse({
        template: await readTemplate(
          serviceClient,
          readRequiredUuid(result.templateId, "TEMPLATE_ID_MISSING")
        )
      });
    }

    if (body.action === "clone_version") {
      const sourceTemplateVersionId = readRequiredUuid(
        readRecord(body.payload).sourceTemplateVersionId,
        "TEMPLATE_VERSION_ID_INVALID"
      );
      const result = await invokeTemplateRpc(
        serviceClient,
        "admin_clone_evaluation_template_version",
        {
          actor_user_id: userData.user.id,
          source_template_version_id: sourceTemplateVersionId
        }
      );

      return jsonResponse({
        template: await readTemplate(
          serviceClient,
          readRequiredUuid(result.templateId, "TEMPLATE_ID_MISSING")
        )
      }, 201);
    }

    return jsonResponse({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const databaseError = readDatabaseError(error);
    const message = error instanceof RequestValidationError
      || error instanceof AuthorizationError
      ? error.message
      : databaseError ?? "EVALUATION_TEMPLATE_OPERATION_FAILED";
    const status = error instanceof AuthorizationError
      || message === "ADMINISTRATION_SCOPE_DENIED"
      ? 403
      : error instanceof RequestValidationError || databaseError
        ? 400
        : 500;

    return jsonResponse({ error: message }, status);
  }
});

async function readHasActiveProfile(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await serviceClient
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("onboarding_status", "ACTIVE")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function readActiveRoles(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<AppRole[]> {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient
    .from("user_role_assignments")
    .select("role_code,scope_type,scope_id")
    .eq("user_id", userId)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listTemplates(
  serviceClient: ReturnType<typeof createClient>,
  roles: readonly AppRole[]
): Promise<ManagedEvaluationTemplate[]> {
  const platformAdmin = roles.some(
    (role) => role.role_code === "SYSTEM_ADMIN"
      && role.scope_type === "PLATFORM"
      && role.scope_id === null
  );
  const organizationIds = roles
    .filter((role) => role.role_code === "SYSTEM_ADMIN"
      && role.scope_type === "ORGANIZATION"
      && role.scope_id)
    .map((role) => role.scope_id as string);

  if (!platformAdmin && organizationIds.length === 0) {
    return [];
  }

  let query = serviceClient
    .from("evaluation_templates")
    .select(
      "id,organization_id,name,description,status,evaluation_template_versions(id,version_number,name,description,status,published_at,evaluation_template_questions(id,position,prompt,question_type,is_required,options))"
    )
    .eq("status", "ACTIVE")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!platformAdmin) {
    query = query.in("organization_id", organizationIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toManagedTemplate);
}

async function readTemplate(
  serviceClient: ReturnType<typeof createClient>,
  templateId: string
): Promise<ManagedEvaluationTemplate> {
  const { data, error } = await serviceClient
    .from("evaluation_templates")
    .select(
      "id,organization_id,name,description,status,evaluation_template_versions(id,version_number,name,description,status,published_at,evaluation_template_questions(id,position,prompt,question_type,is_required,options))"
    )
    .eq("id", templateId)
    .single();

  if (error) {
    throw error;
  }

  return toManagedTemplate(data);
}

async function invokeTemplateRpc(
  serviceClient: ReturnType<typeof createClient>,
  functionName: string,
  parameters: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await serviceClient.rpc(functionName, parameters);

  if (error) {
    throw error;
  }

  return readRecord(data);
}

function toManagedTemplate(value: unknown): ManagedEvaluationTemplate {
  const record = readRecord(value);
  const versions = readArray(record.evaluation_template_versions)
    .map(toManagedTemplateVersion)
    .sort((left, right) => right.versionNumber - left.versionNumber);

  return {
    description: readOptionalString(record.description),
    id: readRequiredString(record.id, "TEMPLATE_ID_MISSING"),
    name: readRequiredString(record.name, "TEMPLATE_NAME_MISSING"),
    organizationId: readRequiredString(
      record.organization_id,
      "TEMPLATE_ORGANIZATION_MISSING"
    ),
    status: record.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
    versions
  };
}

function toManagedTemplateVersion(value: unknown): ManagedTemplateVersion {
  const record = readRecord(value);
  const questions = readArray(record.evaluation_template_questions)
    .map(toManagedTemplateQuestion)
    .sort((left, right) => left.position - right.position);

  return {
    description: readOptionalString(record.description),
    id: readRequiredString(record.id, "TEMPLATE_VERSION_ID_MISSING"),
    name: readRequiredString(record.name, "TEMPLATE_VERSION_NAME_MISSING"),
    publishedAt: readOptionalString(record.published_at),
    questions,
    status: record.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    versionNumber: readNumber(record.version_number)
  };
}

function toManagedTemplateQuestion(value: unknown): ManagedTemplateQuestion {
  const record = readRecord(value);

  return {
    id: readRequiredString(record.id, "TEMPLATE_QUESTION_ID_MISSING"),
    isRequired: record.is_required !== false,
    options: readArray(record.options).map((option) => String(option)),
    position: readNumber(record.position),
    prompt: readRequiredString(record.prompt, "TEMPLATE_QUESTION_PROMPT_MISSING"),
    questionType: readQuestionType(record.question_type)
  };
}

function parseSaveTemplateDraftRequest(value: unknown): SaveTemplateDraftRequest {
  const record = readRecord(value);
  const name = readRequiredString(record.name, "TEMPLATE_NAME_INVALID");
  const templateId = readOptionalUuid(record.templateId);
  const templateVersionId = readOptionalUuid(record.templateVersionId);
  const questions = readArray(record.questions).map(parseTemplateQuestion);

  if (name.length > 160 || questions.length > 100) {
    throw new RequestValidationError("TEMPLATE_DRAFT_INVALID");
  }

  if ((templateId === null) !== (templateVersionId === null)) {
    throw new RequestValidationError("TEMPLATE_DRAFT_ID_PAIR_INVALID");
  }

  return {
    description: readOptionalString(record.description),
    name,
    organizationId: readRequiredUuid(
      record.organizationId,
      "ORGANIZATION_ID_INVALID"
    ),
    questions,
    templateId,
    templateVersionId
  };
}

function parseTemplateQuestion(value: unknown): TemplateQuestionInput {
  const record = readRecord(value);
  const prompt = readRequiredString(
    record.prompt,
    "TEMPLATE_QUESTION_PROMPT_INVALID"
  );
  const questionType = readQuestionType(record.questionType);
  const options = readArray(record.options).map((option) =>
    readRequiredString(option, "TEMPLATE_QUESTION_OPTIONS_INVALID")
  );

  if (prompt.length > 1000 || options.some((option) => option.length > 200)) {
    throw new RequestValidationError("TEMPLATE_QUESTION_INVALID");
  }

  if (optionQuestionTypes.includes(questionType)) {
    if (new Set(options.map((option) => option.toLocaleLowerCase())).size < 2) {
      throw new RequestValidationError("TEMPLATE_QUESTION_OPTIONS_INVALID");
    }
  } else if (options.length > 0) {
    throw new RequestValidationError("TEMPLATE_QUESTION_OPTIONS_NOT_ALLOWED");
  }

  return {
    isRequired: record.isRequired !== false,
    options,
    prompt,
    questionType
  };
}

function requireOrganizationAdministration(
  roles: readonly AppRole[],
  organizationId: string
): void {
  const allowed = roles.some((role) => role.role_code === "SYSTEM_ADMIN"
    && (
      (role.scope_type === "PLATFORM" && role.scope_id === null)
      || (
        role.scope_type === "ORGANIZATION"
        && role.scope_id === organizationId
      )
    ));

  if (!allowed) {
    throw new AuthorizationError("ADMINISTRATION_SCOPE_DENIED");
  }
}

function readQuestionType(value: unknown): QuestionType {
  if (typeof value === "string" && questionTypes.includes(value as QuestionType)) {
    return value as QuestionType;
  }

  throw new RequestValidationError("TEMPLATE_QUESTION_TYPE_INVALID");
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  return readRecord(await request.json().catch(() => null));
}

function readEnvironment() {
  return {
    serviceRoleKey: readEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAnonKey: readEnvironmentValue("SUPABASE_ANON_KEY"),
    supabaseUrl: readEnvironmentValue("SUPABASE_URL")
  };
}

function readEnvironmentValue(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function readRequiredUuid(value: unknown, errorCode: string): string {
  const uuid = readOptionalUuid(value);

  if (!uuid) {
    throw new RequestValidationError(errorCode);
  }

  return uuid;
}

function readOptionalUuid(value: unknown): string | null {
  const text = readOptionalString(value);

  if (!text) {
    return null;
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new RequestValidationError("UUID_INVALID");
  }

  return text;
}

function readRequiredString(value: unknown, errorCode: string): string {
  const text = readOptionalString(value);

  if (!text) {
    throw new RequestValidationError(errorCode);
  }

  return text;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RequestValidationError("REQUEST_BODY_INVALID");
  }

  return value as Record<string, unknown>;
}

function readDatabaseError(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }

  const message = String(error.message);
  const knownErrors = [
    "ADMINISTRATION_SCOPE_DENIED",
    "ORGANIZATION_NOT_ACTIVE",
    "PUBLISHED_TEMPLATE_VERSION_IMMUTABLE",
    "PUBLISHED_TEMPLATE_VERSION_NOT_FOUND",
    "TEMPLATE_DESCRIPTION_INVALID",
    "TEMPLATE_DRAFT_ALREADY_EXISTS",
    "TEMPLATE_DRAFT_ID_PAIR_INVALID",
    "TEMPLATE_NAME_INVALID",
    "TEMPLATE_NOT_FOUND",
    "TEMPLATE_QUESTION_OPTIONS_INVALID",
    "TEMPLATE_QUESTION_PROMPT_INVALID",
    "TEMPLATE_QUESTION_REQUIRED",
    "TEMPLATE_QUESTIONS_INVALID",
    "TEMPLATE_VERSION_NOT_DRAFT",
    "TEMPLATE_VERSION_NOT_FOUND"
  ];

  return knownErrors.find((code) => message.includes(code)) ?? null;
}

class RequestValidationError extends Error {}

class AuthorizationError extends Error {}

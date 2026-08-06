import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type { Database } from "../../types/supabase";

export const evaluationQuestionTypes = [
  "RATING_1_TO_5",
  "RATING_1_TO_10",
  "YES_NO",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "SHORT_TEXT",
  "LONG_TEXT",
  "TAG_SELECTION"
] as const;

export type EvaluationQuestionType = typeof evaluationQuestionTypes[number];

export type EvaluationTemplateQuestion = {
  readonly id: string;
  readonly position: number;
  readonly prompt: string;
  readonly questionType: EvaluationQuestionType;
  readonly isRequired: boolean;
  readonly options: readonly string[];
};

export type EvaluationTemplateVersion = {
  readonly id: string;
  readonly versionNumber: number;
  readonly name: string;
  readonly description: string | null;
  readonly status: "DRAFT" | "PUBLISHED";
  readonly publishedAt: string | null;
  readonly questions: readonly EvaluationTemplateQuestion[];
};

export type EvaluationTemplate = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: "ACTIVE" | "ARCHIVED";
  readonly versions: readonly EvaluationTemplateVersion[];
};

export type EvaluationTemplateQuestionDraft = {
  readonly prompt: string;
  readonly questionType: EvaluationQuestionType;
  readonly isRequired: boolean;
  readonly options: readonly string[];
};

export type EvaluationTemplateDraft = {
  readonly organizationId: string;
  readonly templateId: string | null;
  readonly templateVersionId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly questions: readonly EvaluationTemplateQuestionDraft[];
};

export type EvaluationTemplateService = {
  readonly cloneVersion: (
    sourceTemplateVersionId: string
  ) => Promise<EvaluationTemplate>;
  readonly listTemplates: () => Promise<readonly EvaluationTemplate[]>;
  readonly publishVersion: (
    templateVersionId: string
  ) => Promise<EvaluationTemplate>;
  readonly saveDraft: (
    draft: EvaluationTemplateDraft
  ) => Promise<EvaluationTemplate>;
};

export type EvaluationTemplateServiceErrorCode =
  | "EVALUATION_TEMPLATE_SESSION_REQUIRED"
  | "EVALUATION_TEMPLATE_LIST_FAILED"
  | "EVALUATION_TEMPLATE_SAVE_FAILED"
  | "EVALUATION_TEMPLATE_PUBLISH_FAILED"
  | "EVALUATION_TEMPLATE_CLONE_FAILED";

export class EvaluationTemplateServiceError extends Error {
  constructor(
    readonly code: EvaluationTemplateServiceErrorCode,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "EvaluationTemplateServiceError";
  }
}

let cachedEvaluationTemplateService: EvaluationTemplateService | null = null;

export const browserEvaluationTemplateService: EvaluationTemplateService = {
  cloneVersion: (sourceTemplateVersionId) =>
    getDefaultEvaluationTemplateService().cloneVersion(sourceTemplateVersionId),
  listTemplates: () => getDefaultEvaluationTemplateService().listTemplates(),
  publishVersion: (templateVersionId) =>
    getDefaultEvaluationTemplateService().publishVersion(templateVersionId),
  saveDraft: (draft) =>
    getDefaultEvaluationTemplateService().saveDraft(draft)
};

export function createSupabaseEvaluationTemplateService(
  client: SupabaseClient<Database> = getBrowserSupabaseClient()
): EvaluationTemplateService {
  return {
    async cloneVersion(sourceTemplateVersionId) {
      const data = await invokeEvaluationTemplates(
        client,
        {
          action: "clone_version",
          payload: { sourceTemplateVersionId }
        },
        "EVALUATION_TEMPLATE_CLONE_FAILED"
      );

      return toEvaluationTemplate(data.template);
    },

    async listTemplates() {
      const data = await invokeEvaluationTemplates(
        client,
        { action: "list_templates" },
        "EVALUATION_TEMPLATE_LIST_FAILED"
      );

      return readArray(data.templates).map(toEvaluationTemplate);
    },

    async publishVersion(templateVersionId) {
      const data = await invokeEvaluationTemplates(
        client,
        {
          action: "publish_version",
          payload: { templateVersionId }
        },
        "EVALUATION_TEMPLATE_PUBLISH_FAILED"
      );

      return toEvaluationTemplate(data.template);
    },

    async saveDraft(draft) {
      const data = await invokeEvaluationTemplates(
        client,
        { action: "save_draft", payload: draft },
        "EVALUATION_TEMPLATE_SAVE_FAILED"
      );

      return toEvaluationTemplate(data.template);
    }
  };
}

function getDefaultEvaluationTemplateService(): EvaluationTemplateService {
  if (!cachedEvaluationTemplateService) {
    cachedEvaluationTemplateService = createSupabaseEvaluationTemplateService();
  }

  return cachedEvaluationTemplateService;
}

async function invokeEvaluationTemplates(
  client: SupabaseClient<Database>,
  body: Record<string, unknown>,
  errorCode: EvaluationTemplateServiceErrorCode
): Promise<Record<string, unknown>> {
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new EvaluationTemplateServiceError(
      "EVALUATION_TEMPLATE_SESSION_REQUIRED",
      { message: sessionError?.message }
    );
  }

  const { data, error } = await client.functions.invoke(
    "evaluation-templates",
    {
      body,
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    }
  );

  if (error || !isRecord(data)) {
    throw new EvaluationTemplateServiceError(errorCode, {
      data,
      message: error?.message
    });
  }

  return data;
}

function toEvaluationTemplate(value: unknown): EvaluationTemplate {
  const record = readRecord(value);

  return {
    description: readNullableString(record.description),
    id: readString(record.id),
    name: readString(record.name),
    organizationId: readString(record.organizationId),
    status: record.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
    versions: readArray(record.versions).map(toEvaluationTemplateVersion)
  };
}

function toEvaluationTemplateVersion(value: unknown): EvaluationTemplateVersion {
  const record = readRecord(value);

  return {
    description: readNullableString(record.description),
    id: readString(record.id),
    name: readString(record.name),
    publishedAt: readNullableString(record.publishedAt),
    questions: readArray(record.questions).map(toEvaluationTemplateQuestion),
    status: record.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    versionNumber: readNumber(record.versionNumber)
  };
}

function toEvaluationTemplateQuestion(value: unknown): EvaluationTemplateQuestion {
  const record = readRecord(value);

  return {
    id: readString(record.id),
    isRequired: record.isRequired !== false,
    options: readArray(record.options).map(readString),
    position: readNumber(record.position),
    prompt: readString(record.prompt),
    questionType: toQuestionType(record.questionType)
  };
}

function toQuestionType(value: unknown): EvaluationQuestionType {
  return evaluationQuestionTypes.includes(value as EvaluationQuestionType)
    ? value as EvaluationQuestionType
    : "LONG_TEXT";
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

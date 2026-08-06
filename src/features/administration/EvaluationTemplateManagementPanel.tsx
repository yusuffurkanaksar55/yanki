import { useEffect, useMemo, useState, type FormEvent } from "react";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import {
  browserEvaluationTemplateService,
  evaluationQuestionTypes,
  EvaluationTemplateServiceError,
  type EvaluationQuestionType,
  type EvaluationTemplate,
  type EvaluationTemplateDraft,
  type EvaluationTemplateService,
  type EvaluationTemplateVersion
} from "./evaluationTemplateService";

type EvaluationTemplateManagementPanelProps = {
  readonly service?: EvaluationTemplateService;
  readonly workspaceContext: WorkspaceContext;
};

type QuestionFormState = {
  readonly localId: string;
  readonly prompt: string;
  readonly questionType: EvaluationQuestionType;
  readonly isRequired: boolean;
  readonly optionsText: string;
};

type TemplateFormState = {
  readonly organizationId: string;
  readonly templateId: string | null;
  readonly templateVersionId: string | null;
  readonly name: string;
  readonly description: string;
  readonly questions: readonly QuestionFormState[];
};

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly message: string }
  | { readonly status: "ready"; readonly templates: readonly EvaluationTemplate[] };

const optionQuestionTypes: readonly EvaluationQuestionType[] = [
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "TAG_SELECTION"
];

let questionSequence = 0;

export function EvaluationTemplateManagementPanel({
  service = browserEvaluationTemplateService,
  workspaceContext
}: EvaluationTemplateManagementPanelProps) {
  const defaultOrganizationId = useMemo(
    () => workspaceContext.memberships[0]?.organizationId
      ?? workspaceContext.roles.find(
        (role) => role.roleCode === "SYSTEM_ADMIN"
          && role.scopeType === "ORGANIZATION"
      )?.scopeId
      ?? "",
    [workspaceContext.memberships, workspaceContext.roles]
  );
  const [formState, setFormState] = useState<TemplateFormState>(() =>
    createInitialFormState(defaultOrganizationId)
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [publishingVersionId, setPublishingVersionId] = useState<string | null>(null);
  const [cloningVersionId, setCloningVersionId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTemplates() {
      setLoadState({ status: "loading" });

      try {
        const templates = await service.listTemplates();

        if (isActive) {
          setLoadState({ status: "ready", templates });
        }
      } catch (error) {
        if (isActive) {
          setLoadState({
            message: toTemplateFeedbackMessage(error),
            status: "failed"
          });
        }
      }
    }

    void loadTemplates();

    return () => {
      isActive = false;
    };
  }, [service]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      const template = await service.saveDraft(toTemplateDraft(formState));
      replaceTemplate(setLoadState, template);
      const draftVersion = template.versions.find(
        (version) => version.status === "DRAFT"
      );

      if (draftVersion) {
        setFormState(toFormState(template, draftVersion));
      }

      setFeedbackMessage(tr.administration.templates.feedback.saved);
    } catch (error) {
      setFeedbackMessage(toTemplateFeedbackMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish(versionId: string) {
    setPublishingVersionId(versionId);
    setFeedbackMessage(null);

    try {
      const template = await service.publishVersion(versionId);
      replaceTemplate(setLoadState, template);

      if (formState.templateVersionId === versionId) {
        setFormState(createInitialFormState(defaultOrganizationId));
      }

      setFeedbackMessage(tr.administration.templates.feedback.published);
    } catch (error) {
      setFeedbackMessage(toTemplateFeedbackMessage(error));
    } finally {
      setPublishingVersionId(null);
    }
  }

  async function handleClone(versionId: string) {
    setCloningVersionId(versionId);
    setFeedbackMessage(null);

    try {
      const template = await service.cloneVersion(versionId);
      replaceTemplate(setLoadState, template);
      const draftVersion = template.versions.find(
        (version) => version.status === "DRAFT"
      );

      if (draftVersion) {
        setFormState(toFormState(template, draftVersion));
      }

      setFeedbackMessage(tr.administration.templates.feedback.cloned);
    } catch (error) {
      setFeedbackMessage(toTemplateFeedbackMessage(error));
    } finally {
      setCloningVersionId(null);
    }
  }

  return (
    <section
      aria-label={tr.administration.templates.sectionLabel}
      className="mt-8 grid gap-4 xl:grid-cols-[1fr_1fr] xl:items-start"
    >
      <form
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          void handleSave(event);
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-normal text-coral">
          {tr.administration.templates.eyebrow}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {formState.templateVersionId
                ? tr.administration.templates.form.editTitle
                : tr.administration.templates.form.newTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {tr.administration.templates.description}
            </p>
          </div>
          {formState.templateVersionId ? (
            <button
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2"
              onClick={() => {
                setFormState(createInitialFormState(defaultOrganizationId));
                setFeedbackMessage(null);
              }}
              type="button"
            >
              {tr.administration.templates.form.cancel}
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TemplateTextField
            label={tr.administration.templates.form.organizationId}
            name="organizationId"
            onChange={setFormState}
            required
            value={formState.organizationId}
          />
          <TemplateTextField
            label={tr.administration.templates.form.name}
            name="name"
            onChange={setFormState}
            required
            value={formState.name}
          />
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-800">
          {tr.administration.templates.form.description}
          <textarea
            className="mt-2 min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
            onChange={(event) => {
              setFormState((current) => ({
                ...current,
                description: event.currentTarget.value
              }));
            }}
            value={formState.description}
          />
        </label>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <h3 className="text-base font-semibold">
            {tr.administration.templates.form.questionsTitle}
          </h3>
          <button
            className="rounded-md border border-pine bg-white px-3 py-2 text-sm font-semibold text-pine transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2"
            onClick={() => {
              setFormState((current) => ({
                ...current,
                questions: [...current.questions, createQuestionFormState()]
              }));
            }}
            type="button"
          >
            {tr.administration.templates.form.addQuestion}
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {formState.questions.map((question, index) => (
            <QuestionEditor
              index={index}
              key={question.localId}
              onChange={(nextQuestion) => {
                setFormState((current) => ({
                  ...current,
                  questions: current.questions.map((existing) =>
                    existing.localId === nextQuestion.localId
                      ? nextQuestion
                      : existing
                  )
                }));
              }}
              onRemove={() => {
                setFormState((current) => ({
                  ...current,
                  questions: current.questions.filter(
                    (existing) => existing.localId !== question.localId
                  )
                }));
              }}
              question={question}
            />
          ))}
        </div>

        <button
          className="mt-5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isSaving || formState.questions.length === 0}
          type="submit"
        >
          {isSaving
            ? tr.administration.templates.form.saving
            : tr.administration.templates.form.save}
        </button>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          {tr.administration.templates.list.title}
        </h2>
        {feedbackMessage ? (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
            {feedbackMessage}
          </p>
        ) : null}
        <TemplateList
          cloningVersionId={cloningVersionId}
          loadState={loadState}
          onClone={(versionId) => {
            void handleClone(versionId);
          }}
          onEdit={(template, version) => {
            setFormState(toFormState(template, version));
            setFeedbackMessage(null);
          }}
          onPublish={(versionId) => {
            void handlePublish(versionId);
          }}
          publishingVersionId={publishingVersionId}
        />
      </section>
    </section>
  );
}

function QuestionEditor({
  index,
  onChange,
  onRemove,
  question
}: {
  readonly index: number;
  readonly onChange: (question: QuestionFormState) => void;
  readonly onRemove: () => void;
  readonly question: QuestionFormState;
}) {
  const hasOptions = optionQuestionTypes.includes(question.questionType);

  return (
    <fieldset className="py-5">
      <legend className="text-sm font-semibold text-slate-800">
        {index + 1}. {tr.administration.templates.form.prompt}
      </legend>
      <textarea
        aria-label={`${tr.administration.templates.form.prompt} ${index + 1}`}
        className="mt-3 min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
        onChange={(event) => {
          onChange({ ...question, prompt: event.currentTarget.value });
        }}
        required
        value={question.prompt}
      />
      <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-sm font-semibold text-slate-800">
          {tr.administration.templates.form.questionType}
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
            onChange={(event) => {
              const questionType = event.currentTarget.value as EvaluationQuestionType;
              onChange({
                ...question,
                optionsText: optionQuestionTypes.includes(questionType)
                  ? question.optionsText
                  : "",
                questionType
              });
            }}
            value={question.questionType}
          >
            {evaluationQuestionTypes.map((questionType) => (
              <option key={questionType} value={questionType}>
                {tr.administration.templates.questionTypes[questionType]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-800">
          <input
            checked={question.isRequired}
            className="h-4 w-4 rounded border-slate-300 text-pine focus:ring-pine"
            onChange={(event) => {
              onChange({ ...question, isRequired: event.currentTarget.checked });
            }}
            type="checkbox"
          />
          {tr.administration.templates.form.required}
        </label>
      </div>
      {hasOptions ? (
        <label className="mt-4 block text-sm font-semibold text-slate-800">
          {tr.administration.templates.form.options}
          <textarea
            aria-describedby={`question-options-hint-${question.localId}`}
            className="mt-2 min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
            onChange={(event) => {
              onChange({ ...question, optionsText: event.currentTarget.value });
            }}
            required
            value={question.optionsText}
          />
          <span
            className="mt-1 block text-xs font-normal text-slate-500"
            id={`question-options-hint-${question.localId}`}
          >
            {tr.administration.templates.form.optionsHint}
          </span>
        </label>
      ) : null}
      <button
        className="mt-3 text-sm font-semibold text-red-700 transition hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
        onClick={onRemove}
        type="button"
      >
        {tr.administration.templates.form.removeQuestion}
      </button>
    </fieldset>
  );
}

function TemplateList({
  cloningVersionId,
  loadState,
  onClone,
  onEdit,
  onPublish,
  publishingVersionId
}: {
  readonly cloningVersionId: string | null;
  readonly loadState: LoadState;
  readonly onClone: (versionId: string) => void;
  readonly onEdit: (
    template: EvaluationTemplate,
    version: EvaluationTemplateVersion
  ) => void;
  readonly onPublish: (versionId: string) => void;
  readonly publishingVersionId: string | null;
}) {
  if (loadState.status === "loading") {
    return <p className="mt-4 text-sm text-slate-600">{tr.administration.templates.loading}</p>;
  }

  if (loadState.status === "failed") {
    return (
      <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
        {loadState.message}
      </p>
    );
  }

  if (loadState.templates.length === 0) {
    return <p className="mt-4 text-sm text-slate-600">{tr.administration.templates.empty}</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {loadState.templates.map((template) => (
        <article
          className="rounded-md border border-slate-200 bg-slate-50 p-4"
          key={template.id}
        >
          <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {template.description ?? tr.administration.templates.list.noDescription}
          </p>
          <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
            {template.versions.map((version) => {
              const hasDraft = template.versions.some(
                (candidate) => candidate.status === "DRAFT"
              );

              return (
                <div className="py-4" key={version.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatMessage(
                          tr.administration.templates.list.version,
                          "version",
                          version.versionNumber
                        )}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        version.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-amber-100 text-amber-950"
                      }`}>
                        {version.status === "PUBLISHED"
                          ? tr.administration.templates.list.published
                          : tr.administration.templates.list.draft}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {formatMessage(
                        tr.administration.templates.list.questionCount,
                        "count",
                        version.questions.length
                      )}
                    </span>
                  </div>
                  {version.status === "PUBLISHED" ? (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {tr.administration.templates.list.immutable}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {version.status === "DRAFT" ? (
                      <>
                        <button
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2"
                          onClick={() => onEdit(template, version)}
                          type="button"
                        >
                          {tr.administration.templates.list.editDraft}
                        </button>
                        <button
                          className="rounded-md bg-pine px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
                          disabled={publishingVersionId === version.id}
                          onClick={() => onPublish(version.id)}
                          type="button"
                        >
                          {publishingVersionId === version.id
                            ? tr.administration.templates.list.publishing
                            : tr.administration.templates.list.publish}
                        </button>
                      </>
                    ) : (
                      <button
                        className="rounded-md border border-pine bg-white px-3 py-2 text-sm font-semibold text-pine hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                        disabled={hasDraft || cloningVersionId === version.id}
                        onClick={() => onClone(version.id)}
                        type="button"
                      >
                        {cloningVersionId === version.id
                          ? tr.administration.templates.list.cloning
                          : tr.administration.templates.list.createVersion}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

function TemplateTextField({
  label,
  name,
  onChange,
  required,
  value
}: {
  readonly label: string;
  readonly name: "organizationId" | "name";
  readonly onChange: (
    updater: (current: TemplateFormState) => TemplateFormState
  ) => void;
  readonly required: boolean;
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20 disabled:bg-slate-100"
        onChange={(event) => {
          const value = event.currentTarget.value;
          onChange((current) => ({ ...current, [name]: value }));
        }}
        required={required}
        type="text"
        value={value}
      />
    </label>
  );
}

function createInitialFormState(organizationId: string): TemplateFormState {
  return {
    description: "",
    name: "",
    organizationId,
    questions: [createQuestionFormState()],
    templateId: null,
    templateVersionId: null
  };
}

function createQuestionFormState(): QuestionFormState {
  questionSequence += 1;

  return {
    isRequired: true,
    localId: `question-${questionSequence}`,
    optionsText: "",
    prompt: "",
    questionType: "RATING_1_TO_5"
  };
}

function toFormState(
  template: EvaluationTemplate,
  version: EvaluationTemplateVersion
): TemplateFormState {
  return {
    description: version.description ?? "",
    name: version.name,
    organizationId: template.organizationId,
    questions: version.questions.map((question) => ({
      isRequired: question.isRequired,
      localId: `stored-${question.id}`,
      optionsText: question.options.join("\n"),
      prompt: question.prompt,
      questionType: question.questionType
    })),
    templateId: template.id,
    templateVersionId: version.id
  };
}

function toTemplateDraft(state: TemplateFormState): EvaluationTemplateDraft {
  return {
    description: normalizeOptionalValue(state.description),
    name: state.name.trim(),
    organizationId: state.organizationId.trim(),
    questions: state.questions.map((question) => ({
      isRequired: question.isRequired,
      options: optionQuestionTypes.includes(question.questionType)
        ? question.optionsText
          .split("\n")
          .map((option) => option.trim())
          .filter((option) => option.length > 0)
        : [],
      prompt: question.prompt.trim(),
      questionType: question.questionType
    })),
    templateId: state.templateId,
    templateVersionId: state.templateVersionId
  };
}

function replaceTemplate(
  setLoadState: (
    updater: (current: LoadState) => LoadState
  ) => void,
  template: EvaluationTemplate
) {
  setLoadState((current) => {
    if (current.status !== "ready") {
      return { status: "ready", templates: [template] };
    }

    const exists = current.templates.some(
      (existing) => existing.id === template.id
    );

    return {
      status: "ready",
      templates: exists
        ? current.templates.map((existing) =>
          existing.id === template.id ? template : existing
        )
        : [template, ...current.templates]
    };
  });
}

function normalizeOptionalValue(value: string): string | null {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function formatMessage(template: string, key: string, value: string | number): string {
  return template.replace(`{${key}}`, String(value));
}

function toTemplateFeedbackMessage(error: unknown): string {
  if (error instanceof EvaluationTemplateServiceError) {
    return tr.administration.templates.feedback[error.code];
  }

  return tr.administration.templates.feedback.genericError;
}

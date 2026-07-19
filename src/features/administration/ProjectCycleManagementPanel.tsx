import {
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import {
  browserProjectCycleService,
  ProjectCycleServiceError,
  type ManagedProject,
  type ProjectCycleDraft,
  type ProjectCycleService
} from "./projectCycleService";

type ProjectCycleManagementPanelProps = {
  readonly service?: ProjectCycleService;
  readonly workspaceContext: WorkspaceContext;
};

type FormState = {
  readonly organizationId: string;
  readonly projectName: string;
  readonly projectCode: string;
  readonly projectCompletedOn: string;
  readonly evaluationName: string;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly projectManagerUserId: string;
};

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly projects: readonly ManagedProject[] }
  | { readonly status: "failed"; readonly message: string };

const initialFormState: FormState = {
  closesAt: "",
  evaluationName: "",
  opensAt: "",
  organizationId: "",
  projectCode: "",
  projectCompletedOn: "",
  projectManagerUserId: "",
  projectName: ""
};

export function ProjectCycleManagementPanel({
  service = browserProjectCycleService,
  workspaceContext
}: ProjectCycleManagementPanelProps) {
  const defaultOrganizationId = useMemo(
    () => workspaceContext.memberships[0]?.organizationId ?? "",
    [workspaceContext.memberships]
  );
  const [formState, setFormState] = useState<FormState>({
    ...initialFormState,
    organizationId: defaultOrganizationId
  });
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProjects() {
      setLoadState({ status: "loading" });

      try {
        const projects = await service.listProjectCycles();

        if (!isActive) {
          return;
        }

        setLoadState({ status: "ready", projects });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setLoadState({
          message: toProjectCycleFeedbackMessage(error),
          status: "failed"
        });
      }
    }

    void loadProjects();

    return () => {
      isActive = false;
    };
  }, [service]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const project = await service.createProjectCycle(toDraft(formState));
      setLoadState((current) =>
        current.status === "ready"
          ? { status: "ready", projects: [project, ...current.projects] }
          : { status: "ready", projects: [project] }
      );
      setFeedbackMessage(tr.administration.projects.feedback.created);
      setFormState({
        ...initialFormState,
        organizationId: defaultOrganizationId
      });
    } catch (error) {
      setFeedbackMessage(toProjectCycleFeedbackMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label={tr.administration.projects.sectionLabel}
      className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]"
    >
      <form
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <h2 className="text-lg font-semibold">
          {tr.administration.projects.form.title}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextField
            label={tr.administration.projects.form.organizationId}
            name="organizationId"
            onChange={setFormState}
            required
            type="text"
            value={formState.organizationId}
          />
          <TextField
            label={tr.administration.projects.form.projectName}
            name="projectName"
            onChange={setFormState}
            required
            type="text"
            value={formState.projectName}
          />
          <TextField
            label={tr.administration.projects.form.projectCode}
            name="projectCode"
            onChange={setFormState}
            type="text"
            value={formState.projectCode}
          />
          <TextField
            label={tr.administration.projects.form.projectCompletedOn}
            name="projectCompletedOn"
            onChange={setFormState}
            type="date"
            value={formState.projectCompletedOn}
          />
          <TextField
            label={tr.administration.projects.form.evaluationName}
            name="evaluationName"
            onChange={setFormState}
            required
            type="text"
            value={formState.evaluationName}
          />
          <TextField
            label={tr.administration.projects.form.projectManagerUserId}
            name="projectManagerUserId"
            onChange={setFormState}
            type="text"
            value={formState.projectManagerUserId}
          />
          <TextField
            label={tr.administration.projects.form.opensAt}
            name="opensAt"
            onChange={setFormState}
            required
            type="datetime-local"
            value={formState.opensAt}
          />
          <TextField
            label={tr.administration.projects.form.closesAt}
            name="closesAt"
            onChange={setFormState}
            required
            type="datetime-local"
            value={formState.closesAt}
          />
        </div>
        <button
          className="mt-5 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? tr.administration.projects.form.submitting
            : tr.administration.projects.form.submit}
        </button>
        {feedbackMessage ? (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
            {feedbackMessage}
          </p>
        ) : null}
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          {tr.administration.projects.list.title}
        </h2>
        <ProjectList loadState={loadState} />
      </section>
    </section>
  );
}

function TextField({
  label,
  name,
  onChange,
  required = false,
  type,
  value
}: {
  readonly label: string;
  readonly name: keyof FormState;
  readonly onChange: (
    updater: (current: FormState) => FormState
  ) => void;
  readonly required?: boolean;
  readonly type: string;
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
        name={name}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          onChange((current) => ({
            ...current,
            [name]: nextValue
          }));
        }}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function ProjectList({ loadState }: { readonly loadState: LoadState }) {
  if (loadState.status === "loading") {
    return (
      <p className="mt-4 text-sm leading-6 text-slate-600">
        {tr.administration.projects.list.loading}
      </p>
    );
  }

  if (loadState.status === "failed") {
    return (
      <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-950">
        {loadState.message}
      </p>
    );
  }

  if (loadState.projects.length === 0) {
    return (
      <p className="mt-4 text-sm leading-6 text-slate-600">
        {tr.administration.projects.list.empty}
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {loadState.projects.map((project) => (
        <article
          className="rounded-md border border-slate-200 bg-slate-50 p-4"
          key={project.id}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">{project.name}</h3>
              {project.code ? (
                <p className="mt-1 text-sm text-slate-600">{project.code}</p>
              ) : null}
            </div>
            <span className="w-fit rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {project.status}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <ProjectDate
              label={tr.administration.projects.list.projectCompletedOn}
              value={project.completesOn}
            />
            <ProjectDate
              label={tr.administration.projects.list.evaluationClose}
              value={project.cycles[0]?.closesAt ?? null}
            />
          </dl>
        </article>
      ))}
    </div>
  );
}

function ProjectDate({
  label,
  value
}: {
  readonly label: string;
  readonly value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-700">
        {value ?? tr.administration.projects.list.noDate}
      </dd>
    </div>
  );
}

function toDraft(formState: FormState): ProjectCycleDraft {
  return {
    closesAt: new Date(formState.closesAt).toISOString(),
    evaluationName: formState.evaluationName,
    opensAt: new Date(formState.opensAt).toISOString(),
    organizationId: formState.organizationId,
    projectCode: normalizeOptionalValue(formState.projectCode),
    projectCompletedOn: normalizeOptionalValue(formState.projectCompletedOn),
    projectManagerUserId: normalizeOptionalValue(formState.projectManagerUserId),
    projectName: formState.projectName
  };
}

function normalizeOptionalValue(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function toProjectCycleFeedbackMessage(error: unknown): string {
  if (error instanceof ProjectCycleServiceError) {
    return tr.administration.projects.feedback[error.code];
  }

  return tr.administration.projects.feedback.genericError;
}

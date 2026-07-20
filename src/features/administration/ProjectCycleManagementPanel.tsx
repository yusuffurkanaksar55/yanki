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
  type OrganizationMember,
  type ProjectCycleDraft,
  type ProjectCycleService,
  type ProjectMemberDraft,
  type ProjectMembershipKind
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

type MemberFormState = {
  readonly userId: string;
  readonly membershipKind: ProjectMembershipKind;
};

type LoadState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly organizationMembersById: Readonly<
        Record<string, readonly OrganizationMember[]>
      >;
      readonly projects: readonly ManagedProject[];
    }
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

const initialMemberFormState: MemberFormState = {
  membershipKind: "MEMBER",
  userId: ""
};

const membershipKindOptions: readonly ProjectMembershipKind[] = [
  "MEMBER",
  "PROJECT_MANAGER",
  "SPONSOR",
  "OBSERVER"
];

export function ProjectCycleManagementPanel({
  service = browserProjectCycleService,
  workspaceContext
}: ProjectCycleManagementPanelProps) {
  const defaultOrganizationId = useMemo(
    () => workspaceContext.memberships[0]?.organizationId ?? "",
    [workspaceContext.memberships]
  );
  const canLoadOrganizationMembers = useMemo(
    () => workspaceContext.roles.some((role) => role.roleCode === "SYSTEM_ADMIN"),
    [workspaceContext.roles]
  );
  const [formState, setFormState] = useState<FormState>({
    ...initialFormState,
    organizationId: defaultOrganizationId
  });
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberFormStates, setMemberFormStates] = useState<
    Record<string, MemberFormState>
  >({});
  const [submittingMemberProjectId, setSubmittingMemberProjectId] = useState<
    string | null
  >(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const organizationMembers =
    loadState.status === "ready"
      ? loadState.organizationMembersById[formState.organizationId] ?? []
      : [];

  useEffect(() => {
    let isActive = true;

    async function loadProjects() {
      setLoadState({ status: "loading" });

      try {
        const projects = await service.listProjectCycles();
        const organizationIds = uniqueStrings([
          defaultOrganizationId,
          ...projects.map((project) => project.organizationId)
        ]);
        const organizationMembersById = canLoadOrganizationMembers
          ? await loadOrganizationMembersById(service, organizationIds)
          : {};

        if (!isActive) {
          return;
        }

        setLoadState({
          organizationMembersById,
          projects,
          status: "ready"
        });
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
  }, [canLoadOrganizationMembers, defaultOrganizationId, service]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const project = await service.createProjectCycle(toDraft(formState));
      setLoadState((current) =>
        current.status === "ready"
          ? {
              ...current,
              projects: [project, ...current.projects]
            }
          : {
              organizationMembersById: {},
              projects: [project],
              status: "ready"
            }
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

  async function handleAddProjectMember(
    projectId: string,
    draft: ProjectMemberDraft
  ) {
    setSubmittingMemberProjectId(projectId);
    setFeedbackMessage(null);

    try {
      const project = await service.addProjectMember(draft);
      setLoadState((current) =>
        current.status === "ready"
          ? {
              ...current,
              projects: current.projects.map((existingProject) =>
                existingProject.id === project.id ? project : existingProject
              )
            }
          : current
      );
      setMemberFormStates((current) => {
        const remaining = { ...current };
        delete remaining[projectId];

        return remaining;
      });
      setFeedbackMessage(tr.administration.projects.feedback.memberAdded);
    } catch (error) {
      setFeedbackMessage(toProjectCycleFeedbackMessage(error));
    } finally {
      setSubmittingMemberProjectId(null);
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
          {organizationMembers.length > 0 ? (
            <UserSelectField
              label={tr.administration.projects.form.projectManagerUserId}
              members={organizationMembers}
              name="projectManagerUserId"
              onChange={setFormState}
              placeholder={
                tr.administration.projects.members.projectManagerPlaceholder
              }
              value={formState.projectManagerUserId}
            />
          ) : (
            <TextField
              label={tr.administration.projects.form.projectManagerUserId}
              name="projectManagerUserId"
              onChange={setFormState}
              type="text"
              value={formState.projectManagerUserId}
            />
          )}
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
        <ProjectList
          loadState={loadState}
          memberFormStates={memberFormStates}
          onAddProjectMember={(projectId, draft) => {
            void handleAddProjectMember(projectId, draft);
          }}
          onMemberFormChange={setMemberFormStates}
          submittingMemberProjectId={submittingMemberProjectId}
        />
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

function UserSelectField({
  label,
  members,
  name,
  onChange,
  placeholder,
  value
}: {
  readonly label: string;
  readonly members: readonly OrganizationMember[];
  readonly name: keyof FormState;
  readonly onChange: (
    updater: (current: FormState) => FormState
  ) => void;
  readonly placeholder: string;
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <select
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
        name={name}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          onChange((current) => ({
            ...current,
            [name]: nextValue
          }));
        }}
        value={value}
      >
        <option value="">{placeholder}</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {formatOrganizationMember(member)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProjectList({
  loadState,
  memberFormStates,
  onAddProjectMember,
  onMemberFormChange,
  submittingMemberProjectId
}: {
  readonly loadState: LoadState;
  readonly memberFormStates: Readonly<Record<string, MemberFormState>>;
  readonly onAddProjectMember: (
    projectId: string,
    draft: ProjectMemberDraft
  ) => void;
  readonly onMemberFormChange: (
    updater: (
      current: Record<string, MemberFormState>
    ) => Record<string, MemberFormState>
  ) => void;
  readonly submittingMemberProjectId: string | null;
}) {
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
          <ProjectMembers
            members={project.members}
            organizationMembers={
              loadState.organizationMembersById[project.organizationId] ?? []
            }
            project={project}
            state={memberFormStates[project.id] ?? initialMemberFormState}
            isSubmitting={submittingMemberProjectId === project.id}
            onChange={(nextState) => {
              onMemberFormChange((current) => ({
                ...current,
                [project.id]: nextState
              }));
            }}
            onSubmit={(draft) => {
              onAddProjectMember(project.id, draft);
            }}
          />
        </article>
      ))}
    </div>
  );
}

function ProjectMembers({
  isSubmitting,
  members,
  onChange,
  onSubmit,
  organizationMembers,
  project,
  state
}: {
  readonly isSubmitting: boolean;
  readonly members: ManagedProject["members"];
  readonly onChange: (state: MemberFormState) => void;
  readonly onSubmit: (draft: ProjectMemberDraft) => void;
  readonly organizationMembers: readonly OrganizationMember[];
  readonly project: ManagedProject;
  readonly state: MemberFormState;
}) {
  return (
    <section
      aria-label={`${project.name} ${tr.administration.projects.members.sectionLabel}`}
      className="mt-5 border-t border-slate-200 pt-4"
    >
      <h4 className="text-sm font-semibold text-slate-800">
        {tr.administration.projects.members.title}
      </h4>
      {members.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {members.map((member) => (
            <li
              className="flex flex-col gap-1 text-sm leading-6 text-slate-700 sm:flex-row sm:items-center sm:justify-between"
              key={member.id}
            >
              <span>{formatProjectMember(member)}</span>
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                {formatMembershipKind(member.membershipKind)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {tr.administration.projects.members.empty}
        </p>
      )}
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_11rem_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();

          if (!state.userId) {
            return;
          }

          onSubmit({
            membershipKind: state.membershipKind,
            projectId: project.id,
            userId: state.userId
          });
        }}
      >
        <label className="block text-sm font-semibold text-slate-800">
          {tr.administration.projects.members.user}
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
            disabled={organizationMembers.length === 0}
            onChange={(event) => {
              onChange({
                ...state,
                userId: event.currentTarget.value
              });
            }}
            required
            value={state.userId}
          >
            <option value="">
              {organizationMembers.length > 0
                ? tr.administration.projects.members.userPlaceholder
                : tr.administration.projects.members.noOrganizationMembers}
            </option>
            {organizationMembers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {formatOrganizationMember(member)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          {tr.administration.projects.members.kind}
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
            onChange={(event) => {
              onChange({
                ...state,
                membershipKind: event.currentTarget.value as ProjectMembershipKind
              });
            }}
            value={state.membershipKind}
          >
            {membershipKindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {formatMembershipKind(kind)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded-md border border-pine bg-white px-3 py-2 text-sm font-semibold text-pine transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          disabled={isSubmitting || organizationMembers.length === 0}
          type="submit"
        >
          {isSubmitting
            ? tr.administration.projects.members.adding
            : tr.administration.projects.members.add}
        </button>
      </form>
    </section>
  );
}

async function loadOrganizationMembersById(
  service: ProjectCycleService,
  organizationIds: readonly string[]
): Promise<Record<string, readonly OrganizationMember[]>> {
  const entries = await Promise.all(
    organizationIds.map(async (organizationId) => {
      try {
        return [
          organizationId,
          await service.listOrganizationMembers(organizationId)
        ] as const;
      } catch {
        return [organizationId, []] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}

function formatOrganizationMember(member: OrganizationMember): string {
  return member.displayName
    ? `${member.displayName} (${member.email})`
    : member.email;
}

function formatProjectMember(member: ManagedProject["members"][number]): string {
  if (member.displayName && member.email) {
    return `${member.displayName} (${member.email})`;
  }

  return member.displayName ?? member.email ?? member.userId;
}

function formatMembershipKind(kind: ProjectMembershipKind): string {
  return tr.administration.projects.members.kindLabels[kind];
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
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

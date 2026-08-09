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
  type ManagedEvaluationCycle,
  type OrganizationMember,
  type ProjectCycleDraft,
  type ProjectCycleService,
  type ProjectDateUpdateDraft,
  type ProjectMemberDraft,
  type ProjectMembershipKind
} from "./projectCycleService";
import {
  browserEvaluationTemplateService,
  type EvaluationTemplate,
  type EvaluationTemplateService,
  type EvaluationTemplateVersion
} from "./evaluationTemplateService";

type ProjectCycleManagementPanelProps = {
  readonly evaluationTemplateService?: EvaluationTemplateService;
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
  readonly templateVersionId: string;
};

type MemberFormState = {
  readonly userId: string;
  readonly membershipKind: ProjectMembershipKind;
};

type DateFormState = {
  readonly projectCompletedOn: string;
  readonly closesAt: string;
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
  projectName: "",
  templateVersionId: ""
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
  evaluationTemplateService = browserEvaluationTemplateService,
  service = browserProjectCycleService,
  workspaceContext
}: ProjectCycleManagementPanelProps) {
  const defaultOrganizationId = useMemo(
    () => workspaceContext.memberships[0]?.organizationId ?? "",
    [workspaceContext.memberships]
  );
  const organizationOptions = useMemo(
    () => Array.from(
      new Map(
        workspaceContext.memberships.map((membership) => [
          membership.organizationId,
          {
            id: membership.organizationId,
            name: membership.organizationName
          }
        ])
      ).values()
    ),
    [workspaceContext.memberships]
  );
  const canLoadOrganizationMembers = useMemo(
    () => workspaceContext.roles.some((role) => role.roleCode === "SYSTEM_ADMIN"),
    [workspaceContext.roles]
  );
  const canCreateProjectCycles = canLoadOrganizationMembers;
  const [formState, setFormState] = useState<FormState>({
    ...initialFormState,
    organizationId: defaultOrganizationId
  });
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading"
  });
  const [templates, setTemplates] = useState<readonly EvaluationTemplate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberFormStates, setMemberFormStates] = useState<
    Record<string, MemberFormState>
  >({});
  const [submittingMemberProjectId, setSubmittingMemberProjectId] = useState<
    string | null
  >(null);
  const [generatingAssignmentCycleId, setGeneratingAssignmentCycleId] =
    useState<string | null>(null);
  const [dateFormStates, setDateFormStates] = useState<
    Record<string, DateFormState>
  >({});
  const [updatingDateCycleId, setUpdatingDateCycleId] = useState<string | null>(
    null
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const organizationMembers =
    loadState.status === "ready"
      ? loadState.organizationMembersById[formState.organizationId] ?? []
      : [];
  const publishedTemplateVersions = useMemo(
    () => templates.flatMap((template) =>
      template.organizationId === formState.organizationId
        ? template.versions
          .filter((version) => version.status === "PUBLISHED")
          .map((version) => ({ template, version }))
        : []
    ),
    [formState.organizationId, templates]
  );

  useEffect(() => {
    let isActive = true;

    async function loadProjects() {
      setLoadState({ status: "loading" });

      try {
        const [projects, managedTemplates] = await Promise.all([
          service.listProjectCycles(),
          canCreateProjectCycles
            ? evaluationTemplateService.listTemplates()
            : Promise.resolve([])
        ]);
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
        setTemplates(managedTemplates);
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
  }, [
    canCreateProjectCycles,
    canLoadOrganizationMembers,
    defaultOrganizationId,
    evaluationTemplateService,
    service
  ]);

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

  async function handleGenerateProjectAssignments(evaluationCycleId: string) {
    setGeneratingAssignmentCycleId(evaluationCycleId);
    setFeedbackMessage(null);

    try {
      const result = await service.generateProjectAssignments(evaluationCycleId);
      setLoadState((current) =>
        current.status === "ready"
          ? {
              ...current,
              projects: current.projects.map((project) => ({
                ...project,
                cycles: project.cycles.map((cycle) =>
                  cycle.id === result.evaluationCycleId
                    ? {
                        ...cycle,
                        assignmentSummary: result.assignmentSummary
                      }
                    : cycle
                )
              }))
            }
          : current
      );
      setFeedbackMessage(tr.administration.projects.feedback.assignmentsGenerated);
    } catch (error) {
      setFeedbackMessage(toProjectCycleFeedbackMessage(error));
    } finally {
      setGeneratingAssignmentCycleId(null);
    }
  }

  async function handleUpdateProjectDates(draft: ProjectDateUpdateDraft) {
    setUpdatingDateCycleId(draft.evaluationCycleId);
    setFeedbackMessage(null);

    try {
      const project = await service.updateProjectDates(draft);
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
      setDateFormStates((current) => {
        const remaining = { ...current };
        delete remaining[draft.evaluationCycleId];

        return remaining;
      });
      setFeedbackMessage(tr.administration.projects.feedback.datesUpdated);
    } catch (error) {
      setFeedbackMessage(toProjectCycleFeedbackMessage(error));
    } finally {
      setUpdatingDateCycleId(null);
    }
  }

  return (
    <section
      aria-label={tr.administration.projects.sectionLabel}
      className={`mt-8 grid gap-4 ${
        canCreateProjectCycles ? "2xl:grid-cols-[0.9fr_1.1fr]" : ""
      }`}
    >
      {canCreateProjectCycles ? (
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
          {organizationOptions.length > 0 ? (
            <OrganizationSelectField
              onChange={setFormState}
              options={organizationOptions}
              value={formState.organizationId}
            />
          ) : (
            <TextField
              label={tr.administration.projects.form.organizationId}
              name="organizationId"
              onChange={setFormState}
              required
              type="text"
              value={formState.organizationId}
            />
          )}
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
          <TemplateVersionSelectField
            onChange={setFormState}
            options={publishedTemplateVersions}
            value={formState.templateVersionId}
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
          disabled={isSubmitting || publishedTemplateVersions.length === 0}
          type="submit"
        >
          {isSubmitting
            ? tr.administration.projects.form.submitting
            : tr.administration.projects.form.submit}
        </button>
        </form>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          {tr.administration.projects.list.title}
        </h2>
        {feedbackMessage ? (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
            {feedbackMessage}
          </p>
        ) : null}
        <ProjectList
          canAdministerProject={(project) =>
            canAdministerProject(workspaceContext, project)
          }
          canUpdateProjectDates={(project) =>
            canUpdateProjectDates(workspaceContext, project)
          }
          dateFormStates={dateFormStates}
          loadState={loadState}
          memberFormStates={memberFormStates}
          onAddProjectMember={(projectId, draft) => {
            void handleAddProjectMember(projectId, draft);
          }}
          onGenerateProjectAssignments={(evaluationCycleId) => {
            void handleGenerateProjectAssignments(evaluationCycleId);
          }}
          onDateFormChange={setDateFormStates}
          onUpdateProjectDates={(draft) => {
            void handleUpdateProjectDates(draft);
          }}
          onMemberFormChange={setMemberFormStates}
          generatingAssignmentCycleId={generatingAssignmentCycleId}
          submittingMemberProjectId={submittingMemberProjectId}
          updatingDateCycleId={updatingDateCycleId}
        />
      </section>
    </section>
  );
}

function OrganizationSelectField({
  onChange,
  options,
  value
}: {
  readonly onChange: (
    updater: (current: FormState) => FormState
  ) => void;
  readonly options: readonly { readonly id: string; readonly name: string }[];
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {tr.administration.projects.form.organizationId}
      <select
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
        onChange={(event) => {
          const organizationId = event.target.value;
          onChange((current) => ({ ...current, organizationId }));
        }}
        required
        value={value}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
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

function TemplateVersionSelectField({
  onChange,
  options,
  value
}: {
  readonly onChange: (
    updater: (current: FormState) => FormState
  ) => void;
  readonly options: readonly {
    readonly template: EvaluationTemplate;
    readonly version: EvaluationTemplateVersion;
  }[];
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {tr.administration.projects.form.templateVersion}
      <select
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20 disabled:bg-slate-100"
        disabled={options.length === 0}
        onChange={(event) => {
          const templateVersionId = event.currentTarget.value;
          onChange((current) => ({ ...current, templateVersionId }));
        }}
        required
        value={value}
      >
        <option value="">
          {options.length > 0
            ? tr.administration.projects.form.templateVersionPlaceholder
            : tr.administration.projects.form.noPublishedTemplate}
        </option>
        {options.map(({ template, version }) => (
          <option key={version.id} value={version.id}>
            {template.name} - v{version.versionNumber}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProjectList({
  canAdministerProject,
  canUpdateProjectDates,
  dateFormStates,
  generatingAssignmentCycleId,
  loadState,
  memberFormStates,
  onAddProjectMember,
  onGenerateProjectAssignments,
  onDateFormChange,
  onMemberFormChange,
  onUpdateProjectDates,
  submittingMemberProjectId,
  updatingDateCycleId
}: {
  readonly canAdministerProject: (project: ManagedProject) => boolean;
  readonly canUpdateProjectDates: (project: ManagedProject) => boolean;
  readonly dateFormStates: Readonly<Record<string, DateFormState>>;
  readonly generatingAssignmentCycleId: string | null;
  readonly loadState: LoadState;
  readonly memberFormStates: Readonly<Record<string, MemberFormState>>;
  readonly onAddProjectMember: (
    projectId: string,
    draft: ProjectMemberDraft
  ) => void;
  readonly onGenerateProjectAssignments: (evaluationCycleId: string) => void;
  readonly onDateFormChange: (
    updater: (
      current: Record<string, DateFormState>
    ) => Record<string, DateFormState>
  ) => void;
  readonly onMemberFormChange: (
    updater: (
      current: Record<string, MemberFormState>
    ) => Record<string, MemberFormState>
  ) => void;
  readonly onUpdateProjectDates: (draft: ProjectDateUpdateDraft) => void;
  readonly submittingMemberProjectId: string | null;
  readonly updatingDateCycleId: string | null;
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
              {formatProjectStatus(project.status)}
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
            <ProjectDate
              label={tr.administration.projects.list.templateVersion}
              value={project.cycles[0]
                ? `${project.cycles[0].templateName} - v${project.cycles[0].templateVersionNumber}`
                : tr.administration.projects.list.noTemplateVersion}
            />
          </dl>
          {canUpdateProjectDates(project) ? (
            <ProjectDateManagement
              cycle={project.cycles[0] ?? null}
              isSubmitting={
                project.cycles[0]?.id === updatingDateCycleId
              }
              onChange={(nextState) => {
                const cycleId = project.cycles[0]?.id;

                if (!cycleId) {
                  return;
                }

                onDateFormChange((current) => ({
                  ...current,
                  [cycleId]: nextState
                }));
              }}
              onSubmit={onUpdateProjectDates}
              project={project}
              state={
                project.cycles[0]
                  ? dateFormStates[project.cycles[0].id]
                    ?? toDateFormState(project, project.cycles[0])
                  : null
              }
            />
          ) : null}
          <ProjectAssignmentPlanning
            canGenerate={canAdministerProject(project)}
            cycle={project.cycles[0] ?? null}
            isGenerating={
              project.cycles[0]?.id === generatingAssignmentCycleId
            }
            onGenerate={onGenerateProjectAssignments}
          />
          {canAdministerProject(project) ? (
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
          ) : null}
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

function ProjectDateManagement({
  cycle,
  isSubmitting,
  onChange,
  onSubmit,
  project,
  state
}: {
  readonly cycle: ManagedEvaluationCycle | null;
  readonly isSubmitting: boolean;
  readonly onChange: (state: DateFormState) => void;
  readonly onSubmit: (draft: ProjectDateUpdateDraft) => void;
  readonly project: ManagedProject;
  readonly state: DateFormState | null;
}) {
  return (
    <section
      aria-label={`${project.name} ${tr.administration.projects.dates.sectionLabel}`}
      className="mt-5 border-t border-slate-200 pt-4"
    >
      <h4 className="text-sm font-semibold text-slate-800">
        {tr.administration.projects.dates.title}
      </h4>
      {!cycle || !state ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {tr.administration.projects.dates.noCycle}
        </p>
      ) : (
        <form
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.35fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(toProjectDateUpdateDraft(project.id, cycle.id, state));
          }}
        >
          <label className="block text-sm font-semibold text-slate-800">
            {tr.administration.projects.dates.projectCompletedOn}
            <input
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
              onChange={(event) => {
                onChange({
                  ...state,
                  projectCompletedOn: event.currentTarget.value
                });
              }}
              type="date"
              value={state.projectCompletedOn}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {tr.administration.projects.dates.closesAt}
            <input
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
              onChange={(event) => {
                onChange({
                  ...state,
                  closesAt: event.currentTarget.value
                });
              }}
              required
              type="datetime-local"
              value={state.closesAt}
            />
          </label>
          <button
            className="rounded-md border border-pine bg-white px-3 py-2 text-sm font-semibold text-pine transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? tr.administration.projects.dates.saving
              : tr.administration.projects.dates.save}
          </button>
        </form>
      )}
    </section>
  );
}

function ProjectAssignmentPlanning({
  canGenerate,
  cycle,
  isGenerating,
  onGenerate
}: {
  readonly canGenerate: boolean;
  readonly cycle: ManagedProject["cycles"][number] | null;
  readonly isGenerating: boolean;
  readonly onGenerate: (evaluationCycleId: string) => void;
}) {
  if (!cycle) {
    return (
      <section className="mt-5 rounded-md border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-800">
          {tr.administration.projects.assignments.title}
        </h4>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {tr.administration.projects.assignments.noCycle}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            {tr.administration.projects.assignments.title}
          </h4>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <AssignmentMetric
              label={tr.administration.projects.assignments.total}
              value={cycle.assignmentSummary.total}
            />
            <AssignmentMetric
              label={tr.administration.projects.assignments.pending}
              value={cycle.assignmentSummary.pending}
            />
            <AssignmentMetric
              label={tr.administration.projects.assignments.completed}
              value={cycle.assignmentSummary.completed}
            />
            <AssignmentMetric
              label={tr.administration.projects.assignments.cancelled}
              value={cycle.assignmentSummary.cancelled}
            />
          </dl>
        </div>
        {canGenerate ? (
          <button
            className="w-fit rounded-md bg-pine px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isGenerating}
            onClick={() => {
              onGenerate(cycle.id);
            }}
            type="button"
          >
            {isGenerating
              ? tr.administration.projects.assignments.generating
              : tr.administration.projects.assignments.generate}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AssignmentMetric({
  label,
  value
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-800">{value}</dd>
    </div>
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

function canAdministerProject(
  workspaceContext: WorkspaceContext,
  project: ManagedProject
): boolean {
  return workspaceContext.roles.some((role) =>
    role.roleCode === "SYSTEM_ADMIN"
    && (
      role.scopeType === "PLATFORM"
      || (
        role.scopeType === "ORGANIZATION"
        && role.scopeId === project.organizationId
      )
    )
  );
}

function canUpdateProjectDates(
  workspaceContext: WorkspaceContext,
  project: ManagedProject
): boolean {
  return canAdministerProject(workspaceContext, project)
    || workspaceContext.roles.some((role) =>
      role.roleCode === "PROJECT_MANAGER"
      && role.scopeType === "PROJECT"
      && role.scopeId === project.id
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
        {formatProjectDate(value)}
      </dd>
    </div>
  );
}

function formatProjectStatus(status: string): string {
  return (
    tr.administration.projects.statusLabels[
      status as keyof typeof tr.administration.projects.statusLabels
    ] ?? status
  );
}

function formatProjectDate(value: string | null): string {
  if (!value) {
    return tr.administration.projects.list.noDate;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    ...(value.includes("T") ? { timeStyle: "short" as const } : {})
  }).format(date);
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
    projectName: formState.projectName,
    templateVersionId: formState.templateVersionId
  };
}

function toDateFormState(
  project: ManagedProject,
  cycle: ManagedEvaluationCycle
): DateFormState {
  return {
    closesAt: toLocalDateTimeInput(cycle.closesAt),
    projectCompletedOn:
      cycle.projectCompletedOn ?? project.completesOn ?? ""
  };
}

function toProjectDateUpdateDraft(
  projectId: string,
  evaluationCycleId: string,
  state: DateFormState
): ProjectDateUpdateDraft {
  return {
    closesAt: new Date(state.closesAt).toISOString(),
    evaluationCycleId,
    projectCompletedOn: normalizeOptionalValue(state.projectCompletedOn),
    projectId
  };
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

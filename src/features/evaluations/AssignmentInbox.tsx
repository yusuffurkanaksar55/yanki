import { useEffect, useState } from "react";
import { tr } from "../../locales/tr/messages";
import {
  createAssignmentSummary,
  type AssignmentInboxSummary
} from "./assignmentSummary";
import {
  browserEvaluationAssignmentService,
  type EvaluationAssignment,
  type EvaluationAssignmentAvailability,
  type EvaluationAssignmentService
} from "./evaluationAssignmentService";
import { EvaluationSubmissionForm } from "./EvaluationSubmissionForm";

type AssignmentInboxProps = {
  readonly onSummaryChange?: (summary: AssignmentInboxSummary) => void;
  readonly service?: EvaluationAssignmentService;
  readonly showHeader?: boolean;
};

type AssignmentFilter = "active" | "completed" | "all";

const assignmentPageSize = 6;

type AssignmentInboxState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly assignments: readonly EvaluationAssignment[];
    }
  | { readonly status: "error" };

export function AssignmentInbox({
  onSummaryChange,
  service = browserEvaluationAssignmentService,
  showHeader = true
}: AssignmentInboxProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AssignmentInboxState>({
    status: "loading"
  });
  const [preparingAssignmentId, setPreparingAssignmentId] = useState<string | null>(
    null
  );
  const [preparedSubmission, setPreparedSubmission] = useState<
    Awaited<ReturnType<EvaluationAssignmentService["prepareSubmission"]>> | null
  >(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [filter, setFilter] = useState<AssignmentFilter>("active");
  const [visibleCount, setVisibleCount] = useState(assignmentPageSize);

  useEffect(() => {
    let isActive = true;

    async function loadAssignments() {
      setState({ status: "loading" });

      try {
        const assignments = await service.listMyAssignments();

        if (!isActive) {
          return;
        }

        setState({ status: "ready", assignments });
        onSummaryChange?.(createAssignmentSummary(assignments));
      } catch {
        if (!isActive) {
          return;
        }

        setState({ status: "error" });
        onSummaryChange?.({ activeCycleCount: 0, pendingAssignmentCount: 0 });
      }
    }

    void loadAssignments();

    return () => {
      isActive = false;
    };
  }, [onSummaryChange, reloadKey, service]);

  async function prepareSubmission(assignmentId: string) {
    setPreparingAssignmentId(assignmentId);
    setSubmissionFeedback(null);

    try {
      setPreparedSubmission(await service.prepareSubmission(assignmentId));
    } catch {
      setSubmissionFeedback(tr.assignments.submission.feedback.prepareFailed);
    } finally {
      setPreparingAssignmentId(null);
    }
  }

  function handleSubmitted() {
    setPreparedSubmission(null);
    setSubmissionFeedback(tr.assignments.submission.feedback.submitted);
    setReloadKey((current) => current + 1);
  }

  const assignments = state.status === "ready" ? state.assignments : [];
  const filteredAssignments = sortAssignments(
    assignments.filter((assignment) => matchesFilter(assignment, filter))
  );
  const visibleAssignments = filteredAssignments.slice(0, visibleCount);

  function changeFilter(nextFilter: AssignmentFilter) {
    setFilter(nextFilter);
    setVisibleCount(assignmentPageSize);
  }

  return (
    <section
      aria-label={tr.assignments.sectionLabel}
      className={showHeader ? "mt-8" : "mt-6"}
      id="assignments"
    >
      {showHeader ? (
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            {tr.assignments.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {tr.assignments.description}
          </p>
        </div>
      ) : null}

      {state.status === "ready" && state.assignments.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            aria-label={tr.assignments.filters.label}
            className="flex w-fit max-w-full overflow-x-auto rounded-md border border-slate-300 bg-white p-1 scrollbar-none"
            role="group"
          >
            {(["active", "completed", "all"] as const).map((filterName) => (
              <button
                aria-pressed={filter === filterName}
                className={`min-h-9 whitespace-nowrap rounded px-3 py-1.5 text-sm font-semibold transition focus-ring ${
                  filter === filterName
                    ? "bg-pine text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
                key={filterName}
                onClick={() => changeFilter(filterName)}
                type="button"
              >
                {tr.assignments.filters[filterName]}
              </button>
            ))}
          </div>
          <span className="text-sm font-semibold text-slate-600">
            {formatCount(filteredAssignments.length)}
          </span>
        </div>
      ) : null}

      {state.status === "loading" ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          {tr.assignments.loading}
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="mt-4 flex flex-col gap-4 rounded-lg border border-red-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-red-900">
            {tr.assignments.feedback.readFailed}
          </p>
          <button
            className="w-fit rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
            onClick={() => setReloadKey((current) => current + 1)}
            type="button"
          >
            {tr.assignments.actions.retry}
          </button>
        </div>
      ) : null}

      {state.status === "ready" && state.assignments.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-semibold text-slate-800">
            {tr.assignments.empty.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {tr.assignments.empty.description}
          </p>
        </div>
      ) : null}

      {state.status === "ready"
        && state.assignments.length > 0
        && filteredAssignments.length === 0 ? (
        <div className="mt-4 border-y border-slate-200 bg-white px-4 py-6">
          <p className="font-semibold text-slate-800">
            {tr.assignments.filteredEmpty.title}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {tr.assignments.filteredEmpty.description}
          </p>
        </div>
      ) : null}

      {state.status === "ready" && visibleAssignments.length > 0 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {visibleAssignments.map((assignment) => (
            <AssignmentCard
              assignment={assignment}
              isPreparing={preparingAssignmentId === assignment.id}
              key={assignment.id}
              onStart={() => void prepareSubmission(assignment.id)}
            />
          ))}
        </div>
      ) : null}

      {visibleAssignments.length < filteredAssignments.length ? (
        <div className="mt-5 flex justify-center">
          <button
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-ring"
            onClick={() => setVisibleCount((current) => current + assignmentPageSize)}
            type="button"
          >
            {tr.assignments.actions.showMore}
          </button>
        </div>
      ) : null}

      {submissionFeedback ? (
        <p
          className="mt-4 border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800"
          role="status"
        >
          {submissionFeedback}
        </p>
      ) : null}

      {preparedSubmission ? (
        <EvaluationSubmissionForm
          onCancel={() => setPreparedSubmission(null)}
          onSubmitted={handleSubmitted}
          service={service}
          submission={preparedSubmission}
        />
      ) : null}
    </section>
  );
}

function AssignmentCard({
  assignment,
  isPreparing,
  onStart
}: {
  readonly assignment: EvaluationAssignment;
  readonly isPreparing: boolean;
  readonly onStart: () => void;
}) {
  const status = getAvailabilityPresentation(assignment.availabilityStatus);
  const subjectName =
    assignment.subjectDisplayName ?? assignment.subjectEmail;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">
            {assignment.organizationName}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {assignment.evaluationCycleName}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <AssignmentDetail
          label={tr.assignments.labels.subject}
          value={subjectName}
        />
        <AssignmentDetail
          label={tr.assignments.labels.project}
          value={formatProject(assignment)}
        />
        <AssignmentDetail
          label={tr.assignments.labels.template}
          value={`${assignment.templateName} - v${assignment.templateVersionNumber}`}
        />
        <AssignmentDetail
          label={tr.assignments.labels.opensAt}
          value={formatDateTime(assignment.opensAt)}
        />
        <AssignmentDetail
          label={tr.assignments.labels.closesAt}
          value={formatDateTime(assignment.closesAt)}
        />
      </dl>

      {assignment.availabilityStatus === "AVAILABLE" ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <button
            className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isPreparing}
            onClick={onStart}
            type="button"
          >
            {isPreparing
              ? tr.assignments.actions.preparing
              : tr.assignments.actions.start}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function AssignmentDetail({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function matchesFilter(
  assignment: EvaluationAssignment,
  filter: AssignmentFilter
): boolean {
  if (filter === "active") {
    return ["AVAILABLE", "UPCOMING"].includes(assignment.availabilityStatus);
  }

  if (filter === "completed") {
    return assignment.availabilityStatus === "COMPLETED";
  }

  return true;
}

function sortAssignments(
  assignments: readonly EvaluationAssignment[]
): readonly EvaluationAssignment[] {
  const statusPriority: Record<EvaluationAssignmentAvailability, number> = {
    AVAILABLE: 0,
    UPCOMING: 1,
    COMPLETED: 2,
    CLOSED: 3
  };

  return [...assignments].sort((left, right) => {
    const priorityDifference =
      statusPriority[left.availabilityStatus]
      - statusPriority[right.availabilityStatus];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(right.closesAt).getTime() - new Date(left.closesAt).getTime();
  });
}

function formatCount(count: number): string {
  return tr.assignments.count.replace("{count}", String(count));
}

function formatProject(assignment: EvaluationAssignment): string {
  if (!assignment.projectName) {
    return tr.assignments.values.noProject;
  }

  return assignment.projectCode
    ? `${assignment.projectName} (${assignment.projectCode})`
    : assignment.projectName;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return tr.assignments.values.unknownDate;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getAvailabilityPresentation(
  availability: EvaluationAssignmentAvailability
): { readonly className: string; readonly label: string } {
  if (availability === "UPCOMING") {
    return {
      className: "bg-sky-50 text-sky-800",
      label: tr.assignments.status.upcoming
    };
  }

  if (availability === "CLOSED") {
    return {
      className: "bg-slate-100 text-slate-700",
      label: tr.assignments.status.closed
    };
  }

  if (availability === "COMPLETED") {
    return {
      className: "bg-emerald-50 text-emerald-900",
      label: tr.assignments.status.completed
    };
  }

  return {
    className: "bg-amber-50 text-amber-900",
    label: tr.assignments.status.available
  };
}

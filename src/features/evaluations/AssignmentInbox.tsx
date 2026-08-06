import { useEffect, useState } from "react";
import { tr } from "../../locales/tr/messages";
import {
  browserEvaluationAssignmentService,
  type EvaluationAssignment,
  type EvaluationAssignmentAvailability,
  type EvaluationAssignmentService
} from "./evaluationAssignmentService";

export type AssignmentInboxSummary = {
  readonly activeCycleCount: number;
  readonly pendingAssignmentCount: number;
};

type AssignmentInboxProps = {
  readonly onSummaryChange?: (summary: AssignmentInboxSummary) => void;
  readonly service?: EvaluationAssignmentService;
};

type AssignmentInboxState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly assignments: readonly EvaluationAssignment[];
    }
  | { readonly status: "error" };

export function AssignmentInbox({
  onSummaryChange,
  service = browserEvaluationAssignmentService
}: AssignmentInboxProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AssignmentInboxState>({
    status: "loading"
  });

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
        onSummaryChange?.(createSummary(assignments));
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

  return (
    <section
      aria-label={tr.assignments.sectionLabel}
      className="mt-8"
      id="assignments"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{tr.assignments.title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {tr.assignments.description}
          </p>
        </div>
        {state.status === "ready" ? (
          <span className="text-sm font-semibold text-slate-700">
            {formatCount(state.assignments.length)}
          </span>
        ) : null}
      </div>

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

      {state.status === "ready" && state.assignments.length > 0 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {state.assignments.map((assignment) => (
            <AssignmentCard assignment={assignment} key={assignment.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AssignmentCard({
  assignment
}: {
  readonly assignment: EvaluationAssignment;
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
          label={tr.assignments.labels.opensAt}
          value={formatDateTime(assignment.opensAt)}
        />
        <AssignmentDetail
          label={tr.assignments.labels.closesAt}
          value={formatDateTime(assignment.closesAt)}
        />
      </dl>
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

function createSummary(
  assignments: readonly EvaluationAssignment[]
): AssignmentInboxSummary {
  const activeCycleIds = new Set(
    assignments
      .filter((assignment) => assignment.availabilityStatus === "AVAILABLE")
      .map((assignment) => assignment.evaluationCycleId)
  );
  const pendingAssignmentCount = assignments.filter(
    (assignment) =>
      assignment.assignmentStatus === "PENDING"
      && ["AVAILABLE", "UPCOMING"].includes(assignment.availabilityStatus)
  ).length;

  return {
    activeCycleCount: activeCycleIds.size,
    pendingAssignmentCount
  };
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

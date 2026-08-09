import { useEffect, useState } from "react";
import { tr } from "../../locales/tr/messages";
import {
  browserEvaluationReportService,
  type EvaluationReport,
  type EvaluationReportDistributionItem,
  type EvaluationReportQuestion,
  type EvaluationReportService,
  type EvaluationReportTarget
} from "./evaluationReportService";

type EvaluationReportsPanelProps = {
  readonly service?: EvaluationReportService;
};

type TargetState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly targets: readonly EvaluationReportTarget[];
    };

export function EvaluationReportsPanel({
  service = browserEvaluationReportService
}: EvaluationReportsPanelProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [targetState, setTargetState] = useState<TargetState>({
    status: "loading"
  });
  const [selectedKey, setSelectedKey] = useState("");
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadTargets() {
      setTargetState({ status: "loading" });

      try {
        const targets = await service.listTargets();

        if (!isActive) {
          return;
        }

        setTargetState({ status: "ready", targets });
        setSelectedKey((current) => current || toTargetKey(targets[0]));
      } catch {
        if (isActive) {
          setTargetState({ status: "error" });
        }
      }
    }

    void loadTargets();

    return () => {
      isActive = false;
    };
  }, [reloadKey, service]);

  const selectedTarget = targetState.status === "ready"
    ? targetState.targets.find((target) => toTargetKey(target) === selectedKey)
    : undefined;

  async function loadReport() {
    if (!selectedTarget) {
      return;
    }

    setIsLoadingReport(true);
    setReportError(false);
    setReport(null);

    try {
      setReport(
        await service.getReport(
          selectedTarget.evaluationCycleId,
          selectedTarget.subjectUserId
        )
      );
    } catch {
      setReportError(true);
    } finally {
      setIsLoadingReport(false);
    }
  }

  return (
    <section aria-label={tr.reports.sectionLabel} className="mt-10" id="reports">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-coral">{tr.reports.eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold">{tr.reports.title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {tr.reports.description}
          </p>
        </div>
        <span className="w-fit rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-950 ring-1 ring-emerald-200">
          {tr.reports.aggregateOnly}
        </span>
      </div>

      {targetState.status === "loading" ? (
        <p className="mt-4 border-y border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
          {tr.reports.loadingTargets}
        </p>
      ) : null}

      {targetState.status === "error" ? (
        <div className="mt-4 flex flex-col gap-3 border-y border-red-200 bg-red-50 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-900">{tr.reports.feedback.targetsFailed}</p>
          <button
            className="w-fit rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
            onClick={() => setReloadKey((current) => current + 1)}
            type="button"
          >
            {tr.reports.actions.retry}
          </button>
        </div>
      ) : null}

      {targetState.status === "ready" && targetState.targets.length === 0 ? (
        <div className="mt-4 border-y border-slate-200 bg-white px-4 py-6">
          <p className="font-semibold text-slate-800">{tr.reports.empty.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {tr.reports.empty.description}
          </p>
        </div>
      ) : null}

      {targetState.status === "ready" && targetState.targets.length > 0 ? (
        <div className="mt-4 grid gap-4 border-y border-slate-200 bg-white px-4 py-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            {tr.reports.targetLabel}
            <select
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2"
              onChange={(event) => {
                setSelectedKey(event.target.value);
                setReport(null);
                setReportError(false);
              }}
              value={selectedKey}
            >
              {targetState.targets.map((target) => (
                <option key={toTargetKey(target)} value={toTargetKey(target)}>
                  {formatTargetOption(target)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="min-h-11 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!selectedTarget || isLoadingReport}
            onClick={() => void loadReport()}
            type="button"
          >
            {isLoadingReport
              ? tr.reports.actions.loading
              : tr.reports.actions.load}
          </button>
        </div>
      ) : null}

      {reportError ? (
        <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {tr.reports.feedback.reportFailed}
        </p>
      ) : null}

      {report?.status === "EMPTY" ? (
        <EmptyReport />
      ) : null}

      {report?.status === "AVAILABLE" ? (
        <AvailableReport report={report} />
      ) : null}
    </section>
  );
}

function EmptyReport() {
  return (
    <div className="mt-6 border-l-4 border-sky-600 bg-sky-50 px-5 py-5">
      <h3 className="font-semibold text-sky-950">{tr.reports.noResponses.title}</h3>
      <p className="mt-2 text-sm leading-6 text-sky-950">
        {tr.reports.noResponses.description}
      </p>
    </div>
  );
}

function AvailableReport({
  report
}: {
  readonly report: Extract<EvaluationReport, { readonly status: "AVAILABLE" }>;
}) {
  const subjectName = report.subjectDisplayName ?? report.subjectEmail;

  return (
    <div className="mt-7">
      <div className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">
            {report.organizationName} / {formatProject(report)}
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">
            {subjectName}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {report.evaluationCycleName} / {report.templateName} v{report.templateVersionNumber}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-slate-600">{tr.reports.labels.submissions}</dt>
          <dd className="text-right font-semibold text-slate-900">
            {report.submissionCount}
          </dd>
          <dt className="text-slate-600">{tr.reports.labels.cycleEnd}</dt>
          <dd className="text-right font-semibold text-slate-900">
            {formatDateTime(report.closedAt)}
          </dd>
        </dl>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {report.questions.map((question) => (
          <QuestionResult key={question.id} question={question} />
        ))}
      </div>
    </div>
  );
}

function QuestionResult({
  question
}: {
  readonly question: EvaluationReportQuestion;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-base font-semibold leading-6 text-slate-900">
          {question.position}. {question.prompt}
        </h4>
        <span className="shrink-0 text-xs font-semibold text-slate-500">
          {question.answeredCount} {tr.reports.labels.answers}
        </span>
      </div>
      <div className="mt-4">
        <AggregationResult question={question} />
      </div>
    </article>
  );
}

function AggregationResult({
  question
}: {
  readonly question: EvaluationReportQuestion;
}) {
  const aggregation = question.aggregation;

  if (aggregation.kind === "RATING") {
    return (
      <>
        <p className="text-3xl font-semibold text-pine">
          {aggregation.average === null ? "-" : formatDecimal(aggregation.average)}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {tr.reports.labels.average}
        </p>
        <Distribution rows={aggregation.distribution} />
      </>
    );
  }

  if (aggregation.kind === "YES_NO") {
    return (
      <Distribution
        rows={[
          { count: aggregation.yesCount, value: tr.reports.values.yes },
          { count: aggregation.noCount, value: tr.reports.values.no }
        ]}
      />
    );
  }

  if (aggregation.kind === "OPTIONS") {
    return <Distribution rows={aggregation.distribution} />;
  }

  return (
    <div className="border-l-2 border-slate-300 pl-4">
      <p className="text-sm font-semibold text-slate-800">
        {tr.reports.textWithheld.title}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        {tr.reports.textWithheld.description.replace(
          "{count}",
          String(aggregation.responseCount)
        )}
      </p>
    </div>
  );
}

function Distribution({
  rows
}: {
  readonly rows: readonly EvaluationReportDistributionItem[];
}) {
  const maximum = Math.max(1, ...rows.map((row) => row.count));

  return (
    <dl className="mt-4 grid gap-2">
      {rows.map((row) => (
        <div className="grid grid-cols-[minmax(3rem,auto)_1fr_2rem] items-center gap-3" key={row.value}>
          <dt className="min-w-0 break-words text-sm text-slate-700">{row.value}</dt>
          <dd className="h-2 overflow-hidden rounded-sm bg-slate-100">
            <span
              aria-hidden="true"
              className="block h-full bg-coral"
              style={{ width: `${(row.count / maximum) * 100}%` }}
            />
          </dd>
          <dd className="text-right text-sm font-semibold text-slate-800">
            {row.count}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function toTargetKey(target: EvaluationReportTarget | undefined): string {
  return target
    ? `${target.evaluationCycleId}:${target.subjectUserId}`
    : "";
}

function formatTargetOption(target: EvaluationReportTarget): string {
  const subjectName = target.subjectDisplayName ?? target.subjectEmail;

  return `${target.evaluationCycleName} / ${subjectName} / ${formatProject(target)}`;
}

function formatProject(target: EvaluationReportTarget): string {
  if (!target.projectName) {
    return tr.reports.values.organizationWide;
  }

  return target.projectCode
    ? `${target.projectName} (${target.projectCode})`
    : target.projectName;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(value);
}

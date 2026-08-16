import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  FileChartColumn,
  ListChecks,
  MessageSquareQuote,
  Target,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  readonly showHeader?: boolean;
};

type TargetState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly targets: readonly EvaluationReportTarget[];
    };

export function EvaluationReportsPanel({
  service = browserEvaluationReportService,
  showHeader = true
}: EvaluationReportsPanelProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [targetState, setTargetState] = useState<TargetState>({
    status: "loading"
  });
  const [selectedSubjectUserId, setSelectedSubjectUserId] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isExampleReport, setIsExampleReport] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState(false);
  const reportRequestIdRef = useRef(0);

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

  const targets = targetState.status === "ready" ? targetState.targets : [];
  const subjects = getReportSubjects(targets);
  const subjectTargets = targets.filter(
    (target) => target.subjectUserId === selectedSubjectUserId
  );
  const selectedTarget = subjectTargets.find(
    (target) => toTargetKey(target) === selectedKey
  );

  async function loadReport(target: EvaluationReportTarget | undefined) {
    if (!target) {
      return;
    }

    const requestId = reportRequestIdRef.current + 1;

    reportRequestIdRef.current = requestId;
    setIsLoadingReport(true);
    setIsExampleReport(false);
    setReportError(false);
    setReport(null);

    try {
      const nextReport = await service.getReport(
        target.evaluationCycleId,
        target.subjectUserId
      );

      if (reportRequestIdRef.current === requestId) {
        setReport(nextReport);
      }
    } catch {
      if (reportRequestIdRef.current === requestId) {
        setReportError(true);
      }
    } finally {
      if (reportRequestIdRef.current === requestId) {
        setIsLoadingReport(false);
      }
    }
  }

  return (
    <section
      aria-label={tr.reports.sectionLabel}
      className={showHeader ? "mt-10" : "mt-6"}
      id="reports"
    >
      {showHeader ? (
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
      ) : null}

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
        <div className="surface-panel mt-4 grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(14rem,0.9fr)_minmax(17rem,1.2fr)_auto] lg:items-start">
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            {tr.reports.subjectLabel}
            <select
              className="app-input text-sm font-normal"
              onChange={(event) => {
                const subjectUserId = event.target.value;
                const latestTarget = getLatestTargetForSubject(
                  targets,
                  subjectUserId
                );

                setSelectedSubjectUserId(subjectUserId);
                setSelectedKey(toTargetKey(latestTarget));
                setReport(null);
                setReportError(false);
                setIsExampleReport(false);
                void loadReport(latestTarget);
              }}
              value={selectedSubjectUserId}
            >
              <option value="">{tr.reports.subjectPlaceholder}</option>
              {subjects.map((subject) => (
                <option key={subject.subjectUserId} value={subject.subjectUserId}>
                  {formatSubjectOption(subject)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            {tr.reports.cycleLabel}
            <select
              className="app-input text-sm font-normal"
              disabled={!selectedSubjectUserId}
              onChange={(event) => {
                const key = event.target.value;
                const nextTarget = subjectTargets.find(
                  (target) => toTargetKey(target) === key
                );

                setSelectedKey(key);
                setReport(null);
                setReportError(false);
                setIsExampleReport(false);
                void loadReport(nextTarget);
              }}
              value={selectedKey}
            >
              <option value="">{tr.reports.cyclePlaceholder}</option>
              {subjectTargets.map((target) => (
                <option key={toTargetKey(target)} value={toTargetKey(target)}>
                  {formatCycleOption(target)}
                </option>
              ))}
            </select>
            {selectedTarget ? (
              <span className="font-normal leading-5 text-slate-500">
                {selectedTarget.organizationName} / {formatProject(selectedTarget)}
              </span>
            ) : null}
          </label>
          <button
            className="min-h-11 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 xl:mt-7"
            disabled={!selectedTarget || isLoadingReport}
            onClick={() => void loadReport(selectedTarget)}
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
        <EmptyReport
          onShowExample={() => {
            reportRequestIdRef.current += 1;
            setIsLoadingReport(false);
            setReport(createExampleReport());
            setIsExampleReport(true);
          }}
        />
      ) : null}

      {report?.status === "AVAILABLE" ? (
        <AvailableReport isExample={isExampleReport} report={report} />
      ) : null}
    </section>
  );
}

function EmptyReport({ onShowExample }: { readonly onShowExample: () => void }) {
  return (
    <div className="mt-6 border-l-4 border-sky-600 bg-sky-50 px-5 py-5">
      <h3 className="font-semibold text-sky-950">{tr.reports.noResponses.title}</h3>
      <p className="mt-2 text-sm leading-6 text-sky-950">
        {tr.reports.noResponses.description}
      </p>
      <button
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-sky-300 bg-white px-3 py-2 text-sm font-semibold text-sky-950 transition hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
        onClick={onShowExample}
        type="button"
      >
        <FileChartColumn aria-hidden="true" size={17} strokeWidth={1.8} />
        {tr.reports.actions.showExample}
      </button>
    </div>
  );
}

function AvailableReport({
  isExample,
  report
}: {
  readonly isExample: boolean;
  readonly report: Extract<EvaluationReport, { readonly status: "AVAILABLE" }>;
}) {
  const subjectName = report.subjectDisplayName ?? report.subjectEmail;
  const summary = summarizeReport(report);
  const scoreQuestions = report.questions.filter(
    (question) => question.aggregation.kind !== "TEXT_COMMENTS"
  );
  const commentQuestions = report.questions.filter(
    (question) => question.aggregation.kind === "TEXT_COMMENTS"
  );

  return (
    <div className="mt-7">
      {isExample ? (
        <div className="mb-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-950">
            {tr.reports.example.noticeTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            {tr.reports.example.noticeDescription}
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">
            {report.organizationName} / {formatProject(report)}
          </p>
          <p className="mt-3 text-xs font-bold uppercase text-coral">
            {tr.reports.labels.subject}
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

      <ReportSummary summary={summary} />

      {summary.ratedQuestions.length > 0 ? (
        <ReportInsights summary={summary} />
      ) : null}

      <div className="mt-8 border-b border-slate-200 pb-3">
        <p className="text-xs font-bold uppercase text-coral">
          {tr.reports.detail.eyebrow}
        </p>
        <h4 className="mt-1 text-lg font-semibold text-slate-950">
          {tr.reports.detail.title}
        </h4>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {tr.reports.detail.description}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {scoreQuestions.map((question) => (
          <QuestionResult
            key={question.id}
            question={question}
            submissionCount={report.submissionCount}
            subjectName={subjectName}
          />
        ))}
      </div>

      {commentQuestions.length > 0 ? (
        <div className="mt-8 grid gap-5">
          {commentQuestions.map((question) => (
            <QuestionResult
              key={question.id}
              question={question}
              submissionCount={report.submissionCount}
              subjectName={subjectName}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ReportSummaryData = {
  readonly answeredQuestionCount: number;
  readonly commentCount: number;
  readonly focusAreas: readonly RatedQuestionSummary[];
  readonly overallScore: number | null;
  readonly ratedQuestions: readonly RatedQuestionSummary[];
  readonly strengths: readonly RatedQuestionSummary[];
  readonly submissionCount: number;
  readonly totalQuestionCount: number;
};

type RatedQuestionSummary = {
  readonly average: number;
  readonly maximum: number;
  readonly normalizedScore: number;
  readonly prompt: string;
};

function ReportSummary({ summary }: { readonly summary: ReportSummaryData }) {
  const metrics = [
    {
      icon: BarChart3,
      label: tr.reports.summary.overallScore,
      value: summary.overallScore === null
        ? "-"
        : `${formatDecimal(summary.overallScore)} / 100`
    },
    {
      icon: UsersRound,
      label: tr.reports.summary.responses,
      value: String(summary.submissionCount)
    },
    {
      icon: ListChecks,
      label: tr.reports.summary.answeredQuestions,
      value: `${summary.answeredQuestionCount} / ${summary.totalQuestionCount}`
    },
    {
      icon: MessageSquareQuote,
      label: tr.reports.summary.comments,
      value: String(summary.commentCount)
    }
  ];

  return (
    <section aria-label={tr.reports.summary.sectionLabel} className="mt-6">
      <div className="grid border-y border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }, index) => (
          <div
            className={`flex min-h-28 items-center gap-4 px-4 py-5 sm:px-5 ${index < metrics.length - 1 ? "border-b border-slate-200" : ""} ${index < 2 ? "sm:border-b" : "sm:border-b-0"} ${index === 0 || index === 2 ? "sm:border-r sm:border-r-slate-200" : ""} xl:border-b-0 xl:border-r-0 ${index > 0 ? "xl:border-l xl:border-l-slate-200" : ""}`}
            key={label}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-pine">
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold text-slate-950">{value}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {tr.reports.summary.scoreMethod}
      </p>
    </section>
  );
}

function ReportInsights({ summary }: { readonly summary: ReportSummaryData }) {
  return (
    <section
      aria-label={tr.reports.insights.sectionLabel}
      className="mt-7 grid gap-6 border-y border-slate-200 py-6 lg:grid-cols-2"
    >
      <InsightList
        emptyText={tr.reports.insights.empty}
        icon={Target}
        items={summary.strengths}
        title={tr.reports.insights.strengths}
      />
      <InsightList
        emptyText={tr.reports.insights.empty}
        icon={ListChecks}
        items={summary.focusAreas}
        title={tr.reports.insights.focusAreas}
      />
    </section>
  );
}

function InsightList({
  emptyText,
  icon: Icon,
  items,
  title
}: {
  readonly emptyText: string;
  readonly icon: LucideIcon;
  readonly items: readonly RatedQuestionSummary[];
  readonly title: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="text-pine" size={18} strokeWidth={1.8} />
        <h4 className="font-semibold text-slate-950">{title}</h4>
      </div>
      {items.length > 0 ? (
        <ol className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
          {items.map((item) => (
            <li className="flex items-start justify-between gap-4 py-3" key={item.prompt}>
              <span className="min-w-0 text-sm leading-6 text-slate-700">
                {item.prompt}
              </span>
              <span className="shrink-0 text-sm font-semibold text-slate-950">
                {formatDecimal(item.average)} / {item.maximum}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function QuestionResult({
  question,
  submissionCount,
  subjectName
}: {
  readonly question: EvaluationReportQuestion;
  readonly submissionCount: number;
  readonly subjectName: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-base font-semibold leading-6 text-slate-900">
          {question.position}. {question.prompt}
        </h4>
        <span className="shrink-0 text-xs font-semibold text-slate-500">
          {question.answeredCount} / {submissionCount} {tr.reports.labels.answers}
        </span>
      </div>
      <div className="mt-4">
        <AggregationResult
          question={question}
          subjectName={subjectName}
        />
      </div>
    </article>
  );
}

function AggregationResult({
  question,
  subjectName
}: {
  readonly question: EvaluationReportQuestion;
  readonly subjectName: string;
}) {
  const aggregation = question.aggregation;

  if (aggregation.kind === "RATING") {
    const maximum = getRatingMaximum(question.questionType);

    return (
      <>
        <p className="text-3xl font-semibold text-pine">
          {aggregation.average === null ? "-" : formatDecimal(aggregation.average)}
          <span className="ml-1 text-base font-medium text-slate-500">
            / {maximum}
          </span>
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {tr.reports.labels.average}
        </p>
        <Distribution denominator={question.answeredCount} rows={aggregation.distribution} />
      </>
    );
  }

  if (aggregation.kind === "YES_NO") {
    return (
      <Distribution
        denominator={question.answeredCount}
        rows={[
          { count: aggregation.yesCount, value: tr.reports.values.yes },
          { count: aggregation.noCount, value: tr.reports.values.no }
        ]}
      />
    );
  }

  if (aggregation.kind === "OPTIONS") {
    return (
      <Distribution
        denominator={question.answeredCount}
        rows={aggregation.distribution}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-pine">
        <MessageSquareQuote aria-hidden="true" size={18} strokeWidth={1.8} />
        <p className="text-sm font-semibold text-slate-900">
          {tr.reports.textComments.forSubjectTitle.replace("{subject}", subjectName)}
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {tr.reports.textComments.description}
      </p>
      <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        {aggregation.comments.map((comment, index) => (
          <li className="py-4" key={`${index}:${comment}`}>
            <blockquote className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
              {comment}
            </blockquote>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-amber-900">
        {tr.reports.textComments.contextRisk}
      </p>
    </div>
  );
}

function Distribution({
  denominator,
  rows
}: {
  readonly denominator: number;
  readonly rows: readonly EvaluationReportDistributionItem[];
}) {
  const safeDenominator = Math.max(1, denominator);

  return (
    <dl className="mt-4 grid gap-2">
      {rows.map((row) => (
        <div className="grid grid-cols-[minmax(3rem,auto)_minmax(5rem,1fr)_4.5rem] items-center gap-3" key={row.value}>
          <dt className="min-w-0 break-words text-sm text-slate-700">{row.value}</dt>
          <dd className="h-2 overflow-hidden rounded-sm bg-slate-100">
            <span
              aria-hidden="true"
              className="block h-full bg-coral"
              style={{ width: `${Math.min(100, (row.count / safeDenominator) * 100)}%` }}
            />
          </dd>
          <dd className="text-right text-sm font-semibold text-slate-800">
            {row.count} <span className="font-normal text-slate-500">({formatPercentage(row.count, safeDenominator)})</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function summarizeReport(
  report: Extract<EvaluationReport, { readonly status: "AVAILABLE" }>
): ReportSummaryData {
  const ratedQuestions = report.questions.flatMap((question) => {
    if (
      question.aggregation.kind !== "RATING"
      || question.aggregation.average === null
    ) {
      return [];
    }

    const maximum = getRatingMaximum(question.questionType);

    return [{
      average: question.aggregation.average,
      maximum,
      normalizedScore: (question.aggregation.average / maximum) * 100,
      prompt: question.prompt
    }];
  });
  const overallScore = ratedQuestions.length === 0
    ? null
    : ratedQuestions.reduce(
        (total, question) => total + question.normalizedScore,
        0
      ) / ratedQuestions.length;
  const descending = [...ratedQuestions].sort(
    (left, right) => right.normalizedScore - left.normalizedScore
  );
  const ascending = [...descending].reverse();
  const commentCount = report.questions.reduce((total, question) => (
    question.aggregation.kind === "TEXT_COMMENTS"
      ? total + question.aggregation.comments.length
      : total
  ), 0);

  return {
    answeredQuestionCount: report.questions.filter(
      (question) => question.answeredCount > 0
    ).length,
    commentCount,
    focusAreas: ratedQuestions.length > 1 ? ascending.slice(0, 2) : [],
    overallScore,
    ratedQuestions,
    strengths: descending.slice(0, Math.min(2, ratedQuestions.length)),
    submissionCount: report.submissionCount,
    totalQuestionCount: report.questions.length
  };
}

function getLatestTargetForSubject(
  targets: readonly EvaluationReportTarget[],
  subjectUserId: string
): EvaluationReportTarget | undefined {
  return targets
    .filter((target) => target.subjectUserId === subjectUserId)
    .sort((left, right) => (
      new Date(right.closedAt).getTime() - new Date(left.closedAt).getTime()
    ))[0];
}

function getRatingMaximum(questionType: string): number {
  return questionType === "RATING_1_TO_10" ? 10 : 5;
}

function formatPercentage(count: number, denominator: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
    style: "percent"
  }).format(count / denominator);
}

function createExampleReport(): Extract<
  EvaluationReport,
  { readonly status: "AVAILABLE" }
> {
  return {
    closedAt: "2026-07-30T20:59:00.000Z",
    evaluationCycleId: "example-cycle",
    evaluationCycleName: tr.reports.example.cycleName,
    organizationId: "example-organization",
    organizationName: tr.reports.example.organizationName,
    projectCode: tr.reports.example.projectCode,
    projectId: "example-project",
    projectName: tr.reports.example.projectName,
    questions: [
      {
        aggregation: {
          average: 4.4,
          distribution: [
            { count: 0, value: "1" },
            { count: 0, value: "2" },
            { count: 1, value: "3" },
            { count: 4, value: "4" },
            { count: 5, value: "5" }
          ],
          kind: "RATING"
        },
        answeredCount: 10,
        id: "example-rating-leadership",
        position: 1,
        prompt: tr.reports.example.questions.leadership,
        questionType: "RATING_1_TO_5"
      },
      {
        aggregation: {
          average: 3.7,
          distribution: [
            { count: 0, value: "1" },
            { count: 1, value: "2" },
            { count: 3, value: "3" },
            { count: 4, value: "4" },
            { count: 2, value: "5" }
          ],
          kind: "RATING"
        },
        answeredCount: 10,
        id: "example-rating-feedback",
        position: 2,
        prompt: tr.reports.example.questions.feedback,
        questionType: "RATING_1_TO_5"
      },
      {
        aggregation: {
          average: 8.2,
          distribution: [
            { count: 1, value: "6" },
            { count: 2, value: "7" },
            { count: 3, value: "8" },
            { count: 2, value: "9" },
            { count: 2, value: "10" }
          ],
          kind: "RATING"
        },
        answeredCount: 10,
        id: "example-rating-trust",
        position: 3,
        prompt: tr.reports.example.questions.trust,
        questionType: "RATING_1_TO_10"
      },
      {
        aggregation: {
          kind: "YES_NO",
          noCount: 2,
          yesCount: 8
        },
        answeredCount: 10,
        id: "example-yes-no",
        position: 4,
        prompt: tr.reports.example.questions.support,
        questionType: "YES_NO"
      },
      {
        aggregation: {
          allowsMultiple: true,
          distribution: [
            { count: 8, value: tr.reports.example.options.communication },
            { count: 7, value: tr.reports.example.options.ownership },
            { count: 5, value: tr.reports.example.options.coaching },
            { count: 4, value: tr.reports.example.options.planning }
          ],
          kind: "OPTIONS"
        },
        answeredCount: 10,
        id: "example-options",
        position: 5,
        prompt: tr.reports.example.questions.strengths,
        questionType: "MULTI_SELECT"
      },
      {
        aggregation: {
          comments: [
            tr.reports.example.comments.first,
            tr.reports.example.comments.second,
            tr.reports.example.comments.third,
            tr.reports.example.comments.fourth
          ],
          kind: "TEXT_COMMENTS"
        },
        answeredCount: 4,
        id: "example-comments",
        position: 6,
        prompt: tr.reports.example.questions.comment,
        questionType: "LONG_TEXT"
      }
    ],
    status: "AVAILABLE",
    subjectDisplayName: tr.reports.example.subjectName,
    subjectEmail: tr.reports.example.subjectEmail,
    subjectUserId: "example-subject",
    submissionCount: 10,
    templateName: tr.reports.example.templateName,
    templateVersionId: "example-template-version",
    templateVersionNumber: 2
  };
}

function toTargetKey(target: EvaluationReportTarget | undefined): string {
  return target
    ? `${target.evaluationCycleId}:${target.subjectUserId}`
    : "";
}

type ReportSubject = Pick<
  EvaluationReportTarget,
  "subjectDisplayName" | "subjectEmail" | "subjectUserId"
>;

function getReportSubjects(
  targets: readonly EvaluationReportTarget[]
): readonly ReportSubject[] {
  const subjects = new Map<string, ReportSubject>();

  for (const target of targets) {
    if (!subjects.has(target.subjectUserId)) {
      subjects.set(target.subjectUserId, target);
    }
  }

  return Array.from(subjects.values()).sort((left, right) =>
    formatSubjectOption(left).localeCompare(formatSubjectOption(right), "tr")
  );
}

function formatSubjectOption(subject: ReportSubject): string {
  return subject.subjectDisplayName
    ? `${subject.subjectDisplayName} (${subject.subjectEmail})`
    : subject.subjectEmail;
}

function formatCycleOption(target: EvaluationReportTarget): string {
  return `${target.evaluationCycleName} / ${formatProject(target)}`;
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

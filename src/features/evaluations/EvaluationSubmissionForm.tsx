import { useEffect, useRef, useState } from "react";
import { tr } from "../../locales/tr/messages";
import {
  EvaluationAssignmentServiceError,
  type EvaluationAssignmentService,
  type EvaluationSubmissionAnswer,
  type EvaluationSubmissionQuestion,
  type PreparedEvaluationSubmission
} from "./evaluationAssignmentService";

type AnswerValue = string | number | boolean | readonly string[] | null;

type EvaluationSubmissionFormProps = {
  readonly onCancel: () => void;
  readonly onSubmitted: () => void;
  readonly service: EvaluationAssignmentService;
  readonly submission: PreparedEvaluationSubmission;
};

export function EvaluationSubmissionForm({
  onCancel,
  onSubmitted,
  service,
  submission
}: EvaluationSubmissionFormProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onCancel]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (
      submission.questions.some(
        (question) => question.isRequired && !isAnswered(answers[question.id])
      )
    ) {
      setFeedback(tr.assignments.submission.feedback.requiredAnswers);
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedAnswers: EvaluationSubmissionAnswer[] =
        submission.questions.map((question) => ({
          questionId: question.id,
          value: answers[question.id] ?? null
        }));

      await service.submitEvaluation(submission.credential, normalizedAnswers);
      onSubmitted();
    } catch (error) {
      const feedbackMessage = error instanceof EvaluationAssignmentServiceError
        && error.code === "EVALUATION_SUBMISSION_RATE_LIMITED"
        ? tr.assignments.submission.feedback.rateLimited
        : error instanceof EvaluationAssignmentServiceError
          && error.code === "EVALUATION_SUBMISSION_TOO_LARGE"
          ? tr.assignments.submission.feedback.tooLarge
          : tr.assignments.submission.feedback.submitFailed;

      setFeedback(
        feedbackMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const subjectName = submission.subjectDisplayName ?? submission.subjectEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/55 p-0 sm:items-center sm:p-6">
      <div
        aria-labelledby="evaluation-submission-title"
        aria-modal="true"
        className="flex max-h-screen w-full max-w-4xl flex-col bg-white shadow-xl outline-none sm:max-h-[92vh] sm:rounded-lg"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="border-b border-slate-200 px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-pine">
                {submission.organizationName}
              </p>
              <h2
                className="mt-1 text-xl font-semibold text-slate-950"
                id="evaluation-submission-title"
              >
                {submission.evaluationCycleName}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {formatSubject(subjectName)}
              </p>
            </div>
            <button
              aria-label={tr.assignments.submission.actions.close}
              className="h-9 w-9 shrink-0 text-2xl leading-none text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-pine disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={isSubmitting}
              onClick={onCancel}
              type="button"
            >
              ×
            </button>
          </div>
        </header>

        <form
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="border-l-4 border-pine bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
              <p className="font-semibold">
                {tr.assignments.submission.privacy.title}
              </p>
              <p className="mt-1">
                {tr.assignments.submission.privacy.description}
              </p>
            </div>

            <dl className="mt-5 grid gap-3 border-y border-slate-200 py-4 text-sm sm:grid-cols-3">
              <SummaryItem
                label={tr.assignments.labels.project}
                value={formatProject(submission)}
              />
              <SummaryItem
                label={tr.assignments.labels.template}
                value={`${submission.templateName} - v${submission.templateVersionNumber}`}
              />
              <SummaryItem
                label={tr.assignments.submission.labels.credentialExpiry}
                value={formatDateTime(submission.expiresAt)}
              />
            </dl>

            <div className="mt-2 divide-y divide-slate-200">
              {submission.questions.map((question, index) => (
                <QuestionField
                  key={question.id}
                  number={index + 1}
                  onChange={(value) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: value
                    }))
                  }
                  question={question}
                  value={answers[question.id] ?? null}
                />
              ))}
            </div>

            {feedback ? (
              <p
                className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
                role="alert"
              >
                {feedback}
              </p>
            ) : null}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={isSubmitting}
              onClick={onCancel}
              type="button"
            >
              {tr.assignments.submission.actions.cancel}
            </button>
            <button
              className="rounded-md bg-pine px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? tr.assignments.submission.actions.submitting
                : tr.assignments.submission.actions.submit}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function QuestionField({
  number,
  onChange,
  question,
  value
}: {
  readonly number: number;
  readonly onChange: (value: AnswerValue) => void;
  readonly question: EvaluationSubmissionQuestion;
  readonly value: AnswerValue;
}) {
  const labelId = `question-${question.id}`;

  return (
    <fieldset className="py-6">
      <legend className="w-full text-sm font-semibold leading-6 text-slate-900">
        <span id={labelId}>
          {number}. {question.prompt}
        </span>
        {question.isRequired ? (
          <span className="ml-2 text-xs font-medium text-coral">
            {tr.assignments.submission.labels.required}
          </span>
        ) : (
          <span className="ml-2 text-xs font-medium text-slate-500">
            {tr.assignments.submission.labels.optional}
          </span>
        )}
      </legend>
      <div className="mt-3">
        <QuestionControl
          labelId={labelId}
          onChange={onChange}
          question={question}
          value={value}
        />
      </div>
    </fieldset>
  );
}

function QuestionControl({
  labelId,
  onChange,
  question,
  value
}: {
  readonly labelId: string;
  readonly onChange: (value: AnswerValue) => void;
  readonly question: EvaluationSubmissionQuestion;
  readonly value: AnswerValue;
}) {
  if (
    question.questionType === "RATING_1_TO_5"
    || question.questionType === "RATING_1_TO_10"
  ) {
    const maximum = question.questionType === "RATING_1_TO_5" ? 5 : 10;

    return (
      <div
        aria-labelledby={labelId}
        className={`grid max-w-xl gap-2 ${
          maximum === 10 ? "grid-cols-5 sm:grid-cols-10" : "grid-cols-5"
        }`}
        role="group"
      >
        {Array.from({ length: maximum }, (_, index) => index + 1).map((rating) => (
          <button
            aria-pressed={value === rating}
            className={`h-11 min-w-0 rounded-md border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 ${
              value === rating
                ? "border-pine bg-pine text-white"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
            key={rating}
            onClick={() => onChange(rating)}
            type="button"
          >
            {rating}
          </button>
        ))}
      </div>
    );
  }

  if (question.questionType === "YES_NO") {
    return (
      <div aria-labelledby={labelId} className="flex gap-2" role="group">
        {[
          { label: tr.assignments.submission.values.yes, value: true },
          { label: tr.assignments.submission.values.no, value: false }
        ].map((option) => (
          <button
            aria-pressed={value === option.value}
            className={`min-w-28 rounded-md border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 ${
              value === option.value
                ? "border-pine bg-pine text-white"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
            key={option.label}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.questionType === "SINGLE_SELECT") {
    return (
      <select
        aria-labelledby={labelId}
        className="w-full max-w-xl rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/30"
        onChange={(event) => onChange(event.target.value || null)}
        value={typeof value === "string" ? value : ""}
      >
        <option value="">{tr.assignments.submission.values.select}</option>
        {question.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (
    question.questionType === "MULTI_SELECT"
    || question.questionType === "TAG_SELECTION"
  ) {
    const selected = Array.isArray(value) ? value : [];

    return (
      <div aria-labelledby={labelId} className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => (
          <label
            className="flex min-h-11 items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            key={option}
          >
            <input
              checked={selected.includes(option)}
              className="h-4 w-4 accent-emerald-800"
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option)
                )
              }
              type="checkbox"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.questionType === "LONG_TEXT") {
    return (
      <textarea
        aria-labelledby={labelId}
        className="min-h-32 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/30"
        maxLength={5000}
        onChange={(event) => onChange(event.target.value)}
        value={typeof value === "string" ? value : ""}
      />
    );
  }

  return (
    <input
      aria-labelledby={labelId}
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/30"
      maxLength={500}
      onChange={(event) => onChange(event.target.value)}
      type="text"
      value={typeof value === "string" ? value : ""}
    />
  );
}

function SummaryItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function formatSubject(subjectName: string): string {
  return tr.assignments.submission.subject.replace("{subject}", subjectName);
}

function formatProject(submission: PreparedEvaluationSubmission): string {
  if (!submission.projectName) {
    return tr.assignments.values.noProject;
  }

  return submission.projectCode
    ? `${submission.projectName} (${submission.projectCode})`
    : submission.projectName;
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

function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  return !Array.isArray(value) || value.length > 0;
}

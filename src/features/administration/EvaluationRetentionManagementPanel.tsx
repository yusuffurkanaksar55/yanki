import { useCallback, useEffect, useMemo, useState } from "react";
import { tr } from "../../locales/tr/messages";
import {
  browserEvaluationRetentionService,
  EvaluationRetentionServiceError,
  type EvaluationRetentionPolicy,
  type EvaluationRetentionService
} from "./evaluationRetentionService";

type EvaluationRetentionManagementPanelProps = {
  readonly service?: EvaluationRetentionService;
};

export function EvaluationRetentionManagementPanel({
  service = browserEvaluationRetentionService
}: EvaluationRetentionManagementPanelProps) {
  const [policies, setPolicies] = useState<readonly EvaluationRetentionPolicy[]>(
    []
  );
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [retentionDays, setRetentionDays] = useState("730");
  const [automaticPurgeEnabled, setAutomaticPurgeEnabled] = useState(false);
  const [legalHold, setLegalHold] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedPolicy = useMemo(
    () => policies.find((policy) =>
      policy.organizationId === selectedOrganizationId
    ) ?? null,
    [policies, selectedOrganizationId]
  );

  const applyPolicyToForm = useCallback((policy: EvaluationRetentionPolicy) => {
    setSelectedOrganizationId(policy.organizationId);
    setRetentionDays(String(policy.retentionDays));
    setAutomaticPurgeEnabled(policy.automaticPurgeEnabled);
    setLegalHold(policy.legalHold);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void service.listPolicies()
      .then((nextPolicies) => {
        if (!isCurrent) {
          return;
        }

        setPolicies(nextPolicies);

        if (nextPolicies[0]) {
          applyPolicyToForm(nextPolicies[0]);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setErrorMessage(readErrorMessage(error));
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [applyPolicyToForm, service]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedRetentionDays = Number(retentionDays);

    if (
      !Number.isInteger(parsedRetentionDays)
      || parsedRetentionDays < 30
      || parsedRetentionDays > 3650
    ) {
      setErrorMessage(tr.administration.retention.validation.retentionDays);
      return;
    }

    setIsSaving(true);

    try {
      const updatedPolicy = await service.updatePolicy({
        automaticPurgeEnabled,
        legalHold,
        organizationId: selectedOrganizationId,
        retentionDays: parsedRetentionDays
      });
      const organizationName = selectedPolicy?.organizationName
        ?? updatedPolicy.organizationName;
      const nextPolicy = { ...updatedPolicy, organizationName };

      setPolicies((currentPolicies) => currentPolicies.map((policy) =>
        policy.organizationId === nextPolicy.organizationId
          ? nextPolicy
          : policy
      ));
      applyPolicyToForm(nextPolicy);
      setSuccessMessage(tr.administration.retention.feedback.saved);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-label={tr.administration.retention.sectionLabel}
      className="surface-panel mt-8 px-5 py-6 sm:px-6"
    >
      <div>
        <p className="text-sm font-semibold text-coral">
          {tr.administration.retention.eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold">
          {tr.administration.retention.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {tr.administration.retention.description}
        </p>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-slate-600">
          {tr.administration.retention.loading}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-5 text-sm font-medium text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-5 text-sm font-medium text-emerald-700" role="status">
          {successMessage}
        </p>
      ) : null}

      {!isLoading && policies.length === 0 ? (
        <p className="mt-5 text-sm text-slate-600">
          {tr.administration.retention.empty}
        </p>
      ) : null}

      {selectedPolicy ? (
        <form className="mt-6 grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              {tr.administration.retention.form.organization}
              <select
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-pine"
                onChange={(event) => {
                  const policy = policies.find((item) =>
                    item.organizationId === event.target.value
                  );

                  if (policy) {
                    applyPolicyToForm(policy);
                  }
                }}
                value={selectedOrganizationId}
              >
                {policies.map((policy) => (
                  <option key={policy.organizationId} value={policy.organizationId}>
                    {policy.organizationName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              {tr.administration.retention.form.retentionDays}
              <input
                className="min-h-11 rounded-md border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-pine"
                inputMode="numeric"
                max={3650}
                min={30}
                onChange={(event) => setRetentionDays(event.target.value)}
                type="number"
                value={retentionDays}
              />
            </label>

            <label className="flex items-start gap-3 text-sm text-slate-800">
              <input
                checked={automaticPurgeEnabled}
                className="mt-1 h-4 w-4 accent-pine"
                onChange={(event) =>
                  setAutomaticPurgeEnabled(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                <strong className="block font-semibold">
                  {tr.administration.retention.form.automaticPurge}
                </strong>
                <span className="mt-1 block leading-5 text-slate-600">
                  {tr.administration.retention.form.automaticPurgeDescription}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-slate-800">
              <input
                checked={legalHold}
                className="mt-1 h-4 w-4 accent-pine"
                onChange={(event) => setLegalHold(event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong className="block font-semibold">
                  {tr.administration.retention.form.legalHold}
                </strong>
                <span className="mt-1 block leading-5 text-slate-600">
                  {tr.administration.retention.form.legalHoldDescription}
                </span>
              </span>
            </label>
          </div>

          <div className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:py-1 lg:pl-6">
            <h3 className="text-base font-semibold text-slate-900">
              {tr.administration.retention.status.title}
            </h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-800">
                  {tr.administration.retention.status.policyVersion}
                </dt>
                <dd className="mt-1 text-slate-600">
                  {selectedPolicy.policyVersion}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">
                  {tr.administration.retention.status.lastPurge}
                </dt>
                <dd className="mt-1 text-slate-600">
                  {selectedPolicy.lastPurgeCompletedAt
                    ? formatDateTime(selectedPolicy.lastPurgeCompletedAt)
                    : tr.administration.retention.status.never}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">
                  {tr.administration.retention.status.lastCutoff}
                </dt>
                <dd className="mt-1 text-slate-600">
                  {selectedPolicy.lastPurgeCutoffOn
                    ? formatDate(selectedPolicy.lastPurgeCutoffOn)
                    : tr.administration.retention.status.never}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-6 text-amber-800">
              {tr.administration.retention.backupNotice}
            </p>
          </div>

          <div className="lg:col-span-2">
            <button
              className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSaving || selectedOrganizationId.length === 0}
              type="submit"
            >
              {isSaving
                ? tr.administration.retention.form.saving
                : tr.administration.retention.form.save}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(
    new Date(`${value}T00:00:00Z`)
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(value));
}

function readErrorMessage(error: unknown): string {
  if (error instanceof EvaluationRetentionServiceError) {
    return tr.administration.retention.feedback[error.code];
  }

  return tr.administration.retention.feedback.genericError;
}

import { useCallback, useEffect, useState } from "react";
import { tr } from "../../locales/tr/messages";
import {
  browserSecurityOperationsService,
  SecurityOperationsServiceError,
  type AbuseMonitoringSummary,
  type EncryptionKeyHealth,
  type SecurityOperationsService
} from "./securityOperationsService";

type SecurityOperationsPanelProps = {
  readonly service?: SecurityOperationsService;
};

export function SecurityOperationsPanel({
  service = browserSecurityOperationsService
}: SecurityOperationsPanelProps) {
  const [health, setHealth] = useState<EncryptionKeyHealth | null>(null);
  const [abuseSummary, setAbuseSummary] =
    useState<AbuseMonitoringSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOperations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextHealth, nextAbuseSummary] = await Promise.all([
        service.getEncryptionKeyHealth(),
        service.getAbuseMonitoringSummary()
      ]);

      setHealth(nextHealth);
      setAbuseSummary(nextAbuseSummary);
    } catch (error) {
      setHealth(null);
      setAbuseSummary(null);
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    let isCurrent = true;

    void Promise.all([
      service.getEncryptionKeyHealth(),
      service.getAbuseMonitoringSummary()
    ])
      .then(([nextHealth, nextAbuseSummary]) => {
        if (isCurrent) {
          setHealth(nextHealth);
          setAbuseSummary(nextAbuseSummary);
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
  }, [service]);

  return (
    <section
      aria-label={tr.administration.securityOperations.sectionLabel}
      className="surface-panel mt-8 px-5 py-6 sm:px-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-coral">
            {tr.administration.securityOperations.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {tr.administration.securityOperations.title}
          </h2>
        </div>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={isLoading}
          onClick={() => void loadOperations()}
          type="button"
        >
          {isLoading
            ? tr.administration.securityOperations.refreshing
            : tr.administration.securityOperations.refresh}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-5 text-sm font-medium text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {health ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HealthItem
            healthy={health.status === "HEALTHY"}
            label={tr.administration.securityOperations.overall}
          />
          <HealthItem
            healthy={health.activeKeyConfigured}
            label={tr.administration.securityOperations.activeKey}
          />
          <HealthItem
            healthy={health.allReferencedKeysConfigured}
            label={tr.administration.securityOperations.historicalCoverage}
          />
          <div className="border-l-2 border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-800">
              {tr.administration.securityOperations.keyCounts}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {tr.administration.securityOperations.keyCountValue
                .replace("{configured}", String(health.configuredKeyCount))
                .replace("{referenced}", String(health.referencedKeyCount))}
            </p>
          </div>
        </div>
      ) : null}

      {abuseSummary ? (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              {tr.administration.securityOperations.abuse.title}
            </h3>
            <p className="text-sm text-slate-500">
              {tr.administration.securityOperations.abuse.retention.replace(
                "{days}",
                String(abuseSummary.counterRetentionDays)
              )}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AbuseMetric
              last24Hours={abuseSummary.invalidCredentialAttemptsLast24Hours}
              last60Minutes={abuseSummary.invalidCredentialAttemptsLast60Minutes}
              label={tr.administration.securityOperations.abuse.invalidCredentials}
            />
            <AbuseMetric
              last24Hours={abuseSummary.rateLimitedRequestsLast24Hours}
              last60Minutes={abuseSummary.rateLimitedRequestsLast60Minutes}
              label={tr.administration.securityOperations.abuse.rateLimited}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AbuseMetric({
  label,
  last24Hours,
  last60Minutes
}: {
  readonly label: string;
  readonly last24Hours: number;
  readonly last60Minutes: number;
}) {
  return (
    <div className="border-l-2 border-slate-200 px-3 py-2">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">
        {last60Minutes}
      </p>
      <p className="text-sm text-slate-500">
        {tr.administration.securityOperations.abuse.last24Hours.replace(
          "{count}",
          String(last24Hours)
        )}
      </p>
    </div>
  );
}

function HealthItem({
  healthy,
  label
}: {
  readonly healthy: boolean;
  readonly label: string;
}) {
  return (
    <div className="border-l-2 border-slate-200 px-3 py-2">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className={`mt-1 text-sm font-medium ${
        healthy ? "text-emerald-700" : "text-red-700"
      }`}>
        {healthy
          ? tr.administration.securityOperations.healthy
          : tr.administration.securityOperations.unhealthy}
      </p>
    </div>
  );
}

function readErrorMessage(error: unknown): string {
  if (error instanceof SecurityOperationsServiceError) {
    return tr.administration.securityOperations.feedback[error.code];
  }

  return tr.administration.securityOperations.feedback.genericError;
}

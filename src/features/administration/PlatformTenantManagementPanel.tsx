import { useEffect, useId, useState, type FormEvent } from "react";
import { Building2, MailPlus, RefreshCw } from "lucide-react";
import { tr } from "../../locales/tr/messages";
import {
  browserPlatformTenantService,
  PlatformTenantServiceError,
  type PlatformTenant,
  type PlatformTenantDraft,
  type PlatformTenantService
} from "./platformTenantService";

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly tenants: readonly PlatformTenant[] };

type FormState = PlatformTenantDraft & {
  readonly slugEdited: boolean;
};

export function PlatformTenantManagementPanel({
  service = browserPlatformTenantService
}: {
  readonly service?: PlatformTenantService;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [formState, setFormState] = useState<FormState>(createEmptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reissuingRequestId, setReissuingRequestId] = useState<string | null>(
    null
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void service.listTenants()
      .then((tenants) => {
        if (isCurrent) {
          setLoadState({ status: "ready", tenants });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoadState({ status: "error" });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [service]);

  const tenants = loadState.status === "ready" ? loadState.tenants : [];
  const pendingInvitationCount = tenants.filter((tenant) =>
    tenant.invitationStatus === "PENDING"
    || tenant.invitationStatus === "EXPIRED"
  ).length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await service.createTenant(toDraft(formState));

      setLoadState({ status: "ready", tenants: response.tenants });
      setFormState(createEmptyFormState());
      setFeedback(tr.administration.tenants.feedback.created);
    } catch (error) {
      setFeedback(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefresh() {
    setFeedback(null);

    try {
      const nextTenants = await service.listTenants();

      setLoadState({ status: "ready", tenants: nextTenants });
    } catch {
      setLoadState({ status: "error" });
    }
  }

  async function handleReissue(requestId: string) {
    setReissuingRequestId(requestId);
    setFeedback(null);

    try {
      const nextTenants = await service.reissueInitialInvitation(requestId, 7);

      setLoadState({ status: "ready", tenants: nextTenants });
      setFeedback(tr.administration.tenants.feedback.reissued);
    } catch (error) {
      setFeedback(readErrorMessage(error));
    } finally {
      setReissuingRequestId(null);
    }
  }

  return (
    <section
      aria-label={tr.administration.tenants.sectionLabel}
      className="surface-panel mt-8 overflow-hidden"
    >
      <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="section-kicker">{tr.administration.tenants.eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {tr.administration.tenants.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {tr.administration.tenants.description}
          </p>
        </div>
        <button
          aria-label={tr.administration.tenants.actions.refresh}
          className="icon-button border-slate-200"
          disabled={loadState.status === "loading"}
          onClick={() => void handleRefresh()}
          title={tr.administration.tenants.actions.refresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
      </div>

      {loadState.status === "loading" ? (
        <p className="border-t border-slate-200 px-5 py-5 text-sm text-slate-600 sm:px-6" role="status">
          {tr.administration.tenants.loading}
        </p>
      ) : null}

      {loadState.status === "error" ? (
        <div className="flex flex-col gap-3 border-t border-red-200 bg-red-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm font-medium text-red-900" role="alert">
            {tr.administration.tenants.feedback.listFailed}
          </p>
          <button
            className="w-fit rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 focus-ring"
            onClick={() => void handleRefresh()}
            type="button"
          >
            {tr.administration.tenants.actions.retry}
          </button>
        </div>
      ) : null}

      {loadState.status === "ready" ? (
        <>
          <dl className="grid border-y border-slate-200 bg-slate-50 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
            <TenantMetric
              label={tr.administration.tenants.metrics.total}
              value={tenants.length}
            />
            <TenantMetric
              label={tr.administration.tenants.metrics.active}
              value={tenants.filter((tenant) =>
                tenant.organizationStatus === "ACTIVE"
              ).length}
            />
            <TenantMetric
              label={tr.administration.tenants.metrics.pending}
              value={pendingInvitationCount}
            />
          </dl>

          {feedback ? (
            <p
              className="border-b border-slate-200 px-5 py-4 text-sm font-medium text-slate-800 sm:px-6"
              role="status"
            >
              {feedback}
            </p>
          ) : null}

          <div className="grid lg:grid-cols-[minmax(19rem,0.9fr)_minmax(22rem,1.1fr)] lg:divide-x lg:divide-slate-200">
            <form
              className="grid content-start gap-4 px-5 py-6 sm:px-6"
              onSubmit={handleSubmit}
            >
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  {tr.administration.tenants.form.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {tr.administration.tenants.form.description}
                </p>
              </div>

              <TextField
                label={tr.administration.tenants.form.organizationName}
                maxLength={120}
                onChange={(organizationName) => setFormState((current) => ({
                  ...current,
                  organizationName,
                  organizationSlug: current.slugEdited
                    ? current.organizationSlug
                    : toSlug(organizationName)
                }))}
                required
                value={formState.organizationName}
              />
              <TextField
                description={tr.administration.tenants.form.organizationSlugHint}
                label={tr.administration.tenants.form.organizationSlug}
                maxLength={63}
                onChange={(organizationSlug) => setFormState((current) => ({
                  ...current,
                  organizationSlug: toSlug(organizationSlug),
                  slugEdited: true
                }))}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                value={formState.organizationSlug}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label={tr.administration.tenants.form.administratorName}
                  maxLength={120}
                  onChange={(administratorDisplayName) => setFormState((current) => ({
                    ...current,
                    administratorDisplayName
                  }))}
                  required
                  value={formState.administratorDisplayName}
                />
                <TextField
                  label={tr.administration.tenants.form.administratorEmail}
                  maxLength={320}
                  onChange={(administratorEmail) => setFormState((current) => ({
                    ...current,
                    administratorEmail
                  }))}
                  required
                  type="email"
                  value={formState.administratorEmail}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
                <TextField
                  label={tr.administration.tenants.form.initialUnitName}
                  maxLength={120}
                  onChange={(initialUnitName) => setFormState((current) => ({
                    ...current,
                    initialUnitName
                  }))}
                  required
                  value={formState.initialUnitName}
                />
                <label className="grid content-start gap-2 text-sm font-semibold text-slate-800">
                  {tr.administration.tenants.form.invitationExpiry}
                  <input
                    className="app-input text-sm font-normal"
                    max={30}
                    min={1}
                    onChange={(event) => setFormState((current) => ({
                      ...current,
                      invitationExpiresInDays: Number(event.currentTarget.value)
                    }))}
                    required
                    type="number"
                    value={formState.invitationExpiresInDays}
                  />
                </label>
              </div>

              <button
                className="mt-1 inline-flex w-fit items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-ring disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isSubmitting || formState.organizationSlug.length < 3}
                type="submit"
              >
                <Building2 aria-hidden="true" size={18} strokeWidth={1.8} />
                {isSubmitting
                  ? tr.administration.tenants.form.submitting
                  : tr.administration.tenants.form.submit}
              </button>
            </form>

            <TenantList
              onReissue={(requestId) => void handleReissue(requestId)}
              reissuingRequestId={reissuingRequestId}
              tenants={tenants}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function TenantMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 px-5 py-4 sm:block sm:px-6">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="text-xl font-bold text-slate-950 sm:mt-1">{value}</dd>
    </div>
  );
}

function TenantList({
  onReissue,
  reissuingRequestId,
  tenants
}: {
  readonly onReissue: (requestId: string) => void;
  readonly reissuingRequestId: string | null;
  readonly tenants: readonly PlatformTenant[];
}) {
  return (
    <section
      aria-label={tr.administration.tenants.list.sectionLabel}
      className="border-t border-slate-200 px-5 py-6 sm:px-6 lg:border-t-0"
    >
      <h3 className="text-base font-semibold text-slate-950">
        {tr.administration.tenants.list.title}
      </h3>
      {tenants.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {tr.administration.tenants.list.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {tenants.map((tenant) => (
            <li className="py-4" key={tenant.organizationId}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-950">
                    {tenant.organizationName}
                  </p>
                  <p className="mt-1 break-all text-xs font-medium text-slate-500">
                    {tenant.organizationSlug}
                  </p>
                </div>
                <span className={`w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${
                  readStatusClassName(tenant)
                }`}>
                  {readStatusLabel(tenant)}
                </span>
              </div>

              {tenant.bootstrapManaged ? (
                <div className="mt-3 grid gap-1 text-sm leading-5 text-slate-600">
                  <p className="break-words font-medium text-slate-800">
                    {tenant.administratorDisplayName
                      ?? tr.administration.tenants.list.unknownAdministrator}
                  </p>
                  {tenant.administratorEmail ? (
                    <p className="break-all">{tenant.administratorEmail}</p>
                  ) : null}
                  {tenant.invitationExpiresAt ? (
                    <p className="text-xs text-slate-500">
                      {tr.administration.tenants.list.invitationExpires.replace(
                        "{date}",
                        formatDate(tenant.invitationExpiresAt)
                      )}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  {tr.administration.tenants.list.externalBootstrap}
                </p>
              )}

              {tenant.requestId && (
                tenant.invitationStatus === "PENDING"
                || tenant.invitationStatus === "EXPIRED"
              ) ? (
                <button
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-pine hover:text-pine focus-ring disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={reissuingRequestId !== null}
                  onClick={() => onReissue(tenant.requestId ?? "")}
                  type="button"
                >
                  <MailPlus aria-hidden="true" size={16} strokeWidth={1.8} />
                  {reissuingRequestId === tenant.requestId
                    ? tr.administration.tenants.list.reissuing
                    : tr.administration.tenants.list.reissue}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TextField({
  description,
  label,
  maxLength,
  onChange,
  pattern,
  required,
  type = "text",
  value
}: {
  readonly description?: string;
  readonly label: string;
  readonly maxLength: number;
  readonly onChange: (value: string) => void;
  readonly pattern?: string;
  readonly required?: boolean;
  readonly type?: "email" | "text";
  readonly value: string;
}) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;

  return (
    <div className="grid content-start gap-2">
      <label className="text-sm font-semibold text-slate-800" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={description ? descriptionId : undefined}
        className="app-input text-sm font-normal"
        id={inputId}
        maxLength={maxLength}
        onChange={(event) => onChange(event.currentTarget.value)}
        pattern={pattern}
        required={required}
        type={type}
        value={value}
      />
      {description ? (
        <p
          className="text-xs font-normal leading-5 text-slate-500"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function createEmptyFormState(): FormState {
  return {
    administratorDisplayName: "",
    administratorEmail: "",
    initialUnitName: tr.administration.tenants.form.defaultUnitName,
    invitationExpiresInDays: 7,
    organizationName: "",
    organizationSlug: "",
    requestId: crypto.randomUUID(),
    slugEdited: false
  };
}

function toDraft(state: FormState): PlatformTenantDraft {
  return {
    administratorDisplayName: state.administratorDisplayName.trim(),
    administratorEmail: state.administratorEmail.trim().toLowerCase(),
    initialUnitName: state.initialUnitName.trim(),
    invitationExpiresInDays: state.invitationExpiresInDays,
    organizationName: state.organizationName.trim(),
    organizationSlug: state.organizationSlug.trim(),
    requestId: state.requestId
  };
}

function toSlug(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 63);
}

function readStatusLabel(tenant: PlatformTenant): string {
  if (!tenant.bootstrapManaged) {
    return tr.administration.tenants.status.external;
  }

  return tenant.invitationStatus
    ? tr.administration.tenants.status[tenant.invitationStatus]
    : tr.administration.tenants.status.external;
}

function readStatusClassName(tenant: PlatformTenant): string {
  if (tenant.invitationStatus === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-900";
  }

  if (tenant.invitationStatus === "PENDING") {
    return "bg-sky-50 text-sky-900";
  }

  if (tenant.invitationStatus === "EXPIRED") {
    return "bg-amber-50 text-amber-900";
  }

  return "bg-slate-100 text-slate-700";
}

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
}

function readErrorMessage(error: unknown): string {
  if (error instanceof PlatformTenantServiceError) {
    return tr.administration.tenants.feedback[error.code];
  }

  return tr.administration.tenants.feedback.genericError;
}

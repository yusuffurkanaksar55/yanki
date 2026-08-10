import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import { tr } from "../../locales/tr/messages";
import type { WorkspaceContext } from "../workspace/workspaceContextService";
import {
  browserUserAdministrationService,
  UserAdministrationServiceError,
  type InvitationRoleCode,
  type ManagedInvitation,
  type UserAdministrationData,
  type UserAdministrationService
} from "./userAdministrationService";

type FormState = {
  readonly displayName: string;
  readonly email: string;
  readonly expiresInDays: number;
  readonly managerUserId: string;
  readonly organizationId: string;
  readonly roleCode: InvitationRoleCode;
  readonly unitId: string;
};

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: UserAdministrationData };

const roleOptions: readonly InvitationRoleCode[] = [
  "EMPLOYEE",
  "TEAM_LEADER",
  "SYSTEM_ADMIN",
  "C_LEVEL_REVIEWER",
  "BOARD_REVIEWER"
];

const emptyFormState: FormState = {
  displayName: "",
  email: "",
  expiresInDays: 7,
  managerUserId: "",
  organizationId: "",
  roleCode: "EMPLOYEE",
  unitId: ""
};

export function UserInvitationManagementPanel({
  service = browserUserAdministrationService,
  workspaceContext
}: {
  readonly service?: UserAdministrationService;
  readonly workspaceContext: WorkspaceContext;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(
    null
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const isSystemAdministrator = workspaceContext.roles.some((role) =>
    role.roleCode === "SYSTEM_ADMIN"
    && (role.scopeType === "PLATFORM" || role.scopeType === "ORGANIZATION")
  );

  useEffect(() => {
    if (!isSystemAdministrator) {
      return;
    }

    let isActive = true;

    async function loadAdministration() {
      try {
        const data = await service.listUserAdministration();

        if (!isActive) {
          return;
        }

        const organizationId = data.organizations[0]?.id ?? "";
        const unitId = data.units.find(
          (unit) => unit.organizationId === organizationId
        )?.id ?? "";

        setFormState((current) => ({
          ...current,
          organizationId,
          unitId
        }));
        setLoadState({ data, status: "ready" });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setLoadState({
          message: toFeedbackMessage(error),
          status: "error"
        });
      }
    }

    void loadAdministration();

    return () => {
      isActive = false;
    };
  }, [isSystemAdministrator, service]);

  const organizationUnits = useMemo(() =>
    loadState.status === "ready"
      ? loadState.data.units.filter(
        (unit) => unit.organizationId === formState.organizationId
      )
      : [], [formState.organizationId, loadState]);
  const managerOptions = useMemo(() =>
    loadState.status === "ready"
      ? loadState.data.members.filter(
        (member) => member.organizationId === formState.organizationId
      )
      : [], [formState.organizationId, loadState]);

  if (!isSystemAdministrator) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formState.organizationId || !formState.unitId) {
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const invitation = await service.createInvitation({
        displayName: formState.displayName.trim(),
        email: formState.email.trim().toLowerCase(),
        expiresInDays: formState.expiresInDays,
        managerUserId: formState.managerUserId || null,
        organizationId: formState.organizationId,
        roleCode: formState.roleCode,
        unitId: formState.unitId
      });

      setLoadState((current) => current.status === "ready"
        ? {
          data: {
            ...current.data,
            invitations: [invitation, ...current.data.invitations]
          },
          status: "ready"
        }
        : current);
      setFormState((current) => ({
        ...current,
        displayName: "",
        email: "",
        managerUserId: ""
      }));
      setFeedback(tr.administration.users.feedback.created);
    } catch (error) {
      setFeedback(toFeedbackMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(invitationId: string) {
    setFeedback(null);
    setRevokingInvitationId(invitationId);

    try {
      const invitation = await service.revokeInvitation(invitationId);

      setLoadState((current) => current.status === "ready"
        ? {
          data: {
            ...current.data,
            invitations: current.data.invitations.map((item) =>
              item.id === invitation.id ? invitation : item
            )
          },
          status: "ready"
        }
        : current);
      setFeedback(tr.administration.users.feedback.revoked);
    } catch (error) {
      setFeedback(toFeedbackMessage(error));
    } finally {
      setRevokingInvitationId(null);
    }
  }

  return (
    <section
      aria-label={tr.administration.users.sectionLabel}
      className="surface-panel mt-8 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-normal text-pine">
          {tr.administration.users.eyebrow}
        </p>
        <h2 className="text-xl font-semibold">
          {tr.administration.users.title}
        </h2>
      </div>

      {loadState.status === "loading" ? (
        <p className="mt-5 text-sm text-slate-600" role="status">
          {tr.administration.users.loading}
        </p>
      ) : null}

      {loadState.status === "error" ? (
        <p
          className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
          role="alert"
        >
          {loadState.message}
        </p>
      ) : null}

      {loadState.status === "ready" ? (
        <div className="mt-6 space-y-8">
          <form className="grid max-w-4xl gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={tr.administration.users.form.displayName}
                onChange={(displayName) => setFormState((current) => ({
                  ...current,
                  displayName
                }))}
                required
                value={formState.displayName}
              />
              <TextField
                inputMode="email"
                label={tr.administration.users.form.email}
                onChange={(email) => setFormState((current) => ({
                  ...current,
                  email
                }))}
                required
                type="email"
                value={formState.email}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={tr.administration.users.form.organization}
                onChange={(organizationId) => {
                  const nextUnitId = loadState.data.units.find(
                    (unit) => unit.organizationId === organizationId
                  )?.id ?? "";
                  setFormState((current) => ({
                    ...current,
                    managerUserId: "",
                    organizationId,
                    unitId: nextUnitId
                  }));
                }}
                value={formState.organizationId}
              >
                {loadState.data.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={tr.administration.users.form.unit}
                onChange={(unitId) => setFormState((current) => ({
                  ...current,
                  unitId
                }))}
                value={formState.unitId}
              >
                {organizationUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={tr.administration.users.form.role}
                onChange={(roleCode) => setFormState((current) => ({
                  ...current,
                  roleCode: roleCode as InvitationRoleCode
                }))}
                value={formState.roleCode}
              >
                {roleOptions.map((roleCode) => (
                  <option key={roleCode} value={roleCode}>
                    {tr.dashboard.workspace.roleLabels[roleCode]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={tr.administration.users.form.manager}
                onChange={(managerUserId) => setFormState((current) => ({
                  ...current,
                  managerUserId
                }))}
                value={formState.managerUserId}
              >
                <option value="">
                  {tr.administration.users.form.noManager}
                </option>
                {managerOptions.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {formatMember(member)}
                  </option>
                ))}
              </SelectField>
            </div>

            {feedback ? (
              <p
                className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
                role="status"
              >
                {feedback}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end">
              <label className="block text-sm font-semibold text-slate-800">
                {tr.administration.users.form.expiresInDays}
                <input
                  className="app-input mt-2 text-sm font-normal"
                  max={30}
                  min={1}
                  onChange={(event) => setFormState((current) => ({
                    ...current,
                    expiresInDays: Number(event.currentTarget.value)
                  }))}
                  required
                  type="number"
                  value={formState.expiresInDays}
                />
              </label>
              <button
                className="w-fit rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-ring disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={
                  isSubmitting
                  || loadState.data.organizations.length === 0
                  || organizationUnits.length === 0
                }
                type="submit"
              >
                {isSubmitting
                  ? tr.administration.users.form.submitting
                  : tr.administration.users.form.submit}
              </button>
            </div>
          </form>

          <InvitationList
            invitations={loadState.data.invitations}
            onRevoke={handleRevoke}
            revokingInvitationId={revokingInvitationId}
          />
        </div>
      ) : null}
    </section>
  );
}

function TextField({
  inputMode,
  label,
  onChange,
  required,
  type = "text",
  value
}: {
  readonly inputMode?: "email";
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly required?: boolean;
  readonly type?: "email" | "text";
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <input
        className="app-input mt-2 text-sm font-normal"
        inputMode={inputMode}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <select
        className="app-input mt-2 text-sm font-normal"
        onChange={(event) => onChange(event.currentTarget.value)}
        required
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function InvitationList({
  invitations,
  onRevoke,
  revokingInvitationId
}: {
  readonly invitations: readonly ManagedInvitation[];
  readonly onRevoke: (invitationId: string) => void;
  readonly revokingInvitationId: string | null;
}) {
  return (
    <section
      aria-label={tr.administration.users.list.sectionLabel}
      className="border-t border-slate-200 pt-6"
    >
      <h3 className="text-base font-semibold">
        {tr.administration.users.list.title}
      </h3>
      {invitations.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          {tr.administration.users.list.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {invitations.map((invitation) => (
            <li className="py-4" key={invitation.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {invitation.displayName ?? invitation.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {invitation.email}
                  </p>
                </div>
                <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {tr.administration.users.statusLabels[invitation.status]}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {formatRole(invitation.roleCode)} · {formatDate(invitation.expiresAt)}
              </p>
              {invitation.status === "PENDING" || invitation.status === "EXPIRED" ? (
                <button
                  className="mt-3 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={revokingInvitationId === invitation.id}
                  onClick={() => onRevoke(invitation.id)}
                  type="button"
                >
                  {revokingInvitationId === invitation.id
                    ? tr.administration.users.list.revoking
                    : tr.administration.users.list.revoke}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatMember(member: {
  readonly displayName: string | null;
  readonly email: string;
}): string {
  return member.displayName
    ? `${member.displayName} (${member.email})`
    : member.email;
}

function formatRole(roleCode: string): string {
  return tr.dashboard.workspace.roleLabels[
    roleCode as keyof typeof tr.dashboard.workspace.roleLabels
  ] ?? roleCode;
}

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(date);
}

function toFeedbackMessage(error: unknown): string {
  if (error instanceof UserAdministrationServiceError) {
    return tr.administration.users.feedback[error.code];
  }

  return tr.administration.users.feedback.genericError;
}

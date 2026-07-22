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
  browserHierarchyAdministrationService,
  HierarchyAdministrationServiceError,
  type HierarchyAdministrationData,
  type HierarchyAdministrationService,
  type HierarchyMember,
  type HierarchyMembershipKind,
  type HierarchyRoleCode,
  type HierarchyUnitStatus,
  type HierarchyUnitType
} from "./hierarchyAdministrationService";

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: HierarchyAdministrationData };

type UnitFormState = {
  readonly name: string;
  readonly parentUnitId: string;
  readonly slug: string;
  readonly status: HierarchyUnitStatus;
  readonly unitId: string;
  readonly unitType: HierarchyUnitType;
};

type ContextFormState = {
  readonly managerUserId: string;
  readonly membershipKind: HierarchyMembershipKind;
  readonly primaryUnitId: string;
  readonly userId: string;
};

type RoleFormState = {
  readonly roleCode: HierarchyRoleCode;
  readonly unitId: string;
  readonly userId: string;
};

const roleOptions: readonly HierarchyRoleCode[] = [
  "EMPLOYEE",
  "TEAM_LEADER",
  "SYSTEM_ADMIN",
  "C_LEVEL_REVIEWER",
  "BOARD_REVIEWER"
];

const unitTypeOptions: readonly HierarchyUnitType[] = [
  "DEPARTMENT",
  "UNIT",
  "TEAM",
  "CUSTOM"
];

const emptyUnitForm: UnitFormState = {
  name: "",
  parentUnitId: "",
  slug: "",
  status: "ACTIVE",
  unitId: "",
  unitType: "UNIT"
};

const emptyContextForm: ContextFormState = {
  managerUserId: "",
  membershipKind: "MEMBER",
  primaryUnitId: "",
  userId: ""
};

const emptyRoleForm: RoleFormState = {
  roleCode: "EMPLOYEE",
  unitId: "",
  userId: ""
};

export function RoleHierarchyManagementPanel({
  service = browserHierarchyAdministrationService,
  workspaceContext
}: {
  readonly service?: HierarchyAdministrationService;
  readonly workspaceContext: WorkspaceContext;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [organizationId, setOrganizationId] = useState("");
  const [unitForm, setUnitForm] = useState<UnitFormState>(emptyUnitForm);
  const [contextForm, setContextForm] = useState<ContextFormState>(
    emptyContextForm
  );
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
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

    async function loadHierarchy() {
      try {
        const data = await service.list();

        if (!isActive) {
          return;
        }

        const firstOrganizationId = data.organizations[0]?.id ?? "";
        setOrganizationId(firstOrganizationId);
        initializeMemberForms(data, firstOrganizationId, setContextForm, setRoleForm);
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

    void loadHierarchy();

    return () => {
      isActive = false;
    };
  }, [isSystemAdministrator, service]);

  const organizationUnits = useMemo(() => loadState.status === "ready"
    ? loadState.data.units.filter((unit) =>
      unit.organizationId === organizationId
    )
    : [], [loadState, organizationId]);
  const activeUnits = useMemo(() => organizationUnits.filter((unit) =>
    unit.status === "ACTIVE"
  ), [organizationUnits]);
  const organizationMembers = useMemo(() => loadState.status === "ready"
    ? loadState.data.members.filter((member) =>
      member.organizationId === organizationId
    )
    : [], [loadState, organizationId]);
  const selectedRoleMember = organizationMembers.find((member) =>
    member.userId === roleForm.userId
  );
  const unitScopedRole = roleForm.roleCode === "EMPLOYEE"
    || roleForm.roleCode === "TEAM_LEADER";

  if (!isSystemAdministrator) {
    return null;
  }

  function selectOrganization(nextOrganizationId: string) {
    if (loadState.status !== "ready") {
      return;
    }

    setOrganizationId(nextOrganizationId);
    setUnitForm(emptyUnitForm);
    setFeedback(null);
    initializeMemberForms(
      loadState.data,
      nextOrganizationId,
      setContextForm,
      setRoleForm
    );
  }

  function selectUnit(unitId: string) {
    if (!unitId) {
      setUnitForm(emptyUnitForm);
      return;
    }

    const unit = organizationUnits.find((item) => item.id === unitId);

    if (!unit) {
      return;
    }

    setUnitForm({
      name: unit.name,
      parentUnitId: unit.parentUnitId ?? "",
      slug: unit.slug,
      status: unit.status,
      unitId: unit.id,
      unitType: unit.unitType
    });
  }

  function selectContextMember(userId: string) {
    const member = organizationMembers.find((item) => item.userId === userId);

    setContextForm(member ? toContextForm(member) : emptyContextForm);
  }

  function selectRoleMember(userId: string) {
    const member = organizationMembers.find((item) => item.userId === userId);

    setRoleForm((current) => ({
      ...current,
      unitId: member?.primaryUnitId ?? "",
      userId
    }));
  }

  async function handleUnitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("unit");
    setFeedback(null);

    try {
      const data = await service.saveUnit({
        name: unitForm.name.trim(),
        organizationId,
        parentUnitId: unitForm.parentUnitId || null,
        slug: unitForm.slug.trim(),
        status: unitForm.status,
        unitId: unitForm.unitId || null,
        unitType: unitForm.unitType
      });
      setLoadState({ data, status: "ready" });
      setUnitForm(emptyUnitForm);
      setFeedback(tr.administration.hierarchy.feedback.unitSaved);
    } catch (error) {
      setFeedback(toFeedbackMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleContextSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("context");
    setFeedback(null);

    try {
      const data = await service.setUserContext({
        managerUserId: contextForm.managerUserId || null,
        membershipKind: contextForm.membershipKind,
        organizationId,
        primaryUnitId: contextForm.primaryUnitId,
        userId: contextForm.userId
      });
      setLoadState({ data, status: "ready" });
      const member = data.members.find((item) =>
        item.organizationId === organizationId
        && item.userId === contextForm.userId
      );
      setContextForm(member ? toContextForm(member) : emptyContextForm);
      setRoleForm((current) => current.userId === contextForm.userId
        ? { ...current, unitId: member?.primaryUnitId ?? "" }
        : current);
      setFeedback(tr.administration.hierarchy.feedback.contextSaved);
    } catch (error) {
      setFeedback(toFeedbackMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRoleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("role");
    setFeedback(null);

    try {
      const data = await service.assignRole({
        organizationId,
        roleCode: roleForm.roleCode,
        unitId: unitScopedRole ? roleForm.unitId : null,
        userId: roleForm.userId
      });
      setLoadState({ data, status: "ready" });
      setFeedback(tr.administration.hierarchy.feedback.roleAssigned);
    } catch (error) {
      setFeedback(toFeedbackMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEndRole(roleAssignmentId: string) {
    setPendingAction(roleAssignmentId);
    setFeedback(null);

    try {
      const data = await service.endRole(organizationId, roleAssignmentId);
      setLoadState({ data, status: "ready" });
      setFeedback(tr.administration.hierarchy.feedback.roleEnded);
    } catch (error) {
      setFeedback(toFeedbackMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section
      aria-label={tr.administration.hierarchy.sectionLabel}
      className="mt-8 border-y border-slate-200 bg-white py-6"
    >
      <p className="text-xs font-semibold uppercase tracking-normal text-pine">
        {tr.administration.hierarchy.eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold">
        {tr.administration.hierarchy.title}
      </h2>

      {loadState.status === "loading" ? (
        <p className="mt-5 text-sm text-slate-600" role="status">
          {tr.administration.hierarchy.loading}
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

      {loadState.status === "ready" && loadState.data.organizations.length === 0 ? (
        <p className="mt-5 text-sm text-slate-600">
          {tr.administration.hierarchy.empty}
        </p>
      ) : null}

      {loadState.status === "ready" && loadState.data.organizations.length > 0 ? (
        <>
          <div className="mt-5 max-w-md">
            <SelectField
              label={tr.administration.hierarchy.organization}
              onChange={selectOrganization}
              value={organizationId}
            >
              {loadState.data.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </SelectField>
          </div>

          {feedback ? (
            <p
              className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
              role="status"
            >
              {feedback}
            </p>
          ) : null}

          <div className="mt-6 grid gap-8 xl:grid-cols-3">
            <form
              className="grid content-start gap-4 border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
              onSubmit={handleUnitSubmit}
            >
              <h3 className="text-base font-semibold">
                {tr.administration.hierarchy.units.title}
              </h3>
              <SelectField
                label={tr.administration.hierarchy.units.selectedUnit}
                onChange={selectUnit}
                value={unitForm.unitId}
              >
                <option value="">
                  {tr.administration.hierarchy.units.newUnit}
                </option>
                {organizationUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.status === "ARCHIVED"
                      ? `${unit.name} (${tr.administration.hierarchy.units.archived})`
                      : unit.name}
                  </option>
                ))}
              </SelectField>
              <TextField
                label={tr.administration.hierarchy.units.name}
                onChange={(name) => setUnitForm((current) => ({
                  ...current,
                  name,
                  slug: current.unitId ? current.slug : toSlug(name)
                }))}
                required
                value={unitForm.name}
              />
              <TextField
                disabled={Boolean(unitForm.unitId)}
                label={tr.administration.hierarchy.units.slug}
                onChange={(slug) => setUnitForm((current) => ({
                  ...current,
                  slug
                }))}
                required={!unitForm.unitId}
                value={unitForm.slug}
              />
              <SelectField
                label={tr.administration.hierarchy.units.type}
                onChange={(unitType) => setUnitForm((current) => ({
                  ...current,
                  unitType: unitType as HierarchyUnitType
                }))}
                value={unitForm.unitType}
              >
                {unitTypeOptions.map((unitType) => (
                  <option key={unitType} value={unitType}>
                    {tr.dashboard.workspace.unitTypeLabels[unitType]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={tr.administration.hierarchy.units.parent}
                onChange={(parentUnitId) => setUnitForm((current) => ({
                  ...current,
                  parentUnitId
                }))}
                value={unitForm.parentUnitId}
              >
                <option value="">
                  {tr.administration.hierarchy.units.noParent}
                </option>
                {activeUnits.filter((unit) => unit.id !== unitForm.unitId).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </SelectField>
              {unitForm.unitId ? (
                <SelectField
                  label={tr.administration.hierarchy.units.status}
                  onChange={(status) => setUnitForm((current) => ({
                    ...current,
                    status: status as HierarchyUnitStatus
                  }))}
                  value={unitForm.status}
                >
                  <option value="ACTIVE">
                    {tr.administration.hierarchy.units.active}
                  </option>
                  <option value="ARCHIVED">
                    {tr.administration.hierarchy.units.archived}
                  </option>
                </SelectField>
              ) : null}
              <SubmitButton disabled={pendingAction !== null || !unitForm.name}>
                {pendingAction === "unit"
                  ? tr.administration.hierarchy.units.submitting
                  : unitForm.unitId
                    ? tr.administration.hierarchy.units.submitUpdate
                    : tr.administration.hierarchy.units.submitCreate}
              </SubmitButton>
            </form>

            <form
              className="grid content-start gap-4 border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
              onSubmit={handleContextSubmit}
            >
              <h3 className="text-base font-semibold">
                {tr.administration.hierarchy.people.title}
              </h3>
              <SelectField
                label={tr.administration.hierarchy.people.user}
                onChange={selectContextMember}
                value={contextForm.userId}
              >
                {organizationMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {formatMember(member)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={tr.administration.hierarchy.people.primaryUnit}
                onChange={(primaryUnitId) => setContextForm((current) => ({
                  ...current,
                  primaryUnitId
                }))}
                value={contextForm.primaryUnitId}
              >
                {activeUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={tr.administration.hierarchy.people.membershipKind}
                onChange={(membershipKind) => setContextForm((current) => ({
                  ...current,
                  membershipKind: membershipKind as HierarchyMembershipKind
                }))}
                value={contextForm.membershipKind}
              >
                <option value="MEMBER">
                  {tr.administration.hierarchy.people.member}
                </option>
                <option value="LEADER">
                  {tr.administration.hierarchy.people.leader}
                </option>
              </SelectField>
              <SelectField
                label={tr.administration.hierarchy.people.manager}
                onChange={(managerUserId) => setContextForm((current) => ({
                  ...current,
                  managerUserId
                }))}
                value={contextForm.managerUserId}
              >
                <option value="">
                  {tr.administration.hierarchy.people.noManager}
                </option>
                {organizationMembers.filter((member) =>
                  member.userId !== contextForm.userId
                ).map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {formatMember(member)}
                  </option>
                ))}
              </SelectField>
              <SubmitButton
                disabled={
                  pendingAction !== null
                  || !contextForm.userId
                  || !contextForm.primaryUnitId
                }
              >
                {pendingAction === "context"
                  ? tr.administration.hierarchy.people.submitting
                  : tr.administration.hierarchy.people.submit}
              </SubmitButton>
            </form>

            <form
              className="grid content-start gap-4 border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
              onSubmit={handleRoleSubmit}
            >
              <h3 className="text-base font-semibold">
                {tr.administration.hierarchy.roles.title}
              </h3>
              <SelectField
                label={tr.administration.hierarchy.roles.user}
                onChange={selectRoleMember}
                value={roleForm.userId}
              >
                {organizationMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {formatMember(member)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label={tr.administration.hierarchy.roles.role}
                onChange={(roleCode) => setRoleForm((current) => ({
                  ...current,
                  roleCode: roleCode as HierarchyRoleCode
                }))}
                value={roleForm.roleCode}
              >
                {roleOptions.map((roleCode) => (
                  <option key={roleCode} value={roleCode}>
                    {tr.dashboard.workspace.roleLabels[roleCode]}
                  </option>
                ))}
              </SelectField>
              {unitScopedRole ? (
                <SelectField
                  disabled
                  label={tr.administration.hierarchy.roles.unit}
                  onChange={() => undefined}
                  value={roleForm.unitId}
                >
                  {activeUnits.filter((unit) =>
                    unit.id === selectedRoleMember?.primaryUnitId
                  ).map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </SelectField>
              ) : null}
              <SubmitButton
                disabled={
                  pendingAction !== null
                  || !roleForm.userId
                  || (unitScopedRole && !roleForm.unitId)
                }
              >
                {pendingAction === "role"
                  ? tr.administration.hierarchy.roles.submitting
                  : tr.administration.hierarchy.roles.submit}
              </SubmitButton>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-800">
                  {tr.administration.hierarchy.roles.activeTitle}
                </h4>
                {selectedRoleMember && selectedRoleMember.roles.length > 0 ? (
                  <ul className="mt-3 grid gap-3">
                    {selectedRoleMember.roles.map((role) => (
                      <li
                        className="flex items-center justify-between gap-3 text-sm"
                        key={role.id}
                      >
                        <span className="min-w-0 text-slate-700">
                          {formatRole(role.roleCode, role.scopeId, organizationUnits)}
                        </span>
                        <button
                          className="shrink-0 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
                          disabled={pendingAction !== null}
                          onClick={() => void handleEndRole(role.id)}
                          type="button"
                        >
                          {pendingAction === role.id
                            ? tr.administration.hierarchy.roles.ending
                            : tr.administration.hierarchy.roles.end}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    {tr.administration.hierarchy.roles.empty}
                  </p>
                )}
              </div>
            </form>
          </div>
        </>
      ) : null}
    </section>
  );
}

function initializeMemberForms(
  data: HierarchyAdministrationData,
  organizationId: string,
  setContextForm: (value: ContextFormState) => void,
  setRoleForm: (value: RoleFormState) => void
) {
  const member = data.members.find((item) =>
    item.organizationId === organizationId
  );

  setContextForm(member ? toContextForm(member) : emptyContextForm);
  setRoleForm(member
    ? { ...emptyRoleForm, unitId: member.primaryUnitId, userId: member.userId }
    : emptyRoleForm);
}

function toContextForm(member: HierarchyMember): ContextFormState {
  return {
    managerUserId: member.managerUserId ?? "",
    membershipKind: member.membershipKind,
    primaryUnitId: member.primaryUnitId,
    userId: member.userId
  };
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatMember(member: HierarchyMember): string {
  return member.displayName
    ? `${member.displayName} (${member.email})`
    : member.email;
}

function formatRole(
  roleCode: HierarchyRoleCode,
  scopeId: string | null,
  units: readonly { readonly id: string; readonly name: string }[]
): string {
  const roleLabel = tr.dashboard.workspace.roleLabels[roleCode];
  const unitName = scopeId
    ? units.find((unit) => unit.id === scopeId)?.name
    : null;

  return unitName ? `${roleLabel} / ${unitName}` : roleLabel;
}

function TextField({
  disabled = false,
  label,
  onChange,
  required = false,
  value
}: {
  readonly disabled?: boolean;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly required?: boolean;
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20 disabled:bg-slate-100 disabled:text-slate-500"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        required={required}
        type="text"
        value={value}
      />
    </label>
  );
}

function SelectField({
  children,
  disabled = false,
  label,
  onChange,
  value
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <select
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal shadow-sm focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20 disabled:bg-slate-100 disabled:text-slate-500"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function SubmitButton({
  children,
  disabled
}: {
  readonly children: ReactNode;
  readonly disabled: boolean;
}) {
  return (
    <button
      className="w-fit rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
  );
}

function toFeedbackMessage(error: unknown): string {
  if (error instanceof HierarchyAdministrationServiceError) {
    return tr.administration.hierarchy.feedback[error.code];
  }

  return tr.administration.hierarchy.feedback.genericError;
}

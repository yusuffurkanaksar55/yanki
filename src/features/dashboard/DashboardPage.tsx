import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  Network,
  Settings,
  TimerReset,
  UserRound,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import {
  ApplicationShell,
  type ApplicationNavigationItem
} from "../../components/ApplicationShell";
import { tr } from "../../locales/tr/messages";
import { AssignmentInbox } from "../evaluations/AssignmentInbox";
import {
  createAssignmentSummary,
  type AssignmentInboxSummary
} from "../evaluations/assignmentSummary";
import {
  browserEvaluationAssignmentService,
  type EvaluationAssignmentService
} from "../evaluations/evaluationAssignmentService";
import { EvaluationReportsPanel } from "../reporting/EvaluationReportsPanel";
import type { EvaluationReportService } from "../reporting/evaluationReportService";
import type {
  WorkspaceContext,
  WorkspaceMembership,
  WorkspaceRole
} from "../workspace/workspaceContextService";
import {
  canAccessAdministration,
  canAccessEvaluationReports
} from "../workspace/workspaceAuthorization";

export type DashboardView = "dashboard" | "assignments" | "reports";

type DashboardPageProps = {
  readonly activeView?: DashboardView;
  readonly evaluationAssignmentService?: EvaluationAssignmentService;
  readonly evaluationReportService?: EvaluationReportService;
  readonly profileDisplayName?: string | null;
  readonly userEmail?: string | null;
  readonly isSigningOut?: boolean;
  readonly onSignOut?: () => Promise<void>;
  readonly workspaceContext?: WorkspaceContext | null;
};

export function DashboardPage({
  activeView = "dashboard",
  evaluationAssignmentService = browserEvaluationAssignmentService,
  evaluationReportService,
  profileDisplayName,
  userEmail,
  isSigningOut = false,
  onSignOut,
  workspaceContext
}: DashboardPageProps) {
  const hasAdministrationRole = canAccessAdministration(workspaceContext);
  const hasReportingRole = canAccessEvaluationReports(workspaceContext);
  const resolvedView = activeView === "reports" && !hasReportingRole
    ? "dashboard"
    : activeView;
  const assignmentSummary = useAssignmentSummary(
    resolvedView === "dashboard" ? evaluationAssignmentService : null
  );

  return (
    <ApplicationShell
      isSigningOut={isSigningOut}
      navigationItems={getNavigationItems(workspaceContext, resolvedView)}
      onSignOut={onSignOut}
      profileDisplayName={profileDisplayName}
      userEmail={userEmail}
    >
      <main
        className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        id={resolvedView}
      >
        <DashboardHeader
          activeView={resolvedView}
          hasAdministrationRole={hasAdministrationRole}
          workspaceContext={workspaceContext}
        />

        {resolvedView === "dashboard" ? (
          <>
            <Metrics assignmentSummary={assignmentSummary} />
            <QuickAccess hasReportingRole={hasReportingRole} />
            {workspaceContext ? (
              <WorkspaceContextSection
                profileDisplayName={profileDisplayName}
                userEmail={userEmail}
                workspaceContext={workspaceContext}
              />
            ) : null}
          </>
        ) : null}

        {resolvedView === "assignments" ? (
          <AssignmentInbox
            service={evaluationAssignmentService}
            showHeader={false}
          />
        ) : null}

        {resolvedView === "reports" ? (
          <EvaluationReportsPanel
            service={evaluationReportService}
            showHeader={false}
          />
        ) : null}
      </main>
    </ApplicationShell>
  );
}

function DashboardHeader({
  activeView,
  hasAdministrationRole,
  workspaceContext
}: {
  readonly activeView: DashboardView;
  readonly hasAdministrationRole: boolean;
  readonly workspaceContext: WorkspaceContext | null | undefined;
}) {
  const copy = getViewCopy(activeView);

  return (
    <section className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="section-kicker">{getOrganizationName(workspaceContext)}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {copy.description}
        </p>
      </div>

      {activeView === "dashboard" && hasAdministrationRole ? (
        <a
          className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-ring"
          href="#administration"
        >
          <Settings aria-hidden="true" size={18} strokeWidth={1.8} />
          {tr.dashboard.administration.action}
        </a>
      ) : null}

      {activeView === "reports" ? (
        <span className="w-fit rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-950 ring-1 ring-emerald-200">
          {tr.reports.aggregateOnly}
        </span>
      ) : null}
    </section>
  );
}

function Metrics({
  assignmentSummary
}: {
  readonly assignmentSummary: AssignmentInboxSummary | null;
}) {
  return (
    <section
      aria-label={tr.dashboard.metricsSectionLabel}
      className="grid border-b border-slate-200 sm:grid-cols-2"
    >
      <Metric
        icon={TimerReset}
        label={tr.dashboard.metrics.activeCycles.label}
        value={assignmentSummary?.activeCycleCount}
      />
      <Metric
        icon={ClipboardCheck}
        label={tr.dashboard.metrics.pendingAssignments.label}
        value={assignmentSummary?.pendingAssignmentCount}
      />
    </section>
  );
}

function QuickAccess({ hasReportingRole }: { readonly hasReportingRole: boolean }) {
  return (
    <section aria-label={tr.dashboard.quickAccess.sectionLabel} className="mt-8">
      <h2 className="text-lg font-bold text-slate-950">
        {tr.dashboard.quickAccess.title}
      </h2>
      <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
        <QuickAccessLink
          description={tr.assignments.description}
          href="#assignments"
          icon={ClipboardCheck}
          title={tr.assignments.title}
        />
        {hasReportingRole ? (
          <QuickAccessLink
            description={tr.reports.description}
            href="#reports"
            icon={BarChart3}
            title={tr.reports.title}
          />
        ) : null}
      </div>
    </section>
  );
}

function QuickAccessLink({
  description,
  href,
  icon: Icon,
  title
}: {
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly title: string;
}) {
  return (
    <a
      className="group grid min-h-20 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-4 py-4 text-slate-800 transition hover:text-pine focus-ring"
      href={href}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-pine ring-1 ring-slate-200">
        <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-slate-950 group-hover:text-pine">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-5 text-slate-600">
          {description}
        </span>
      </span>
      <ArrowRight aria-hidden="true" size={19} strokeWidth={1.8} />
    </a>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number | undefined;
}) {
  return (
    <div className="flex min-h-28 items-center gap-4 py-5 sm:px-6 sm:first:border-r sm:first:border-slate-200 sm:first:pl-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-pine shadow-sm ring-1 ring-slate-200">
        <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {value === undefined ? (
          <span
            aria-label={tr.dashboard.metrics.loading}
            className="mt-2 block h-7 w-12 animate-pulse rounded bg-slate-200"
          />
        ) : (
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        )}
      </div>
    </div>
  );
}

function WorkspaceContextSection({
  profileDisplayName,
  userEmail,
  workspaceContext
}: {
  readonly profileDisplayName?: string | null;
  readonly userEmail?: string | null;
  readonly workspaceContext: WorkspaceContext;
}) {
  const organizationNames = Array.from(new Set(
    workspaceContext.memberships.map((membership) => membership.organizationName)
  ));
  const personName = profileDisplayName ?? userEmail ?? tr.app.accountFallback;
  const roleSummaries = summarizeRoles(workspaceContext.roles);

  return (
    <section
      aria-label={tr.dashboard.workspace.sectionLabel}
      className="mt-10 border-t border-slate-200 pt-7"
    >
      <div className="max-w-2xl">
        <p className="section-kicker">{tr.dashboard.workspace.eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">
          {tr.dashboard.workspace.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {tr.dashboard.workspace.description}
        </p>
      </div>

      <div className="mt-6 grid gap-8 border-y border-slate-200 py-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] lg:gap-12">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950">
            <Network aria-hidden="true" className="text-pine" size={18} strokeWidth={1.8} />
            {tr.dashboard.workspace.hierarchyTitle}
          </h3>
          <ol className="relative mt-5 grid gap-1 before:absolute before:bottom-7 before:left-[1.35rem] before:top-7 before:w-px before:bg-slate-300">
            <HierarchyNode
              icon={Building2}
              label={tr.dashboard.workspace.labels.organization}
              values={organizationNames}
              emptyText={tr.dashboard.workspace.empty.memberships}
            />
            <HierarchyNode
              icon={UsersRound}
              label={tr.dashboard.workspace.labels.memberships}
              values={workspaceContext.memberships.map(formatMembership)}
              emptyText={tr.dashboard.workspace.empty.memberships}
            />
            <HierarchyNode
              icon={UserRound}
              label={tr.dashboard.workspace.labels.managers}
              values={workspaceContext.managers.map(formatManager)}
              emptyText={tr.dashboard.workspace.empty.managers}
            />
            <HierarchyNode
              icon={BriefcaseBusiness}
              label={tr.dashboard.workspace.labels.you}
              values={userEmail && userEmail !== personName
                ? [personName, userEmail]
                : [personName]}
              emptyText={tr.app.accountFallback}
            />
          </ol>
        </div>

        <div className="min-w-0 lg:border-l lg:border-slate-200 lg:pl-10">
          <h3 className="text-sm font-bold text-slate-950">
            {tr.dashboard.workspace.rolesTitle}
          </h3>
          {roleSummaries.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {roleSummaries.map((role) => (
                <li className="py-4" key={`${role.roleCode}:${role.scopeType}`}>
                  <p className="font-semibold text-slate-900">{formatRoleLabel(role.roleCode)}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {formatRoleScope(role.scopeType, role.count)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              {tr.dashboard.workspace.empty.roles}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function HierarchyNode({
  emptyText,
  icon: Icon,
  label,
  values
}: {
  readonly emptyText: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly values: readonly string[];
}) {
  return (
    <li className="relative grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-4 py-3">
      <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-pine shadow-sm">
        <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
        {values.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {values.map((value) => (
              <li className="break-words text-sm font-semibold leading-5 text-slate-900" key={value}>
                {value}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm leading-5 text-slate-500">{emptyText}</p>
        )}
      </div>
    </li>
  );
}

function getNavigationItems(
  workspaceContext: WorkspaceContext | null | undefined,
  activeView: DashboardView
): readonly ApplicationNavigationItem[] {
  const items: ApplicationNavigationItem[] = [
    {
      href: "#dashboard",
      icon: LayoutDashboard,
      isActive: activeView === "dashboard",
      label: tr.navigation.dashboard
    },
    {
      href: "#assignments",
      icon: ClipboardCheck,
      isActive: activeView === "assignments",
      label: tr.navigation.cycles
    }
  ];

  if (canAccessEvaluationReports(workspaceContext)) {
    items.push({
      href: "#reports",
      icon: BarChart3,
      isActive: activeView === "reports",
      label: tr.navigation.reports
    });
  }

  if (canAccessAdministration(workspaceContext)) {
    items.push({
      href: "#administration",
      icon: Settings,
      label: tr.navigation.administration
    });
  }

  return items;
}

function getViewCopy(activeView: DashboardView): {
  readonly description: string;
  readonly title: string;
} {
  if (activeView === "assignments") {
    return {
      description: tr.assignments.description,
      title: tr.assignments.title
    };
  }

  if (activeView === "reports") {
    return {
      description: tr.reports.description,
      title: tr.reports.title
    };
  }

  return {
    description: tr.dashboard.summary,
    title: tr.dashboard.title
  };
}

function useAssignmentSummary(
  service: EvaluationAssignmentService | null
): AssignmentInboxSummary | null {
  const [summary, setSummary] = useState<AssignmentInboxSummary | null>(null);

  useEffect(() => {
    if (!service) {
      return;
    }

    let isActive = true;

    void service.listMyAssignments()
      .then((assignments) => {
        if (isActive) {
          setSummary(createAssignmentSummary(assignments));
        }
      })
      .catch(() => {
        if (isActive) {
          setSummary({ activeCycleCount: 0, pendingAssignmentCount: 0 });
        }
      });

    return () => {
      isActive = false;
    };
  }, [service]);

  return summary;
}

function getOrganizationName(
  workspaceContext: WorkspaceContext | null | undefined
): string {
  return workspaceContext?.memberships[0]?.organizationName ?? tr.dashboard.eyebrow;
}

function formatRoleLabel(roleCode: string): string {
  return (
    tr.dashboard.workspace.roleLabels[
      roleCode as keyof typeof tr.dashboard.workspace.roleLabels
    ] ?? roleCode
  );
}

function formatRoleScope(scopeType: string, count: number): string {
  const scopeLabel =
    tr.dashboard.workspace.scopeLabels[
      scopeType as keyof typeof tr.dashboard.workspace.scopeLabels
    ] ?? scopeType;

  return count > 1
    ? tr.dashboard.workspace.values.roleScopeCount
        .replace("{scope}", scopeLabel)
        .replace("{count}", String(count))
    : tr.dashboard.workspace.values.roleScope.replace("{scope}", scopeLabel);
}

function formatMembership(membership: WorkspaceMembership): string {
  const primaryLabel = membership.isPrimary
    ? ` · ${tr.dashboard.workspace.values.primaryMembership}`
    : "";

  return `${membership.unitName} · ${formatUnitType(membership.unitType)}${primaryLabel}`;
}

function formatManager(manager: {
  readonly managerDisplayName: string | null;
  readonly managerEmail: string | null;
  readonly relationshipType: string;
}): string {
  const name =
    manager.managerDisplayName ??
    manager.managerEmail ??
    tr.dashboard.workspace.empty.managerName;
  const relationshipLabel =
    tr.dashboard.workspace.relationshipLabels[
      manager.relationshipType as keyof typeof tr.dashboard.workspace.relationshipLabels
    ];

  return relationshipLabel ? `${name} · ${relationshipLabel}` : name;
}

function summarizeRoles(roles: readonly WorkspaceRole[]): readonly ({
  readonly count: number;
} & Pick<WorkspaceRole, "roleCode" | "scopeType">)[] {
  const summaries = new Map<string, {
    count: number;
    roleCode: string;
    scopeType: string;
  }>();

  for (const role of roles) {
    const key = `${role.roleCode}:${role.scopeType}`;
    const existing = summaries.get(key);

    summaries.set(key, {
      count: (existing?.count ?? 0) + 1,
      roleCode: role.roleCode,
      scopeType: role.scopeType
    });
  }

  return Array.from(summaries.values()).sort((left, right) =>
    formatRoleLabel(left.roleCode).localeCompare(formatRoleLabel(right.roleCode), "tr")
  );
}

function formatUnitType(unitType: string): string {
  return (
    tr.dashboard.workspace.unitTypeLabels[
      unitType as keyof typeof tr.dashboard.workspace.unitTypeLabels
    ] ?? unitType
  );
}

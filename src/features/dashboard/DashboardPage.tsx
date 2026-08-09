import { useCallback, useState } from "react";
import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  TimerReset,
  type LucideIcon
} from "lucide-react";
import {
  ApplicationShell,
  type ApplicationNavigationItem
} from "../../components/ApplicationShell";
import { tr } from "../../locales/tr/messages";
import {
  AssignmentInbox,
  type AssignmentInboxSummary
} from "../evaluations/AssignmentInbox";
import type { EvaluationAssignmentService } from "../evaluations/evaluationAssignmentService";
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

type DashboardPageProps = {
  readonly evaluationAssignmentService?: EvaluationAssignmentService;
  readonly evaluationReportService?: EvaluationReportService;
  readonly profileDisplayName?: string | null;
  readonly userEmail?: string | null;
  readonly isSigningOut?: boolean;
  readonly onSignOut?: () => Promise<void>;
  readonly workspaceContext?: WorkspaceContext | null;
};

export function DashboardPage({
  evaluationAssignmentService,
  evaluationReportService,
  profileDisplayName,
  userEmail,
  isSigningOut = false,
  onSignOut,
  workspaceContext
}: DashboardPageProps) {
  const [assignmentSummary, setAssignmentSummary] =
    useState<AssignmentInboxSummary | null>(null);
  const hasAdministrationRole = canAccessAdministration(workspaceContext);
  const hasReportingRole = canAccessEvaluationReports(workspaceContext);
  const handleAssignmentSummaryChange = useCallback(
    (summary: AssignmentInboxSummary) => setAssignmentSummary(summary),
    []
  );

  return (
    <ApplicationShell
      isSigningOut={isSigningOut}
      navigationItems={getNavigationItems(workspaceContext)}
      onSignOut={onSignOut}
      profileDisplayName={profileDisplayName}
      userEmail={userEmail}
    >
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" id="dashboard">
        <section className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">{getOrganizationName(workspaceContext)}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              {tr.dashboard.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {tr.dashboard.summary}
            </p>
          </div>
          {hasAdministrationRole ? (
            <a
              className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-ring"
              href="#administration"
            >
              <Settings aria-hidden="true" size={18} strokeWidth={1.8} />
              {tr.dashboard.administration.action}
            </a>
          ) : null}
        </section>

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

        <AssignmentInbox
          onSummaryChange={handleAssignmentSummaryChange}
          service={evaluationAssignmentService}
        />

        {hasReportingRole ? (
          <EvaluationReportsPanel service={evaluationReportService} />
        ) : null}

        {workspaceContext ? (
          <WorkspaceContextSection workspaceContext={workspaceContext} />
        ) : null}
      </main>
    </ApplicationShell>
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
  workspaceContext
}: {
  readonly workspaceContext: WorkspaceContext;
}) {
  const primaryMembership =
    workspaceContext.memberships.find((membership) => membership.isPrimary) ??
    workspaceContext.memberships[0];

  return (
    <section
      aria-label={tr.dashboard.workspace.sectionLabel}
      className="mt-10 border-t border-slate-200 pt-7"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">{tr.dashboard.workspace.eyebrow}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {tr.dashboard.workspace.title}
          </h2>
        </div>
        {primaryMembership ? (
          <span className="w-fit rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {formatUnitType(primaryMembership.unitType)}
          </span>
        ) : null}
      </div>

      <dl className="mt-5 grid overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-3">
        <ContextList
          emptyText={tr.dashboard.workspace.empty.roles}
          items={workspaceContext.roles.map(formatRole)}
          label={tr.dashboard.workspace.labels.roles}
        />
        <ContextList
          emptyText={tr.dashboard.workspace.empty.memberships}
          items={workspaceContext.memberships.map(formatMembership)}
          label={tr.dashboard.workspace.labels.memberships}
        />
        <ContextList
          emptyText={tr.dashboard.workspace.empty.managers}
          items={workspaceContext.managers.map(formatManager)}
          label={tr.dashboard.workspace.labels.managers}
        />
      </dl>
    </section>
  );
}

function ContextList({
  emptyText,
  items,
  label
}: {
  readonly emptyText: string;
  readonly items: readonly string[];
  readonly label: string;
}) {
  return (
    <div className="min-w-0 border-b border-slate-200 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-3">
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li className="break-words text-sm font-medium leading-5 text-slate-800" key={item}>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-5 text-slate-500">{emptyText}</p>
        )}
      </dd>
    </div>
  );
}

function getNavigationItems(
  workspaceContext: WorkspaceContext | null | undefined
): readonly ApplicationNavigationItem[] {
  const items: ApplicationNavigationItem[] = [
    {
      href: "#dashboard",
      icon: LayoutDashboard,
      isActive: true,
      label: tr.navigation.dashboard
    },
    {
      href: "#assignments",
      icon: ClipboardCheck,
      label: tr.navigation.cycles
    }
  ];

  if (canAccessEvaluationReports(workspaceContext)) {
    items.push({ href: "#reports", icon: BarChart3, label: tr.navigation.reports });
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

function getOrganizationName(
  workspaceContext: WorkspaceContext | null | undefined
): string {
  return workspaceContext?.memberships[0]?.organizationName ?? tr.dashboard.eyebrow;
}

function formatRole(role: WorkspaceRole): string {
  const roleLabel =
    tr.dashboard.workspace.roleLabels[
      role.roleCode as keyof typeof tr.dashboard.workspace.roleLabels
    ] ?? role.roleCode;
  const scopeLabel =
    tr.dashboard.workspace.scopeLabels[
      role.scopeType as keyof typeof tr.dashboard.workspace.scopeLabels
    ] ?? role.scopeType;

  return `${roleLabel} / ${scopeLabel}`;
}

function formatMembership(membership: WorkspaceMembership): string {
  return `${membership.organizationName} / ${membership.unitName}`;
}

function formatManager(manager: {
  readonly managerDisplayName: string | null;
  readonly managerEmail: string | null;
}): string {
  return (
    manager.managerDisplayName ??
    manager.managerEmail ??
    tr.dashboard.workspace.empty.managerName
  );
}

function formatUnitType(unitType: string): string {
  return (
    tr.dashboard.workspace.unitTypeLabels[
      unitType as keyof typeof tr.dashboard.workspace.unitTypeLabels
    ] ?? unitType
  );
}

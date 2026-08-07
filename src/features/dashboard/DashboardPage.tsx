import { useCallback, useState } from "react";
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
  canAccessEvaluationReports,
  isAdministrationRole
} from "../workspace/workspaceAuthorization";

const baseNavigationItems: readonly {
  readonly href: string;
  readonly label: string;
}[] = [
  { href: "#dashboard", label: tr.navigation.dashboard },
  { href: "#assignments", label: tr.navigation.cycles },
  { href: "#content", label: tr.navigation.projects }
];

const readinessItems = [
  {
    label: tr.dashboard.readiness.identitySeparation,
    status: tr.dashboard.status.implemented
  },
  {
    label: tr.dashboard.readiness.encryptionBoundary,
    status: tr.dashboard.status.implemented
  },
  {
    label: tr.dashboard.readiness.runtimeAuth,
    status: tr.dashboard.status.implemented
  },
  {
    label: tr.dashboard.readiness.databasePolicies,
    status: tr.dashboard.status.implemented
  }
] as const;

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
  const navigationItems = getNavigationItems(workspaceContext);
  const hasAdministrationRole = canAccessAdministration(workspaceContext);
  const hasReportingRole = canAccessEvaluationReports(workspaceContext);
  const metricCards = createMetricCards(assignmentSummary);
  const handleAssignmentSummaryChange = useCallback(
    (summary: AssignmentInboxSummary) => setAssignmentSummary(summary),
    []
  );

  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-pine">
              {tr.app.kicker}
            </p>
            <p className="mt-1 text-xl font-semibold">{tr.app.name}</p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <nav
              aria-label={tr.navigation.primaryAriaLabel}
              className="flex flex-wrap gap-2"
            >
              {navigationItems.map((item, index) => (
                <a
                  aria-current={index === 0 ? "page" : undefined}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2"
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            {onSignOut ? (
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {profileDisplayName ? (
                  <span>
                    {tr.dashboard.session.profile}{" "}
                    <strong className="font-semibold text-slate-800">
                      {profileDisplayName}
                    </strong>
                  </span>
                ) : null}
                {userEmail ? (
                  <span>
                    {tr.dashboard.session.signedInAs}{" "}
                    <strong className="font-semibold text-slate-800">
                      {userEmail}
                    </strong>
                  </span>
                ) : null}
                <button
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={isSigningOut}
                  onClick={() => {
                    void onSignOut();
                  }}
                  type="button"
                >
                  {isSigningOut
                    ? tr.dashboard.session.signingOut
                    : tr.dashboard.session.signOut}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-8" id="content">
        <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-coral">
              {tr.dashboard.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
              {tr.dashboard.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              {tr.dashboard.summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2">
              {tr.dashboard.actions.newCycle}
            </button>
            <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2">
              {tr.dashboard.actions.manageTemplates}
            </button>
          </div>
        </section>

        {workspaceContext ? (
          <WorkspaceContextSection
            hasAdministrationRole={hasAdministrationRole}
            workspaceContext={workspaceContext}
          />
        ) : null}

        <AssignmentInbox
          onSummaryChange={handleAssignmentSummaryChange}
          service={evaluationAssignmentService}
        />

        {hasReportingRole ? (
          <EvaluationReportsPanel service={evaluationReportService} />
        ) : null}

        <section
          aria-label={tr.dashboard.metricsSectionLabel}
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {metricCards.map((card) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              key={card.label}
            >
              <p className="text-sm font-medium text-slate-600">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {card.detail}
              </p>
            </article>
          ))}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {tr.dashboard.workflow.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {tr.dashboard.workflow.description}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber">
                {tr.dashboard.workflow.badge}
              </span>
            </div>

            <ol className="mt-6 divide-y divide-slate-200">
              {tr.dashboard.workflow.steps.map((step, index) => (
                <li className="grid gap-3 py-4 sm:grid-cols-[2rem_1fr]" key={step}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{tr.dashboard.privacy.title}</h2>
            <div className="mt-5 space-y-4">
              {readinessItems.map((item) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0"
                  key={item.label}
                >
                  <span className="text-sm leading-6 text-slate-700">
                    {item.label}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
              {tr.dashboard.privacy.threshold}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function createMetricCards(summary: AssignmentInboxSummary | null) {
  return [
    {
      label: tr.dashboard.metrics.activeCycles.label,
      value: summary ? String(summary.activeCycleCount) : "...",
      detail: tr.dashboard.metrics.activeCycles.detail
    },
    {
      label: tr.dashboard.metrics.pendingAssignments.label,
      value: summary ? String(summary.pendingAssignmentCount) : "...",
      detail: tr.dashboard.metrics.pendingAssignments.detail
    },
    {
      label: tr.dashboard.metrics.threshold.label,
      value: "4",
      detail: tr.dashboard.metrics.threshold.detail
    },
    {
      label: tr.dashboard.metrics.secureStorage.label,
      value: tr.dashboard.metrics.secureStorage.value,
      detail: tr.dashboard.metrics.secureStorage.detail
    }
  ] as const;
}

function WorkspaceContextSection({
  hasAdministrationRole,
  workspaceContext
}: {
  readonly hasAdministrationRole: boolean;
  readonly workspaceContext: WorkspaceContext;
}) {
  const primaryMembership =
    workspaceContext.memberships.find((membership) => membership.isPrimary) ??
    workspaceContext.memberships[0];

  return (
    <section
      aria-label={tr.dashboard.workspace.sectionLabel}
      className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {tr.dashboard.workspace.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {tr.dashboard.workspace.description}
            </p>
          </div>
          {primaryMembership ? (
            <span className="inline-flex w-fit rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {formatUnitType(primaryMembership.unitType)}
            </span>
          ) : null}
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
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
      </div>

      {hasAdministrationRole ? (
        <section className="rounded-lg border border-pine/20 bg-emerald-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-950">
            {tr.dashboard.administration.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-950">
            {tr.dashboard.administration.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {workspaceContext.roles
              .filter((role) => isAdministrationRole(role.roleCode))
              .map((role) => (
                <span
                  className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-950 ring-1 ring-emerald-200"
                  key={`${role.roleCode}-${role.scopeType}-${role.scopeId ?? "global"}`}
                >
                  {formatRole(role)}
                </span>
              ))}
          </div>
        </section>
      ) : null}
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
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <dt className="text-sm font-semibold text-slate-800">{label}</dt>
      <dd className="mt-3">
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li className="text-sm leading-6 text-slate-700" key={item}>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-slate-500">{emptyText}</p>
        )}
      </dd>
    </div>
  );
}

function getNavigationItems(
  workspaceContext: WorkspaceContext | null | undefined
): readonly { readonly href: string; readonly label: string }[] {
  const items = [...baseNavigationItems];

  if (canAccessEvaluationReports(workspaceContext)) {
    items.push({ href: "#reports", label: tr.navigation.reports });
  }

  if (canAccessAdministration(workspaceContext)) {
    items.push({ href: "#administration", label: tr.navigation.administration });
  }

  return items;
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

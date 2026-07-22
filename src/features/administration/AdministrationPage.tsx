import { tr } from "../../locales/tr/messages";
import type {
  WorkspaceContext,
  WorkspaceRole
} from "../workspace/workspaceContextService";
import {
  canAccessAdministration,
  getAdministrationRoles
} from "../workspace/workspaceAuthorization";
import type { HierarchyAdministrationService } from "./hierarchyAdministrationService";
import { ProjectCycleManagementPanel } from "./ProjectCycleManagementPanel";
import type { ProjectCycleService } from "./projectCycleService";
import { RoleHierarchyManagementPanel } from "./RoleHierarchyManagementPanel";
import { UserInvitationManagementPanel } from "./UserInvitationManagementPanel";
import type { UserAdministrationService } from "./userAdministrationService";

type AdministrationPageProps = {
  readonly hierarchyAdministrationService?: HierarchyAdministrationService;
  readonly isSigningOut?: boolean;
  readonly onSignOut?: () => Promise<void>;
  readonly profileDisplayName?: string | null;
  readonly projectCycleService?: ProjectCycleService;
  readonly userAdministrationService?: UserAdministrationService;
  readonly userEmail?: string | null;
  readonly workspaceContext: WorkspaceContext;
};

export function AdministrationPage({
  hierarchyAdministrationService,
  isSigningOut = false,
  onSignOut,
  profileDisplayName,
  projectCycleService,
  userAdministrationService,
  userEmail,
  workspaceContext
}: AdministrationPageProps) {
  if (!canAccessAdministration(workspaceContext)) {
    return <AdministrationBlockedPage />;
  }

  const administrationRoles = getAdministrationRoles(workspaceContext);

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
              <a
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2"
                href="#dashboard"
              >
                {tr.navigation.dashboard}
              </a>
              <a
                aria-current="page"
                className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900"
                href="#administration"
              >
                {tr.navigation.administration}
              </a>
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

      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <section className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-coral">
              {tr.administration.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
              {tr.administration.title}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              {tr.administration.summary}
            </p>
          </div>

          <aside
            aria-label={tr.administration.roles.sectionLabel}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-semibold">
              {tr.administration.roles.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {tr.administration.roles.description}
            </p>
            <ul className="mt-4 space-y-2">
              {administrationRoles.map((role) => (
                <li
                  className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  key={`${role.roleCode}-${role.scopeType}-${role.scopeId ?? "global"}`}
                >
                  {formatRole(role)}
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <UserInvitationManagementPanel
          service={userAdministrationService}
          workspaceContext={workspaceContext}
        />

        <RoleHierarchyManagementPanel
          service={hierarchyAdministrationService}
          workspaceContext={workspaceContext}
        />

        <ProjectCycleManagementPanel
          service={projectCycleService}
          workspaceContext={workspaceContext}
        />

        <section
          aria-label={tr.administration.workflowsSectionLabel}
          className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {tr.administration.workflows.map((workflow) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              key={workflow.title}
            >
              <p className="text-xs font-semibold uppercase tracking-normal text-pine">
                {workflow.status}
              </p>
              <h2 className="mt-2 text-lg font-semibold">{workflow.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {workflow.description}
              </p>
              <ul className="mt-4 space-y-2">
                {workflow.items.map((item) => (
                  <li className="text-sm leading-6 text-slate-700" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">
              {tr.administration.datePolicy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {tr.administration.datePolicy.description}
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-4">
                <dt className="text-sm font-semibold text-slate-800">
                  {tr.administration.datePolicy.projectCompletionLabel}
                </dt>
                <dd className="mt-2 text-sm text-slate-600">
                  {tr.administration.datePolicy.configuredBy}
                </dd>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <dt className="text-sm font-semibold text-slate-800">
                  {tr.administration.datePolicy.evaluationCloseLabel}
                </dt>
                <dd className="mt-2 text-sm text-slate-600">
                  {tr.administration.datePolicy.configuredBy}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-emerald-950">
              {tr.administration.safeguards.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {tr.administration.safeguards.items.map((item) => (
                <li className="text-sm leading-6 text-emerald-950" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}

function AdministrationBlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6 text-ink">
      <section className="w-full max-w-lg rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">
          {tr.administration.blocked.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          {tr.administration.blocked.description}
        </p>
        <a
          className="mt-5 inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2"
          href="#dashboard"
        >
          {tr.administration.blocked.backLink}
        </a>
      </section>
    </main>
  );
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

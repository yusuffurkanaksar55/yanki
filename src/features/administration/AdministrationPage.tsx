import { useState, type ReactNode } from "react";
import {
  Archive,
  Building2,
  Boxes,
  FileStack,
  FolderKanban,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon
} from "lucide-react";
import { ApplicationShell } from "../../components/ApplicationShell";
import { tr } from "../../locales/tr/messages";
import type {
  WorkspaceContext,
  WorkspaceRole
} from "../workspace/workspaceContextService";
import {
  canAccessAdministration,
  getAdministrationRoles
} from "../workspace/workspaceAuthorization";
import { EvaluationTemplateManagementPanel } from "./EvaluationTemplateManagementPanel";
import type { EvaluationTemplateService } from "./evaluationTemplateService";
import { EvaluationRetentionManagementPanel } from
  "./EvaluationRetentionManagementPanel";
import type { EvaluationRetentionService } from "./evaluationRetentionService";
import type { HierarchyAdministrationService } from "./hierarchyAdministrationService";
import { ProjectCycleManagementPanel } from "./ProjectCycleManagementPanel";
import type { ProjectCycleService } from "./projectCycleService";
import { PlatformTenantManagementPanel } from "./PlatformTenantManagementPanel";
import type { PlatformTenantService } from "./platformTenantService";
import { RoleHierarchyManagementPanel } from "./RoleHierarchyManagementPanel";
import { SecurityOperationsPanel } from "./SecurityOperationsPanel";
import type { SecurityOperationsService } from "./securityOperationsService";
import { UserInvitationManagementPanel } from "./UserInvitationManagementPanel";
import type { UserAdministrationService } from "./userAdministrationService";

type AdministrationPageProps = {
  readonly evaluationTemplateService?: EvaluationTemplateService;
  readonly evaluationRetentionService?: EvaluationRetentionService;
  readonly hierarchyAdministrationService?: HierarchyAdministrationService;
  readonly isSigningOut?: boolean;
  readonly onSignOut?: () => Promise<void>;
  readonly platformTenantService?: PlatformTenantService;
  readonly profileDisplayName?: string | null;
  readonly projectCycleService?: ProjectCycleService;
  readonly securityOperationsService?: SecurityOperationsService;
  readonly userAdministrationService?: UserAdministrationService;
  readonly userEmail?: string | null;
  readonly workspaceContext: WorkspaceContext;
};

type AdministrationModuleId =
  | "tenants"
  | "users"
  | "hierarchy"
  | "projects"
  | "templates"
  | "security"
  | "retention";

type AdministrationModule = {
  readonly icon: LucideIcon;
  readonly id: AdministrationModuleId;
  readonly label: string;
};

export function AdministrationPage({
  evaluationRetentionService,
  evaluationTemplateService,
  hierarchyAdministrationService,
  isSigningOut = false,
  onSignOut,
  platformTenantService,
  profileDisplayName,
  projectCycleService,
  securityOperationsService,
  userAdministrationService,
  userEmail,
  workspaceContext
}: AdministrationPageProps) {
  const [activeModule, setActiveModule] =
    useState<AdministrationModuleId>("projects");

  if (!canAccessAdministration(workspaceContext)) {
    return <AdministrationBlockedPage />;
  }

  const administrationRoles = getAdministrationRoles(workspaceContext);
  const canManageTenantConfiguration = workspaceContext.roles.some(
    (role) => role.roleCode === "SYSTEM_ADMIN"
  );
  const canManagePlatformOperations = workspaceContext.roles.some(
    (role) =>
      role.roleCode === "SYSTEM_ADMIN"
      && role.scopeType === "PLATFORM"
      && role.scopeId === null
  );
  const modules = getAdministrationModules(
    canManageTenantConfiguration,
    canManagePlatformOperations
  );

  return (
    <ApplicationShell
      isSigningOut={isSigningOut}
      navigationItems={[
        {
          href: "#dashboard",
          icon: LayoutDashboard,
          label: tr.navigation.dashboard
        },
        {
          href: "#administration",
          icon: Settings,
          isActive: true,
          label: tr.navigation.administration
        }
      ]}
      onSignOut={onSignOut}
      profileDisplayName={profileDisplayName}
      userEmail={userEmail}
    >
      <main className="app-page">
        <section className="border-b border-slate-200 pb-7">
          <p className="section-kicker">{tr.administration.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {tr.administration.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            {tr.administration.summary}
          </p>
          <div
            aria-label={tr.administration.roles.sectionLabel}
            className="mt-5 flex flex-wrap gap-2"
          >
            {administrationRoles.map((role) => (
              <span
                className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                key={`${role.roleCode}-${role.scopeType}-${role.scopeId ?? "global"}`}
              >
                {formatRole(role)}
              </span>
            ))}
          </div>
        </section>

        <div className="grid min-w-0 gap-7 pt-6 xl:grid-cols-[14rem_minmax(0,1fr)] xl:items-start">
          <nav
            aria-label={tr.administration.moduleNavigationLabel}
            className="min-w-0 max-w-full"
          >
            <div
              className="grid w-full max-w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:block xl:space-y-1"
              role="tablist"
            >
              {modules.map((module) => {
                const Icon = module.icon;
                const isActive = module.id === activeModule;

                return (
                  <button
                    aria-controls={`administration-panel-${module.id}`}
                    aria-selected={isActive}
                    className={`flex h-12 w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition focus-ring ${
                      isActive
                        ? "bg-emerald-50 text-pine"
                        : "text-slate-600 hover:bg-white hover:text-slate-950"
                    }`}
                    id={`administration-tab-${module.id}`}
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    role="tab"
                    type="button"
                  >
                    <Icon
                      aria-hidden="true"
                      className="shrink-0"
                      size={18}
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0 leading-5">{module.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <section
            aria-labelledby={`administration-tab-${activeModule}`}
            className="min-w-0 [&>section]:mt-0"
            id={`administration-panel-${activeModule}`}
            role="tabpanel"
          >
            {renderAdministrationModule(activeModule, {
              evaluationRetentionService,
              evaluationTemplateService,
              hierarchyAdministrationService,
              projectCycleService,
              platformTenantService,
              securityOperationsService,
              userAdministrationService,
              workspaceContext
            })}
          </section>
        </div>
      </main>
    </ApplicationShell>
  );
}

function getAdministrationModules(
  canManageTenantConfiguration: boolean,
  canManagePlatformOperations: boolean
): readonly AdministrationModule[] {
  const modules: AdministrationModule[] = [
    { icon: FolderKanban, id: "projects", label: tr.administration.modules.projects }
  ];

  if (canManagePlatformOperations) {
    modules.unshift(
      { icon: Building2, id: "tenants", label: tr.administration.modules.tenants }
    );
  }

  if (canManageTenantConfiguration) {
    modules.push(
      { icon: Users, id: "users", label: tr.administration.modules.users },
      { icon: Boxes, id: "hierarchy", label: tr.administration.modules.hierarchy },
      { icon: FileStack, id: "templates", label: tr.administration.modules.templates }
    );
  }

  if (canManagePlatformOperations) {
    modules.push(
      { icon: ShieldCheck, id: "security", label: tr.administration.modules.security }
    );
  }

  if (canManageTenantConfiguration) {
    modules.push(
      { icon: Archive, id: "retention", label: tr.administration.modules.retention }
    );
  }

  return modules;
}

function renderAdministrationModule(
  activeModule: AdministrationModuleId,
  services: {
    readonly evaluationRetentionService?: EvaluationRetentionService;
    readonly evaluationTemplateService?: EvaluationTemplateService;
    readonly hierarchyAdministrationService?: HierarchyAdministrationService;
    readonly platformTenantService?: PlatformTenantService;
    readonly projectCycleService?: ProjectCycleService;
    readonly securityOperationsService?: SecurityOperationsService;
    readonly userAdministrationService?: UserAdministrationService;
    readonly workspaceContext: WorkspaceContext;
  }
): ReactNode {
  if (activeModule === "tenants") {
    return (
      <PlatformTenantManagementPanel service={services.platformTenantService} />
    );
  }

  if (activeModule === "users") {
    return (
      <UserInvitationManagementPanel
        service={services.userAdministrationService}
        workspaceContext={services.workspaceContext}
      />
    );
  }

  if (activeModule === "hierarchy") {
    return (
      <RoleHierarchyManagementPanel
        service={services.hierarchyAdministrationService}
        workspaceContext={services.workspaceContext}
      />
    );
  }

  if (activeModule === "templates") {
    return (
      <EvaluationTemplateManagementPanel
        service={services.evaluationTemplateService}
        workspaceContext={services.workspaceContext}
      />
    );
  }

  if (activeModule === "security") {
    return <SecurityOperationsPanel service={services.securityOperationsService} />;
  }

  if (activeModule === "retention") {
    return (
      <EvaluationRetentionManagementPanel
        service={services.evaluationRetentionService}
      />
    );
  }

  return (
    <ProjectCycleManagementPanel
      evaluationTemplateService={services.evaluationTemplateService}
      service={services.projectCycleService}
      workspaceContext={services.workspaceContext}
    />
  );
}

function AdministrationBlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6 text-ink">
      <section className="surface-panel w-full max-w-lg p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-amber-50 text-amber">
          <ShieldCheck aria-hidden="true" size={22} strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-950">
          {tr.administration.blocked.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {tr.administration.blocked.description}
        </p>
        <a
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-ring"
          href="#dashboard"
        >
          <LayoutDashboard aria-hidden="true" size={18} strokeWidth={1.8} />
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

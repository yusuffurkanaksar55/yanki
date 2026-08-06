import { useEffect, useState } from "react";
import { AdministrationPage } from "../features/administration/AdministrationPage";
import type { EvaluationTemplateService } from "../features/administration/evaluationTemplateService";
import type { HierarchyAdministrationService } from "../features/administration/hierarchyAdministrationService";
import type { ProjectCycleService } from "../features/administration/projectCycleService";
import type { UserAdministrationService } from "../features/administration/userAdministrationService";
import { AuthGate } from "../features/authentication/AuthGate";
import { AuthProvider } from "../features/authentication/AuthProvider";
import type { AuthService } from "../features/authentication/authService";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import type {
  EvaluationAssignmentService
} from "../features/evaluations/evaluationAssignmentService";
import { ProfileGate } from "../features/profiles/ProfileGate";
import type { ProfileService } from "../features/profiles/profileService";
import { WorkspaceContextGate } from "../features/workspace/WorkspaceContextGate";
import type { WorkspaceContextService } from "../features/workspace/workspaceContextService";

type AppProps = {
  readonly authService?: AuthService;
  readonly evaluationAssignmentService?: EvaluationAssignmentService;
  readonly evaluationTemplateService?: EvaluationTemplateService;
  readonly hierarchyAdministrationService?: HierarchyAdministrationService;
  readonly profileService?: ProfileService;
  readonly projectCycleService?: ProjectCycleService;
  readonly userAdministrationService?: UserAdministrationService;
  readonly workspaceContextService?: WorkspaceContextService;
};

type AppRoute = "dashboard" | "administration";

export function App({
  authService,
  evaluationAssignmentService,
  evaluationTemplateService,
  hierarchyAdministrationService,
  profileService,
  projectCycleService,
  userAdministrationService,
  workspaceContextService
}: AppProps) {
  const route = useHashRoute();

  return (
    <AuthProvider service={authService}>
      <AuthGate>
        {({ userId, userEmail, isSigningOut, onSignOut }) => (
          <ProfileGate
            isSigningOut={isSigningOut}
            onSignOut={onSignOut}
            service={profileService}
            userEmail={userEmail}
            userId={userId}
          >
            {({ profile }) => (
              <WorkspaceContextGate service={workspaceContextService}>
                {({ workspaceContext }) => (
                  <>
                    {route === "administration" ? (
                      <AdministrationPage
                        evaluationTemplateService={evaluationTemplateService}
                        hierarchyAdministrationService={hierarchyAdministrationService}
                        isSigningOut={isSigningOut}
                        onSignOut={onSignOut}
                        profileDisplayName={profile.display_name}
                        projectCycleService={projectCycleService}
                        userAdministrationService={userAdministrationService}
                        userEmail={userEmail}
                        workspaceContext={workspaceContext}
                      />
                    ) : (
                      <DashboardPage
                        evaluationAssignmentService={evaluationAssignmentService}
                        isSigningOut={isSigningOut}
                        onSignOut={onSignOut}
                        profileDisplayName={profile.display_name}
                        userEmail={userEmail}
                        workspaceContext={workspaceContext}
                      />
                    )}
                  </>
                )}
              </WorkspaceContextGate>
            )}
          </ProfileGate>
        )}
      </AuthGate>
    </AuthProvider>
  );
}

function useHashRoute(): AppRoute {
  const [route, setRoute] = useState(readRouteFromHash);

  useEffect(() => {
    function handleHashChange() {
      setRoute(readRouteFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return route;
}

function readRouteFromHash(): AppRoute {
  if (typeof window === "undefined") {
    return "dashboard";
  }

  return window.location.hash === "#administration"
    ? "administration"
    : "dashboard";
}

import { useEffect, useRef, useState } from "react";
import { AdministrationPage } from "../features/administration/AdministrationPage";
import type { EvaluationTemplateService } from "../features/administration/evaluationTemplateService";
import type { HierarchyAdministrationService } from "../features/administration/hierarchyAdministrationService";
import type { ProjectCycleService } from "../features/administration/projectCycleService";
import type { SecurityOperationsService } from "../features/administration/securityOperationsService";
import type { UserAdministrationService } from "../features/administration/userAdministrationService";
import { AuthGate } from "../features/authentication/AuthGate";
import { AuthProvider } from "../features/authentication/AuthProvider";
import type { AuthService } from "../features/authentication/authService";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import type {
  EvaluationAssignmentService
} from "../features/evaluations/evaluationAssignmentService";
import { MarketingPage } from "../features/marketing/MarketingPage";
import type { EvaluationReportService } from "../features/reporting/evaluationReportService";
import { ProfileGate } from "../features/profiles/ProfileGate";
import type { ProfileService } from "../features/profiles/profileService";
import { WorkspaceContextGate } from "../features/workspace/WorkspaceContextGate";
import type { WorkspaceContextService } from "../features/workspace/workspaceContextService";

type AppProps = {
  readonly authService?: AuthService;
  readonly evaluationAssignmentService?: EvaluationAssignmentService;
  readonly evaluationReportService?: EvaluationReportService;
  readonly evaluationTemplateService?: EvaluationTemplateService;
  readonly hierarchyAdministrationService?: HierarchyAdministrationService;
  readonly profileService?: ProfileService;
  readonly projectCycleService?: ProjectCycleService;
  readonly securityOperationsService?: SecurityOperationsService;
  readonly userAdministrationService?: UserAdministrationService;
  readonly workspaceContextService?: WorkspaceContextService;
};

type AppRoute = "marketing" | "login" | "dashboard" | "administration";

export function App({
  authService,
  evaluationAssignmentService,
  evaluationReportService,
  evaluationTemplateService,
  hierarchyAdministrationService,
  profileService,
  projectCycleService,
  securityOperationsService,
  userAdministrationService,
  workspaceContextService
}: AppProps) {
  const route = useHashRoute();

  if (route === "marketing") {
    return <MarketingPage />;
  }

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
                        securityOperationsService={securityOperationsService}
                        userAdministrationService={userAdministrationService}
                        userEmail={userEmail}
                        workspaceContext={workspaceContext}
                      />
                    ) : (
                      <DashboardPage
                        evaluationAssignmentService={evaluationAssignmentService}
                        evaluationReportService={evaluationReportService}
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
  const authCallbackPendingRef = useRef(
    typeof window !== "undefined" && isAuthCallbackLocation(window.location)
  );
  const [route, setRoute] = useState(readRouteFromHash);

  useEffect(() => {
    function handleHashChange() {
      const nextRoute = readRouteFromHash();

      if (authCallbackPendingRef.current && nextRoute === "marketing") {
        authCallbackPendingRef.current = false;
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}#login`
        );
        setRoute("login");
        return;
      }

      setRoute(nextRoute);
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
    return "marketing";
  }

  if (window.location.hash === "#administration") {
    return "administration";
  }

  if (window.location.hash === "#dashboard") {
    return "dashboard";
  }

  if (window.location.hash === "#login") {
    return "login";
  }

  if (isAuthCallbackLocation(window.location)) {
    return "login";
  }

  return "marketing";
}

function isAuthCallbackLocation(location: Location): boolean {
  const hashParameters = new URLSearchParams(location.hash.slice(1));
  const searchParameters = new URLSearchParams(location.search);

  return (
    hashParameters.has("access_token")
    || hashParameters.has("refresh_token")
    || hashParameters.has("error")
    || hashParameters.has("error_code")
    || ["invite", "recovery"].includes(hashParameters.get("type") ?? "")
    || searchParameters.has("code")
    || searchParameters.has("error")
    || searchParameters.has("error_code")
  );
}

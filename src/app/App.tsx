import { AuthGate } from "../features/authentication/AuthGate";
import { AuthProvider } from "../features/authentication/AuthProvider";
import type { AuthService } from "../features/authentication/authService";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ProfileGate } from "../features/profiles/ProfileGate";
import type { ProfileService } from "../features/profiles/profileService";
import { WorkspaceContextGate } from "../features/workspace/WorkspaceContextGate";
import type { WorkspaceContextService } from "../features/workspace/workspaceContextService";

type AppProps = {
  readonly authService?: AuthService;
  readonly profileService?: ProfileService;
  readonly workspaceContextService?: WorkspaceContextService;
};

export function App({
  authService,
  profileService,
  workspaceContextService
}: AppProps) {
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
                  <DashboardPage
                    isSigningOut={isSigningOut}
                    onSignOut={onSignOut}
                    profileDisplayName={profile.display_name}
                    userEmail={userEmail}
                    workspaceContext={workspaceContext}
                  />
                )}
              </WorkspaceContextGate>
            )}
          </ProfileGate>
        )}
      </AuthGate>
    </AuthProvider>
  );
}

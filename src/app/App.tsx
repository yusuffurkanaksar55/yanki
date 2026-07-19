import { AuthGate } from "../features/authentication/AuthGate";
import { AuthProvider } from "../features/authentication/AuthProvider";
import type { AuthService } from "../features/authentication/authService";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ProfileGate } from "../features/profiles/ProfileGate";
import type { ProfileService } from "../features/profiles/profileService";

type AppProps = {
  readonly authService?: AuthService;
  readonly profileService?: ProfileService;
};

export function App({ authService, profileService }: AppProps) {
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
              <DashboardPage
                isSigningOut={isSigningOut}
                onSignOut={onSignOut}
                profileDisplayName={profile.display_name}
                userEmail={userEmail}
              />
            )}
          </ProfileGate>
        )}
      </AuthGate>
    </AuthProvider>
  );
}

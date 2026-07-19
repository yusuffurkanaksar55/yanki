import { AuthGate } from "../features/authentication/AuthGate";
import { AuthProvider } from "../features/authentication/AuthProvider";
import type { AuthService } from "../features/authentication/authService";
import { DashboardPage } from "../features/dashboard/DashboardPage";

type AppProps = {
  readonly authService?: AuthService;
};

export function App({ authService }: AppProps) {
  return (
    <AuthProvider service={authService}>
      <AuthGate>
        {({ userEmail, isSigningOut, onSignOut }) => (
          <DashboardPage
            isSigningOut={isSigningOut}
            onSignOut={onSignOut}
            userEmail={userEmail}
          />
        )}
      </AuthGate>
    </AuthProvider>
  );
}

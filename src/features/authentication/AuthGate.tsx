import type { ReactNode } from "react";
import { tr } from "../../locales/tr/messages";
import { AuthPage } from "./AuthPage";
import { useAuth } from "./AuthContext";
import { PasswordSetupPage } from "./PasswordSetupPage";

type AuthGateRenderProps = {
  readonly userId: string;
  readonly userEmail: string | null;
  readonly isSigningOut: boolean;
  readonly onSignOut: () => Promise<void>;
};

type AuthGateProps = {
  readonly children: (props: AuthGateRenderProps) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const {
    status,
    session,
    userEmail,
    isSubmitting,
    signOut,
    feedback,
    passwordSetupRequired
  } = useAuth();

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-6 text-ink">
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-medium shadow-sm">
          {tr.auth.loading}
        </p>
      </main>
    );
  }

  if (status === "blocked") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-6 text-ink">
        <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">{tr.auth.configuration.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {feedback?.message ?? tr.auth.feedback.genericError}
          </p>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <AuthPage />;
  }

  if (!session?.user.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-6 text-ink">
        <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">{tr.auth.configuration.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {tr.auth.feedback.AUTH_SESSION_READ_FAILED}
          </p>
        </section>
      </main>
    );
  }

  if (passwordSetupRequired) {
    return <PasswordSetupPage />;
  }

  return (
    <>
      {children({
        userId: session.user.id,
        userEmail,
        isSigningOut: isSubmitting,
        onSignOut: signOut
      })}
    </>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { tr } from "../../locales/tr/messages";
import {
  browserProfileService,
  ProfileServiceError,
  type ProfileService,
  type UserProfile
} from "./profileService";

type ProfileGateState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "inactive"; readonly profile: UserProfile }
  | { readonly status: "ready"; readonly profile: UserProfile }
  | { readonly status: "blocked"; readonly message: string };

type ProfileGateRenderProps = {
  readonly profile: UserProfile;
};

type ProfileGateProps = {
  readonly children: (props: ProfileGateRenderProps) => ReactNode;
  readonly isSigningOut?: boolean;
  readonly onSignOut?: () => Promise<void>;
  readonly service?: ProfileService;
  readonly userEmail: string | null;
  readonly userId: string;
};

export function ProfileGate({
  children,
  isSigningOut = false,
  onSignOut,
  service = browserProfileService,
  userEmail,
  userId
}: ProfileGateProps) {
  const [state, setState] = useState<ProfileGateState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      setState({ status: "loading" });

      try {
        const profile = await service.getOwnProfile(userId);

        if (!isActive) {
          return;
        }

        if (!profile) {
          setState({ status: "missing" });
          return;
        }

        if (profile.onboarding_status !== "ACTIVE") {
          setState({ status: "inactive", profile });
          return;
        }

        setState({ status: "ready", profile });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          status: "blocked",
          message: toProfileFeedbackMessage(error)
        });
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [service, userId]);

  if (state.status === "ready") {
    return <>{children({ profile: state.profile })}</>;
  }

  if (state.status === "loading") {
    return (
      <ProfileStatusLayout
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        title={tr.profile.loading.title}
        userEmail={userEmail}
      >
        <p className="text-sm leading-6 text-slate-700">
          {tr.profile.loading.description}
        </p>
      </ProfileStatusLayout>
    );
  }

  if (state.status === "missing") {
    return (
      <ProfileStatusLayout
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        title={tr.profile.missing.title}
        userEmail={userEmail}
      >
        <p className="text-sm leading-6 text-slate-700">
          {tr.profile.missing.description}
        </p>
      </ProfileStatusLayout>
    );
  }

  if (state.status === "inactive") {
    return (
      <ProfileStatusLayout
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        title={tr.profile.inactive.title}
        userEmail={userEmail}
      >
        <p className="text-sm leading-6 text-slate-700">
          {tr.profile.inactive.description}
        </p>
      </ProfileStatusLayout>
    );
  }

  return (
    <ProfileStatusLayout
      isSigningOut={isSigningOut}
      onSignOut={onSignOut}
      title={tr.profile.blocked.title}
      userEmail={userEmail}
    >
      <p className="text-sm leading-6 text-slate-700">{state.message}</p>
    </ProfileStatusLayout>
  );
}

function ProfileStatusLayout({
  children,
  isSigningOut,
  onSignOut,
  title,
  userEmail
}: {
  readonly children: ReactNode;
  readonly isSigningOut: boolean;
  readonly onSignOut?: () => Promise<void>;
  readonly title: string;
  readonly userEmail: string | null;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6 text-ink">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-normal text-pine">
          {tr.app.kicker}
        </p>
        <h1 className="mt-2 text-xl font-semibold">{title}</h1>
        {userEmail ? (
          <p className="mt-3 text-sm text-slate-500">
            {tr.profile.session.signedInAs}{" "}
            <strong className="font-semibold text-slate-700">{userEmail}</strong>
          </p>
        ) : null}
        <div className="mt-5">{children}</div>
        {onSignOut ? (
          <button
            className="mt-6 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={isSigningOut}
            onClick={() => {
              void onSignOut();
            }}
            type="button"
          >
            {isSigningOut
              ? tr.profile.session.signingOut
              : tr.profile.session.signOut}
          </button>
        ) : null}
      </section>
    </main>
  );
}

function toProfileFeedbackMessage(error: unknown): string {
  if (error instanceof ProfileServiceError) {
    return tr.profile.feedback[error.code];
  }

  return tr.profile.feedback.genericError;
}

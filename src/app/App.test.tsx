import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { tr } from "../locales/tr/messages";
import type { AuthService } from "../features/authentication/authService";
import type { Session } from "@supabase/supabase-js";
import type {
  ProfileService,
  UserProfile
} from "../features/profiles/profileService";

describe("App", () => {
  it("renders the Turkish dashboard shell after an authenticated session is available", async () => {
    const profileService = createProfileServiceStub(createProfileStub());

    render(
      <App
        authService={createAuthServiceStub(createSessionStub())}
        profileService={profileService}
      />
    );

    expect(
      await screen.findByRole("heading", { name: tr.dashboard.title })
    ).toBeInTheDocument();
    expect(profileService.getOwnProfile).toHaveBeenCalledWith("user-id");
    expect(
      screen.getByRole("navigation", { name: tr.navigation.primaryAriaLabel })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: tr.dashboard.actions.newCycle })
    ).toBeInTheDocument();
    expect(screen.getByText(tr.dashboard.privacy.threshold)).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByText("Person Example")).toBeInTheDocument();
  });

  it("shows invitation onboarding when an authenticated user has no profile yet", async () => {
    render(
      <App
        authService={createAuthServiceStub(createSessionStub())}
        profileService={createProfileServiceStub(null)}
      />
    );

    expect(
      await screen.findByRole("heading", { name: tr.profile.missing.title })
    ).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
  });

  it("renders the sign-in page when there is no active session", async () => {
    render(<App authService={createAuthServiceStub(null)} />);

    expect(
      await screen.findByRole("heading", { name: tr.auth.pageTitle })
    ).toBeInTheDocument();
  });
});

function createAuthServiceStub(session: Session | null): AuthService {
  return {
    getSession: vi.fn(async () => session),
    onAuthStateChange: vi.fn(() => ({
      unsubscribe: vi.fn()
    })),
    signInWithPassword: vi.fn(async () => undefined),
    requestPasswordReset: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined)
  };
}

function createSessionStub(): Session {
  return {
    user: {
      id: "user-id",
      email: "person@example.com"
    }
  } as Session;
}

function createProfileServiceStub(profile: UserProfile | null): ProfileService {
  return {
    getOwnProfile: vi.fn(async () => profile)
  };
}

function createProfileStub(
  overrides: Partial<UserProfile> = {}
): UserProfile {
  return {
    user_id: "user-id",
    email: "person@example.com",
    display_name: "Person Example",
    onboarding_status: "ACTIVE",
    ...overrides
  };
}

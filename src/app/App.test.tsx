import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { tr } from "../locales/tr/messages";
import type { AuthService } from "../features/authentication/authService";
import type { Session } from "@supabase/supabase-js";

describe("App", () => {
  it("renders the Turkish dashboard shell after an authenticated session is available", async () => {
    render(<App authService={createAuthServiceStub(createSessionStub())} />);

    expect(
      await screen.findByRole("heading", { name: tr.dashboard.title })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: tr.navigation.primaryAriaLabel })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: tr.dashboard.actions.newCycle })
    ).toBeInTheDocument();
    expect(screen.getByText(tr.dashboard.privacy.threshold)).toBeInTheDocument();
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
    getSession: async () => session,
    onAuthStateChange: () => ({
      unsubscribe: () => undefined
    }),
    signInWithPassword: async () => undefined,
    requestPasswordReset: async () => undefined,
    signOut: async () => undefined
  };
}

function createSessionStub(): Session {
  return {
    user: {
      email: "person@example.com"
    }
  } as Session;
}

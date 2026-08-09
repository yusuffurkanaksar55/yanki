import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { tr } from "../../locales/tr/messages";
import { AuthGate } from "./AuthGate";
import { AuthProvider } from "./AuthProvider";
import type { AuthService } from "./authService";

describe("PasswordSetupPage", () => {
  it("requires a strong matching password before opening the workspace", async () => {
    const user = userEvent.setup();
    const service = createAuthServiceStub(createSession(true));

    renderPasswordSetup(service);

    expect(
      await screen.findByRole("heading", {
        name: tr.auth.passwordSetup.title
      })
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(tr.auth.passwordSetup.passwordLabel),
      "weak-password"
    );
    await user.type(
      screen.getByLabelText(tr.auth.passwordSetup.confirmationLabel),
      "weak-password"
    );
    await user.click(
      screen.getByRole("button", {
        name: tr.auth.passwordSetup.submitButton
      })
    );

    expect(
      screen.getByText(tr.auth.passwordSetup.validation.complexity)
    ).toBeInTheDocument();
    expect(service.updatePassword).not.toHaveBeenCalled();
  });

  it("updates the password and releases the authenticated workspace", async () => {
    const user = userEvent.setup();
    const service = createAuthServiceStub(createSession(true));

    renderPasswordSetup(service);

    await user.type(
      await screen.findByLabelText(tr.auth.passwordSetup.passwordLabel),
      "Secure-Password-42!"
    );
    await user.type(
      screen.getByLabelText(tr.auth.passwordSetup.confirmationLabel),
      "Secure-Password-42!"
    );
    await user.click(
      screen.getByRole("button", {
        name: tr.auth.passwordSetup.submitButton
      })
    );

    await waitFor(() => {
      expect(service.updatePassword).toHaveBeenCalledWith(
        "Secure-Password-42!"
      );
    });
    expect(await screen.findByText("Workspace ready")).toBeInTheDocument();
  });

  it("requires password setup for a Supabase recovery event", async () => {
    const session = createSession(false);
    let stateListener:
      | ((event: AuthChangeEvent, nextSession: Session | null) => void)
      | null = null;
    const service: AuthService = {
      ...createAuthServiceStub(session),
      onAuthStateChange: vi.fn((listener) => {
        stateListener = listener;
        return { unsubscribe: vi.fn() };
      })
    };

    renderPasswordSetup(service);

    expect(await screen.findByText("Workspace ready")).toBeInTheDocument();

    act(() => {
      stateListener?.("PASSWORD_RECOVERY", session);
    });

    expect(
      await screen.findByRole("heading", {
        name: tr.auth.passwordSetup.title
      })
    ).toBeInTheDocument();
  });

  it("lets the user leave a password-setup session", async () => {
    const user = userEvent.setup();
    const service = createAuthServiceStub(createSession(true));

    renderPasswordSetup(service);

    await user.click(
      await screen.findByRole("button", {
        name: tr.profile.session.signOut
      })
    );

    expect(service.signOut).toHaveBeenCalledTimes(1);
  });
});

function renderPasswordSetup(service: AuthService) {
  render(
    <AuthProvider service={service}>
      <AuthGate>
        {() => <p>Workspace ready</p>}
      </AuthGate>
    </AuthProvider>
  );
}

function createAuthServiceStub(session: Session): AuthService {
  return {
    getSession: vi.fn(async () => session),
    onAuthStateChange: vi.fn(() => ({ unsubscribe: vi.fn() })),
    requestPasswordReset: vi.fn(async () => undefined),
    signInWithPassword: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    updatePassword: vi.fn(async () => undefined)
  };
}

function createSession(requiresPasswordSetup: boolean): Session {
  return {
    access_token: "test-access-token",
    expires_at: 4_102_444_800,
    expires_in: 3600,
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    user: {
      app_metadata: {},
      aud: "authenticated",
      created_at: "2026-08-09T00:00:00.000Z",
      id: "92222222-2222-4222-8222-222222222222",
      user_metadata: {
        requires_password_setup: requiresPasswordSetup
      }
    }
  } as Session;
}

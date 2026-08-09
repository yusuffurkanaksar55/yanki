import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { tr } from "../../locales/tr/messages";
import { AuthProvider } from "./AuthProvider";
import { AuthPage } from "./AuthPage";
import type { AuthService } from "./authService";

describe("AuthPage", () => {
  it("validates the sign-in form with Turkish messages", async () => {
    const user = userEvent.setup();

    renderAuthPage(createAuthServiceStub());

    await user.click(screen.getByRole("button", { name: tr.auth.form.signInButton }));

    expect(screen.getByText(tr.auth.validation.emailRequired)).toBeInTheDocument();
  });

  it("submits email and password to the auth service", async () => {
    const user = userEvent.setup();
    const service = createAuthServiceStub();

    renderAuthPage(service);

    await user.type(
      screen.getByLabelText(tr.auth.form.emailLabel),
      "person@example.com"
    );
    await user.type(screen.getByLabelText(tr.auth.form.passwordLabel), "secret1");
    await user.click(screen.getByRole("button", { name: tr.auth.form.signInButton }));

    await waitFor(() => {
      expect(service.signInWithPassword).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "secret1"
      });
    });
  });

  it("requests password reset and shows a safe success message", async () => {
    const user = userEvent.setup();
    const service = createAuthServiceStub();

    renderAuthPage(service);

    await user.type(
      screen.getByLabelText(tr.auth.passwordReset.emailLabel),
      "person@example.com"
    );
    await user.click(
      screen.getByRole("button", {
        name: tr.auth.passwordReset.submitButton
      })
    );

    await waitFor(() => {
      expect(service.requestPasswordReset).toHaveBeenCalledWith(
        "person@example.com"
      );
    });
    expect(
      await screen.findByText(tr.auth.feedback.passwordResetRequested)
    ).toBeInTheDocument();
  });
});

function renderAuthPage(service: AuthService) {
  render(
    <AuthProvider service={service}>
      <AuthPage />
    </AuthProvider>
  );
}

function createAuthServiceStub(session: Session | null = null): AuthService {
  return {
    getSession: vi.fn(async () => session),
    onAuthStateChange: vi.fn(() => ({
      unsubscribe: vi.fn()
    })),
    signInWithPassword: vi.fn(async () => undefined),
    requestPasswordReset: vi.fn(async () => undefined),
    updatePassword: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined)
  };
}

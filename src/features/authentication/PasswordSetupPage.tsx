import { useState, type FormEvent } from "react";
import { tr } from "../../locales/tr/messages";
import { useAuth } from "./AuthContext";

export function PasswordSetupPage() {
  const {
    clearFeedback,
    completePasswordSetup,
    feedback,
    isSubmitting,
    signOut
  } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const validationError = validatePasswordSetup(password, confirmation);

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    await completePasswordSetup(password);
  }

  const visibleError = localError
    ?? (feedback?.tone === "error" ? feedback.message : null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6 py-10 text-ink">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-normal text-pine">
          {tr.app.kicker}
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          {tr.auth.passwordSetup.title}
        </h1>

        {visibleError ? (
          <p
            className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-950"
            role="alert"
          >
            {visibleError}
          </p>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            {tr.auth.passwordSetup.passwordLabel}
            <input
              autoComplete="new-password"
              className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
              disabled={isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {tr.auth.passwordSetup.confirmationLabel}
            <input
              autoComplete="new-password"
              className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
              disabled={isSubmitting}
              onChange={(event) => setConfirmation(event.target.value)}
              type="password"
              value={confirmation}
            />
          </label>

          <button
            className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? tr.auth.passwordSetup.submitting
              : tr.auth.passwordSetup.submitButton}
          </button>

          <button
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={isSubmitting}
            onClick={() => void signOut()}
            type="button"
          >
            {tr.profile.session.signOut}
          </button>
        </form>
      </section>
    </main>
  );
}

function validatePasswordSetup(
  password: string,
  confirmation: string
): string | null {
  if (!password) {
    return tr.auth.passwordSetup.validation.required;
  }

  if (password.length < 12) {
    return tr.auth.passwordSetup.validation.minimumLength;
  }

  if (
    !/[a-z]/u.test(password)
    || !/[A-Z]/u.test(password)
    || !/[0-9]/u.test(password)
    || !/[^A-Za-z0-9]/u.test(password)
  ) {
    return tr.auth.passwordSetup.validation.complexity;
  }

  if (password !== confirmation) {
    return tr.auth.passwordSetup.validation.mismatch;
  }

  return null;
}

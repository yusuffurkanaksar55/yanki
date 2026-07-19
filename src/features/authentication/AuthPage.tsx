import { useState, type FormEvent } from "react";
import { tr } from "../../locales/tr/messages";
import { useAuth } from "./AuthContext";

export function AuthPage() {
  const {
    feedback,
    isSubmitting,
    signInWithPassword,
    requestPasswordReset,
    clearFeedback
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const validationError = validateSignIn(email, password);

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    await signInWithPassword({
      email: email.trim(),
      password
    });
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const validationError = validateEmail(resetEmail);

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    await requestPasswordReset(resetEmail.trim());
  }

  const visibleFeedback = localError
    ? { tone: "error" as const, message: localError }
    : feedback;

  return (
    <main className="min-h-screen bg-mist text-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-normal text-pine">
            {tr.app.kicker}
          </p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
            {tr.auth.pageTitle}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-700">
            {tr.auth.pageSummary}
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {tr.auth.securityHighlights.map((item) => (
              <div
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={item.title}
              >
                <dt className="text-sm font-semibold">{item.title}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-4">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{tr.auth.signIn.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {tr.auth.signIn.description}
            </p>

            {visibleFeedback ? (
              <p
                className={`mt-5 rounded-md border px-4 py-3 text-sm leading-6 ${
                  visibleFeedback.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-red-200 bg-red-50 text-red-950"
                }`}
                role="status"
              >
                {visibleFeedback.message}
              </p>
            ) : null}

            <form className="mt-5 grid gap-4" onSubmit={handleSignIn}>
              <label className="grid gap-2 text-sm font-medium">
                {tr.auth.form.emailLabel}
                <input
                  autoComplete="email"
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
                  disabled={isSubmitting}
                  inputMode="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                {tr.auth.form.passwordLabel}
                <input
                  autoComplete="current-password"
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
                  disabled={isSubmitting}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </label>

              <button
                className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? tr.auth.form.submitting
                  : tr.auth.form.signInButton}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{tr.auth.passwordReset.title}</h2>
            <form className="mt-4 grid gap-4" onSubmit={handlePasswordReset}>
              <label className="grid gap-2 text-sm font-medium">
                {tr.auth.passwordReset.emailLabel}
                <input
                  autoComplete="email"
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20"
                  disabled={isSubmitting}
                  inputMode="email"
                  name="resetEmail"
                  onChange={(event) => setResetEmail(event.target.value)}
                  type="email"
                  value={resetEmail}
                />
              </label>
              <button
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pine focus:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={isSubmitting}
                type="submit"
              >
                {tr.auth.passwordReset.submitButton}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

function validateSignIn(email: string, password: string): string | null {
  return validateEmail(email) ?? validatePassword(password);
}

function validateEmail(email: string): string | null {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return tr.auth.validation.emailRequired;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return tr.auth.validation.emailInvalid;
  }

  return null;
}

function validatePassword(password: string): string | null {
  if (!password) {
    return tr.auth.validation.passwordRequired;
  }

  if (password.length < 6) {
    return tr.auth.validation.passwordTooShort;
  }

  return null;
}

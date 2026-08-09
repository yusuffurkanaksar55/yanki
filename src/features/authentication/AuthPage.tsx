import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MessageSquareText
} from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="grid min-h-screen bg-white text-ink lg:grid-cols-[minmax(0,1fr)_34rem]">
      <section className="relative min-h-64 overflow-hidden border-b border-slate-200 lg:min-h-screen lg:border-b-0 lg:border-r">
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          src="/assets/yanki-auth-voices.jpg"
        />
        <div className="relative flex min-h-64 flex-col justify-between p-5 sm:p-8 lg:min-h-screen lg:p-10">
          <div className="flex w-fit items-center gap-3 rounded-md bg-white/95 px-3 py-2 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-pine text-white">
              <MessageSquareText aria-hidden="true" size={20} strokeWidth={1.8} />
            </span>
            <div>
              <p className="font-bold leading-5 text-slate-950">{tr.app.name}</p>
              <p className="text-xs font-medium text-slate-500">{tr.app.kicker}</p>
            </div>
          </div>

          <div className="max-w-lg rounded-md bg-white/95 p-4 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-5">
            <p className="section-kicker">{tr.auth.eyebrow}</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
              {tr.auth.pageTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {tr.auth.pageSummary}
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <p className="section-kicker">{tr.auth.signIn.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            {tr.auth.signIn.title}
          </h2>
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

          <form className="mt-7 grid gap-5" onSubmit={handleSignIn}>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              {tr.auth.form.emailLabel}
              <span className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                  strokeWidth={1.8}
                />
                <input
                  autoComplete="email"
                  className="app-input pl-10"
                  disabled={isSubmitting}
                  inputMode="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              {tr.auth.form.passwordLabel}
              <span className="relative">
                <KeyRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                  strokeWidth={1.8}
                />
                <input
                  autoComplete="current-password"
                  className="app-input px-10"
                  disabled={isSubmitting}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? tr.auth.form.hidePassword : tr.auth.form.showPassword}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-ring"
                  onClick={() => setShowPassword((current) => !current)}
                  title={showPassword ? tr.auth.form.hidePassword : tr.auth.form.showPassword}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" size={18} strokeWidth={1.8} />
                  ) : (
                    <Eye aria-hidden="true" size={18} strokeWidth={1.8} />
                  )}
                </button>
              </span>
            </label>

            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-ring disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? tr.auth.form.submitting
                : tr.auth.form.signInButton}
              {!isSubmitting ? (
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
              ) : null}
            </button>
          </form>

          <div className="mt-9 border-t border-slate-200 pt-7">
            <h3 className="text-base font-bold text-slate-950">
              {tr.auth.passwordReset.title}
            </h3>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              onSubmit={handlePasswordReset}
            >
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                {tr.auth.passwordReset.emailLabel}
                <input
                  autoComplete="email"
                  className="app-input"
                  disabled={isSubmitting}
                  inputMode="email"
                  name="resetEmail"
                  onChange={(event) => setResetEmail(event.target.value)}
                  type="email"
                  value={resetEmail}
                />
              </label>
              <button
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-ring disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={isSubmitting}
                type="submit"
              >
                {tr.auth.passwordReset.submitButton}
              </button>
            </form>
          </div>
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

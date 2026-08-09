import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
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
  const [isResetOpen, setIsResetOpen] = useState(false);

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
    <main className="relative min-h-screen overflow-x-clip bg-slate-950 text-ink">
      <img
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[64%_center]"
        src="/assets/yanki-public-hero.jpg"
      />
      <div className="absolute inset-0 bg-slate-950/10" />

      <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(29rem,33rem)]">
        <section className="relative flex min-h-52 flex-col justify-between p-5 sm:p-8 lg:min-h-screen lg:p-10">
          <a
            aria-label={tr.marketing.navigation.home}
            className="focus-ring flex w-fit items-center gap-3 rounded-md bg-white/95 px-3 py-2 shadow-sm ring-1 ring-slate-200/80 backdrop-blur"
            href="#overview"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-pine text-white">
              <MessageSquareText aria-hidden="true" size={20} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block font-bold leading-5 text-slate-950">{tr.app.name}</span>
              <span className="block text-xs font-medium text-slate-500">{tr.app.kicker}</span>
            </span>
          </a>

          <div className="hidden max-w-md lg:absolute lg:left-10 lg:top-1/2 lg:block lg:-translate-y-1/2">
            <p className="section-kicker">{tr.auth.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-950">
              {tr.auth.pageTitle}
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-700">
              {tr.auth.pageSummary}
            </p>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-13rem)] min-w-0 items-center border-t border-slate-200 bg-white px-5 py-10 shadow-[-16px_0_40px_rgba(15,23,42,0.08)] sm:px-10 lg:min-h-screen lg:border-l lg:border-t-0 lg:px-12">
          <div className="mx-auto w-full max-w-md min-w-0">
            <a
              className="focus-ring inline-flex items-center gap-2 rounded-md text-sm font-semibold text-slate-600 transition hover:text-slate-950"
              href="#overview"
            >
              <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.8} />
              {tr.auth.backToSite}
            </a>

            <p className="section-kicker mt-9">{tr.auth.signIn.eyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">
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
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-800">
                {tr.auth.form.emailLabel}
                <span className="relative min-w-0">
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

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-800">
                {tr.auth.form.passwordLabel}
                <span className="relative min-w-0">
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

            <div className="mt-8 border-t border-slate-200 pt-5">
              <button
                aria-expanded={isResetOpen}
                className="focus-ring flex min-h-11 w-full items-center justify-between rounded-md px-1 text-left text-sm font-bold text-slate-700 transition hover:text-slate-950"
                onClick={() => {
                  clearFeedback();
                  setLocalError(null);
                  setIsResetOpen((current) => !current);
                }}
                type="button"
              >
                {tr.auth.passwordReset.title}
                <ChevronDown
                  aria-hidden="true"
                  className={`transition-transform ${isResetOpen ? "rotate-180" : ""}`}
                  size={18}
                  strokeWidth={1.8}
                />
              </button>

              {isResetOpen ? (
                <form className="mt-3 grid gap-3" onSubmit={handlePasswordReset}>
                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-800">
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
              ) : null}
            </div>
          </div>
        </section>
      </div>
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

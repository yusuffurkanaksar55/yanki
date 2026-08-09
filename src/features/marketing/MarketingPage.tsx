import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Cloud,
  Database,
  KeyRound,
  Menu,
  MessageSquareText,
  Server,
  ShieldCheck,
  X
} from "lucide-react";
import { tr } from "../../locales/tr/messages";

const workflowIcons = [Building2, MessageSquareText, ShieldCheck] as const;

export function MarketingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-ink">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a
            aria-label={tr.marketing.navigation.home}
            className="focus-ring inline-flex items-center gap-3 rounded-md"
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

          <nav
            aria-label={tr.marketing.navigation.ariaLabel}
            className="hidden items-center gap-1 lg:flex"
          >
            <PublicNavLink href="#how-it-works" label={tr.marketing.navigation.howItWorks} />
            <PublicNavLink href="#privacy" label={tr.marketing.navigation.privacy} />
            <PublicNavLink href="#deployment" label={tr.marketing.navigation.deployment} />
            <a
              className="focus-ring ml-3 inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
              href="#login"
            >
              <KeyRound aria-hidden="true" size={17} strokeWidth={1.8} />
              {tr.marketing.navigation.signIn}
            </a>
          </nav>

          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? tr.marketing.navigation.closeMenu : tr.marketing.navigation.openMenu}
            className="icon-button lg:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
          </button>
        </div>

        {isMenuOpen ? (
          <nav
            aria-label={tr.marketing.navigation.mobileAriaLabel}
            className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden"
          >
            <div className="mx-auto grid max-w-7xl gap-1">
              <MobileNavLink href="#how-it-works" label={tr.marketing.navigation.howItWorks} onClick={() => setIsMenuOpen(false)} />
              <MobileNavLink href="#privacy" label={tr.marketing.navigation.privacy} onClick={() => setIsMenuOpen(false)} />
              <MobileNavLink href="#deployment" label={tr.marketing.navigation.deployment} onClick={() => setIsMenuOpen(false)} />
              <a
                className="focus-ring mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-pine px-4 py-3 text-sm font-bold text-white"
                href="#login"
                onClick={() => setIsMenuOpen(false)}
              >
                <KeyRound aria-hidden="true" size={17} strokeWidth={1.8} />
                {tr.marketing.navigation.signIn}
              </a>
            </div>
          </nav>
        ) : null}
      </header>

      <main>
        <section
          className="relative flex min-h-[34rem] items-center overflow-hidden border-b border-slate-200 sm:min-h-[38rem] lg:min-h-[calc(100svh-8rem)]"
          id="overview"
        >
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"
            src="/assets/yanki-public-hero.jpg"
          />
          <div className="absolute inset-0 bg-white/50 sm:bg-transparent" />
          <div className="relative mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
            <div className="max-w-xl">
              <p className="section-kicker">{tr.marketing.hero.eyebrow}</p>
              <h1 className="mt-3 text-5xl font-bold leading-none text-slate-950 sm:text-6xl lg:text-7xl">
                {tr.app.name}
              </h1>
              <p className="mt-5 max-w-lg text-xl font-semibold leading-8 text-slate-900 sm:text-2xl">
                {tr.marketing.hero.title}
              </p>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-700">
                {tr.marketing.hero.summary}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-pine px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                  href="#login"
                >
                  {tr.marketing.hero.primaryAction}
                  <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
                </a>
                <a
                  className="focus-ring inline-flex items-center justify-center rounded-md border border-slate-300 bg-white/90 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-white"
                  href="#how-it-works"
                >
                  {tr.marketing.hero.secondaryAction}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-950 text-white" aria-label={tr.marketing.proof.ariaLabel}>
          <div className="mx-auto grid max-w-7xl divide-y divide-slate-800 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-10">
            {tr.marketing.proof.items.map((item) => (
              <div className="py-6 sm:px-6 sm:first:pl-0 sm:last:pr-0" key={item.title}>
                <p className="font-bold text-white">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="scroll-mt-24 bg-white py-20 sm:py-24" id="how-it-works">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="section-kicker">{tr.marketing.workflow.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
                {tr.marketing.workflow.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{tr.marketing.workflow.summary}</p>
            </div>
            <ol className="mt-12 grid border-y border-slate-200 md:grid-cols-3 md:divide-x md:divide-slate-200">
              {tr.marketing.workflow.steps.map((step, index) => {
                const Icon = workflowIcons[index];

                return (
                  <li className="border-b border-slate-200 py-8 last:border-b-0 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0" key={step.title}>
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-pine">
                        <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
                      </span>
                      <span className="text-sm font-bold text-coral">0{index + 1}</span>
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="scroll-mt-24 bg-emerald-950 py-20 text-white sm:py-24" id="privacy">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-10">
            <div>
              <p className="text-xs font-bold uppercase text-[#f4b4ad]">{tr.marketing.security.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{tr.marketing.security.title}</h2>
              <p className="mt-5 text-base leading-7 text-emerald-100">{tr.marketing.security.summary}</p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-lg border border-emerald-800 bg-emerald-800 sm:grid-cols-2">
              {tr.marketing.security.items.map((item, index) => {
                const Icon = index === 0 ? Database : index === 1 ? ShieldCheck : index === 2 ? KeyRound : CheckCircle2;

                return (
                  <div className="bg-emerald-950 p-6" key={item.title}>
                    <Icon aria-hidden="true" className="text-[#f4b4ad]" size={22} strokeWidth={1.8} />
                    <h3 className="mt-4 font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-100">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="scroll-mt-24 bg-mist py-20 sm:py-24" id="deployment">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
              <div>
                <p className="section-kicker">{tr.marketing.deployment.eyebrow}</p>
                <h2 className="mt-2 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{tr.marketing.deployment.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{tr.marketing.deployment.summary}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DeploymentOption icon={Cloud} {...tr.marketing.deployment.saas} />
                <DeploymentOption icon={Server} {...tr.marketing.deployment.privateServer} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-coral py-16 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold leading-tight">{tr.marketing.cta.title}</h2>
              <p className="mt-3 text-base leading-7 text-red-50">{tr.marketing.cta.summary}</p>
            </div>
            <a
              className="focus-ring inline-flex w-fit items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
              href="#login"
            >
              {tr.marketing.cta.action}
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p className="font-bold text-slate-900">{tr.app.name}</p>
          <p>{tr.marketing.footer}</p>
        </div>
      </footer>
    </div>
  );
}

function PublicNavLink({ href, label }: { readonly href: string; readonly label: string }) {
  return <a className="focus-ring rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950" href={href}>{label}</a>;
}

function MobileNavLink({ href, label, onClick }: { readonly href: string; readonly label: string; readonly onClick: () => void }) {
  return <a className="focus-ring rounded-md px-3 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={href} onClick={onClick}>{label}</a>;
}

function DeploymentOption({
  description,
  icon: Icon,
  title
}: {
  readonly description: string;
  readonly icon: typeof Cloud;
  readonly title: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <Icon aria-hidden="true" className="text-pine" size={24} strokeWidth={1.8} />
      <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

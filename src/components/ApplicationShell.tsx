import type { LucideIcon } from "lucide-react";
import { LogOut, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { tr } from "../locales/tr/messages";

export type ApplicationNavigationItem = {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly isActive?: boolean;
  readonly label: string;
};

type ApplicationShellProps = {
  readonly children: ReactNode;
  readonly isSigningOut?: boolean;
  readonly navigationItems: readonly ApplicationNavigationItem[];
  readonly onSignOut?: () => Promise<void>;
  readonly profileDisplayName?: string | null;
  readonly userEmail?: string | null;
};

export function ApplicationShell({
  children,
  isSigningOut = false,
  navigationItems,
  onSignOut,
  profileDisplayName,
  userEmail
}: ApplicationShellProps) {
  const accountName = profileDisplayName ?? userEmail ?? tr.app.accountFallback;
  const accountDetail = profileDisplayName ? userEmail : null;

  return (
    <div className="min-h-screen bg-mist text-ink lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Brand />

        <nav
          aria-label={tr.navigation.primaryAriaLabel}
          className="flex-1 px-3 py-5"
        >
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <NavigationLink item={item} />
              </li>
            ))}
          </ul>
        </nav>

        <AccountPanel
          accountDetail={accountDetail}
          accountName={accountName}
          isSigningOut={isSigningOut}
          onSignOut={onSignOut}
        />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <Brand compact />
            {onSignOut ? (
              <button
                aria-label={
                  isSigningOut
                    ? tr.dashboard.session.signingOut
                    : tr.dashboard.session.signOut
                }
                className="icon-button"
                disabled={isSigningOut}
                onClick={() => void onSignOut()}
                title={tr.dashboard.session.signOut}
                type="button"
              >
                <LogOut aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
            ) : null}
          </div>
          <nav
            aria-label={tr.navigation.primaryAriaLabel}
            className="border-t border-slate-100 px-2"
          >
            <ul
              className="grid gap-1 py-2"
              style={{
                gridTemplateColumns: `repeat(${navigationItems.length}, minmax(0, 1fr))`
              }}
            >
              {navigationItems.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <NavigationLink compact item={item} />
                </li>
              ))}
            </ul>
          </nav>
        </header>

        {children}
      </div>
    </div>
  );
}

function Brand({ compact = false }: { readonly compact?: boolean }) {
  return (
    <a
      aria-label={tr.app.name}
      className={`flex items-center gap-3 text-ink focus-ring ${
        compact ? "min-h-10" : "border-b border-slate-100 px-5 py-5"
      }`}
      href="#dashboard"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-pine text-white shadow-sm">
        <MessageSquareText aria-hidden="true" size={21} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-5">{tr.app.name}</span>
      </span>
    </a>
  );
}

function NavigationLink({
  compact = false,
  item
}: {
  readonly compact?: boolean;
  readonly item: ApplicationNavigationItem;
}) {
  const Icon = item.icon;

  return (
    <a
      aria-current={item.isActive ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md text-sm font-semibold transition focus-ring ${
        compact
          ? "h-14 min-w-0 flex-col justify-center gap-1 px-1 py-1 text-xs"
          : "px-3 py-2.5"
      } ${
        item.isActive
          ? "bg-emerald-50 text-pine"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
      href={item.href}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      <span className={compact ? "max-w-full text-center leading-4" : undefined}>
        {item.label}
      </span>
    </a>
  );
}

function AccountPanel({
  accountDetail,
  accountName,
  isSigningOut,
  onSignOut
}: {
  readonly accountDetail: string | null | undefined;
  readonly accountName: string;
  readonly isSigningOut: boolean;
  readonly onSignOut?: () => Promise<void>;
}) {
  return (
    <div className="border-t border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-sm font-bold text-coral"
        >
          {accountName.trim().charAt(0).toLocaleUpperCase("tr-TR") || "Y"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {accountName}
          </p>
          {accountDetail ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {accountDetail}
            </p>
          ) : null}
        </div>
        {onSignOut ? (
          <button
            aria-label={
              isSigningOut
                ? tr.dashboard.session.signingOut
                : tr.dashboard.session.signOut
            }
            className="icon-button"
            disabled={isSigningOut}
            onClick={() => void onSignOut()}
            title={tr.dashboard.session.signOut}
            type="button"
          >
            <LogOut aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The shared auth-card language (§7.2's pattern, per the Stitch auth mockups):
 * centered card, brand row, per-screen heading, error/success strips, and the
 * §5.6 registration disclaimer under the card.
 *
 * Dark parity (Phase 16 follow-up): the dot-grid field here was an inline `style`,
 * which no `dark:` variant can override — it is now the same gradient as Tailwind
 * arbitrary values with a dark counterpart, so every screen built on this shell
 * (register, forgot password) follows the app's default dark theme.
 */
import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";

import { Disclaimer } from "@/components/Disclaimer";

export function BrandRow({
  row = SHELLS.register.brandRow,
  badge = SHELLS.register.badge,
  text = SHELLS.register.brandText,
}: {
  row?: string;
  badge?: string;
  text?: string;
} = {}) {
  return (
    <Link to="/" className={row} aria-label="TCSJL home">
      <span className={badge}>[TCSJL]</span>
      <span className={text}>TCSJL</span>
    </Link>
  );
}

/** rose-50 error strip; the message text is the caller's responsibility. */
export function ErrorStrip({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
    >
      <span
        className="material-symbols-outlined text-rose-600 text-[18px] shrink-0 dark:text-rose-400"
        data-icon="error"
      >
        error
      </span>
      <span>{message}</span>
    </p>
  );
}

/** emerald-50 success strip. */
export function SuccessStrip({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"
    >
      <span
        className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 dark:text-emerald-400"
        data-icon="check_circle"
      >
        check_circle
      </span>
      <span>{message}</span>
    </p>
  );
}

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Renders below the card instead of the registration disclaimer. */
  footerVariant?: "registration" | "footer";
  skin?: "skin-v1" | "skin-v2";
  /** Which composition's card this screen carries. */
  shell?: keyof typeof SHELLS;
}

/**
 * Each auth composition draws its own card — same skeleton, different width,
 * padding, brand badge and heading rhythm — so the shell is a named variant
 * rather than one set of classes every screen has to accept. `register` is the
 * registration composition's shell and the default; the others are added as the
 * screens that need them are ported.
 */
const SHELLS = {
  register: {
    main: "flex-grow flex items-center justify-center px-4 py-10 sm:px-6",
    card: "w-full max-w-[460px] bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-9 relative transition-all dark:bg-slate-900 dark:border-slate-800",
    brandRow: "flex items-center gap-2.5",
    badge: "bg-indigo-600 text-white font-bold text-sm px-2.5 py-1 rounded-lg tracking-tight select-none shadow-sm",
    brandText: "font-headline text-slate-900 font-bold text-lg tracking-tight dark:text-slate-100",
    heading: "mt-6 mb-6",
    title: "text-[28px] font-bold text-slate-900 tracking-tight leading-tight dark:text-slate-100",
    subtitle: "text-slate-500 text-sm mt-1 leading-relaxed dark:text-slate-400",
  },
  forgot: {
    main: "flex-grow flex items-center justify-center px-4 py-10 relative z-10",
    card: "max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-10 transition-all duration-200 dark:bg-slate-900 dark:border-slate-800",
    brandRow: "flex items-center gap-2.5 mb-2",
    badge: "bg-indigo-600 px-2.5 py-1 rounded-md text-xs font-bold text-white tracking-wide shadow-xs",
    brandText: "text-slate-900 font-bold text-base tracking-tight font-headline dark:text-slate-100",
    heading: "",
    title: "text-[28px] font-bold text-slate-900 tracking-tight mt-6 mb-2 leading-tight font-headline dark:text-slate-100",
    subtitle: "text-sm text-slate-500 leading-relaxed mb-6 dark:text-slate-400",
  },
} as const;

export function AuthCard({
  title,
  subtitle,
  children,
  footerVariant = "registration",
  skin = "skin-v1",
  shell = "register",
}: AuthCardProps) {
  const styles = SHELLS[shell];
  return (
    <div
      className={`${skin} flex min-h-screen flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-body text-slate-800 dark:text-slate-200 antialiased bg-[#F8FAFC] dark:bg-slate-950 bg-[radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] dark:bg-[radial-gradient(#334155_0.75px,transparent_0.75px)] [background-size:16px_16px]`}
    >
      <main className={styles.main}>
        <div className={styles.card}>
          <BrandRow row={styles.brandRow} badge={styles.badge} text={styles.brandText} />
          <div className={styles.heading}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          <div className="space-y-4">{children}</div>
        </div>
      </main>
      <footer className="w-full pb-6 px-4">
        <div className="mx-auto max-w-xl text-center">
          <Disclaimer variant={footerVariant} />
        </div>
      </footer>
    </div>
  );
}

/** Small labeled field wrapper keeping the six screens' markup uniform. */
export function AuthField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactElement;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {hint !== undefined && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

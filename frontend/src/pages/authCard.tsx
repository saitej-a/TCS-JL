/**
 * The shared auth-card language (§7.2's pattern, per the Stitch auth mockups):
 * centered card, brand row, per-screen heading, error/success strips, and the
 * §5.6 registration disclaimer under the card.
 */
import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";

import { Disclaimer } from "@/components/Disclaimer";

export function BrandRow() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="TCS Joining Tracker home">
      <span className="bg-indigo-600 text-white font-bold text-sm px-2.5 py-1 rounded-lg tracking-tight select-none shadow-sm">
        [TJT]
      </span>
      <span className="font-headline text-slate-900 font-bold text-lg tracking-tight">
        TCS Joining Tracker
      </span>
    </Link>
  );
}

/** rose-50 error strip; the message text is the caller's responsibility. */
export function ErrorStrip({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 shadow-sm"
    >
      <span className="material-symbols-outlined text-rose-600 text-[18px] shrink-0" data-icon="error">
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
      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm"
    >
      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0" data-icon="check_circle">
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
}

export function AuthCard({ title, subtitle, children, footerVariant = "registration", skin = "skin-v1" }: AuthCardProps) {
  return (
    <div
      className={`${skin} flex min-h-screen flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-body text-slate-800 antialiased`}
      style={{
        backgroundColor: "#F8FAFC",
        backgroundImage: "radial-gradient(#CBD5E1 0.75px, transparent 0.75px)",
        backgroundSize: "16px 16px",
      }}
    >
      <main className="flex-grow flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-9 relative transition-all">
          <BrandRow />
          <div className="mt-6 mb-6">
            <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-slate-500 text-sm mt-1 leading-relaxed">{subtitle}</p>
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

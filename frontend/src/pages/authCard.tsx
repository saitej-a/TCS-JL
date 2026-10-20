/**
 * Shared architectural shells and status strips for the authentication and
 * verification flow (Phase 4 Anti-Slop Overhaul):
 * - `AuthSplitFrame`: 2-column architectural frame for `/login` and `/register`,
 *   pairing a live anonymized candidate timeline specimen (`data-ui`) on the
 *   left with the credential form on the right. Zero radial dot-grids, zero
 *   blur-3xl orbs, zero `data-awaiting` placeholders.
 * - `AuthCard`: Clean single-column recovery card for `/forgot-password` and
 *   `/reset-password/:token`.
 * - `VerificationStepBar`: Deterministic 3-step progress bar shared across
 *   `/verify-email-pending` and `/verify-email/:token`.
 */
import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Check, CheckCircle2, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { Disclaimer, type DisclaimerVariant } from "@/components/Disclaimer";
import { ANONYMOUS_SENTINEL, IdentityPill } from "@/components/IdentityPill";

export function BrandRow({
  row = "inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
  mark = "h-9 w-9 shrink-0",
  showLabel = true,
}: {
  row?: string;
  mark?: string;
  showLabel?: boolean;
} = {}) {
  return (
    <Link to="/" className={row} aria-label="TCSJL home">
      <BrandMark className={mark} />
      {showLabel && (
        <span className="font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Recruitment Status
        </span>
      )}
    </Link>
  );
}

/** Flat 1px rose-200 alert strip. */
export function ErrorStrip({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200"
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}

/** Flat 1px emerald-200 status strip. */
export function SuccessStrip({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200"
    >
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}

const SPECIMEN_MILESTONES = [
  {
    stage: "Offer letter accepted",
    date: "12 Jan 2025",
    delta: "Day 0",
    state: "done" as const,
  },
  {
    stage: "Readiness survey (JRS)",
    date: "05 Feb 2025",
    delta: "+24d",
    state: "done" as const,
  },
  {
    stage: "Joining letter received",
    date: "24 Feb 2025",
    delta: "+19d",
    state: "current" as const,
  },
] as const;

/**
 * Live anonymized candidate timeline specimen shown in the left column of
 * `/login` and `/register` so prospective and returning members immediately see
 * the exact privacy-preserving ledger record the workspace maintains.
 */
export function CandidateTimelineSpecimen() {
  return (
    <div
      data-ui="true"
      className="mt-7 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <IdentityPill
          compact
          author={{
            id: "specimen",
            display_name: ANONYMOUS_SENTINEL,
            batch: "2025",
            hiring_type: "Digital",
            region: "Hyderabad",
          }}
        />
        <span className="shrink-0 rounded bg-brand-50 px-2 py-0.5 font-mono-code text-[11px] font-medium text-brand-700 tabular-nums dark:bg-brand-950/60 dark:text-brand-300">
          43d total
        </span>
      </div>

      <ol className="mt-3.5 space-y-2.5" aria-label="Sample candidate recruitment ledger">
        {SPECIMEN_MILESTONES.map((item) => (
          <li key={item.stage} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                aria-hidden="true"
                className={
                  item.state === "current"
                    ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white dark:bg-brand-500 dark:text-slate-950"
                    : "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                }
              >
                <Check className="h-2.5 w-2.5 stroke-[2.5]" />
              </span>
              <span
                className={
                  item.state === "current"
                    ? "truncate font-semibold text-slate-900 dark:text-slate-100"
                    : "truncate font-medium text-slate-700 dark:text-slate-300"
                }
              >
                {item.stage}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 font-mono-code text-[11px] tabular-nums">
              <span className="text-slate-500 dark:text-slate-400">{item.date}</span>
              <span className="w-10 text-right font-medium text-brand-700 dark:text-brand-300">
                {item.delta}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>Email &amp; full name stay private</span>
        <span className="font-mono-code tabular-nums text-slate-600 dark:text-slate-300">
          k ≥ 5 cohort rule
        </span>
      </div>
    </div>
  );
}

interface AuthSplitFrameProps {
  title: string;
  subtitle: string;
  leftHeadline?: string;
  leftCopy?: string;
  children: ReactNode;
  footerNote?: ReactNode;
  footerVariant?: DisclaimerVariant;
}

export function AuthSplitFrame({
  title,
  subtitle,
  leftHeadline = "Keep your onboarding journey transparent and on track.",
  leftCopy = "Log offer acceptance, readiness surveys, and joining letters alongside verified batch cohorts without exposing your personal identity.",
  children,
  footerNote,
  footerVariant = "registration",
}: AuthSplitFrameProps) {
  return (
    <div className="flex min-h-[100svh] flex-col justify-between bg-slate-50 font-body text-slate-900 antialiased selection:bg-brand-100 selection:text-brand-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 md:py-14">
        <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white md:flex-row dark:border-slate-800 dark:bg-slate-900">
          {/* Left Column: Candidate Timeline Specimen */}
          <div className="flex flex-col justify-between border-b border-slate-200 bg-slate-100/75 p-7 sm:p-9 md:w-[44%] md:border-b-0 md:border-r dark:border-slate-800 dark:bg-slate-950/60">
            <div>
              <BrandRow />

              <div className="mt-7 space-y-2.5">
                <h2 className="font-display text-xl font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
                  {leftHeadline}
                </h2>
                <p className="text-xs leading-relaxed text-slate-600 sm:text-[13px] dark:text-slate-300">
                  {leftCopy}
                </p>
              </div>

              <CandidateTimelineSpecimen />
            </div>

            <div className="mt-7 flex items-center gap-2 border-t border-slate-200/80 pt-4 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400"
                aria-hidden="true"
              />
              <span>
                Independent and community-run. Read our{" "}
                <Link
                  to="/privacy"
                  className="underline underline-offset-2 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
                >
                  privacy policy
                </Link>
                .
              </span>
            </div>
          </div>

          {/* Right Column: Credential Form */}
          <div className="flex flex-col justify-between bg-white p-7 sm:p-10 md:w-[56%] dark:bg-slate-900">
            <div>
              <header className="mb-6">
                <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[26px] dark:text-slate-100">
                  {title}
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {subtitle}
                </p>
              </header>

              {children}
            </div>

            {footerNote !== undefined && <div className="mt-6">{footerNote}</div>}
          </div>
        </div>
      </main>

      <footer className="w-full px-6 pb-6 pt-2">
        <div className="mx-auto max-w-xl text-center">
          <Disclaimer variant={footerVariant} />
        </div>
      </footer>
    </div>
  );
}

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  breadcrumb?: ReactNode;
  footerVariant?: DisclaimerVariant;
  shell?: "register" | "forgot" | "reset";
}

/**
 * Clean single-column recovery card for `/forgot-password` and `/reset-password/:token`.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  breadcrumb,
  footerVariant = "registration",
}: AuthCardProps) {
  return (
    <div className="flex min-h-[100svh] flex-col justify-between bg-slate-50 font-body text-slate-800 antialiased selection:bg-brand-100 selection:text-brand-900 dark:bg-slate-950 dark:text-slate-200">
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 sm:p-9 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <BrandRow />
            {breadcrumb}
          </div>
          <header className="mt-6 mb-6">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          </header>
          <div className="space-y-4">{children}</div>
        </div>
      </main>
      <footer className="w-full px-4 pb-6">
        <div className="mx-auto max-w-xl text-center">
          <Disclaimer variant={footerVariant} />
        </div>
      </footer>
    </div>
  );
}

/**
 * Shared 3-step horizontal onboarding progress strip used by
 * `/verify-email-pending` and `/verify-email/:token`.
 */
export function VerificationStepBar() {
  return (
    <nav
      aria-label="Account setup progress"
      className="mb-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <ol className="flex items-center justify-between text-xs">
        <li className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300"
          >
            <Check className="h-3 w-3 stroke-[2.5]" />
          </span>
          <span className="font-medium">1. Register</span>
        </li>
        <li aria-hidden="true" className="mx-3 h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <li className="flex items-center gap-2" aria-current="step">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 font-mono-code text-[11px] font-semibold text-white tabular-nums dark:bg-brand-500 dark:text-slate-950"
          >
            2
          </span>
          <span className="font-semibold text-brand-700 dark:text-brand-300">Verify email</span>
        </li>
        <li aria-hidden="true" className="mx-3 h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <li className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-mono-code text-[11px] font-medium text-slate-500 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          >
            3
          </span>
          <span>Set up your profile</span>
        </li>
      </ol>
    </nav>
  );
}

/** Small labeled field wrapper keeping the auth screens' markup uniform. */
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
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      {children}
      {hint !== undefined && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

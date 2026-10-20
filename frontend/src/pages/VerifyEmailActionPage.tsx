/**
 * The §7.2.4 verification action screen (Phase 4 Anti-Slop Overhaul):
 * Deterministic verification state machine (`verifying` -> `success` | `failure`)
 * sharing `VerificationStepBar` with `/verify-email-pending`.
 *
 * Behavior contracts preserved:
 * - Calls `verifyEmail(token)` once per token;
 * - Success routes to `/login` (verification does not establish a session);
 * - Failure echoes the attempted token in a wrapping-safe pill
 *   (`data-testid="attempted-token"`, `[overflow-wrap:anywhere]`) and links to
 *   `/verify-email-pending`.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Clock } from "lucide-react";

import { verifyEmail } from "@/api/auth";
import { Disclaimer } from "@/components/Disclaimer";
import { BrandRow, VerificationStepBar } from "@/pages/authCard";

type Outcome = "verifying" | "success" | "failure";

export function VerifyEmailActionPage() {
  const { token = "" } = useParams();
  const [outcome, setOutcome] = useState<Outcome>("verifying");
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || token === "") return;
    attempted.current = true;
    verifyEmail(token)
      .then(() => setOutcome("success"))
      .catch(() => setOutcome("failure"));
  }, [token]);

  return (
    <div className="flex min-h-[100svh] flex-col justify-between bg-slate-50 font-body text-slate-800 antialiased selection:bg-brand-100 selection:text-brand-900 dark:bg-slate-950 dark:text-slate-200">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <VerificationStepBar />

        <div className="w-full rounded-xl border border-slate-200 bg-white p-7 sm:p-9 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
            <BrandRow />
            {outcome === "verifying" && (
              <span className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Checking token</span>
              </span>
            )}
            {outcome === "success" && (
              <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Verified</span>
              </span>
            )}
            {outcome === "failure" && (
              <span className="inline-flex items-center gap-1.5 rounded bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Link expired or invalid</span>
              </span>
            )}
          </div>

          {outcome === "verifying" && (
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Verifying your email
              </h1>
              <p
                className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
                role="status"
              >
                One moment while we confirm your verification link.
              </p>
            </div>
          )}

          {outcome === "success" && (
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Your email is verified
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Thanks — your account is active. Sign in to finish your profile so the timeline and
                community can be personalised for you.
              </p>

              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Account status</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                    <span>Active &amp; ready for onboarding</span>
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  to="/login"
                  className="btn-brand-primary flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <div className="pt-1 text-center">
                  <Link
                    to="/dashboard"
                    className="inline-flex min-h-[44px] items-center gap-1 rounded px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
                  >
                    <span>Go to the dashboard instead</span>
                  </Link>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Verification links are single-use and time-limited for your account security.</span>
              </div>
            </div>
          )}

          {outcome === "failure" && (
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                We could not verify that link
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                This verification link is invalid or has expired. Request a new one and we will email
                you another.
              </p>

              {token !== "" && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-slate-500 dark:text-slate-400">
                      Attempted link token
                    </span>
                    <span
                      className="max-w-full min-w-0 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono-code text-xs font-semibold text-slate-800 [overflow-wrap:anywhere] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      data-testid="attempted-token"
                    >
                      {token}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <Link
                  to="/verify-email-pending"
                  className="btn-brand-primary flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  <span>Request a new email</span>
                </Link>
                <div className="pt-1 text-center">
                  <Link
                    to="/login"
                    className="inline-flex min-h-[44px] items-center gap-1 rounded px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:text-slate-300 dark:hover:text-brand-300"
                  >
                    <span>Back to sign in</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full px-4 pb-6">
        <div className="mx-auto max-w-xl text-center">
          <Disclaimer variant="registration" />
        </div>
      </footer>
    </div>
  );
}

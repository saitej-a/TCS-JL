/**
 * The §7.2.4 verification action screen, built to the
 * `email_verification_actions_verify_email_token` composition: its own `<main>`
 * with the 3-step indicator, then a `max-w-lg` card carrying the icon disc,
 * heading, copy, status panel, primary CTA and the security note. Visiting
 * /verify-email/:token calls the verify endpoint once and renders exactly one of
 * the three outcomes.
 *
 * Divergences recorded (RECONCILIATION-16.md): the composition shows only the
 * success state and its CTA targets onboarding — the real flow routes through
 * sign-in, because verification does not authenticate. Its masked
 * "a***@example.com" identity row is not copied: this route has no session to read
 * an address from, so the panel states the account status alone.
 *
 * Dark parity (Phase 16 follow-up): the ambient dot-grid backdrop was an inline
 * `style`, which no `dark:` variant can override — it is now the same gradient as
 * Tailwind arbitrary values with a dark counterpart, and the step strip, card,
 * outcome discs and status panels each carry their `dark:` pair.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { verifyEmail } from "@/api/auth";
import { Disclaimer } from "@/components/Disclaimer";
import { SmallCheckGlyph } from "@/pages/authGlyphs";

type Outcome = "verifying" | "success" | "failure";

/** The composition's 3-step indicator. */
function StepStrip() {
  return (
    <div className="w-full max-w-2xl mb-8 bg-white border border-slate-200/90 rounded-lg p-3 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 px-3 dark:text-slate-400">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold dark:text-emerald-400">
          <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <SmallCheckGlyph className="w-3 h-3" />
          </span>
          <span>1. Register</span>
        </div>
        <div aria-hidden="true" className="h-0.5 flex-1 bg-brand-200 mx-4 dark:bg-brand-900" />
        <div
          className="flex items-center gap-2 text-brand-700 font-semibold dark:text-brand-300"
          aria-current="step"
        >
          <span className="w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center text-[11px] font-bold">
            2
          </span>
          <span>Verify email</span>
        </div>
        <div aria-hidden="true" className="h-0.5 flex-1 bg-slate-200 mx-4 dark:bg-slate-700" />
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] dark:bg-slate-800 dark:text-slate-500">
            3
          </span>
          <span>Set up your profile</span>
        </div>
      </div>
    </div>
  );
}

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
    <div className="skin-v2 flex min-h-screen flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-body text-slate-800 dark:text-slate-200 antialiased bg-[#F8FAFC] dark:bg-slate-950 bg-[radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] dark:bg-[radial-gradient(#334155_0.75px,transparent_0.75px)] [background-size:16px_16px]">
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 flex flex-col items-center justify-center">
        <StepStrip />

        <div className="w-full max-w-lg mx-auto bg-white rounded-xl border border-slate-200 shadow-subtle p-8 md:p-10 flex flex-col items-center text-center dark:bg-slate-900 dark:border-slate-800">
          {outcome === "verifying" && (
            <>
              <div className="w-16 h-16 rounded-full bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-400 shadow-sm mb-6 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500">
                <span className="material-symbols-outlined text-[32px]" data-icon="hourglass_top">
                  hourglass_top
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-3 dark:text-slate-100">
                Verifying your email
              </h1>
              <p
                className="text-slate-600 text-sm leading-relaxed mb-6 max-w-md dark:text-slate-300"
                role="status"
              >
                One moment while we confirm your verification link.
              </p>
            </>
          )}

          {outcome === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm mb-6 dark:bg-emerald-950/60 dark:border-emerald-900/60 dark:text-emerald-300">
                <span className="material-symbols-outlined text-[32px]" data-icon="check_circle">
                  check_circle
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-3 dark:text-slate-100">
                Your email is verified
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 max-w-md dark:text-slate-300">
                Thanks — your account is active. Sign in to finish your profile so the timeline and
                community can be personalised for you.
              </p>

              {/* The composition's status panel. Its identity row is dropped: this
                  route has no session, so there is no address to show. */}
              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 mb-6 text-left dark:bg-slate-800/60 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500 font-normal dark:text-slate-400">Account status</span>
                  <span className="text-emerald-700 font-medium inline-flex items-center gap-1 dark:text-emerald-400">
                    <SmallCheckGlyph className="w-3 h-3" /> Active &amp; ready for onboarding
                  </span>
                </div>
              </div>

              <div className="w-full space-y-3">
                <Link
                  to="/login"
                  className="btn-brand-primary w-full h-11 min-h-[44px] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  <span>Sign in</span>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <div className="text-center pt-1">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700 transition-colors py-1 px-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 min-h-[44px] dark:text-slate-300 dark:hover:text-brand-300"
                  >
                    <span>Go to the dashboard instead</span>
                  </Link>
                </div>
              </div>

              <div className="w-full mt-6 pt-4 border-t border-slate-100 flex items-center justify-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                <span>Verification links are single-use and time-limited for your account security.</span>
              </div>
            </>
          )}

          {outcome === "failure" && (
            <>
              <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-100 flex items-center justify-center text-rose-600 shadow-sm mb-6 dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-300">
                <span className="material-symbols-outlined text-[32px]" data-icon="error">
                  error
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-3 dark:text-slate-100">
                We could not verify that link
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 max-w-md dark:text-slate-300">
                This verification link is invalid or has expired. Request a new one and we will email
                you another.
              </p>

              {/* Wrapping-safe token echo (9.5.1 D-7): the identifier the reader
                  clicked, never allowed to break layout. */}
              {token !== "" && (
                <div className="w-full bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 mb-6 text-left dark:bg-slate-800/60 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-normal dark:text-slate-400">
                      Attempted link token
                    </span>
                    <span
                      className="font-mono-code text-slate-800 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 max-w-full min-w-0 [overflow-wrap:anywhere] dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
                      data-testid="attempted-token"
                    >
                      {token}
                    </span>
                  </div>
                </div>
              )}

              <div className="w-full space-y-3">
                <Link
                  to="/verify-email-pending"
                  className="btn-brand-primary w-full h-11 min-h-[44px] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  <span>Request a new email</span>
                </Link>
                <div className="text-center pt-1">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700 transition-colors py-1 px-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 min-h-[44px] dark:text-slate-300 dark:hover:text-brand-300"
                  >
                    <span>Back to sign in</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="w-full pb-6 px-4">
        <div className="mx-auto max-w-xl text-center">
          <Disclaimer variant="registration" />
        </div>
      </footer>
    </div>
  );
}

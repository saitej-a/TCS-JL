/**
 * The §7.2.3 "check your inbox" screen, built to the
 * `verification_pending_verify_email_pending` composition: this mockup does not
 * use the shared auth card — it is its own `<main>` holding the 3-step strip
 * (1. Register ✓ → 2. Verify email → 3. Set up your profile) and a centered
 * `max-w-xl` card with the mail disc, inbox copy, the hint badge, the action row
 * with its cooldown arc, and the inline success/error banners.
 *
 * The composition's masked "a***@example.com" pill is rendered, but with the real
 * address the caller passed in router state ({ email }), never a masked stand-in:
 * the user has to be able to see and correct the address the link went to. When
 * this route is opened directly with no known address (a bookmark, a reload),
 * there is nothing truthful to put in the pill, so the labeled editable field
 * (9.5.1 D-11 — never a window.prompt) takes its place.
 *
 * Dark parity (Phase 16 follow-up): the ambient dot-grid backdrop was an inline
 * `style`, which no `dark:` variant can override — it is now the same gradient as
 * Tailwind arbitrary values with a dark counterpart, and the step strip, card,
 * banners and mail disc each carry their `dark:` pair.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { resendVerification } from "@/api/auth";
import { Disclaimer } from "@/components/Disclaimer";
import { Input } from "@/components/Input";
import { SmallCheckGlyph } from "@/pages/authGlyphs";

const RESEND_SECONDS = 60;

/** The composition's two feedback banners, as (headline, detail) pairs. */
const RATE_LIMITED_COPY = {
  title: "Too many requests. Please wait a moment before trying again.",
  detail: "Anti-spam safeguards limit dispatch frequency to protect your candidate identifier.",
};
const SEND_FAILED_COPY = {
  title: "We could not send that email.",
  detail: "Please check your connection and try again.",
};

/** The composition's 3-step progress strip. */
function StepStrip() {
  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-lg p-3 shadow-xs dark:bg-slate-900 dark:border-slate-800">
      <ol className="flex items-center justify-between text-xs">
        <li className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60">
            <SmallCheckGlyph className="w-3 h-3" />
          </span>
          <span className="font-medium text-slate-600 dark:text-slate-400">1. Register</span>
        </li>
        <li aria-hidden="true" className="h-px w-8 bg-slate-200 flex-1 mx-3 dark:bg-slate-700" />
        <li className="flex items-center gap-2" aria-current="step">
          <span className="w-5 h-5 rounded-full bg-brand-700 text-white font-semibold flex items-center justify-center text-[11px] shadow-xs">
            2
          </span>
          <span className="font-semibold text-brand-700 dark:text-brand-300">Verify email</span>
        </li>
        <li aria-hidden="true" className="h-px w-8 bg-slate-200 flex-1 mx-3 dark:bg-slate-700" />
        <li className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center text-[11px] dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700">
            3
          </span>
          <span className="font-normal text-slate-400 dark:text-slate-500">Set up your profile</span>
        </li>
      </ol>
    </div>
  );
}

/**
 * The composition's cooldown arc: a stroked track with a partial brand-600
 * progress path, rotated -90° so it starts at twelve o'clock. The mockup paints a
 * fixed 70% arc; this paints the share of the wait that has actually elapsed.
 */
function CooldownArc({ remaining }: { remaining: number }) {
  const elapsed = (RESEND_SECONDS - remaining) / RESEND_SECONDS;
  return (
    <span className="relative w-4 h-4 shrink-0" aria-hidden="true">
      <svg className="w-4 h-4 -rotate-90" viewBox="0 0 36 36">
        <path
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="3.5"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="stroke-brand-600"
          strokeDasharray={`${Math.round(elapsed * 100)}, 100`}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
    </span>
  );
}

export function VerifyEmailPendingPage() {
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(stateEmail);
  /** Only offer the correction field when the caller did not tell us the address. */
  const [editing, setEditing] = useState(stateEmail === "");
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    if (sending || cooldown > 0) return;
    const target = email.trim();
    if (target === "") return;
    setSending(true);
    setError(null);
    try {
      await resendVerification(target);
      setResent(true);
      setCooldown(RESEND_SECONDS);
    } catch (error) {
      const apiError = error as { code?: string };
      if (apiError?.code === "RATE_LIMITED") {
        setError(RATE_LIMITED_COPY);
        setCooldown(30);
      } else {
        setError(SEND_FAILED_COPY);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="skin-v2 flex min-h-screen flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-body text-slate-800 dark:text-slate-200 antialiased bg-[#F8FAFC] dark:bg-slate-950 bg-[radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] dark:bg-[radial-gradient(#334155_0.75px,transparent_0.75px)] [background-size:16px_16px]">
      <main className="flex-1 flex flex-col items-center justify-center p-6 my-8">
        <div className="w-full max-w-xl">
          <StepStrip />

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center relative overflow-hidden dark:bg-slate-900 dark:border-slate-800">
            <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 border-2 border-brand-200/60 shadow-inner dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-900/60">
              {/* The composition's line-art mail anchor. */}
              <svg
                className="w-12 h-12 stroke-brand-700 dark:stroke-brand-300"
                viewBox="0 0 48 48"
                fill="none"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="8" y="12" width="32" height="24" rx="3" />
                <path d="m10 15 14 11 14-11" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2 dark:text-slate-100">
              Check your inbox
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto mb-6 dark:text-slate-300">
              {email.trim() === "" ? (
                "We sent a verification link to your inbox. Click it to activate your account."
              ) : (
                <>
                  We sent a verification link to{" "}
                  <span className="code-text font-semibold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded text-xs dark:text-brand-300 dark:bg-brand-950/60 dark:border-brand-900/60">
                    {email}
                  </span>
                  . Click it to activate your account.
                </>
              )}
            </p>

            <div className="mb-6 flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 py-2 px-3 rounded-lg max-w-sm mx-auto dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-700">
              <span
                className="material-symbols-outlined text-slate-400 text-sm dark:text-slate-500"
                data-icon="info"
              >
                info
              </span>
              <span>If you don't see it within a couple minutes, inspect your spam or junk folder.</span>
            </div>

            {editing && (
              <div className="max-w-md mx-auto mb-6 text-left">
                <label
                  htmlFor="verify-email-field"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Registered email address
                </label>
                <Input
                  id="verify-email-field"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="border-t border-slate-100 pt-6 mb-6 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={sending || email.trim() === "" || cooldown > 0}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-medium text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-xs focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    refresh
                  </span>
                  <span>{sending ? "Sending…" : "Resend verification email"}</span>
                </button>
                {cooldown > 0 && (
                  <button
                    type="button"
                    disabled
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 font-medium text-sm inline-flex items-center justify-center gap-2.5 cursor-not-allowed select-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
                  >
                    <CooldownArc remaining={cooldown} />
                    <span className="text-xs">
                      Resend available in{" "}
                      <span className="code-text font-semibold text-slate-600 dark:text-slate-300">
                        {cooldown}s
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2.5 max-w-md mx-auto mb-6 text-left">
              {resent && (
                <div
                  role="status"
                  className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs dark:bg-emerald-950/50 dark:border-emerald-900/60 dark:text-emerald-300"
                >
                  <span
                    className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 dark:text-emerald-400"
                    data-icon="check_circle"
                  >
                    check_circle
                  </span>
                  <div>
                    <p className="font-medium text-emerald-900 dark:text-emerald-200">
                      A fresh link is on its way.
                    </p>
                    <p className="text-emerald-700 mt-0.5 dark:text-emerald-400">
                      Please check your inbox again shortly. Verification links expire after 24 hours.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-300"
                >
                  <span
                    className="material-symbols-outlined text-rose-600 text-[18px] shrink-0 dark:text-rose-400"
                    data-icon="warning"
                  >
                    warning
                  </span>
                  <div>
                    <p className="font-medium text-rose-900 dark:text-rose-200">{error.title}</p>
                    <p className="text-rose-700 mt-0.5 dark:text-rose-300">{error.detail}</p>
                  </div>
                </div>
              )}
            </div>

            {/* The composition's secondary ghost link and support line. */}
            <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
              <p className="text-xs text-slate-500 mb-2 dark:text-slate-400">
                Wrong address? Register again to change it.
              </p>
              {stateEmail !== "" && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mb-3 block mx-auto text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Use a different address
                </button>
              )}
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors focus-ring rounded py-1 px-2.5 hover:bg-brand-50 dark:text-brand-300 dark:hover:text-brand-200 dark:hover:bg-brand-950/60"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Use a different email address</span>
              </Link>
            </div>
          </div>

          {/* The composition's trust note. Its copy claimed "Zero-knowledge
              verification • No personal data indexed publicly" — a claim this
              project cannot make (it stores account and profile data), so the note
              states the truthful security property instead. */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <svg
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Verification links are single-use and time-limited</span>
          </div>
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

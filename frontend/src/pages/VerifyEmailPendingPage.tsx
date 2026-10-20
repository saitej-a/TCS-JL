/**
 * The §7.2.3 "check your inbox" screen (Phase 4 Anti-Slop Overhaul):
 * Deterministic verification pending card sharing `VerificationStepBar` with
 * `/verify-email/:token`. Replaces oversized cartoon icon circles with a clean
 * architectural header, inline recipient pill, editable fallback input, and
 * tabular-nums cooldown control.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Lock,
  Mail,
  RefreshCw,
} from "lucide-react";

import { resendVerification } from "@/api/auth";
import { Disclaimer } from "@/components/Disclaimer";
import { Input } from "@/components/Input";
import { BrandRow, VerificationStepBar } from "@/pages/authCard";

const RESEND_SECONDS = 60;

const RATE_LIMITED_COPY = {
  title: "Too many requests. Please wait a moment before trying again.",
  detail: "Anti-spam safeguards limit dispatch frequency to protect your candidate identifier.",
};
const SEND_FAILED_COPY = {
  title: "We could not send that email.",
  detail: "Please check your connection and try again.",
};

function CooldownArc({ remaining }: { remaining: number }) {
  const elapsed = (RESEND_SECONDS - remaining) / RESEND_SECONDS;
  return (
    <span className="relative h-4 w-4 shrink-0" aria-hidden="true">
      <svg className="h-4 w-4 -rotate-90" viewBox="0 0 36 36">
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
    } catch (err) {
      const apiError = err as { code?: string };
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
    <div className="flex min-h-[100svh] flex-col justify-between bg-slate-50 font-body text-slate-800 antialiased selection:bg-brand-100 selection:text-brand-900 dark:bg-slate-950 dark:text-slate-200">
      <main className="my-8 flex flex-1 flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl">
          <VerificationStepBar />

          <div className="rounded-xl border border-slate-200 bg-white p-7 sm:p-9 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
              <BrandRow />
              <span className="inline-flex items-center gap-1.5 rounded bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Verification pending</span>
              </span>
            </div>

            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Check your inbox
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {email.trim() === "" ? (
                "We sent a verification link to your inbox. Click it to activate your account."
              ) : (
                <>
                  We sent a verification link to{" "}
                  <span className="code-text rounded border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/60 dark:text-brand-300">
                    {email}
                  </span>
                  . Click it to activate your account.
                </>
              )}
            </p>

            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              <Info
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <span>If you don't see it within a couple minutes, inspect your spam or junk folder.</span>
            </div>

            {editing && (
              <div className="mt-5 text-left">
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
                  placeholder="name@domain.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={sending || email.trim() === "" || cooldown > 0}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>{sending ? "Sending…" : "Resend verification email"}</span>
                </button>
                {cooldown > 0 && (
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-[44px] cursor-not-allowed select-none items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  >
                    <CooldownArc remaining={cooldown} />
                    <span className="text-xs">
                      Resend available in{" "}
                      <span className="code-text font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                        {cooldown}s
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </div>

            {(resent || error !== null) && (
              <div className="mt-5 space-y-2.5 text-left">
                {resent && (
                  <div
                    role="status"
                    className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium text-emerald-900 dark:text-emerald-200">
                        A fresh link is on its way.
                      </p>
                      <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">
                        Please check your inbox again shortly. Verification links expire after 24 hours.
                      </p>
                    </div>
                  </div>
                )}

                {error !== null && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium text-rose-900 dark:text-rose-200">{error.title}</p>
                      <p className="mt-0.5 text-rose-700 dark:text-rose-300">{error.detail}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-xs dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400">
                  Wrong address? Register again to change it.
                </span>
                {stateEmail !== "" && !editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="font-medium text-slate-600 underline underline-offset-2 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    Use a different address
                  </button>
                )}
              </div>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:text-brand-300 dark:hover:bg-brand-950/60 dark:hover:text-brand-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Use a different email address</span>
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span>Verification links are single-use and time-limited</span>
          </div>
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

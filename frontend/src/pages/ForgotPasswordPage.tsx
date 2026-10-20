/**
 * The §7.2.5 forgot-password screen (Phase 4 Anti-Slop Overhaul):
 * Clean single-column recovery card built on `AuthCard`.
 *
 * Enumeration-safe contract preserved: presents the exact same sent status
 * regardless of whether the email exists or the request errors.
 */
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";

import { requestPasswordReset } from "@/api/auth";
import { Input } from "@/components/Input";
import { AuthCard } from "@/pages/authCard";

const SENT_TEXT = "If that email exists, a reset link is on its way.";
const SENT_HINT = "Please check your inbox or spam folder within 2–3 minutes.";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || email === "") return;
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      // Enumeration-safe: even on failure, present the same sent state.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email you registered with and we will send you a reset link."
      shell="forgot"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Email address
            </label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="name@domain.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {sent && (
            <div
              role="status"
              className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 transition-opacity duration-200 dark:border-emerald-900/60 dark:bg-emerald-950/50"
            >
              <CheckCircle2
                className="h-5 w-5 shrink-0 select-none text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-xs font-medium leading-snug text-emerald-800 sm:text-sm dark:text-emerald-200">
                  {SENT_TEXT}
                </p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  {SENT_HINT}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-700 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{submitting ? "Sending reset link..." : "Send reset link"}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      <div className="mt-6 flex items-center gap-2.5 border-t border-slate-100 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <KeyRound
          className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
          aria-hidden="true"
        />
        <span>Secure password reset with single-use magic link verification.</span>
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="group inline-flex items-center gap-1.5 py-1 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline dark:text-brand-300 dark:hover:text-brand-200"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          <span>Back to sign in</span>
        </Link>
      </div>
    </AuthCard>
  );
}

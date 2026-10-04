/**
 * The §7.2.5 forgot-password screen, rebuilt to the `forgot_password_screen`
 * composition (Phase 12): card with heading + explanatory subheader, the
 * send-reset-link CTA with a leading arrow glyph, the emerald success strip
 * with the inbox/spam hint line, a lock-hint row, and the back link.
 *
 * The success copy is enumeration-safe: the same response regardless of
 * whether the email exists (the shipped contract — the composition's shown
 * success banner is the same honest wording, not a confirmation the address
 * exists).
 */
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "@/api/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AuthCard, SuccessStrip } from "@/pages/authCard";
import { LockGlyph } from "@/pages/authGlyphs";

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
      skin="skin-v1"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {sent && (
            <div
              role="status"
              className="bg-emerald-50 rounded-lg border border-emerald-200/80 p-3.5 flex items-start gap-3 mt-4 transition-all duration-300"
            >
              <span
                className="material-symbols-outlined text-emerald-600 text-xl shrink-0 select-none"
                data-icon="check_circle"
              >
                check_circle
              </span>
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-emerald-700 leading-snug">
                  {SENT_TEXT}
                </p>
                <p className="text-[12px] text-emerald-600/90 mt-0.5">{SENT_HINT}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-medium text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 flex items-center justify-center gap-2 mt-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{submitting ? "Sending reset link..." : "Send reset link"}</span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      </form>

      <div className="mt-6 flex items-center gap-2.5 border-t border-slate-100 pt-5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span className="material-symbols-outlined text-slate-400 text-base shrink-0" data-icon="lock_reset">
          lock_reset
        </span>
        <span>Secure password reset with single-use magic link verification.</span>
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to sign in</span>
        </Link>
      </div>
    </AuthCard>
  );
}

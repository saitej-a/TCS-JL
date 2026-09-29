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
            <div>
              <SuccessStrip message={SENT_TEXT} />
              <p className="mt-1 px-3 text-[12px] text-emerald-600/90 dark:text-emerald-400/80">
                {SENT_HINT}
              </p>
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth loading={submitting} className="mt-5 h-11">
            Send reset link
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-center gap-2.5 border-t border-slate-100 pt-5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <LockGlyph className="h-4 w-4 shrink-0 text-slate-400" />
        <span>Secure password reset with single-use link verification.</span>
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline dark:text-brand-400"
        >
          <span aria-hidden="true">←</span>
          <span>Back to sign in</span>
        </Link>
      </div>
    </AuthCard>
  );
}

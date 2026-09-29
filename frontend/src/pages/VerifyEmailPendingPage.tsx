/**
 * The §7.2.3 "check your inbox" screen, rebuilt to the
 * `verification_pending_verify_email_pending` composition (Phase 12): the
 * 3-step progress strip (1. Register ✓ → 2. Verify email → 3. Set up your
 * profile), the mail illustration as the card's visual anchor, the inbox
 * copy, and the resend affordances.
 *
 * The resend address lives in a labeled, editable in-card field (9.5.1 D-11 —
 * never a window.prompt), prefilled from the router state RegisterPage passes
 * ({ email }). The composition's masked "a***@example.com" is rendered as a
 * real editable field showing the actual address — masking a field the user
 * must be able to correct would defeat the wrong-address path.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { resendVerification } from "@/api/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AuthCard, ErrorStrip, SuccessStrip } from "@/pages/authCard";
import { MailGlyph, RefreshGlyph } from "@/pages/authGlyphs";

const RESEND_SECONDS = 60;

function StepStrip() {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <ol className="flex items-center justify-between px-3 text-xs">
        <li className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400" aria-current="false">
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            ✓
          </span>
          <span className="font-semibold">1. Register</span>
        </li>
        <li aria-hidden="true" className="mx-3 h-0.5 flex-1 bg-brand-200 dark:bg-brand-800" />
        <li className="flex items-center gap-2 text-brand-700 dark:text-brand-300" aria-current="step">
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
            2
          </span>
          <span className="font-semibold">Verify email</span>
        </li>
        <li aria-hidden="true" className="mx-3 h-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
        <li className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] dark:border-slate-600 dark:bg-slate-800">
            3
          </span>
          <span>Set up your profile</span>
        </li>
      </ol>
    </div>
  );
}

export function VerifyEmailPendingPage() {
  const location = useLocation();
  const stateEmail =
    (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(stateEmail);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        setError("Please wait before requesting another email.");
        setCooldown(30);
      } else {
        setError("Could not send the email. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <StepStrip />

      <AuthCard
        title="Check your inbox"
        subtitle="We sent a verification link to your inbox. Click it to activate your account."
      >
        <div className="space-y-4">
          {/* The composition's mail illustration as visual anchor. */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-200/60 bg-brand-100 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <MailGlyph className="h-12 w-12" />
          </div>

          {resent && <SuccessStrip message="Verification email sent." />}
          {error !== null && <ErrorStrip message={error} />}

          <div>
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

          <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            <span aria-hidden="true">ⓘ</span>
            <span>If you don't see it within a couple minutes, inspect your spam or junk folder.</span>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
            {cooldown > 0 ? (
              /* The composition's cooldown state: disabled with countdown. */
              <button
                type="button"
                disabled
                className="flex min-h-[44px] w-full cursor-not-allowed select-none items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
              >
                <RefreshGlyph className="h-4 w-4" />
                <span>Resend available in {cooldown}s</span>
              </button>
            ) : (
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={handleResend}
                loading={sending}
                disabled={email.trim() === ""}
                leadingIcon={<RefreshGlyph className="h-4 w-4" />}
              >
                Resend verification email
              </Button>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Wrong address? Register again to change it.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 hover:text-brand-800 dark:text-brand-400 dark:hover:bg-brand-950/40"
            >
              <span aria-hidden="true">←</span>
              <span>Use a different email address</span>
            </Link>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}

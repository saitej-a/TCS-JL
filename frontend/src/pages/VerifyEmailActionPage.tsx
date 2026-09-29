/**
 * The §7.2.4 verification action screen, rebuilt to the
 * `email_verification_actions_verify_email_token` composition (Phase 12):
 * each outcome renders the composition's anatomy — a large circular icon
 * disc, heading, explanatory copy, and a full-width primary CTA. Visiting
 * /verify-email/:token calls the verify endpoint once and renders exactly
 * one of the three outcomes.
 *
 * Divergences recorded (RECONCILIATION.md): the composition shows only the
 * success state, and its "Continue to your profile" CTA targets onboarding —
 * the real flow routes through sign-in (verification does not authenticate);
 * the masked "a***@example.com" identity panel is not copied because the
 * action page has no session to read an address from.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { verifyEmail } from "@/api/auth";
import { Button } from "@/components/Button";
import { AuthCard, ErrorStrip, SuccessStrip } from "@/pages/authCard";
import { CheckCircleGlyph } from "@/pages/authGlyphs";

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
    <AuthCard
      title={outcome === "success" ? "Your email is verified" : "Verifying your email"}
      subtitle={
        outcome === "success"
          ? "Thanks — your account is active. Sign in to finish your profile so the timeline and community can be personalised for you."
          : "One moment while we confirm your verification link."
      }
    >
      <div className="space-y-4">
        {outcome === "verifying" && (
          <p className="text-sm text-slate-500 dark:text-slate-400" role="status">
            Verifying…
          </p>
        )}

        {outcome === "success" && (
          <>
            {/* The composition's success anatomy: icon disc + CTA. */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircleGlyph className="h-8 w-8" />
            </div>
            <SuccessStrip message="Your email is verified. You can sign in now." />
            <Link
              to="/login"
              className="flex min-h-[44px] items-center justify-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
            >
              Sign in
            </Link>
            <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Verification links are single-use and time-limited for your account security.
            </p>
          </>
        )}

        {outcome === "failure" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
              <span aria-hidden="true" className="text-2xl font-bold">✕</span>
            </div>
            <ErrorStrip message="This verification link is invalid or has expired." />
            {/* Wrapping-safe token echo (9.5.1 D-7): the identifier the reader
                clicked, never allowed to break layout. */}
            {token !== "" && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Link token:{" "}
                <span
                  className="inline-block max-w-full min-w-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 [overflow-wrap:anywhere] dark:bg-slate-700 dark:text-slate-200"
                  data-testid="attempted-token"
                >
                  {token}
                </span>
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => {
                window.location.href = "/verify-email-pending";
              }}
            >
              Request a new email
            </Button>
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </AuthCard>
  );
}

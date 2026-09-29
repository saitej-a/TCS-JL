/**
 * The §7.2.3 "check your inbox" screen: the resend address lives in a labeled,
 * editable in-card field (9.5.1 D-11 — never a window.prompt), prefilled from
 * the router state RegisterPage passes ({ email }).
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { resendVerification } from "@/api/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AuthCard, AuthField, ErrorStrip, SuccessStrip } from "@/pages/authCard";

const RESEND_SECONDS = 60;

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
    <AuthCard
      title="Verify your email"
      subtitle="We sent a verification link to your inbox. Click it to activate your account."
    >
      <div className="space-y-4">
        {resent && <SuccessStrip message="Verification email sent." />}
        {error !== null && <ErrorStrip message={error} />}
        <AuthField
          label="Registered email address"
          htmlFor="verify-email-field"
          hint="The address the verification link was sent to."
        >
          <Input
            id="verify-email-field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </AuthField>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Didn't get it? Check your spam folder, correct the address above if it
          is wrong, then resend.
        </p>
        <Button
          type="button"
          variant="primary"
          fullWidth
          onClick={handleResend}
          loading={sending}
          disabled={cooldown > 0 || email.trim() === ""}
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
        </Button>
      </div>
    </AuthCard>
  );
}

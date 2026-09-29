/**
 * The §7.2.6 reset-password screen: new password + confirm against the
 * :token, success routes to /login. Validation uses the shared passwordRules
 * module (9.5.1 D-10) — the real server policy, not a client-invented one —
 * and the copy states the REAL 60-minute single-use window
 * (PASSWORD_RESET_TIMEOUT = 3600, 9.5.1 D-12/R6).
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { confirmPasswordReset } from "@/api/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AuthCard, AuthField, ErrorStrip } from "@/pages/authCard";
import { RULE_LABELS, validatePassword } from "@/utils/passwordRules";

export function ResetPasswordPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mismatch = confirm !== "" && confirm !== password;
  const failures = validatePassword(password);
  const passwordInvalid = password !== "" && failures.length > 0;
  const firstFailure = failures[0]?.label ?? "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mismatch || passwordInvalid || password === "") {
      setErrorMessage(
        mismatch ? "Passwords do not match." : `Password needs ${firstFailure}.`,
      );
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await confirmPasswordReset({ token, new_password: password, new_password_confirm: confirm });
      navigate("/login", { replace: true });
    } catch (error) {
      const apiError = error as { code?: string; message?: string };
      if (apiError?.code === "TOKEN_INVALID" || /expired|invalid/i.test(apiError?.message ?? "")) {
        setErrorMessage("This reset link is invalid or has expired. Request a new one.");
      } else {
        setErrorMessage(apiError?.message ?? "Could not reset the password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Your reset link is time-limited and single-use. It expires 60 minutes after it was issued."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <AuthField
            label="New password"
            htmlFor="reset-password"
            hint="At least 10 characters with upper, lower, digit and special."
          >
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={passwordInvalid || undefined}
            />
          </AuthField>
          {password !== "" && failures.length > 0 && (
            <ul className="space-y-1 text-xs" data-testid="password-rules">
              {RULE_LABELS.map((rule) => {
                const failed = failures.some((f) => f.id === rule.id);
                return (
                  <li
                    key={rule.id}
                    className={failed ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}
                    data-testid={`rule-${rule.id}`}
                  >
                    {rule.label} — {failed ? "missing" : "ok"}
                  </li>
                );
              })}
            </ul>
          )}
          <AuthField label="Confirm new password" htmlFor="reset-confirm">
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              aria-invalid={mismatch || undefined}
            />
          </AuthField>
          {(mismatch || passwordInvalid || errorMessage !== null) && (
            <ErrorStrip
              message={
                mismatch
                  ? "Passwords do not match."
                  : passwordInvalid
                    ? `Password needs ${firstFailure}.`
                    : (errorMessage ?? "")
              }
            />
          )}
          {errorMessage !== null && /invalid or has expired/i.test(errorMessage) && token !== "" && (
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
            type="submit"
            variant="primary"
            fullWidth
            loading={submitting}
            disabled={mismatch || passwordInvalid}
          >
            Reset password
          </Button>
        </div>
      </form>
      <p className="text-center text-sm">
        <Link to="/login" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
          ← Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}

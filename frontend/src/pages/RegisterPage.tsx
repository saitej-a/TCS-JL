/**
 * The §7.2.2 registration screen. Client-side validation is UX only — the
 * server stays the authority. Success → /verify-email-pending (the account is
 * created unverified). Note: display_name is NOT a registration field — it
 * lives on the candidate profile (the wizard's step 1 collects it).
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "@/api/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { recordAccountCreated } from "@/pwa/installSignals";
import {
  AuthCard,
  AuthField,
  ErrorStrip,
} from "@/pages/authCard";
import { RULE_LABELS, validatePassword } from "@/utils/passwordRules";

export function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mismatch = confirm !== "" && confirm !== password;
  const failures = validatePassword(password);
  const passwordInvalid = password !== "" && failures.length > 0;
  const firstFailure = failures[0]?.label ?? "";
  const canSubmit =
    email !== "" &&
    failures.length === 0 &&
    confirm === password &&
    agreed &&
    !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mismatch || passwordInvalid) {
      setErrorMessage(
        mismatch ? "Passwords do not match." : `Password needs ${firstFailure}.`,
      );
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await register({ email, password, password_confirm: confirm });
      // §10.1's install trigger counts a created account as one of its two
      // signals (9.4 Task 8) — recorded where the fact happens.
      recordAccountCreated();
      navigate("/verify-email-pending", { replace: true, state: { email } });
    } catch (error) {
      const apiError = error as { code?: string; message?: string };
      if (apiError?.code === "EMAIL_TAKEN" || /already/i.test(apiError?.message ?? "")) {
        setErrorMessage("An account with this email already exists.");
      } else {
        setErrorMessage(apiError?.message ?? "Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Join the community tracking TCS joining timelines.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <AuthField label="Email address" htmlFor="register-email">
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </AuthField>
          <AuthField
            label="Password"
            htmlFor="register-password"
            hint="Must be at least 10 characters with upper, lower, digit and special."
          >
            <Input
              id="register-password"
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
          <AuthField label="Confirm password" htmlFor="register-confirm">
            <Input
              id="register-confirm"
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
          <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4"
              data-testid="terms-checkbox"
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="text-brand-700 hover:underline dark:text-brand-400">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-brand-700 hover:underline dark:text-brand-400">
                Privacy Policy
              </Link>
            </span>
          </label>
          <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={!canSubmit}>
            Create account
          </Button>
        </div>
      </form>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

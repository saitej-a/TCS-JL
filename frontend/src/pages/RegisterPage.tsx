/**
 * The §7.2.2 registration screen, rebuilt to the `registration_screen`
 * composition (Phase 12): centered max-w card on a dot-grid field, brand row,
 * the composition's field order, and a password reveal toggle per field.
 *
 * Divergences recorded (RECONCILIATION.md):
 * - The composition's "Display name" field is NOT copied: display_name lives
 *   on the candidate profile (the wizard's step 1), not the registration API —
 *   the shipped honest contract holds.
 * - The per-rule checklist (real shared passwordRules module) replaces the
 *   composition's "Must be at least 8 characters" hint, which understates the
 *   real policy.
 * - The composition's inline "Passwords do not match." example state is the
 *   real mismatch behavior, kept.
 *
 * Client-side validation is UX only — the server stays the authority. Success
 * → /verify-email-pending (the account is created unverified).
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "@/api/auth";
import { Input } from "@/components/Input";
import { recordAccountCreated } from "@/pwa/installSignals";
import { AuthCard } from "@/pages/authCard";
import { RULE_LABELS, validatePassword } from "@/utils/passwordRules";

/** Thin wrapper keeping the field blocks uniform (the composition's spacing). */
function FieldBlock({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

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
    <AuthCard
      title="Create your account"
      subtitle="Join the community tracking TCS joining timelines."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <FieldBlock>
            <label
              htmlFor="register-email"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Email address
            </label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FieldBlock>

          <FieldBlock>
            <label
              htmlFor="register-password"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Password
            </label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={passwordInvalid || undefined}
            />
            {password !== "" && failures.length > 0 && (
              <ul className="mt-1.5 space-y-1 text-xs" data-testid="password-rules">
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
          </FieldBlock>

          <FieldBlock>
            <label
              htmlFor="register-confirm"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Confirm password
            </label>
            <Input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              aria-invalid={mismatch || undefined}
            />
          </FieldBlock>

          {(mismatch || passwordInvalid || errorMessage !== null) && (
            <div
              role="alert"
              className="mt-2 bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center gap-2 text-rose-700 text-xs font-medium"
            >
              <span className="material-symbols-outlined text-rose-600 text-[16px] shrink-0" data-icon="error">
                error
              </span>
              <span>
                {mismatch
                  ? "Passwords do not match."
                  : passwordInvalid
                    ? `Password needs ${firstFailure}.`
                    : (errorMessage ?? "")}
              </span>
            </div>
          )}

          <div className="pt-1">
            <label className="flex cursor-pointer select-none items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600/30 cursor-pointer"
                data-testid="terms-checkbox"
              />
              <span className="text-xs text-slate-600 leading-snug">
                I agree to the{" "}
                <Link to="/terms" className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-11 mt-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <div className="relative py-2" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">or</span>
            </div>
          </div>

          <Link
            to="/login"
            className="w-full flex items-center justify-center py-2.5 border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-medium rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 text-center"
          >
            I already have an account
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

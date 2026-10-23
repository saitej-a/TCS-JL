/**
 * The §7.2.2 registration screen (Phase 4 Anti-Slop Overhaul):
 * Built on the shared `AuthSplitFrame` 2-column architectural layout pairing
 * a live anonymized candidate timeline specimen (`data-ui`) on the left with
 * the registration form on the right.
 *
 * Behavior contracts preserved:
 * - Display name stays on Step 2 of `/onboarding`, never on registration;
 * - Per-rule password checklist uses the shared `passwordRules` module;
 * - Client-side validation gates bad submissions, server remains authoritative;
 * - Success records the PWA install signal and routes to `/verify-email-pending`.
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Info } from "lucide-react";

import { register } from "@/api/auth";
import { Input } from "@/components/Input";
import { AuthSplitFrame, ErrorStrip } from "@/pages/authCard";
import { recordAccountCreated } from "@/pwa/installSignals";
import { PASSWORD_MIN_LENGTH, RULE_LABELS, validatePassword } from "@/utils/passwordRules";

const CONFIRM_ERROR_FIELD =
  "w-full h-10 px-3.5 pr-10 rounded-lg border border-rose-400 dark:border-rose-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-[border-color,box-shadow] duration-150";

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
    <AuthSplitFrame
      title="Create your account"
      subtitle="Join the community tracking TCS joining timelines."
      leftHeadline="Track your recruitment milestones alongside your batch."
      leftCopy="Your account anchors your private milestone log while contributing anonymized wait-day deltas to your stream and regional cohort."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
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
              placeholder="name@domain.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
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
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={passwordInvalid || undefined}
            />
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Info
                className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <span>
                At least {PASSWORD_MIN_LENGTH} characters, with upper and lower case, a digit and a
                symbol.
              </span>
            </p>
            {password !== "" && failures.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs" data-testid="password-rules">
                {RULE_LABELS.map((rule) => {
                  const failed = failures.some((f) => f.id === rule.id);
                  return (
                    <li
                      key={rule.id}
                      className={
                        failed
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }
                      data-testid={`rule-${rule.id}`}
                    >
                      {rule.label} — {failed ? "missing" : "ok"}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
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
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              aria-invalid={mismatch || undefined}
              controlClassName={mismatch ? CONFIRM_ERROR_FIELD : undefined}
            />
          </div>

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

          <div className="pt-1">
            <label className="flex cursor-pointer select-none items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-700 focus:ring-brand-600/30 dark:border-slate-600"
                data-testid="terms-checkbox"
              />
              <span className="text-xs leading-snug text-slate-600 dark:text-slate-400">
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="font-medium text-brand-700 hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="font-medium text-brand-700 hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-brand-700 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <div className="relative py-2" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 font-medium text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                or
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-center text-sm font-medium text-slate-700 transition-[background-color,border-color,transform] duration-150 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            I already have an account
          </Link>
        </div>
      </form>
    </AuthSplitFrame>
  );
}

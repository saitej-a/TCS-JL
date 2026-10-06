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
 *
 * Dark parity (Phase 16 follow-up): the shell's card and dot-grid come from
 * `AuthCard`; the fields, helper row, alert strip and secondary link here carry
 * their own `dark:` pairs so the form reads on the app's default dark surface.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "@/api/auth";
import { Input } from "@/components/Input";
import { recordAccountCreated } from "@/pwa/installSignals";
import { AuthCard } from "@/pages/authCard";
import { PASSWORD_MIN_LENGTH, RULE_LABELS, validatePassword } from "@/utils/passwordRules";

/** Thin wrapper keeping the field blocks uniform (the composition's spacing). */
function FieldBlock({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

/**
 * The composition's field treatments, verbatim. Its display-name field is the
 * fifth kept out (see the class doc), so its identity and password fields carry
 * the mockup's own ring and border, and the confirmation carries the mockup's
 * mismatch state.
 */
const FIELD =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500";
const PASSWORD_FIELD =
  "w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500";
const CONFIRM_FIELD =
  "w-full px-3.5 py-2.5 bg-white border border-rose-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors shadow-sm dark:bg-slate-800 dark:border-rose-800 dark:text-slate-100 dark:placeholder:text-slate-500";
const REVEAL =
  "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none dark:text-slate-500 dark:hover:text-slate-300";

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
              controlClassName={FIELD}
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
              controlClassName={PASSWORD_FIELD}
              revealClassName={REVEAL}
            />
            {/* The composition's helper row under the password field. Its hint text
                ("Must be at least 8 characters") understates the real policy, so the
                row carries the real requirement instead. */}
            <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1 dark:text-slate-400">
              <span
                className="material-symbols-outlined text-slate-400 text-[14px] shrink-0 translate-y-0.5 dark:text-slate-500"
                data-icon="info"
              >
                info
              </span>
              <span>
                At least {PASSWORD_MIN_LENGTH} characters, with upper and lower case, a digit and a
                symbol.
              </span>
            </p>
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
              controlClassName={mismatch ? CONFIRM_FIELD : FIELD}
            />
          </FieldBlock>

          {(mismatch || passwordInvalid || errorMessage !== null) && (
            <div
              role="alert"
              className="mt-2 bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center gap-2 text-rose-700 text-xs font-medium dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-300"
            >
              <span
                className="material-symbols-outlined text-rose-600 text-[16px] shrink-0 dark:text-rose-400"
                data-icon="error"
              >
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
                className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600/30 cursor-pointer dark:border-slate-600"
                data-testid="terms-checkbox"
              />
              <span className="text-xs text-slate-600 leading-snug dark:text-slate-400">
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium dark:text-indigo-400 dark:hover:text-indigo-300"
                >
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
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium dark:bg-slate-900 dark:text-slate-500">
                or
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="w-full flex items-center justify-center py-2.5 border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-medium rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 text-center dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-200"
          >
            I already have an account
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

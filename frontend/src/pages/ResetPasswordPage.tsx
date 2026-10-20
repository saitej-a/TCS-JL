/**
 * The §7.2.6 reset-password screen (Phase 4 Anti-Slop Overhaul):
 * Unified onto the single-column `AuthCard` recovery shell with Lucide icons,
 * flat 1px borders, and zero drop-shadows.
 *
 * Behavior contracts preserved:
 * - States the real 60-minute single-use window (`PASSWORD_RESET_TIMEOUT = 3600`);
 * - Uses the shared `passwordRules` module with one strength band per real rule;
 * - Invalid/expired token echoes the attempted token in a wrapping-safe pill
 *   (`data-testid="attempted-token"`, `[overflow-wrap:anywhere]`);
 * - Both password fields keep the `Toggle password visibility` button with
 *   `aria-pressed`.
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react";

import { confirmPasswordReset } from "@/api/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AuthCard, ErrorStrip } from "@/pages/authCard";
import { PASSWORD_MIN_LENGTH, RULE_LABELS, validatePassword } from "@/utils/passwordRules";

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

  // Strength meter: the share of the real policy the password already meets.
  const metCount = RULE_LABELS.length - failures.length;
  const strengthLabel =
    password === ""
      ? ""
      : metCount === RULE_LABELS.length
        ? "Strong"
        : metCount >= 2
          ? "Getting there"
          : "Weak";
  const barColor =
    metCount === RULE_LABELS.length
      ? "bg-emerald-500"
      : metCount >= 2
        ? "bg-amber-500"
        : "bg-rose-500";

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
      shell="reset"
      breadcrumb={
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Account Access</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">Reset Password</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="reset-password"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              New password
            </label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={passwordInvalid || undefined}
            />
            {password !== "" && (
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Password strength
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {strengthLabel}
                  </span>
                </div>
                <div className="grid h-1.5 w-full grid-cols-5 gap-1.5">
                  {Array.from({ length: RULE_LABELS.length }, (_, i) => (
                    <div
                      key={i}
                      className={`h-full rounded-full ${i < metCount ? barColor : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                  ))}
                </div>
              </div>
            )}
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
              htmlFor="reset-confirm"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Confirm new password
            </label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              aria-invalid={mismatch || undefined}
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

          {errorMessage !== null && /invalid or has expired/i.test(errorMessage) && token !== "" && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Link token:{" "}
              <span
                className="inline-block max-w-full min-w-0 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono-code text-[11px] text-slate-700 [overflow-wrap:anywhere] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                data-testid="attempted-token"
              >
                {token}
              </span>
            </p>
          )}

          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Security requirements
            </span>
            <RequirementRow
              ok={metCount >= RULE_LABELS.length}
              label={`${PASSWORD_MIN_LENGTH}+ characters with upper and lower case, a digit and a symbol`}
            />
            <RequirementRow
              ok={confirm !== "" && confirm === password}
              label="Matches the confirmation field"
            />
          </div>

          <div className="pt-1.5">
            <Button
              type="submit"
              loading={submitting}
              disabled={mismatch || passwordInvalid}
              controlClassName="w-full h-11 min-h-[44px] bg-brand-700 hover:bg-brand-800 active:scale-[0.98] text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              <span>Set new password</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center dark:border-slate-800">
        <Link
          to="/login"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded text-xs font-semibold text-slate-600 transition-colors hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </AuthCard>
  );
}

function RequirementRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          ok
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            : "border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
        }`}
      >
        {ok && <Check className="h-2.5 w-2.5 stroke-[2.5]" />}
      </span>
      <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
    </div>
  );
}

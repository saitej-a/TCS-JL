/**
 * The §7.2.6 reset-password screen, rebuilt to the
 * `reset_password_reset_password_token` composition (Phase 12): breadcrumb
 * header, the two password fields with reveal toggles, a strength meter
 * driven by the REAL shared policy, and the security-requirements panel.
 *
 * The copy states the REAL 60-minute single-use window
 * (PASSWORD_RESET_TIMEOUT = 3600, 9.5.1 D-12/R6). Validation uses the shared
 * passwordRules module (9.5.1 D-10) — the real server policy, not the
 * composition's weaker "At least 8 characters" fiction.
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { confirmPasswordReset } from "@/api/auth";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { AuthCard, ErrorStrip } from "@/pages/authCard";
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

  // Strength meter: the share of the real policy the password already meets.
  const metCount = RULE_LABELS.length - failures.length;
  const strengthLabel =
    password === "" ? "" : metCount === RULE_LABELS.length ? "Strong" : metCount >= 2 ? "Getting there" : "Weak";
  const barColor =
    metCount === RULE_LABELS.length ? "bg-emerald-500" : metCount >= 2 ? "bg-amber-500" : "bg-rose-500";

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
      {/* The composition's breadcrumb: Account Access → Reset Password. */}
      <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>Account Access</span>
        <span aria-hidden="true">→</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">Reset Password</span>
      </nav>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          <div>
            <label
              htmlFor="reset-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              New password
            </label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={passwordInvalid || undefined}
            />
            {password !== "" && (
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Password strength</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{strengthLabel}</span>
                </div>
                <div className="grid h-1.5 w-full grid-cols-4 gap-1">
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
                      className={failed ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}
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
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Confirm new password
            </label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
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
                className="inline-block max-w-full min-w-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 [overflow-wrap:anywhere] dark:bg-slate-700 dark:text-slate-200"
                data-testid="attempted-token"
              >
                {token}
              </span>
            </p>
          )}

          {/* The composition's security-requirements panel, real policy. */}
          <div className="space-y-2 rounded-lg border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/40">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Security Requirements
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <CheckDot ok={metCount >= 1} />
              <span className="font-medium">Meets the real password policy (10+ chars, mixed case, digit, special)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <CheckDot ok={confirm !== "" && confirm === password} />
              <span className="font-medium">Matches the confirmation field</span>
            </div>
          </div>

          <div className="pt-2">
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
        </div>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center dark:border-slate-700">
        <Link
          to="/login"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-400"
        >
          <span aria-hidden="true">←</span>
          <span>Back to sign in</span>
        </Link>
      </div>
    </AuthCard>
  );
}

/** The requirements panel's check dot: emerald check when satisfied. */
function CheckDot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
        ok
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
          : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
      }`}
    >
      {ok ? "✓" : ""}
    </span>
  );
}

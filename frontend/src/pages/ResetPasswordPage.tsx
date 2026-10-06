/**
 * The §7.2.6 reset-password screen, built to the
 * `reset_password_reset_password_token` composition: this mockup does not use the
 * shared auth card at all — it is a breadcrumb header, a centered heading, and a
 * `max-w-md` form card — so the screen carries its own shell and the composition's
 * own field, requirement-panel and action-button treatments.
 *
 * The copy states the REAL 60-minute single-use window
 * (PASSWORD_RESET_TIMEOUT = 3600, 9.5.1 D-12/R6). Validation uses the shared
 * passwordRules module (9.5.1 D-10) — the real server policy. The mockup's
 * strength meter is three decorative bands and its requirement panel lists three
 * fixed claims ("At least 8 characters", "Not a commonly used password"); the
 * meter renders one band per real rule and the panel states the real policy, both
 * recorded as deliberate drops in RECONCILIATION-16.md.
 *
 * Dark parity (Phase 16 follow-up): the ambient dot-grid backdrop was an inline
 * `style`, which no `dark:` variant can override — it is now the same gradient
 * expressed as Tailwind arbitrary values with a dark counterpart, and every card,
 * field and panel below carries its own `dark:` pair.
 */
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { confirmPasswordReset } from "@/api/auth";
import { Button } from "@/components/Button";
import { Disclaimer } from "@/components/Disclaimer";
import { Input } from "@/components/Input";
import { ErrorStrip } from "@/pages/authCard";
import {
  ArrowLeftGlyph,
  ArrowRightGlyph,
  ChevronRightGlyph,
  EyeGlyph,
  SmallCheckGlyph,
} from "@/pages/authGlyphs";
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
    <div className="skin-v2 flex min-h-screen flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-body text-slate-800 dark:text-slate-200 antialiased bg-[#F8FAFC] dark:bg-slate-950 bg-[radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] dark:bg-[radial-gradient(#334155_0.75px,transparent_0.75px)] [background-size:16px_16px]">
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="max-w-md mx-auto w-full">
          {/* The composition's breadcrumb header. */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 mb-2 dark:text-slate-400">
              <span className="hover:text-slate-700 dark:hover:text-slate-200">Account Access</span>
              <ChevronRightGlyph className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-800 font-semibold dark:text-slate-200">Reset Password</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-slate-100">
              Choose a new password
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed dark:text-slate-300">
              Your reset link is time-limited and single-use. It expires 60 minutes after it was issued.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="reset-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 dark:text-slate-200"
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
                    controlClassName="w-full h-11 px-3.5 pr-11 bg-white border border-slate-300 rounded-elem text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all shadow-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                    revealClassName="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none dark:text-slate-500 dark:hover:text-slate-300"
                    revealIcon={(revealed) => <EyeGlyph revealed={revealed} className="w-5 h-5" />}
                  />
                  {password !== "" && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Password strength
                        </span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {strengthLabel}
                        </span>
                      </div>
                      {/* One band per real policy rule — the mockup's three fixed
                          bands say nothing about what the server enforces. */}
                      <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
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
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 dark:text-slate-200"
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
                    controlClassName="w-full h-11 px-3.5 pr-11 bg-white border border-slate-300 rounded-elem text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all shadow-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                    revealClassName="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none dark:text-slate-500 dark:hover:text-slate-300"
                    revealIcon={(revealed) => <EyeGlyph revealed={revealed} className="w-5 h-5" />}
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
                      className="inline-block max-w-full min-w-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 [overflow-wrap:anywhere] dark:bg-slate-800 dark:text-slate-300"
                      data-testid="attempted-token"
                    >
                      {token}
                    </span>
                  </p>
                )}

                {/* The composition's security-requirements panel, real policy. */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-elem p-3.5 space-y-2 mt-3 dark:bg-slate-800/60 dark:border-slate-700">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 dark:text-slate-400">
                    Security Requirements
                  </span>
                  <RequirementRow
                    ok={metCount >= RULE_LABELS.length}
                    label={`${PASSWORD_MIN_LENGTH}+ characters with upper and lower case, a digit and a symbol`}
                  />
                  <RequirementRow ok={confirm !== "" && confirm === password} label="Matches the confirmation field" />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    loading={submitting}
                    disabled={mismatch || passwordInvalid}
                    controlClassName="w-full h-11 min-h-[44px] bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-semibold rounded-elem text-sm flex items-center justify-center gap-2 shadow-xs transition-colors focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
                  >
                    <span>Set new password</span>
                    <ArrowRightGlyph className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center dark:border-slate-800">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-700 min-h-[44px] transition-colors focus:ring-2 focus:ring-brand-600 rounded dark:text-slate-300 dark:hover:text-brand-300"
              >
                <ArrowLeftGlyph className="w-4 h-4" />
                <span>Back to sign in</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full pb-6 px-4">
        <div className="mx-auto max-w-xl text-center">
          <Disclaimer variant="registration" />
        </div>
      </footer>
    </div>
  );
}

/** The requirements panel's row: the composition's dot, tick and label treatment. */
function RequirementRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
      <span
        aria-hidden="true"
        className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
          ok
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
        }`}
      >
        {ok && <SmallCheckGlyph className="w-3 h-3" />}
      </span>
      <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
    </div>
  );
}

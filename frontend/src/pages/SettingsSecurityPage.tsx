/**
 * /settings/security (9.5 Task 6 — no generated screen; the #3/#4 row
 * vocabulary). Built honestly against the API:
 *
 * - Password change: the API has NO authenticated change-password endpoint —
 *   only the email-based reset flow (POST /password-reset/request/). The row
 *   routes there with a confirm step instead of pretending an in-form change
 *   exists.
 * - 2FA: not built server-side (Phase 10 backlog) — stated, no fake toggle.
 * - Active sessions: the token model is JWT-with-refresh, not session rows;
 *   the API exposes no session list. The one real action is
 *   "sign out everywhere" = the logout endpoint blacklists THIS refresh
 *   token family server-side (06 §3.3). The row says exactly that.
 *
 * Phase 12 reconciliation: cards adopt the composition's bordered-header
 * anatomy (title + subtitle over a divider); rows unchanged.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { requestPasswordReset } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { TYPOGRAPHY } from "@/theme/tokens";
import type { ReactElement } from "react";

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";
const CARD_HEAD = "border-b border-slate-100 p-4 pb-3.5 dark:border-slate-800 sm:p-5 sm:pb-4";
const CARD_BODY = "p-4 pt-4 sm:p-5 sm:pt-4";
const ROW =
  "flex items-start justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0";

export function SettingsSecurityPage(): ReactElement {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function sendPasswordReset(): Promise<void> {
    if (user === null) return;
    setSendingReset(true);
    try {
      // The endpoint answers identically for unknown emails
      // (anti-enumeration), so success/failure says nothing sensitive.
      await requestPasswordReset(user.email);
      setResetSent(true);
    } catch {
      setResetSent(true);
    } finally {
      setSendingReset(false);
    }
  }

  async function signOutEverywhere(): Promise<void> {
    setSigningOut(true);
    try {
      await logout();
      // logout() clears the context and the tokens; landing on /login makes
      // the effect visible without a reload.
      navigate("/login", { replace: true });
    } catch {
      toast({ message: "Could not sign out. Please try again.", variant: "error" });
      setSigningOut(false);
    }
  }

  return (
    <SettingsLayout
      title="Security"
      description="Password, sign-in sessions and account access controls."
    >
      <section className={CARD} aria-label="Password">
        <div className={CARD_HEAD}>
          <h2 className={TYPOGRAPHY.cardTitle}>Password</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ensure your account uses a strong passphrase to prevent unauthorized changes.
          </p>
        </div>
        <div className={`${CARD_BODY} mt-0`}>
          <div className={ROW}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Change your password
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Password changes run through email verification — we send a reset link to your
                sign-in address so the change is confirmed by you, not just typed here.
              </p>
              {resetSent && (
                <p role="status" data-testid="reset-sent" className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Reset email requested. Check your inbox for the link.
                </p>
              )}
            </div>
            <button
              type="button"
              data-testid="request-reset"
              disabled={sendingReset}
              onClick={() => void sendPasswordReset()}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {sendingReset ? "Sending…" : "Email me a reset link"}
            </button>
          </div>
        </div>
      </section>

      <section className={CARD} aria-label="Additional security">
        <div className={CARD_HEAD}>
          <h2 className={TYPOGRAPHY.cardTitle}>Additional security</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Extra protections for how your account is accessed.
          </p>
        </div>
        <div className={`${CARD_BODY} mt-0`}>
          <div className={ROW}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Two-factor authentication
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Not available yet. 2FA is planned for a later milestone — this row will offer it
                when the API does.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              Not available
            </span>
          </div>
          <div className={ROW}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Active sessions
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign-in uses rotating tokens, not a session list — there is nothing to browse
                here. Use the action below to invalidate your sign-in tokens.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              N/A
            </span>
          </div>
          <div className={ROW}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Sign out everywhere
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Signs out this browser now and invalidates your refresh token server-side, so
                other signed-in browsers stop refreshing too.
              </p>
            </div>
            {confirmingSignOut ? (
              <div className="flex shrink-0 items-center gap-2" data-testid="signout-confirm">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
                  onClick={() => setConfirmingSignOut(false)}
                >
                  Keep me signed in
                </button>
                <button
                  type="button"
                  data-testid="signout-confirm-yes"
                  disabled={signingOut}
                  className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                  onClick={() => void signOutEverywhere()}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="signout-everywhere"
                className="shrink-0 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                onClick={() => setConfirmingSignOut(true)}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </section>
    </SettingsLayout>
  );
}

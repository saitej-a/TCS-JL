/**
 * /settings/security (9.5 Task 6, screen #5) — ported from
 * `tcs_joining_tracker_security_settings_settings_security` (Phase 16).
 *
 * The composition's markup is carried: the `Security` title block, the two
 * `border-b`-headed cards and the third card with the shield glyph beside its
 * heading, the 44px-tall control family, the `min-h-[44px]` button treatments,
 * the status lines, and the `divide-y` row stack with its chips and trailing
 * glyphs. Two utilities the composition uses but never defines — `rounded-custom`
 * and `focus-brand` — are defined once in `styles/stitch-scopes.css`, the way
 * `code-text` and `shadow-subtle` are.
 *
 * Where the composition and the API disagree, the API wins and the divergence is
 * declared in the phase record:
 *
 * - **The password form cannot be ported as a working form.** The API has no
 *   authenticated change-password endpoint — only the email-based reset flow
 *   (`POST /auth/password-reset/request/`, which card 2 drives for real). So card
 *   1 keeps the composition's field markup, caption and helper line with the
 *   controls `disabled`, and states plainly why; the composition's state
 *   demonstrations (`Password updated.`, `Your current password is incorrect.`)
 *   and its loading-button variant are not ported, because neither state can
 *   occur.
 * - **2FA and the session list.** The composition's chips ("Not available yet" /
 *   "Not tracked yet") are honest and are carried; its explanation of *why* is
 *   not — WebAuthn/TOTP are a backlog item, not a scheduled rollout, and the app
 *   does list signed-in devices on the Devices screen. Both sentences are in
 *   `Fabrication kept out` and the rows explain the real state instead.
 * - **Sign out everywhere** is an app action the composition has no row for, so
 *   it is added as a third row in the composition's own row markup — the
 *   two-step confirm the 9.5 pass required is preserved.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { requestPasswordReset } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import type { ReactElement } from "react";

const CARD =
  "bg-white rounded-custom border border-slate-200 shadow-sm p-6 dark:border-slate-800 dark:bg-slate-800";
const HEAD_5 = "border-b border-slate-100 pb-4 mb-5 dark:border-slate-800";
const HEAD_4 = "border-b border-slate-100 pb-4 mb-4 dark:border-slate-800";
const CARD_H2 = "text-base font-semibold text-slate-900 dark:text-slate-100";
const CARD_SUB = "text-xs text-slate-500 mt-0.5 dark:text-slate-400";
const FIELD =
  "w-full h-11 px-3.5 pr-10 text-sm bg-white border border-slate-300 rounded-custom text-slate-900 placeholder-slate-400 focus-brand transition-colors disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const FIELD_LABEL =
  "block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 dark:text-slate-300";
const EYE =
  "absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 disabled:cursor-not-allowed";
const BTN_PRIMARY =
  "min-h-[44px] px-5 py-2.5 bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white text-sm font-semibold rounded-custom transition-colors shadow-sm focus-brand inline-flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_SECONDARY =
  "min-h-[44px] px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 active:bg-slate-100 text-sm font-semibold rounded-custom transition-colors focus-brand inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
const BTN_ROSE =
  "min-h-[44px] px-4 py-2 bg-rose-50 border border-rose-200/80 hover:bg-rose-100 text-rose-700 text-sm font-semibold rounded-custom transition-colors focus-brand inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";
const CHIP =
  "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
const ROW_TITLE = "text-sm font-semibold text-slate-800 flex items-center gap-2 dark:text-slate-100";
const ROW_SUB = "text-xs text-slate-500 leading-relaxed dark:text-slate-400";
const INFO_LINE =
  "flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-custom max-w-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400";

/** The composition's eye glyph on every password field. */
function EyeGlyph(): ReactElement {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** The composition's info-circle glyph (its recovery status line). */
function InfoCircleGlyph({ className }: { className: string }): ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/**
 * The composition's read-only password field: label, masked control, disabled eye
 * toggle, helper line. Disabled because the API has no change-password endpoint —
 * the note beneath the form says so, and the reset flow below is the real path.
 */
function ReadOnlyPasswordField({
  id,
  label,
  placeholder,
  helper,
}: {
  id: string;
  label: string;
  placeholder: string;
  helper?: string;
}): ReactElement {
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label} <span className="text-rose-500">*</span>
      </label>
      <div className="relative">
        <input
          type="password"
          id={id}
          disabled
          placeholder={placeholder}
          className={FIELD}
          aria-describedby={helperId}
        />
        <button
          type="button"
          disabled
          aria-label={`Toggle ${label.toLowerCase()} visibility`}
          className={EYE}
        >
          <EyeGlyph />
        </button>
      </div>
      {helper !== undefined && (
        <p id={helperId} className="text-xs text-slate-500 mt-1.5 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email.charAt(0)}***${email.slice(at)}`;
}

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
    <div className="skin-v2 max-w-4xl w-full font-body antialiased">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-slate-100">
          Security
        </h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          Change your password and review how your account is protected.
        </p>
      </div>

      <div className="space-y-6">
        <section aria-labelledby="card-password-title" className={CARD}>
          <div className={HEAD_5}>
            <h2 id="card-password-title" className={CARD_H2}>
              Password
            </h2>
            <p className={CARD_SUB}>
              Ensure your account uses a strong passphrase to prevent unauthorized modifications to
              your timeline.
            </p>
          </div>

          {/* The composition's credential form. Its controls stay disabled: the API
              exposes no authenticated change-password endpoint, so the real path is
              the email reset flow in the card below. */}
          <form className="space-y-4 max-w-lg" onSubmit={(e) => e.preventDefault()} noValidate>
            <ReadOnlyPasswordField
              id="current-password"
              label="Current password"
              placeholder="Enter current password"
            />
            <ReadOnlyPasswordField
              id="new-password"
              label="New password"
              placeholder="Enter new password"
              helper="At least 8 characters. Avoid passwords you use elsewhere."
            />
            <ReadOnlyPasswordField
              id="confirm-password"
              label="Confirm new password"
              placeholder="Repeat new password"
            />

            <div className="pt-2 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled
                  aria-describedby="password-unavailable"
                  className={BTN_PRIMARY}
                >
                  Change password
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 dark:border-slate-800">
                <div className={INFO_LINE} id="password-unavailable">
                  <InfoCircleGlyph className="w-4 h-4 text-brand-700 shrink-0 dark:text-brand-300" />
                  <span>
                    Password changes are not available from this screen: the API exposes only the
                    email reset flow, which the card below starts.
                  </span>
                </div>
              </div>
            </div>
          </form>
        </section>

        <section aria-labelledby="card-recovery-title" className={CARD}>
          <div className={HEAD_4}>
            <h2 id="card-recovery-title" className={CARD_H2}>
              Password recovery
            </h2>
            <p className={CARD_SUB}>
              Need to access your candidate account without your current password? We can send a
              secure recovery token to your registered inbox.
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                data-testid="request-reset"
                disabled={sendingReset}
                onClick={() => void sendPasswordReset()}
                className={BTN_SECONDARY}
              >
                <svg
                  className="w-4 h-4 text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {sendingReset ? "Sending…" : "Send password reset email"}
              </button>
            </div>

            {/* The composition's status line. It appears only once a request has
                actually been made, and prints the session's real masked address. */}
            {resetSent && (
              <div className={INFO_LINE} role="status" data-testid="reset-sent">
                <InfoCircleGlyph className="w-4 h-4 text-brand-700 shrink-0 dark:text-brand-300" />
                <span>
                  Reset link sent to{" "}
                  <span className="font-mono-code font-medium text-slate-900 dark:text-slate-100">
                    {user === null ? "your sign-in address" : maskEmail(user.email)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="card-protection-title" className={CARD}>
          <div className={HEAD_4}>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-slate-600 dark:text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h2 id="card-protection-title" className={CARD_H2}>
                Account protection
              </h2>
            </div>
            <p className={CARD_SUB}>
              Platform features currently active or in development for candidate account security.
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="py-3.5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className={ROW_TITLE}>
                  <span>Active sessions</span>
                  <span className={CHIP}>Not tracked yet</span>
                </div>
                <p className={ROW_SUB}>
                  Sign-in uses rotating tokens, not a session list — there is nothing to browse
                  here. Use the action below to invalidate your sign-in tokens.
                </p>
              </div>
              <div className="shrink-0 text-slate-400 pt-0.5">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
            </div>

            <div className="pt-3.5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className={ROW_TITLE}>
                  <span>Two-factor authentication</span>
                  <span className={CHIP}>Not available yet</span>
                </div>
                <p className={ROW_SUB}>
                  Not available yet. 2FA is planned for a later milestone — this row will offer it
                  when the API does.
                </p>
              </div>
              <div className="shrink-0 text-slate-400 pt-0.5">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            {/* The app's own destructive action, in the composition's row markup. */}
            <div className="pt-3.5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className={ROW_TITLE}>
                  <span>Sign out everywhere</span>
                </div>
                <p className={ROW_SUB}>
                  Signs out this browser now and invalidates your refresh token server-side, so
                  other signed-in browsers stop refreshing too.
                </p>
              </div>
              {confirmingSignOut ? (
                <div className="flex shrink-0 items-center gap-2" data-testid="signout-confirm">
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={() => setConfirmingSignOut(false)}
                  >
                    Keep me signed in
                  </button>
                  <button
                    type="button"
                    data-testid="signout-confirm-yes"
                    disabled={signingOut}
                    className={BTN_ROSE}
                    onClick={() => void signOutEverywhere()}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="signout-everywhere"
                  className={BTN_ROSE}
                  onClick={() => setConfirmingSignOut(true)}
                >
                  <svg
                    className="w-4 h-4 text-rose-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * /settings/danger (9.5 Task 7 — screen #5). Highest-consequence surface in
 * the product, built against the REAL contract (apps/accounts/services.py,
 * `anonymize_delete_account`), which diverges from the plan's assumptions:
 *
 * - Deletion is IMMEDIATE ANONYMIZATION, not a 7-day grace period: the email
 *   is replaced with a tombstone address, the password is made unusable,
 *   every refresh token is blacklisted and the row is kept only as the
 *   tombstone seam. There is no deactivate endpoint and no undelete window;
 *   the copy states exactly what is destroyed vs. retained.
 * - DELETE /account/ requires {password} re-authentication; a wrong password
 *   answers a generic 403 (06 §2.7 anti-enumeration rule), so failure copy
 *   never hints which credential was wrong.
 * - Data export: NO endpoint exists server-side. The row states that and
 *   offers nothing fake — recorded as a 9.5 divergence.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { TYPOGRAPHY } from "@/theme/tokens";
import type { ReactElement } from "react";

const CARD =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800 sm:p-5";

export function SettingsDangerPage(): ReactElement {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  const [typedConfirm, setTypedConfirm] = useState("");
  const [understands, setUnderstands] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clearing the typed confirmation also re-locks the flow.
  useEffect(() => {
    if (typedConfirm === "" && understands) setUnderstands(false);
  }, [typedConfirm, understands]);

  const canConfirm = typedConfirm === "DELETE" && understands && password.length > 0 && !deleting;

  async function deleteAccount(): Promise<void> {
    setDeleting(true);
    try {
      await apiClient.delete("/account/", { data: { password } });
      // Server has anonymized the row and blacklisted every refresh token;
      // drop the local session and land on /login as the visible effect.
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast({
        message: "Deletion failed — the password did not match your account. Please try again.",
        variant: "error",
      });
      setDeleting(false);
    }
  }

  return (
    <SettingsLayout
      title="Danger zone"
      description="Irreversible account actions. Read each description before acting."
    >
      {/* Data export — no server-side endpoint; stated, not faked. */}
      <section className={CARD} aria-label="Your data">
        <h2 className={TYPOGRAPHY.cardTitle}>Your data</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Request a copy of your data
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Not available yet. Data export needs a server-side endpoint, which is not built — this
          row will offer the request when the API does. Nothing here pretends otherwise.
        </p>
      </section>

      <section
        className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 sm:p-5"
        aria-label="Delete account"
      >
        <h2 className={TYPOGRAPHY.cardTitle}>Delete account</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <p>
            Deletion is <strong>immediate and permanent</strong>. There is no grace period and no
            undelete.
          </p>
          <p>When you confirm, the server immediately:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Replaces your email with an anonymous tombstone address and permanently removes your
              sign-in access
            </li>
            <li>Signs you out of every device by invalidating all your session tokens</li>
            <li>
              Detaches your profile from your posts and comments (they remain as anonymous
              tombstone records)
            </li>
          </ul>
        </div>

        <div className="mt-4 space-y-3 border-t border-rose-200 pt-4 dark:border-rose-900/60">
          {/* Step 1 — typed confirmation */}
          <div>
            <label
              htmlFor="delete-confirm"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100"
            >
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              data-testid="delete-confirm-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="Type DELETE"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:max-w-xs"
            />
          </div>

          {/* Step 2 — understanding checkbox, gated behind the typed word */}
          <label
            className={`flex items-start gap-2 text-sm ${
              typedConfirm === "DELETE" ? "" : "opacity-50"
            } ${understands ? "" : "cursor-not-allowed"}`}
          >
            <input
              type="checkbox"
              data-testid="delete-understands"
              disabled={typedConfirm !== "DELETE"}
              checked={understands}
              onChange={(e) => setUnderstands(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-rose-600"
            />
            <span className="text-slate-700 dark:text-slate-300">
              I understand my account will be anonymized immediately and permanently. This cannot
              be undone, and my posts and comments will stay without my name attached.
            </span>
          </label>

          {/* Step 3 — password re-auth (server requires it) */}
          <div>
            <label
              htmlFor="delete-password"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100"
            >
              Confirm your password
            </label>
            <div className="relative mt-1 sm:max-w-xs">
              <input
                id="delete-password"
                data-testid="delete-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-16 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              data-testid="delete-account-btn"
              disabled={!canConfirm}
              onClick={() => void deleteAccount()}
              className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Permanently delete my account"}
            </button>
            {(typedConfirm !== "" || understands || password !== "") && !deleting && (
              <button
                type="button"
                data-testid="delete-abort"
                onClick={() => {
                  setTypedConfirm("");
                  setUnderstands(false);
                  setPassword("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </section>
    </SettingsLayout>
  );
}

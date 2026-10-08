/**
 * /settings/danger (9.5 Task 7, screen #5) — ported from
 * `tcs_joining_tracker_danger_zone_settings_settings_danger` (Phase 16).
 *
 * The composition's markup is carried: the rose breadcrumb, the warning-triangle
 * header block, the 12-column grid with the three action cards on the left and
 * the "Before you delete" column on the right, the GDPR/DPDP chip, the rose
 * `border-2 border-[#E11D48]` delete card with its 4px top strip, its
 * destroyed-items list with X-circle glyphs, its slow-by-design confirmation
 * block, and the alternatives list with its real links.
 *
 * Two of the composition's three cards describe features the backend does not
 * have, and the port says so instead of drawing controls that cannot work
 * (declared in the phase record):
 *
 * - **Export your data.** No export endpoint exists server-side, so the
 *   `Request export` button ships disabled and the amber status row states that
 *   nothing has been requested or queued — the mockup's "Export requested 26 Sep
 *   2026, 18:40 — preparing" would be a fabricated job.
 * - **Deactivate account.** There is no deactivate endpoint either: an account is
 *   active or permanently anonymized. The card keeps its amber treatment and its
 *   button, disabled, with the missing endpoint named.
 *
 * The delete card is the one the real contract (apps/accounts/services.py,
 * `anonymize_delete_account`) backs, so its copy is the honest version of the
 * mockup's: **immediate anonymization with no grace period and no undelete**
 * (the mockup's 7-day grace footnote is dropped — it would be a promise the
 * server does not keep), typed `DELETE`, the understanding checkbox behind it,
 * and the password re-authentication the endpoint requires. A wrong password
 * answers a generic 403 (06 §2.7), so the failure copy never hints which
 * credential was wrong.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import type { ReactElement } from "react";

const CARD = "bg-white rounded-custom border border-slate-200 p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800";
const CARD_ICON =
  "w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5";
const CARD_H2 = "text-base font-semibold text-slate-900 dark:text-slate-100";
const CARD_BODY = "text-sm text-slate-600 mt-1 leading-relaxed dark:text-slate-400";
const CARD_ACTION =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border text-xs font-semibold transition-colors shadow-xs active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";
const CHIP =
  "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border";
const FIELD =
  "w-full text-sm bg-white border border-slate-300 rounded-lg px-3.5 py-2 shadow-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const FIELD_LABEL = "block text-xs font-semibold text-slate-800 mb-1.5 dark:text-slate-200";

/** The composition's breadcrumb chevron. */
function BreadcrumbChevron(): ReactElement {
  return (
    <svg
      className="w-3.5 h-3.5 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/** One "what is destroyed" line, with the composition's X-circle glyph. */
function DestroyedItem({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

/** One "before you delete" suggestion: icon chip, copy and a real link. */
function Alternative({
  title,
  detail,
  to,
  linkLabel,
  glyph,
}: {
  title: string;
  detail: string;
  to: string;
  linkLabel: string;
  glyph: React.ReactNode;
}): ReactElement {
  return (
    <li className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded bg-white text-slate-600 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 dark:border-slate-700 dark:bg-slate-800">
          {glyph}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{title}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">{detail}</div>
          <Link
            to={to}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#0369A1] hover:underline mt-1.5 dark:text-brand-300"
          >
            {linkLabel}
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </li>
  );
}

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
    <div className="skin-v2 max-w-[1040px] w-full font-body antialiased">
      <nav
        className="flex items-center gap-2 text-xs text-slate-500 mb-3 dark:text-slate-400"
        aria-label="Breadcrumb"
      >
        <Link to="/dashboard" className="hover:text-slate-900 transition-colors dark:hover:text-slate-100">
          Home
        </Link>
        <BreadcrumbChevron />
        <Link to="/settings" className="hover:text-slate-900 transition-colors dark:hover:text-slate-100">
          Settings
        </Link>
        <BreadcrumbChevron />
        <span className="font-semibold text-rose-700 dark:text-rose-400">Danger zone</span>
      </nav>

      <header className="mb-7">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600 flex-shrink-0 dark:bg-rose-950/60 dark:text-rose-300">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Danger zone
          </h1>
        </div>
        <p className="text-sm text-slate-600 mt-1.5 ml-10 dark:text-slate-400">
          These actions are permanent. Read each one before you continue.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1 — export. No endpoint exists, so the button ships disabled
              and the status row states that nothing was requested. */}
          <section className={CARD} aria-label="Export your data">
            <div className="flex items-start gap-4">
              <div className={`${CARD_ICON} bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200`}>
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className={CARD_H2}>Export your data</h2>
                  <span className={`${CHIP} bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600`}>
                    GDPR / DPDP
                  </span>
                </div>
                <p className={CARD_BODY}>
                  Not available yet. Data export needs a server-side endpoint, which is not built —
                  this row will offer the request when the API does. Nothing here pretends
                  otherwise.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled
                    title="Data export is not available yet."
                    className={`${CARD_ACTION} border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300`}
                  >
                    <svg
                      className="w-3.5 h-3.5 text-slate-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Request export
                  </button>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2.5 text-xs text-amber-800 bg-amber-50/70 px-3.5 py-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <svg
                    className="w-4 h-4 text-amber-600 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="font-mono text-xs text-amber-900 tracking-tight dark:text-amber-200">
                    No export has been requested or queued.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2 — deactivate. The API has no such endpoint; the card says so
              rather than drawing a pause that cannot be undone by signing in. */}
          <section
            className="bg-amber-50/40 rounded-custom border border-amber-200/90 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20"
            aria-label="Deactivate account"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5 dark:bg-amber-950/60 dark:border-amber-900/60 dark:text-amber-300">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className={CARD_H2}>Deactivate account</h2>
                </div>
                <p className={CARD_BODY}>
                  Not available. The API has no deactivate endpoint — an account is either active or
                  permanently deleted — so there is no reversible pause to offer here.
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    disabled
                    title="Account deactivation is not available yet."
                    className={`${CARD_ACTION} border-amber-400 text-amber-900 hover:bg-amber-100/70 hover:border-amber-500 dark:border-amber-800 dark:text-amber-300`}
                  >
                    <svg
                      className="w-3.5 h-3.5 text-amber-700"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    Deactivate my account
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Deletion below is the only account action the server implements.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 3 — the one the real contract backs. */}
          <section
            className="bg-white rounded-custom border-2 border-[#E11D48] p-6 shadow-md relative overflow-hidden dark:bg-slate-800"
            aria-label="Delete account permanently"
          >
            {/* Subtle top warning banner line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#E11D48]" />

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-[#E11D48] flex-shrink-0 mt-0.5 dark:bg-rose-950/60 dark:border-rose-900/60 dark:text-rose-300">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Delete account permanently
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-[#E11D48] border border-rose-200 dark:bg-rose-950/60 dark:border-rose-900/60 dark:text-rose-300">
                    Irreversible
                  </span>
                </div>
                <p className={`${CARD_BODY} mt-1`}>
                  Deletion is immediate and permanent. Once deleted, your account cannot be
                  recovered — there is no grace period and no undelete. Here is exactly what is
                  destroyed:
                </p>

                <ul className="mt-3.5 space-y-2 text-xs text-slate-700 bg-rose-50/50 p-3.5 rounded-lg border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-slate-300">
                  <DestroyedItem>
                    <strong>Sign-in access ends immediately:</strong> your email is replaced with an
                    anonymous tombstone address and your password is made unusable.
                  </DestroyedItem>
                  <DestroyedItem>
                    <strong>Every device is signed out:</strong> all of your session tokens are
                    invalidated, so nothing keeps refreshing.
                  </DestroyedItem>
                  <DestroyedItem>
                    <strong>Community posts stay as anonymous records:</strong> your profile is
                    detached from them, so the threads remain readable without your name attached —
                    they remain as tombstone records.
                  </DestroyedItem>
                </ul>

                {/* Confirmation block: slow by design. */}
                <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 dark:border-slate-700 dark:bg-slate-900">
                  <div>
                    <label htmlFor="confirm-delete" className={FIELD_LABEL}>
                      Type{" "}
                      <span className="font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60">
                        DELETE
                      </span>{" "}
                      to confirm:
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="text"
                        id="confirm-delete"
                        data-testid="delete-confirm-input"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Type DELETE"
                        value={typedConfirm}
                        onChange={(e) => setTypedConfirm(e.target.value)}
                        className="w-full font-mono text-sm tracking-wider font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg px-3.5 py-2 shadow-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none ring-2 ring-rose-500/20 placeholder:text-rose-300 placeholder:font-normal dark:bg-slate-800 dark:text-rose-300 dark:border-rose-900/60"
                      />
                      {typedConfirm === "DELETE" && (
                        <div className="absolute right-3 top-2.5 text-rose-600">
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="confirm-check"
                      data-testid="delete-understands"
                      disabled={typedConfirm !== "DELETE"}
                      checked={understands}
                      onChange={(e) => setUnderstands(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 focus:ring-offset-2 cursor-pointer accent-[#E11D48] disabled:cursor-not-allowed"
                    />
                    <label
                      htmlFor="confirm-check"
                      className="text-xs font-medium text-slate-800 cursor-pointer select-none dark:text-slate-200"
                    >
                      I understand this cannot be undone
                    </label>
                  </div>

                  {/* The endpoint requires the password; the mockup's flow has no
                      way to satisfy it, so the field is kept and styled here. */}
                  <div>
                    <label htmlFor="delete-password" className={FIELD_LABEL}>
                      Confirm your password
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        id="delete-password"
                        data-testid="delete-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${FIELD} pr-16`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      data-testid="delete-account-btn"
                      disabled={!canConfirm}
                      onClick={() => void deleteAccount()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
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
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      {deleting ? "Deleting…" : "Delete my account permanently"}
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
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <svg
                      className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                    <span>
                      Anonymization happens the moment you confirm; nothing is staged and nothing
                      can be cancelled afterwards.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 w-full">
          <div className="bg-white rounded-custom border border-slate-200 p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0369A1] flex items-center justify-center dark:bg-brand-950/60 dark:text-brand-300">
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Before you delete
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed dark:text-slate-400">
              If you are leaving because you already received your official joining letter or wish
              to stop notifications, consider these alternatives first:
            </p>

            <ul className="space-y-3 pt-1">
              <Alternative
                title="Go anonymous instead"
                detail="Set your identity to Anonymous Candidate so your name is not attached to your posts and comments."
                to="/settings/privacy"
                linkLabel="Open Privacy settings"
                glyph={
                  <svg
                    className="w-3.5 h-3.5 text-[#0369A1] dark:text-brand-300"
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
                }
              />
              <Alternative
                title="Mute push instead"
                detail="Turn off push alerts or revoke a device you no longer use, and the ACCOUNT stays intact."
                to="/settings/devices"
                linkLabel="Open Devices settings"
                glyph={
                  <svg
                    className="w-3.5 h-3.5 text-[#0369A1] dark:text-brand-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                    <path d="M12 18h.01" />
                  </svg>
                }
              />
              <Alternative
                title="Mark your milestone as 'Joined'"
                detail="Log your joining date so pending batchmates can calibrate their own timelines."
                to="/timeline"
                linkLabel="Update timeline status"
                glyph={
                  <svg
                    className="w-3.5 h-3.5 text-[#0369A1] dark:text-brand-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                }
              />
            </ul>

            <div className="pt-3 border-t border-slate-100 text-center dark:border-slate-800">
              <Link
                to="/community/create"
                className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Ask the community first
              </Link>
            </div>

            <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-100 text-[11px] text-slate-600 leading-normal dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-slate-300">
              <div className="font-semibold text-[#0369A1] mb-0.5 dark:text-brand-300">
                Need a copy first?
              </div>
              Data export is not available yet, so keep anything you need from your own records
              before confirming: the account cannot be recovered afterwards.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

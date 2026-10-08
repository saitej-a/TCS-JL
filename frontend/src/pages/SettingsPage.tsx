/**
 * The settings hub (9.5 Task 2, screen #1) — ported from
 * `tcs_joining_tracker_desktop_settings_screen` (Phase 16).
 *
 * The composition's markup is carried as-is, down to its own inline-config token
 * names — `text-slate-primary`, `border-slate-border`, `bg-brand-tint`,
 * `rounded-card`, `hover:shadow-hover`, `rounded-control` — which `@theme` now
 * declares (they are the same bytes as the numeric scale beside them). What the
 * screen *says* comes from the API, never from the mock:
 *
 * - the name, masked address, member-since line and ID come from the session;
 * - the profile card's status line is the profile's real `hiring_type` and
 *   `expected_joining_date`, the devices card's is the active count from
 *   `GET /devices/` plus the browser's real `Notification.permission`;
 * - the status chip is the profile's `current_status` through the app's tested
 *   badge matrix — and while that is unknown it wears the composition's own blue
 *   chip rather than a made-up status.
 *
 * Three things in the composition are **not** ported, each declared in
 * `.planning/phases/TCS-JL-16-…/RECONCILIATION-16.md` (D-01):
 *
 * 1. the `Save changes` button — this screen edits nothing (every section is a
 *    link to the page that owns its form), so a save button here would be a lie;
 * 2. the `Design note:` strip and the five `Dark-theme note:` captions — they are
 *    the designer's annotations to us, not UI; the app implements dark mode as
 *    `dark:` variants of the light markup rather than a second literal palette;
 * 3. the page footer — the shell composition owns the footer, and `AppShell`
 *    already renders the real disclaimer.
 *
 * The composition's `<main>` is also the scrolling column; the shell's own
 * `<main>` is that column in the app, so only the page's own flex column is
 * carried here.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getProfile } from "@/api/profile";
import { listDevices } from "@/api/notifications";
import { isPushDenied } from "@/pwa/pushClient";
import { useAuth } from "@/context/AuthContext";
import { SectionRetry } from "@/components/ErrorPanels";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/theme/badges";
import type { CandidateProfilePrivate } from "@/api/profile";
import type { ReactElement } from "react";

/* The composition's two card surfaces. `md:col-span-2` belongs to the danger
   card's wrapper (the composition widens only that one). */
const CARD =
  "bg-white border border-slate-border rounded-card p-5 shadow-subtle hover:shadow-hover hover:border-slate-300 transition-all duration-150 flex items-start justify-between cursor-pointer dark:bg-slate-800 dark:border-slate-800 dark:hover:border-slate-700";
const CARD_ICON =
  "w-10 h-10 rounded-control bg-brand-tint text-brand flex items-center justify-center shrink-0 dark:bg-brand-950/60 dark:text-brand-300";
const CARD_TITLE =
  "text-base font-bold text-slate-primary leading-snug group-hover:text-brand transition-colors dark:text-slate-100 dark:group-hover:text-brand-300";
const CARD_SUB = "text-xs text-slate-secondary mt-1 leading-relaxed dark:text-slate-400";
const CARD_STATUS =
  "mt-3.5 inline-flex items-center gap-1.5 text-xs text-slate-muted font-medium bg-slate-50 border border-slate-border px-2.5 py-1 rounded-control font-mono-numbers dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300";
const DOT = "w-1.5 h-1.5 rounded-full";
/** The composition's 4px chevron aff at the card edge. */
const CHEVRON =
  "text-slate-300 group-hover:text-slate-500 transition-colors pt-1 dark:text-slate-600 dark:group-hover:text-slate-400";

function maskedEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  return `${local.charAt(0)}***${domain}`;
}

function memberSince(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}

function pushStateCopy(): { label: string; detail: string } {
  // The honest source is the browser's actual permission value (the plan's
  // "push state from the PWA layer" rule) — not a capability probe.
  if (typeof Notification === "undefined") {
    return { label: "Unsupported", detail: "This browser cannot receive push alerts." };
  }
  if (Notification.permission === "granted") {
    return { label: "Push on", detail: "Alerts are enabled in this browser." };
  }
  if (Notification.permission === "denied" || isPushDenied()) {
    return {
      label: "Blocked",
      detail: "Alerts are off in this browser's site settings.",
    };
  }
  return { label: "Not enabled", detail: "Enable alerts from the Notifications page." };
}

/** The composition's 24px chevron at 4px (`w-4 h-4`), 2.5 arm. */
function ChevronRight({ className }: { className: string }): ReactElement {
  return (
    <div className={className}>
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
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

/** The account summary strip: avatar initials, name, chips, address, ID. */
function AccountSummary(): ReactElement {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfilePrivate | null>(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const loadProfile = useCallback((): (() => void) => {
    let cancelled = false;
    setRetrying(true);
    getProfile()
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setFailed(false);
        }
      })
      .catch(() => {
        // Unknown stays unknown; the failure additionally raises the inline
        // retry so the section can recover without a page reload (Task 10).
        if (!cancelled) {
          setProfile(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setRetrying(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = loadProfile();
    return cleanup;
  }, [loadProfile]);

  const name = profile?.display_name ?? user?.email.split("@")[0] ?? "—";
  const status = profile === null ? null : profile.current_status;

  return (
    <div
      data-testid="account-summary"
      aria-label="Account summary"
      className="mt-6 bg-white border border-slate-border rounded-card p-5 shadow-subtle flex items-center justify-between flex-wrap gap-4 dark:bg-slate-800 dark:border-slate-800"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
          {initialsOf(name)}
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-slate-primary leading-snug dark:text-slate-100">
              {name}
            </h2>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                user?.is_verified
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60"
                  : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60"
              }`}
            >
              <svg
                className={`w-3.5 h-3.5 ${user?.is_verified ? "text-emerald-600" : "text-amber-600"}`}
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
              {user === null ? "unknown" : user.is_verified ? "Email verified" : "Email not verified"}
            </span>
            {/* The composition's fixed blue "JL received" chip is not carried —
                the chip reports the profile's real status through the app's
                tested badge matrix, and wears the composition's own blue only
                while that status is genuinely unknown. */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                status === null
                  ? "bg-brand-tint text-brand border-sky-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-sky-800"
                  : `${STATUS_BADGE_CLASSES[status].bg} ${STATUS_BADGE_CLASSES[status].text}`
              }`}
            >
              <svg
                className="w-3.5 h-3.5 text-brand dark:text-brand-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {status === null ? "Status unknown" : STATUS_LABELS[status]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-secondary dark:text-slate-400">
            <span className="font-mono-numbers text-slate-muted dark:text-slate-400">
              {user === null ? "unknown" : maskedEmail(user.email)}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              •
            </span>
            <span className="font-mono-numbers text-slate-muted dark:text-slate-400">
              Member since {user === null ? "unknown" : memberSince(user.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-right">
        <span className="text-xs text-slate-secondary bg-slate-50 border border-slate-border px-3 py-1.5 rounded-control font-mono-numbers dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
          ID:{" "}
          <span className="font-semibold text-slate-primary dark:text-slate-100">
            {user === null ? "unknown" : user.id}
          </span>
        </span>
      </div>

      {failed && (
        <div className="w-full">
          <SectionRetry
            message="The account summary could not be loaded."
            // Retry clicks discard the cleanup — harmless for an idempotent
            // GET (a stale in-flight response carries the same data).
            onRetry={() => {
              loadProfile();
            }}
            retrying={retrying}
          />
        </div>
      )}
    </div>
  );
}

export function SettingsPage(): ReactElement {
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<CandidateProfilePrivate | null>(null);
  const push = pushStateCopy();

  useEffect(() => {
    let cancelled = false;
    listDevices()
      .then((devices) => {
        const list = Array.isArray(devices) ? devices : [];
        if (!cancelled) setDeviceCount(list.filter((d) => d.is_active).length);
      })
      .catch(() => {
        if (!cancelled) setDeviceCount(null);
      });
    getProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryLine =
    profile === null
      ? "Category and joining date unknown"
      : `${profile.hiring_type} • Joining date ${profile.expected_joining_date ?? "not set"}`;

  return (
    <div className="skin-v2 flex flex-col justify-between max-w-[1040px] font-body antialiased">
      <div className="flex items-center justify-between pb-6 border-b border-slate-border dark:border-slate-800">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-slate-muted mb-1.5 dark:text-slate-400"
          >
            <Link
              to="/dashboard"
              className="hover:text-slate-primary transition-colors dark:hover:text-slate-100"
            >
              Home
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-brand font-medium dark:text-brand-300">Settings</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-primary dark:text-slate-100">
            Settings
          </h1>
          <p className="text-sm text-slate-secondary mt-0.5 dark:text-slate-400">
            Manage your account, privacy and notifications
          </p>
        </div>
      </div>

      <AccountSummary />

      <div className="mt-8 mb-4 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-muted dark:text-slate-400">
          Configuration Sections
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="relative group">
          <Link
            to="/settings/profile"
            data-testid="card-profile"
            className={CARD}
          >
            <div className="flex items-start gap-4">
              <div className={CARD_ICON} aria-hidden="true">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="pr-2">
                <h4 className={CARD_TITLE}>Profile</h4>
                <p className={CARD_SUB}>Update your name, avatar, joining date and category</p>
                <div className={CARD_STATUS}>
                  <span className={`${DOT} bg-brand`} aria-hidden="true" />
                  <span>{categoryLine}</span>
                </div>
              </div>
            </div>
            <ChevronRight className={CHEVRON} />
          </Link>
        </div>

        <div className="relative group">
          <Link
            to="/settings/privacy"
            data-testid="card-privacy"
            className={CARD}
          >
            <div className="flex items-start gap-4">
              <div className={CARD_ICON} aria-hidden="true">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="pr-2">
                <h4 className={CARD_TITLE}>Privacy</h4>
                <p className={CARD_SUB}>Control what other candidates can see</p>
                <div className={`${CARD_STATUS} text-emerald-700 bg-emerald-50 border-emerald-200`}>
                  <span className={`${DOT} bg-emerald-500`} aria-hidden="true" />
                  <span>
                    {profile === null
                      ? "Visibility state unknown"
                      : profile.public_identity_mode === "ANONYMOUS"
                        ? "You appear as Anonymous Candidate"
                        : "Your display name is visible"}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className={CHEVRON} />
          </Link>
        </div>

        <div className="relative group">
          <Link
            to="/settings/security"
            data-testid="card-security"
            className={CARD}
          >
            <div className="flex items-start gap-4">
              <div className={CARD_ICON} aria-hidden="true">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="pr-2">
                <h4 className={CARD_TITLE}>Security</h4>
                <p className={CARD_SUB}>Password, two-factor and active sessions</p>
                <div className={`${CARD_STATUS} text-amber-700 bg-amber-50 border-amber-200`}>
                  <span className={`${DOT} bg-amber-500`} aria-hidden="true" />
                  <span>2FA: not available yet</span>
                </div>
              </div>
            </div>
            <ChevronRight className={CHEVRON} />
          </Link>
        </div>

        <div className="relative group">
          <Link
            to="/settings/devices"
            data-testid="card-devices"
            className={CARD}
          >
            <div className="flex items-start gap-4">
              <div className={CARD_ICON} aria-hidden="true">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                  <path d="M12 18h.01" />
                </svg>
              </div>
              <div className="pr-2">
                <h4 className={CARD_TITLE}>Devices &amp; notifications</h4>
                <p className={CARD_SUB}>Push alerts and registered devices</p>
                <div className={`${CARD_STATUS} text-slate-600`}>
                  <span className={`${DOT} bg-sky-500`} aria-hidden="true" />
                  <span>
                    {deviceCount === null
                      ? "devices unknown"
                      : `${deviceCount} active device${deviceCount === 1 ? "" : "s"}`}{" "}
                    · {push.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{push.detail}</p>
              </div>
            </div>
            <ChevronRight className={CHEVRON} />
          </Link>
        </div>

        <div className="relative group md:col-span-2">
          <Link
            to="/settings/danger"
            data-testid="card-danger"
            className="bg-rose-50/40 border border-rose-200 border-l-4 border-l-[#E11D48] rounded-card p-5 shadow-subtle hover:shadow-hover hover:border-rose-300 transition-all duration-150 flex items-start justify-between cursor-pointer dark:bg-rose-950/20 dark:border-rose-900/60"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-control bg-rose-100 text-[#E11D48] flex items-center justify-center shrink-0 dark:bg-rose-900/40 dark:text-rose-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
              </div>
              <div className="pr-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-[#E11D48] leading-snug dark:text-rose-400">
                    Danger zone
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono-numbers dark:bg-rose-900/40 dark:text-rose-300">
                    Irreversible
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed dark:text-rose-300">
                  Export your data or delete your account
                </p>
                <div className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-rose-700 font-medium font-mono-numbers dark:text-rose-300">
                  <span>Export format: JSON / Anonymized CSV • Account purge permanent</span>
                </div>
              </div>
            </div>
            <div className="text-rose-400 group-hover:text-rose-600 transition-colors pt-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * The settings hub (9.5 Task 2, screen #1; Phase 12 reconciliation) — account
 * summary strip + five section cards, each deep-linking to its route with an
 * honest status line.
 *
 * Composition anatomy adopted (`desktop_settings_screen`): section cards as
 * icon-chip rows (tinted lucide square, title + description, chevron affordance)
 * with the danger card in the rose treatment; the status chips stay inline.
 *
 * Honesty rules (the plan's "never a hard-coded 3 devices"): category/joining
 * date come from the profile API, push state from the browser's real
 * Notification.permission value, device count from GET /devices/. Any value
 * that cannot be known renders an explicit "unknown" state, never a guess.
 *
 * Annotation artifacts of the mock (DESIGN NOTE captions, dark-mapping strips,
 * the "Mode: Light" label) are deliberately absent — 09.5-CONTEXT §5.2.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronRight, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";

import { getProfile } from "@/api/profile";
import { listDevices } from "@/api/notifications";
import { isPushDenied } from "@/pwa/pushClient";
import { useAuth } from "@/context/AuthContext";
import { Disclaimer } from "@/components/Disclaimer";
import { SectionRetry } from "@/components/ErrorPanels";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { TYPOGRAPHY } from "@/theme/tokens";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/theme/badges";
import type { CandidateProfilePrivate } from "@/api/profile";
import type { ReactElement } from "react";

const CARD =
  "group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow dark:border-slate-800 dark:bg-slate-800 sm:p-5";
const CARD_ICON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300";
const CARD_TITLE = "text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300";
const STATUS_LINE = "text-xs text-slate-500 dark:text-slate-400";
const CHEVRON = "shrink-0 text-slate-300 transition-colors group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400";

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

/** The 2×2 account summary strip (screen #1). */
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

  const status = profile === null ? null : profile.current_status;
  const statusClasses =
    status === null
      ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
      : `${STATUS_BADGE_CLASSES[status].bg} ${STATUS_BADGE_CLASSES[status].text}`;

  return (
    <section
      aria-label="Account summary"
      data-testid="account-summary"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800 sm:p-5"
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className={TYPOGRAPHY.caption}>Name</dt>
          <dd className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {profile?.display_name ?? user?.email.split("@")[0] ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={TYPOGRAPHY.caption}>Email</dt>
          <dd className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">
            {user === null ? "unknown" : maskedEmail(user.email)}
          </dd>
        </div>
        <div>
          <dt className={TYPOGRAPHY.caption}>Verified</dt>
          <dd>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                user?.is_verified
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {user === null ? "unknown" : user.is_verified ? "Verified" : "Not verified"}
            </span>
          </dd>
        </div>
        <div>
          <dt className={TYPOGRAPHY.caption}>Member since</dt>
          <dd className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {user === null ? "unknown" : memberSince(user.created_at)}
          </dd>
        </div>
        <div>
          <dt className={TYPOGRAPHY.caption}>Category</dt>
          <dd className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {profile?.hiring_type ?? "unknown"}
          </dd>
        </div>
        <div>
          <dt className={TYPOGRAPHY.caption}>Status</dt>
          <dd>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses}`}>
              {status === null ? "unknown" : STATUS_LABELS[status]}
            </span>
          </dd>
        </div>
      </dl>
      {failed && (
        <div className="mt-3">
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
    </section>
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
        if (!cancelled) setDeviceCount(devices.filter((d) => d.is_active).length);
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
      : `${profile.hiring_type} • Joining date ${
          profile.expected_joining_date ?? "not set"
        }`;

  return (
    <SettingsLayout title="Settings" description="Your account, privacy, devices and data controls.">
      <AccountSummary />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/settings/profile" className={CARD} data-testid="card-profile">
          <span className="flex min-w-0 items-start gap-4">
            <span className={CARD_ICON} aria-hidden="true">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className={CARD_TITLE}>Profile information</span>
              <span className={`${STATUS_LINE} mt-0.5 block truncate`}>{categoryLine}</span>
            </span>
          </span>
          <ChevronRight className={`h-4 w-4 ${CHEVRON}`} aria-hidden="true" />
        </Link>
        <Link to="/settings/privacy" className={CARD} data-testid="card-privacy">
          <span className="flex min-w-0 items-start gap-4">
            <span className={CARD_ICON} aria-hidden="true">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className={CARD_TITLE}>Privacy &amp; visibility</span>
              <span className={`${STATUS_LINE} mt-0.5 block`}>
                {profile === null
                  ? "Visibility state unknown"
                  : profile.public_identity_mode === "ANONYMOUS"
                    ? "You appear as Anonymous Candidate"
                    : "Your display name is visible"}
              </span>
            </span>
          </span>
          <ChevronRight className={`h-4 w-4 ${CHEVRON}`} aria-hidden="true" />
        </Link>
        <Link to="/settings/devices" className={CARD} data-testid="card-devices">
          <span className="flex min-w-0 items-start gap-4">
            <span className={CARD_ICON} aria-hidden="true">
              <Bell className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className={CARD_TITLE}>Devices &amp; notifications</span>
              <span className={`${STATUS_LINE} mt-0.5 block`}>
                {push.label}
                {" • "}
                {deviceCount === null ? "devices unknown" : `${deviceCount} active device${deviceCount === 1 ? "" : "s"}`}
              </span>
              <span className={`${STATUS_LINE} mt-0.5 block`}>{push.detail}</span>
            </span>
          </span>
          <ChevronRight className={`h-4 w-4 ${CHEVRON}`} aria-hidden="true" />
        </Link>
        <Link to="/settings/security" className={CARD} data-testid="card-security">
          <span className="flex min-w-0 items-start gap-4">
            <span className={CARD_ICON} aria-hidden="true">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className={CARD_TITLE}>Security</span>
              <span className={`${STATUS_LINE} mt-0.5 block`}>Password, sessions and sign-out controls</span>
            </span>
          </span>
          <ChevronRight className={`h-4 w-4 ${CHEVRON}`} aria-hidden="true" />
        </Link>
        <Link
          to="/settings/danger"
          className="group flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-white p-4 shadow-sm transition-all hover:border-rose-300 hover:shadow dark:border-rose-900/60 dark:bg-slate-800 sm:p-5"
          data-testid="card-danger"
        >
          <span className="flex min-w-0 items-start gap-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
              aria-hidden="true"
            >
              <ShieldAlert className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="text-sm font-semibold text-rose-700 transition-colors group-hover:text-rose-800 dark:text-rose-300">
                Danger zone
              </span>
              <span className={`${STATUS_LINE} mt-0.5 block`}>
                Export, deactivate or permanently delete your account
              </span>
            </span>
          </span>
          <ChevronRight className={`h-4 w-4 ${CHEVRON}`} aria-hidden="true" />
        </Link>
      </div>
      <Disclaimer variant="footer" />
    </SettingsLayout>
  );
}

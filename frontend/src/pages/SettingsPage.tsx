/**
 * The settings overview (Phase 7 Anti-Slop Overhaul):
 * Replaces the 2×2 icon-in-tinted-square card grid with a flat, divided
 * architectural settings ledger paired with the persistent sub-navigation rail
 * in `SettingsLayout`.
 *
 * Honesty contracts preserved:
 * - Status lines come from real APIs (`GET /profile/`, `GET /devices/`, and
 *   `Notification.permission`);
 * - Explicit "unknown" states render when a request fails or is in-flight;
 * - Masked email (`u***@example.com`) and real status badge.
 */
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Eye,
  Lock,
  Mail,
  Smartphone,
  UserRound,
} from "lucide-react";

import { getProfile } from "@/api/profile";
import { listDevices } from "@/api/notifications";
import { isPushDenied } from "@/pwa/pushClient";
import { useAuth } from "@/context/AuthContext";
import { SectionRetry } from "@/components/ErrorPanels";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/theme/badges";
import type { CandidateProfilePrivate } from "@/api/profile";

const LEDGER_ROW =
  "group flex items-start justify-between gap-4 bg-white p-5 transition-colors duration-150 hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/70";
const ROW_TITLE =
  "text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300";
const ROW_SUB = "mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400";
const ROW_STATUS =
  "mt-2.5 inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono-code text-xs font-medium text-slate-600 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
const DOT = "h-1.5 w-1.5 rounded-full";

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
      className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-700 font-display text-base font-bold text-white dark:bg-brand-600">
          {initialsOf(name)}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
              {name}
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                user?.is_verified
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300"
              }`}
            >
              <Check
                className={`h-3.5 w-3.5 ${user?.is_verified ? "text-emerald-600" : "text-amber-600"}`}
                aria-hidden="true"
              />
              {user === null ? "unknown" : user.is_verified ? "Email verified" : "Email not verified"}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                status === null
                  ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
                  : `${STATUS_BADGE_CLASSES[status].bg} ${STATUS_BADGE_CLASSES[status].text}`
              }`}
            >
              <Mail className="h-3.5 w-3.5 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              {status === null ? "Status unknown" : STATUS_LABELS[status]}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono-code tabular-nums">
              {user === null ? "unknown" : maskedEmail(user.email)}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              •
            </span>
            <span className="font-mono-code tabular-nums">
              Member since {user === null ? "unknown" : memberSince(user.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-right">
        <span className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono-code text-xs text-slate-600 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          ID:{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {user === null ? "unknown" : user.id}
          </span>
        </span>
      </div>

      {failed && (
        <div className="w-full">
          <SectionRetry
            message="The account summary could not be loaded."
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
    <div className="flex max-w-3xl flex-col justify-between font-body antialiased">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
          >
            <Link
              to="/dashboard"
              className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            >
              Home
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-medium text-brand-700 dark:text-brand-300">Settings</span>
          </nav>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manage your account, privacy and notifications
          </p>
        </div>
      </div>

      <AccountSummary />

      <div className="mt-7 mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-tight text-slate-500 dark:text-slate-400">
          Configuration sections
        </h3>
      </div>

      {/* Flat divided architectural ledger replacing the 2x2 icon-in-square card grid */}
      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        <Link to="/settings/profile" data-testid="card-profile" className={LEDGER_ROW}>
          <div className="pr-2">
            <h4 className={`flex items-center gap-2 ${ROW_TITLE}`}>
              <UserRound
                className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400"
                aria-hidden="true"
              />
              <span>Profile</span>
            </h4>
            <p className={ROW_SUB}>Update your name, avatar, joining date and category</p>
            <div className={ROW_STATUS}>
              <span className={`${DOT} bg-brand-700 dark:bg-brand-400`} aria-hidden="true" />
              <span>{categoryLine}</span>
            </div>
          </div>
          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500"
            aria-hidden="true"
          />
        </Link>

        <Link to="/settings/privacy" data-testid="card-privacy" className={LEDGER_ROW}>
          <div className="pr-2">
            <h4 className={`flex items-center gap-2 ${ROW_TITLE}`}>
              <Eye
                className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400"
                aria-hidden="true"
              />
              <span>Privacy</span>
            </h4>
            <p className={ROW_SUB}>Control what other candidates can see</p>
            <div className={`${ROW_STATUS} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300`}>
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
          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500"
            aria-hidden="true"
          />
        </Link>

        <Link to="/settings/security" data-testid="card-security" className={LEDGER_ROW}>
          <div className="pr-2">
            <h4 className={`flex items-center gap-2 ${ROW_TITLE}`}>
              <Lock
                className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400"
                aria-hidden="true"
              />
              <span>Security</span>
            </h4>
            <p className={ROW_SUB}>Password, two-factor and active sessions</p>
            <div className={`${ROW_STATUS} border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300`}>
              <span className={`${DOT} bg-amber-500`} aria-hidden="true" />
              <span>2FA: not available yet</span>
            </div>
          </div>
          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500"
            aria-hidden="true"
          />
        </Link>

        <Link to="/settings/devices" data-testid="card-devices" className={LEDGER_ROW}>
          <div className="pr-2">
            <h4 className={`flex items-center gap-2 ${ROW_TITLE}`}>
              <Smartphone
                className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400"
                aria-hidden="true"
              />
              <span>Devices &amp; notifications</span>
            </h4>
            <p className={ROW_SUB}>Push alerts and registered devices</p>
            <div className={ROW_STATUS}>
              <span className={`${DOT} bg-brand-600 dark:bg-brand-400`} aria-hidden="true" />
              <span>
                {deviceCount === null
                  ? "devices unknown"
                  : `${deviceCount} active device${deviceCount === 1 ? "" : "s"}`}{" "}
                · {push.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{push.detail}</p>
          </div>
          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500"
            aria-hidden="true"
          />
        </Link>

        <Link
          to="/settings/danger"
          data-testid="card-danger"
          className="group flex items-start justify-between gap-4 border-l-2 border-l-rose-600 bg-rose-50/40 p-5 transition-colors duration-150 hover:bg-rose-50/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/40"
        >
          <div className="pr-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                aria-hidden="true"
              />
              <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                Danger zone
              </h4>
              <span className="rounded bg-rose-100 px-2 py-0.5 font-mono-code text-[10px] font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                Irreversible
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-rose-800 dark:text-rose-300">
              Export your data or delete your account
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 font-mono-code text-xs font-medium text-rose-700 dark:text-rose-300">
              <span>Export format: JSON / Anonymized CSV • Account purge permanent</span>
            </div>
          </div>
          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 text-rose-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-rose-600"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}

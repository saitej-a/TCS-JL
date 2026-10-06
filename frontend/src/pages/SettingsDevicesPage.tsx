/**
 * /settings/devices (9.5 Task 5, screen #4) — ported from
 * `tcs_joining_tracker_devices_notifications_settings` (Phase 16).
 *
 * The composition's markup is carried: the Home > Settings > Devices breadcrumb
 * with its chevrons, the `Devices & notifications` title block, the amber push
 * banner with its `Blocked` chip and "How to unblock" action, the 12-column grid
 * (7/5) with the alert-type card and the registered-devices card, the device
 * table with its laptop/phone glyphs and per-row Revoke, the bottom
 * "No other devices" card with its sign-out action, and the 44×24
 * `switch-toggle` control — whose behaviour lives in the composition's `<style>`
 * block and is carried into `styles/stitch-scopes.css`.
 *
 * What the screen says comes from the APIs and the browser, never from the mock:
 *
 * - the banner states the real `Notification.permission` (the denied copy names
 *   site settings, the only thing that can change it), and the amber "Blocked"
 *   treatment is the composition's own;
 * - the alert rows are the six real `NotificationPreferences` keys — the mock's
 *   "Survey and joining formalities" and "Weekly digest email" rows have no
 *   column behind them, and its `4 of 5 active` chip is the real tally;
 * - the table's rows are `GET /devices/`, so names, last-active times and the
 *   `This device` marker are real (`describeBrowser()`), and the mock's platform
 *   lines (`iOS 19.4 • PWA`, `Pixel 9 • WebPush Active`, `Ubuntu x86_64`) and its
 *   city badge are dropped — no API field backs them;
 * - `Enable push on this device` runs the real `subscribeToPush()` flow, and the
 *   panel's `ID:` is the matching device row's own id.
 *
 * Dropped and declared: the `Quiet hours schedule` block (the backend has no
 * such column and the page must not pretend it does), the page footer (the shell
 * owns it), and the mock's `Tokens refresh every 30 days` reassurance, which the
 * real token model does not promise.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  deleteDevice,
  getNotificationPreferences,
  listDevices,
  patchNotificationPreferences,
} from "@/api/notifications";
import type { NotificationPreferences } from "@/api/notifications";
import type { DeviceInfo } from "@/types/notifications";
import { SkeletonCard } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { describeBrowser, pushSupported, subscribeToPush } from "@/pwa/pushClient";
import type { ReactElement } from "react";

const DEVICE_TYPE_LABELS: Record<DeviceInfo["device_type"], string> = {
  WEB: "Browser (Web Push)",
  ANDROID: "Android (FCM)",
  IOS: "iOS (FCM)",
};

/** The row's second line: what the channel is, never a repeat of the name. */
const DEVICE_TYPE_DETAILS: Record<DeviceInfo["device_type"], string> = {
  WEB: "Web push registration",
  ANDROID: "Firebase Cloud Messaging",
  IOS: "Firebase Cloud Messaging",
};

/** The six real preference keys, in the composition's row order and grouping. */
const ALERT_ROWS: {
  key: keyof NotificationPreferences;
  label: string;
  detail: string;
  primary?: boolean;
}[] = [
  {
    key: "push_enabled",
    label: "Push alerts",
    detail: "The master switch for the push channel. In-app notifications always arrive.",
    primary: true,
  },
  {
    key: "notify_timeline_reminders",
    label: "Joining journey updates",
    detail: "Status changes from JL received to joined",
  },
  {
    key: "notify_on_comment",
    label: "Community replies and mentions",
    detail: "When someone answers your discussion post or quotes your timeline",
  },
  {
    key: "notify_on_reply",
    label: "Replies to your comments",
    detail: "When someone answers a comment you wrote",
  },
  {
    key: "notify_on_announcements",
    label: "Announcements from moderators",
    detail: "Critical batch advisory notices, verified wave pulses, and platform alerts",
  },
  {
    key: "notify_on_vote_milestone",
    label: "Upvote milestones",
    detail: "When a post of yours passes an upvote milestone",
  },
];

function formatLastSeen(iso: string | null): string {
  if (iso === null) return "never";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleString();
}

/**
 * The banner's copy for each real permission value. `tone` picks the card's
 * palette — the amber "Blocked" treatment the composition draws, the slate
 * "not enabled yet" one, and an emerald one for the granted state the mockup
 * does not draw (it only ever shows the blocked state).
 */
function permissionBanner(permission: string | undefined, pushEnabled: boolean): {
  tone: "ok" | "warn" | "off";
  chip: string;
  title: string;
  detail: string;
  unblockable: boolean;
} | null {
  if (!pushEnabled) {
    return {
      tone: "off",
      chip: "Off",
      title: "Push alerts are turned off",
      detail:
        "The master switch in Alert types is off, so no push is sent even where this browser allows it. Turn it back on to receive alerts.",
      unblockable: false,
    };
  }
  switch (permission) {
    case "granted":
      return {
        tone: "ok",
        chip: "Active",
        title: "Push alerts are on for this browser",
        detail: "Alerts appear even when the app is closed, subject to the alert types below.",
        unblockable: false,
      };
    case "denied":
      return {
        tone: "warn",
        chip: "Blocked",
        title: "Push alerts are blocked in this browser",
        detail:
          "Your browser is blocking notifications for this site. To turn them back on, open your browser site settings and allow notifications.",
        unblockable: true,
      };
    case "default":
      return {
        tone: "off",
        chip: "Not enabled",
        title: "Push alerts are not enabled yet",
        detail:
          "This browser has not been asked. Use the control on the right to subscribe this device.",
        unblockable: false,
      };
    default:
      return {
        tone: "off",
        chip: "Unknown",
        title: "Push availability unknown",
        detail: "This browser did not report a notification permission.",
        unblockable: false,
      };
  }
}

/** The per-tone palettes the banner's markup switches between. */
const TONES = {
  ok: {
    card: "bg-emerald-50/80 border border-emerald-200/90",
    icon: "bg-emerald-100 border border-emerald-200/80 text-emerald-700",
    title: "text-emerald-900",
    chip: "bg-emerald-200/80 text-emerald-900 border border-emerald-300/60",
    detail: "text-emerald-800",
    button: "border-emerald-300 text-emerald-900 hover:bg-emerald-100/60",
    glyph: "text-emerald-700",
    caption: "text-emerald-700/90",
  },
  warn: {
    card: "bg-amber-50/80 border border-amber-200/90",
    icon: "bg-amber-100 border border-amber-200/80 text-amber-700",
    title: "text-amber-900",
    chip: "bg-amber-200/80 text-amber-900 border border-amber-300/60",
    detail: "text-amber-800",
    button: "border-amber-300 text-amber-900 hover:bg-amber-100/60",
    glyph: "text-amber-700",
    caption: "text-amber-700/90",
  },
  off: {
    card: "bg-slate-50 border border-slate-200/90",
    icon: "bg-slate-100 border border-slate-200/80 text-slate-600",
    title: "text-slate-900",
    chip: "bg-slate-200/80 text-slate-800 border border-slate-300/60",
    detail: "text-slate-600",
    button: "border-slate-300 text-slate-800 hover:bg-slate-100/60",
    glyph: "text-slate-600",
    caption: "text-slate-500",
  },
} as const;

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

/** The composition's bell-off glyph, for the blocked banner. */
function BellOffGlyph(): ReactElement {
  return (
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
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
      <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export function SettingsDevicesPage(): ReactElement {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [showUnblock, setShowUnblock] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback((): (() => void) => {
    let cancelled = false;
    Promise.all([getNotificationPreferences(), listDevices()])
      .then(([nextPrefs, nextDevices]) => {
        if (cancelled) return;
        setPrefs(nextPrefs);
        setDevices(nextDevices);
        setFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  async function toggleAlert(key: keyof NotificationPreferences): Promise<void> {
    if (prefs === null) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic; rolled back on failure
    setSavingKey(key);
    try {
      const saved = await patchNotificationPreferences({ [key]: next[key] });
      setPrefs(saved);
    } catch {
      setPrefs(previous);
      toast({ message: "Could not save the alert setting. Please try again.", variant: "error" });
    } finally {
      setSavingKey(null);
    }
  }

  async function revoke(device: DeviceInfo): Promise<void> {
    setRevoking(device.id);
    try {
      await deleteDevice(device.id);
      // Refetch so the list reflects the server, not an optimistic guess.
      const fresh = await listDevices();
      setDevices(fresh);
      toast({ message: "Device revoked.", variant: "success" });
    } catch {
      toast({ message: "Could not revoke the device. Please try again.", variant: "error" });
    } finally {
      setRevoking(null);
    }
  }

  async function enablePush(): Promise<void> {
    setSubscribing(true);
    try {
      const outcome = await subscribeToPush();
      if (outcome === "subscribed") {
        toast({ message: "Push enabled for this device.", variant: "success" });
        load();
      } else if (outcome === "denied") {
        toast({
          message: "The browser blocked notifications. Allow them in site settings first.",
          variant: "error",
        });
      } else if (outcome === "unconfigured") {
        toast({ message: "Push is not configured on the server yet.", variant: "error" });
      } else if (outcome === "unsupported") {
        toast({ message: "This browser cannot receive push alerts.", variant: "error" });
      } else {
        toast({ message: "Could not enable push. Please try again.", variant: "error" });
      }
    } finally {
      setSubscribing(false);
    }
  }

  async function signOutEverywhere(): Promise<void> {
    setSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast({ message: "Could not sign out. Please try again.", variant: "error" });
      setSigningOut(false);
    }
  }

  const permission = typeof Notification === "undefined" ? undefined : Notification.permission;
  const banner = prefs === null ? null : permissionBanner(permission, prefs.push_enabled);
  const activeDevices = devices?.filter((d) => d.is_active) ?? [];
  const thisDevice = activeDevices.find(
    (d) => d.device_type === "WEB" && d.browser === describeBrowser(),
  );
  const activeAlerts =
    prefs === null ? 0 : ALERT_ROWS.filter(({ key }) => prefs[key] === true).length;
  const tone = banner === null ? null : TONES[banner.tone];

  return (
    <div className="skin-v2 max-w-[1040px] w-full font-body antialiased">
      <header className="mb-7">
        <nav
          className="flex items-center space-x-2 text-xs text-slate-500 mb-2 dark:text-slate-400"
          aria-label="Breadcrumb"
        >
          <Link to="/dashboard" className="hover:text-slate-800 transition-colors dark:hover:text-slate-200">
            Home
          </Link>
          <BreadcrumbChevron />
          <Link to="/settings" className="hover:text-slate-800 transition-colors dark:hover:text-slate-200">
            Settings
          </Link>
          <BreadcrumbChevron />
          <span className="font-medium text-slate-800 dark:text-slate-200">Devices</span>
        </nav>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Devices &amp; notifications
        </h2>
        <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
          Manage push alerts and the devices signed in to your account
        </p>
      </header>

      {(prefs === null || devices === null) && !failed && <SkeletonCard />}
      {failed && (
        <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
              Could not load your devices and preferences. Try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setPrefs(null);
                setDevices(null);
                load();
              }}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {prefs !== null && devices !== null && banner !== null && tone !== null && (
        <>
          <div
            data-testid="push-banner"
            role="status"
            className={`mb-6 rounded-[12px] p-4 sm:p-5 shadow-sm ${tone.card}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tone.icon}`}
              >
                <BellOffGlyph />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h3 className={`text-sm font-semibold ${tone.title}`}>{banner.title}</h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded font-mono-tabular ${tone.chip}`}
                  >
                    {banner.chip}
                  </span>
                </div>
                <p className={`text-xs mt-1 leading-relaxed max-w-2xl ${tone.detail}`}>
                  {banner.detail}
                </p>
                {banner.unblockable && (
                  <div className="mt-3 flex items-center gap-4">
                    <button
                      type="button"
                      aria-expanded={showUnblock}
                      onClick={() => setShowUnblock((current) => !current)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border text-xs font-semibold transition-colors shadow-xs ${tone.button}`}
                    >
                      <svg
                        className={`w-3.5 h-3.5 ${tone.glyph}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                      <span>How to unblock</span>
                    </button>
                    <span className={`text-[11px] font-medium ${tone.caption}`}>
                      We will not ask again automatically.
                    </span>
                  </div>
                )}
                {banner.unblockable && showUnblock && (
                  <ol className={`mt-3 space-y-1 text-[11px] list-decimal list-inside ${tone.detail}`}>
                    <li>Open this site's permissions from your browser's address bar.</li>
                    <li>Set Notifications to Allow.</li>
                    <li>Reload this page — the banner follows the browser, not the app.</li>
                  </ol>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-start mb-6">
            <section className="col-span-12 lg:col-span-7 bg-white rounded-[12px] border border-slate-200 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-800">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Alert types</h3>
                  <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                    Customize what you want to be notified about
                  </p>
                </div>
                <span className="text-xs font-semibold text-brand-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 font-mono-tabular dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-900/60">
                  {activeAlerts} of {ALERT_ROWS.length} active
                </span>
              </div>

              <div className="divide-y divide-slate-100 mt-1 dark:divide-slate-800">
                {ALERT_ROWS.map(({ key, label, detail, primary }) => (
                  <div className="py-4 flex items-center justify-between gap-4" key={key}>
                    <div className="pr-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {label}
                        </h4>
                        {primary === true && (
                          <span className="px-1.5 py-0.5 bg-sky-50 text-brand-700 text-[10px] font-medium rounded border border-sky-100 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-900/60">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{detail}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs[key]}
                      aria-label={label}
                      data-testid={`alert-${key}`}
                      disabled={savingKey === key}
                      onClick={() => void toggleAlert(key)}
                      className={`switch-toggle shrink-0 ${prefs[key] ? "active" : "inactive" } disabled:opacity-60`}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="col-span-12 lg:col-span-5 bg-white rounded-[12px] border border-slate-200 p-6 shadow-xs flex flex-col justify-between dark:border-slate-800 dark:bg-slate-800">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Registered devices
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                      Sessions authorized for your account
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-600 font-mono-tabular dark:bg-slate-700 dark:text-slate-300">
                    {activeDevices.length} online
                  </span>
                </div>

                {/* The composition's in-browser push control, wired to the real
                    subscription flow; the id is the matching device row's own. */}
                <div className="my-3.5 p-3 rounded-lg bg-sky-50/60 border border-sky-100 dark:bg-brand-950/40 dark:border-brand-900/60">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-brand-900 dark:text-brand-300">
                      For this browser only
                    </span>
                    {thisDevice !== undefined && (
                      <span className="text-[10px] text-slate-500 font-mono-tabular dark:text-slate-400">
                        ID: {thisDevice.id}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mb-2.5 leading-snug dark:text-slate-400">
                    {thisDevice === undefined
                      ? "Subscribe this local browser session to receive web push packets."
                      : "This browser is already subscribed. Revoke its row below to stop receiving web push packets here."}
                  </p>
                  <button
                    type="button"
                    data-testid="enable-push"
                    disabled={subscribing || thisDevice !== undefined || !pushSupported()}
                    onClick={() => void enablePush()}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    <span>
                      {subscribing
                        ? "Subscribing…"
                        : thisDevice === undefined
                          ? "Enable push on this device"
                          : "Push active on this device"}
                    </span>
                  </button>
                </div>

                {activeDevices.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No active devices. Subscribe this browser above to register it.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono-tabular dark:border-slate-800 dark:text-slate-500">
                          <th className="py-2 pr-2 text-left font-semibold">Device</th>
                          <th className="py-2 px-2 text-left font-semibold">Last active</th>
                          <th className="py-2 pl-2 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeDevices.map((device) => (
                          <tr
                            key={device.id}
                            data-testid="device-row"
                            className="group hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-700/40"
                          >
                            <td className="py-3 pr-2">
                              <div className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5 dark:bg-slate-700 dark:text-slate-300">
                                  {device.device_type === "WEB" ? (
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
                                      <rect width="18" height="12" x="3" y="4" rx="2" />
                                      <line x1="2" x2="22" y1="20" y2="20" />
                                    </svg>
                                  ) : (
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
                                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                                      <line x1="12" x2="12.01" y1="18" y2="18" />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-slate-900 truncate dark:text-slate-100">
                                      {device.browser === ""
                                        ? DEVICE_TYPE_LABELS[device.device_type]
                                        : device.browser}
                                    </span>
                                    {device.id === thisDevice?.id && (
                                      <span
                                        data-testid="this-device"
                                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-brand-800 border border-sky-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-900/60"
                                      >
                                        This device
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono-tabular">
                                    {DEVICE_TYPE_DETAILS[device.device_type]}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 align-middle">
                              <span className="font-mono-tabular text-[11px] text-slate-600 dark:text-slate-300">
                                Last active {formatLastSeen(device.last_seen_at)}
                              </span>
                            </td>
                            <td className="py-3 pl-2 text-right align-middle">
                              <button
                                type="button"
                                data-testid={`revoke-${device.id}`}
                                disabled={revoking !== null}
                                onClick={() => void revoke(device)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded font-medium text-xs transition-colors disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              >
                                {revoking === device.id ? "Revoking…" : "Revoke"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono-tabular dark:border-slate-800 dark:text-slate-400">
                <span>Refresh tokens rotate on every use</span>
                <span className="text-emerald-700 font-medium dark:text-emerald-400">
                  ● {activeDevices.length} signed-in key{activeDevices.length === 1 ? "" : "s"}
                </span>
              </div>
            </section>
          </div>

          {activeDevices.length <= 1 && (
            <section className="rounded-[12px] bg-white border border-slate-200 border-dashed p-6 shadow-xs mb-10 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300">
                    <svg
                      className="w-5 h-5 text-slate-600 dark:text-slate-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      No other devices
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                      You are only signed in here. Devices appear after you sign in elsewhere.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {confirmingSignOut ? (
                    <div className="flex items-center gap-2" data-testid="signout-confirm">
                      <button
                        type="button"
                        onClick={() => setConfirmingSignOut(false)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg transition-colors dark:text-slate-300 dark:hover:text-slate-100"
                      >
                        Keep me signed in
                      </button>
                      <button
                        type="button"
                        data-testid="signout-confirm-yes"
                        disabled={signingOut}
                        onClick={() => void signOutEverywhere()}
                        className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {signingOut ? "Signing out…" : "Sign out everywhere"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="signout-everywhere"
                      onClick={() => setConfirmingSignOut(true)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-200 flex items-center gap-1.5 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:border-rose-900/60"
                    >
                      <svg
                        className="w-3.5 h-3.5"
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
                        <line x1="21" x2="9" y1="12" y2="12" />
                      </svg>
                      <span>Sign out everywhere</span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

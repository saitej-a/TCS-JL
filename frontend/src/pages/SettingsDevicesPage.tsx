/**
 * /settings/devices (9.5 Task 5, screen #4) — push-state banner from the real
 * Notification.permission, alert-type toggles over /notifications/preferences/,
 * and the registered device list from GET /devices/ with Revoke.
 *
 * Honesty rules (the plan's acceptance items):
 * - The banner states the actual permission value; the denied copy says what
 *   the user CAN do (site settings) and never promises an in-app re-prompt
 *   the browser will not deliver.
 * - Quiet hours: the backend has NO quiet-hours field (07 §3.3 / 6.2 shipped
 *   no such column) — no fake control is rendered.
 * - Revoke = DELETE /devices/{id}/ (soft deactivate). The F-94-1 routing rule
 *   is untouched: this row action revokes exactly the row it is on.
 *
 * Phase 12 reconciliation: cards adopt the composition's bordered-header
 * anatomy; the push banner, switches and device rows are unchanged.
 */
import { useCallback, useEffect, useState } from "react";

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
import { describeBrowser } from "@/pwa/pushClient";
import { SettingsLayout } from "@/layouts/SettingsLayout";
import { TYPOGRAPHY } from "@/theme/tokens";
import type { ReactElement } from "react";

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";
const CARD_HEAD = "border-b border-slate-100 p-4 pb-3.5 dark:border-slate-800 sm:p-5 sm:pb-4";
const CARD_BODY = "p-4 pt-4 sm:p-5 sm:pt-4";
const ROW =
  "flex items-start justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0";

const ALERT_TOGGLES: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "notify_on_comment", label: "Comments on your posts" },
  { key: "notify_on_reply", label: "Replies to your comments" },
  { key: "notify_on_vote_milestone", label: "Upvote milestones" },
  { key: "notify_on_announcements", label: "Community announcements" },
  { key: "notify_timeline_reminders", label: "Timeline reminders" },
  { key: "push_enabled", label: "Push alerts (master switch)" },
];

const DEVICE_TYPE_LABELS: Record<DeviceInfo["device_type"], string> = {
  WEB: "Browser (Web Push)",
  ANDROID: "Android (FCM)",
  IOS: "iOS (FCM)",
};

function formatLastSeen(iso: string | null): string {
  if (iso === null) return "never";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleString();
}

/** The banner's copy for each real permission value. */
function permissionBanner(permission: string | undefined, pushEnabled: boolean): {
  tone: "ok" | "warn" | "off";
  title: string;
  detail: string;
} | null {
  if (!pushEnabled) {
    return {
      tone: "off",
      title: "Push alerts are turned off",
      detail: "Alert-type switches below control the push channel; re-enable the master switch to receive alerts again.",
    };
  }
  switch (permission) {
    case "granted":
      return {
        tone: "ok",
        title: "Push alerts are on for this browser",
        detail: "Alerts appear even when the app is closed, subject to the alert types below.",
      };
    case "denied":
      return {
        tone: "off",
        title: "This browser is blocking notifications",
        detail:
          "To receive alerts, allow notifications for this site in your browser's site settings (the padlock icon). The app cannot re-ask on its own.",
      };
    case "default":
      return {
        tone: "warn",
        title: "Push alerts are not enabled yet",
        detail: "Enable alerts from the Notifications page to start receiving push.",
      };
    default:
      return {
        tone: "warn",
        title: "Push availability unknown",
        detail: "This browser did not report a notification permission.",
      };
  }
}

export function SettingsDevicesPage(): ReactElement {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

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
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic; rolled back on failure
    try {
      const saved = await patchNotificationPreferences({ [key]: next[key] });
      setPrefs(saved);
    } catch {
      setPrefs(prefs);
      toast({ message: "Could not save the alert setting. Please try again.", variant: "error" });
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

  const permission =
    typeof Notification === "undefined" ? undefined : Notification.permission;
  const banner =
    prefs === null ? null : permissionBanner(permission, prefs.push_enabled);
  const activeDevices = devices?.filter((d) => d.is_active) ?? [];

  return (
    <SettingsLayout
      title="Devices & notifications"
      description="Push alert settings and the devices registered to your account."
    >
      {prefs === null && devices === null && !failed && <SkeletonCard />}
      {failed && (
        <div className={CARD}>
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Could not load your devices and preferences. Try again in a moment.
          </p>
        </div>
      )}

      {prefs !== null && devices !== null && (
        <>
          {banner !== null && (
            <div
              data-testid="push-banner"
              role="status"
              className={`rounded-xl border p-4 text-sm ${
                banner.tone === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : banner.tone === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <p className="font-semibold">{banner.title}</p>
              <p className="mt-0.5 text-xs opacity-90">{banner.detail}</p>
            </div>
          )}

          <section className={CARD} aria-label="Alert types">
            <div className={CARD_HEAD}>
              <h2 className={TYPOGRAPHY.cardTitle}>Alert types</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                These control the push channel. In-app notifications always arrive.
              </p>
            </div>
            <div className={`${CARD_BODY} mt-0`}>
              {ALERT_TOGGLES.map(({ key, label }) => (
                <div className={ROW} key={key}>
                  <p className="min-w-0 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {label}
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[key]}
                    aria-label={label}
                    data-testid={`alert-${key}`}
                    disabled={revoking !== null}
                    onClick={() => void toggleAlert(key)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      prefs[key] ? "bg-brand-700 dark:bg-brand-500" : "bg-slate-300 dark:bg-slate-600"
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        prefs[key] ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={CARD} aria-label="Registered devices">
            <div className={CARD_HEAD}>
              <h2 className={TYPOGRAPHY.cardTitle}>Registered devices</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Browsers registered for push on your account.
              </p>
            </div>
            {activeDevices.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                No active devices. Enable push alerts from the Notifications page to register
                this browser.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {activeDevices.map((device) => (
                  <li key={device.id} className="flex items-center justify-between gap-3 py-3" data-testid="device-row">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {DEVICE_TYPE_LABELS[device.device_type]}
                        {device.browser !== "" && ` — ${device.browser}`}
                        {/* The real "this device" marker: same UA-derived label
                            the 9.4 registration stores, matching a WEB row. */}
                        {device.device_type === "WEB" &&
                          device.browser === describeBrowser() && (
                            <span
                              data-testid="this-device"
                              className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                            >
                              this device
                            </span>
                          )}
                      </p>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        Last active {formatLastSeen(device.last_seen_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid={`revoke-${device.id}`}
                      disabled={revoking !== null}
                      onClick={() => void revoke(device)}
                      className="shrink-0 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    >
                      {revoking === device.id ? "Revoking…" : "Revoke"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </SettingsLayout>
  );
}

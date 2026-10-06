/**
 * Firebase Cloud Messaging browser registration.
 *
 * Flow:
 *   1. the primer's "Enable Alerts" (caller's job — `subscribeToPush` is only
 *      ever invoked from that button, and `askNotificationPermission` below is
 *      the app's ONLY caller of `Notification.requestPermission()`);
 *   2. ask for permission (never before step 1);
 *   3. acquire an FCM token using the configured Firebase VAPID key and app SW;
 *   4. register the token as a FIREBASE_WEB device.
 *
 * A denial is persisted and never re-prompted (§10.1), matching the browser's
 * own "don't nag" rule: re-prompting a denied origin is a silent no-op.
 */
import { apiPost } from "@/api/client";
import {
  getFirebaseMessagingToken,
  isFirebaseMessagingConfigured,
} from "@/pwa/firebaseMessaging";
import { registerServiceWorker } from "@/pwa/registerSW";

export const PUSH_DENIED_FLAG = "tjt.push_denied";

export type PushOutcome =
  | "subscribed"
  | "denied"
  | "unsupported"
  | "unconfigured"
  | "failed";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function isPushDenied(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(PUSH_DENIED_FLAG) === "1";
}

export function markPushDenied(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PUSH_DENIED_FLAG, "1");
}

/** A ≤64-char browser label for the device row (the serializer's max length). */
export function describeBrowser(agent = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const candidates: ReadonlyArray<readonly [string, RegExp]> = [
    ["Edge", /Edg\//],
    ["Opera", /OPR\//],
    ["Firefox", /Firefox\//],
    ["Chrome", /Chrome\//],
    ["Safari", /Safari\//],
  ];
  const match = candidates.find(([, pattern]) => pattern.test(agent));
  return (match?.[0] ?? "Browser").slice(0, 64);
}

async function registerFirebaseToken(registration: ServiceWorkerRegistration): Promise<void> {
  const token = await getFirebaseMessagingToken(registration);
  if (!token) throw new Error("Firebase returned an empty browser registration token.");
  await apiPost("/devices/", {
    fcm_token: token,
    device_type: "FIREBASE_WEB",
    browser: describeBrowser(),
  });
}

/** Refresh the server's token record when an already-enabled user returns. */
export async function refreshPushRegistration(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  if (
    !isFirebaseMessagingConfigured() ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }
  await registerFirebaseToken(registration);
}

/**
 * Ask for notification permission — and never ask an origin that has already
 * answered (§10.1's "a denial is never re-prompted").
 *
 * The state check is load-bearing, not a micro-optimisation. On an origin the
 * browser has already blocked, `requestPermission()` may never settle (no dialog
 * can be raised), which left the primer's button permanently disabled and the
 * denial unpersisted — so the primer re-offered every session, the exact opposite
 * of the rule (9.4 F-94-2). An existing `denied`/`granted` state *is* the answer.
 *
 * A rejected call is not a denial: it returns `null` so the caller reports
 * `"failed"` without recording a decision the user never made.
 */
async function askNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return null;
  }
}

/**
 * Run the Firebase subscription flow. Every failure mode returns a value
 * instead of throwing: the caller is a modal that must close either way.
 */
export async function subscribeToPush(): Promise<PushOutcome> {
  if (!pushSupported()) return "unsupported";
  if (isPushDenied()) return "denied";
  if (!isFirebaseMessagingConfigured()) return "unconfigured";

  const permission = await askNotificationPermission();
  if (permission === null) return "failed";
  if (permission !== "granted") {
    // Already denied elsewhere, or refused just now: persist it so the primer
    // never asks again, and let the caller say why alerts stay off.
    markPushDenied();
    return "denied";
  }

  const registration = await registerServiceWorker();
  if (registration === null) return "failed";

  try {
    await registerFirebaseToken(registration);
    return "subscribed";
  } catch {
    return "failed";
  }
}

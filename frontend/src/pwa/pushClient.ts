/**
 * Web Push subscription client (9.4 Task 8, decision D2).
 *
 * Flow, in the order §10.1 requires:
 *   1. the primer's "Enable Alerts" (caller's job — `subscribeToPush` is only
 *      ever invoked from that button, and it is the app's ONLY caller of
 *      `Notification.requestPermission()`);
 *   2. read the VAPID public key from the anonymous endpoint;
 *   3. ask for permission (never before step 1);
 *   4. `PushManager.subscribe({userVisibleOnly: true, applicationServerKey})`;
 *   5. register the subscription as a WEB device — the 6.2 contract stores the
 *      subscription JSON in the token column, which is exactly what
 *      `WebPushBackend` parses back into `subscription_info`.
 *
 * A denial is persisted and never re-prompted (§10.1), matching the browser's
 * own "don't nag" rule: re-prompting a denied origin is a silent no-op.
 */
import { apiGet, apiPost } from "@/api/client";
import { registerServiceWorker } from "@/pwa/registerSW";

/** The anonymous, cached endpoint Task 8 adds (public key only). */
export const VAPID_KEY_PATH = "/devices/vapid-key/";

export const PUSH_DENIED_FLAG = "tjt.push_denied";

export interface VapidKeyPayload {
  public_key: string;
  configured: boolean;
}

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

/** Base64url VAPID key → the bytes `applicationServerKey` expects. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export function getVapidKey(): Promise<VapidKeyPayload> {
  return apiGet<VapidKeyPayload>(VAPID_KEY_PATH);
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

/**
 * Run the subscription flow. Every failure mode returns a value instead of
 * throwing: the caller is a modal that must close either way.
 */
export async function subscribeToPush(): Promise<PushOutcome> {
  if (!pushSupported()) return "unsupported";
  if (isPushDenied()) return "denied";

  let key: VapidKeyPayload;
  try {
    key = await getVapidKey();
  } catch {
    return "failed";
  }
  // No key configured server-side: subscribing would fail in the browser with
  // an opaque `InvalidStateError`, so the UI skips it and can say why.
  if (!key.configured || key.public_key.trim() === "") return "unconfigured";

  const alreadyGranted =
    typeof Notification !== "undefined" && Notification.permission === "granted";
  const permission = alreadyGranted ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    markPushDenied();
    return "denied";
  }

  const registration = await registerServiceWorker();
  if (registration === null) return "failed";

  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key.public_key),
      }));

    await apiPost("/devices/", {
      fcm_token: JSON.stringify(subscription.toJSON()),
      device_type: "WEB",
      browser: describeBrowser(),
    });
    return "subscribed";
  } catch {
    return "failed";
  }
}

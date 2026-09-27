/**
 * Service-worker registration and connectivity (9.4 Task 8).
 *
 * The registration is explicit rather than injected: vite.config.ts sets
 * `injectRegister: null`, so this module is the app's only registration path —
 * one code path, testable, and no invisible second worker in index.html.
 *
 * Everything degrades silently. An unregistered worker costs the visitor
 * installability and offline reads; it must never cost them the page.
 */

/** vite-plugin-pwa's generated worker, at the site root. */
export const SW_URL = "/sw.js";

/** §10.1's offline banner is driven by the browser, not by the worker. */
export const OFFLINE_COPY = "⚠️ Offline Mode. Showing cached data. Actions will sync when online.";

export function swSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export async function registerServiceWorker(
  swUrl: string = SW_URL,
): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null;
  try {
    return await navigator.serviceWorker.register(swUrl, { scope: "/" });
  } catch {
    // Dev server without the plugin's dev SW, an unsupported browser, or a
    // blocked registration — all recoverable by simply not being offline-ready.
    return null;
  }
}

/** `navigator.onLine` is optimistic (it reports link state, not reachability). */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** Subscribe to connectivity transitions; returns the unsubscribe function. */
export function subscribeConnectivity(listener: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleOnline = (): void => listener(true);
  const handleOffline = (): void => listener(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * A push `notificationclick` arrives as a message from the worker (an open tab
 * is focused and told where to go) — never as a raw URL the page follows.
 */
export const PUSH_CLICK_MESSAGE = "push-click";

export function subscribePushClicks(listener: (target: string) => void): () => void {
  if (!swSupported()) return () => undefined;
  const handler = (event: MessageEvent): void => {
    const data = event.data as { type?: unknown; clickAction?: unknown } | null;
    if (data !== null && typeof data === "object" && data.type === PUSH_CLICK_MESSAGE) {
      listener(resolveClickAction(data.clickAction));
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => {
    navigator.serviceWorker.removeEventListener("message", handler);
  };
}

/**
 * §10.1's deep link. The payload carries an SPA route (`/community/posts/<id>`,
 * `/dashboard`); anything that is not a site-relative path is refused rather
 * than followed, so a hostile push cannot navigate the app off-origin.
 */
export function resolveClickAction(clickAction: unknown): string {
  if (typeof clickAction !== "string") return "/dashboard";
  const path = clickAction.trim();
  if (path === "" || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

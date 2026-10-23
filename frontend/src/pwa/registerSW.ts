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

/**
 * vite-plugin-pwa's worker URL. In a production build the generated worker is
 * `/sw.js`; under `vite dev` with `devOptions.enabled` the plugin serves its
 * dev worker at `/dev-sw.js?dev-sw` — same registration flow, same scope, so
 * the drill (and local sessions) exercise the real path instead of a 404 shim
 * that would make every registration fail silently.
 */
export const SW_URL =
  typeof import.meta.env !== "undefined" && import.meta.env.DEV
    ? "/dev-sw.js?dev-sw"
    : "/sw.js";

/** §10.1's offline banner is driven by the browser, not by the worker. */
/**
 * §10.1's offline line, in two parts so the banner can style the state name
 * (Phase 12 Task 12: the composition's offline artboard).
 *
 * The v1 string promised "Actions will sync when online" — this app has no
 * Background Sync queue and no optimistic write persistence, so that promise is
 * not shippable. What is true: the worker serves cached reads, and a write made
 * offline is simply not saved.
 */
export const OFFLINE_TITLE = "Offline mode.";
export const OFFLINE_COPY =
  "Showing cached data. Changes you make now are not saved until you reconnect.";

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

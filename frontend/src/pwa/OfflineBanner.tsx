/**
 * §10.1's offline strip, restyled to the PWA-states composition (Phase 12
 * Task 12): amber bar, offline icon, the state line, and a retry control.
 *
 * It reads `navigator.onLine` plus the `online`/`offline` events — the SW is
 * never consulted, so the banner works before (or without) a registered worker.
 *
 * The composition's banner also promises a background sync queue, a
 * "Cached 14m ago" timestamp and an action count. None of that exists here (no
 * Background Sync, no persisted cache timestamp), so the copy states what is
 * true: reads come from the service worker's cache and writes do not queue.
 */
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { OFFLINE_COPY, OFFLINE_TITLE, isOnline, subscribeConnectivity } from "@/pwa/registerSW";

export function OfflineBanner(): React.ReactElement | null {
  const [online, setOnline] = useState<boolean>(() => isOnline());

  useEffect(() => subscribeConnectivity(setOnline), []);

  if (online) return null;

  return (
    <div
      data-testid="offline-banner"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-amber-100 px-4 py-2 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <span className="flex items-center gap-2">
        <WifiOff aria-hidden="true" className="h-4 w-4" />
        <span role="status" className="text-xs font-medium">
          <strong className="font-semibold">{OFFLINE_TITLE}</strong> {OFFLINE_COPY}
        </span>
      </span>
      {/* Retry is a reload: the honest meaning of "try the network again" for a
          page whose failed reads are its only pending work. */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200/60 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
      >
        Retry connection
      </button>
    </div>
  );
}

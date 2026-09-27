/**
 * §10.1's offline strip: an amber, non-blocking banner at the top of the page
 * whenever the browser reports itself offline.
 *
 * It reads `navigator.onLine` plus the `online`/`offline` events — the SW is
 * never consulted, so the banner works before (or without) a registered worker.
 */
import { useEffect, useState } from "react";

import { OFFLINE_COPY, isOnline, subscribeConnectivity } from "@/pwa/registerSW";

export function OfflineBanner(): React.ReactElement | null {
  const [online, setOnline] = useState<boolean>(() => isOnline());

  useEffect(() => subscribeConnectivity(setOnline), []);

  if (online) return null;

  return (
    <div
      role="status"
      data-testid="offline-banner"
      className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
    >
      {OFFLINE_COPY}
    </div>
  );
}

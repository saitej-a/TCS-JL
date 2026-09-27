/**
 * The PWA layer (9.4 Task 8): everything §10.1 adds to the running app, in one
 * component the shells mount — the offline strip, the install promotion, the
 * push primer, service-worker registration, and the two pieces of bookkeeping
 * the promotion's trigger depends on.
 *
 * Mounted by AppShell, so it exists on public and authenticated routes alike
 * (an offline visitor reading the community should be told why the data is
 * stale), and it lives inside the router, which is what lets the primer's
 * outcome and a push `notificationclick` drive navigation.
 *
 * Priming rule (recorded decision): the primer is offered on `/notifications`
 * only. That is the surface whose value the copy describes, so the ask arrives
 * where the answer matters instead of interrupting an unrelated page.
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useOptionalToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { InstallPrompt } from "@/pwa/InstallPrompt";
import { OfflineBanner } from "@/pwa/OfflineBanner";
import {
  PushPrimer,
  dismissPrimerForSession,
  primerDismissedThisSession,
} from "@/pwa/PushPrimer";
import { isPushDenied, pushSupported, type PushOutcome } from "@/pwa/pushClient";
import { recordCommunityVisit } from "@/pwa/installSignals";
import { registerServiceWorker, subscribePushClicks } from "@/pwa/registerSW";

/** Where the primer may appear (see the module docstring). */
export const PRIMER_ROUTE = "/notifications";

export function PwaLayer(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  // Chrome must survive a tree without the provider (see useOptionalToast).
  const toastApi = useOptionalToast();
  const [primerOpen, setPrimerOpen] = useState(false);

  // Register once per page load; failures are silent (registerSW.ts).
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  // §10.1's second install trigger: distinct visit days to the community.
  useEffect(() => {
    if (location.pathname.startsWith("/community")) recordCommunityVisit();
  }, [location.pathname]);

  // A focused tab is told where the push's deep link points.
  useEffect(() => subscribePushClicks((target) => navigate(target)), [navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (location.pathname !== PRIMER_ROUTE) return;
    if (!pushSupported() || isPushDenied() || primerDismissedThisSession()) return;
    setPrimerOpen(true);
  }, [isAuthenticated, location.pathname]);

  function handlePrimerClose(outcome: PushOutcome | null): void {
    setPrimerOpen(false);
    dismissPrimerForSession();
    if (outcome === "subscribed") {
      toastApi?.toast({ message: "Push alerts are on for this device.", variant: "success" });
      return;
    }
    if (outcome === "denied") {
      // Persisted by the client; the primer will not offer this again.
      toastApi?.toast({
        message: "Push alerts stay off. You can enable them in your browser settings.",
        variant: "info",
      });
      return;
    }
    if (outcome === "unconfigured") {
      toastApi?.toast({ message: "Push alerts are not available right now.", variant: "info" });
      return;
    }
    if (outcome === "failed" || outcome === "unsupported") {
      toastApi?.toast({
        message: "Push alerts could not be enabled on this device.",
        variant: "error",
      });
    }
  }

  return (
    <>
      <OfflineBanner />
      <InstallPrompt />
      <PushPrimer open={primerOpen} onClose={handlePrimerClose} />
    </>
  );
}

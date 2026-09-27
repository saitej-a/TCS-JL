/**
 * §10.1's install promotion (9.4 Task 8).
 *
 * Two conditions must BOTH hold before it renders:
 *   - a `beforeinstallprompt` event has been captured (so the button can
 *     actually install — a banner that cannot install is a dark pattern), and
 *   - §10.1's usage trigger is met (`installSignals.installTriggerMet()`).
 *
 * "Not now" is a permanent dismissal: the copy table offers no third state, and
 * re-showing a refused install prompt is exactly the nagging the spec forbids.
 */
import { useEffect, useState } from "react";

import { TYPOGRAPHY } from "@/theme/tokens";
import { dismissInstallPrompt, installTriggerMet, isInstallDismissed } from "@/pwa/installSignals";

/** The Chromium-only install event (not in the DOM lib's typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const INSTALL_TITLE = "Install TJT Tracker";
export const INSTALL_BODY =
  "Add the tracker to your home screen for instant updates on your joining letter status.";
export const INSTALL_ACCEPT = "Install App";
export const INSTALL_DISMISS = "Not now";

export function InstallPrompt(): React.ReactElement | null {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => isInstallDismissed());

  useEffect(() => {
    const handler = (event: Event): void => {
      // Suppress the browser's own mini-infobar: §10.1 decides when to promote.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (promptEvent === null || dismissed || !installTriggerMet()) return null;

  async function handleInstall(): Promise<void> {
    if (promptEvent === null) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setPromptEvent(null);
      return;
    }
    dismissInstallPrompt();
    setDismissed(true);
  }

  function handleDismiss(): void {
    dismissInstallPrompt();
    setDismissed(true);
  }

  return (
    <div
      data-testid="install-prompt"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="min-w-0">
        <p className={`${TYPOGRAPHY.subheadLabel} text-slate-900 dark:text-slate-100`}>
          {INSTALL_TITLE}
        </p>
        <p className={`${TYPOGRAPHY.caption} mt-0.5`}>{INSTALL_BODY}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          data-testid="install-accept"
          onClick={handleInstall}
          className="flex min-h-[40px] items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          {INSTALL_ACCEPT}
        </button>
        <button
          type="button"
          data-testid="install-dismiss"
          onClick={handleDismiss}
          className="flex min-h-[40px] items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {INSTALL_DISMISS}
        </button>
      </div>
    </div>
  );
}

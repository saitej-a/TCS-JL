/**
 * §10.1's install promotion (9.4 Task 8), restyled to the PWA-states
 * composition (Phase 12 Task 12): icon chip, title with an "Offline & fast"
 * pill, body, and the dismissal note the composition places under the actions.
 *
 * Two conditions must BOTH hold before it renders:
 *   - a `beforeinstallprompt` event has been captured (so the button can
 *     actually install — a banner that cannot install is a dark pattern), and
 *   - §10.1's usage trigger is met (`installSignals.installTriggerMet()`).
 *
 * "Not now" is a permanent dismissal: the copy table offers no third state, and
 * re-showing a refused install prompt is exactly the nagging the spec forbids.
 * The composition's note ("Can be dismissed or re-enabled in Settings") is
 * therefore not shippable as written — nothing in Settings re-enables it; the
 * note below says instead how to install after declining.
 */
import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

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
      className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
            <Smartphone aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className={`${TYPOGRAPHY.subheadLabel} text-slate-900 dark:text-slate-100`}>
                {INSTALL_TITLE}
              </span>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Offline &amp; fast
              </span>
            </p>
            <p className={`${TYPOGRAPHY.caption} mt-0.5`}>{INSTALL_BODY}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="install-dismiss"
            onClick={handleDismiss}
            className="flex min-h-[40px] items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {INSTALL_DISMISS}
          </button>
          <button
            type="button"
            data-testid="install-accept"
            onClick={handleInstall}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-800"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {INSTALL_ACCEPT}
          </button>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-5xl text-[11px] text-slate-500 dark:text-slate-400">
        Shown after you add a timeline milestone or visit the community on two different days. Choosing
        &ldquo;{INSTALL_DISMISS}&rdquo; hides this for good — you can still install from your browser menu.
      </p>
    </div>
  );
}

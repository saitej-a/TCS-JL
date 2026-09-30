/**
 * §10.1's push primer (9.4 Task 8), rebuilt to the PWA-states composition
 * (Phase 12 Task 12): icon disc header, the value rows, the trust line the
 * composition places under the actions, and the two-button footer.
 *
 * The browser prompt fires ONLY from here, and only after "Enable Alerts" — a
 * visitor who never accepts it never sees a native permission dialog, so the
 * origin keeps its one shot at a real answer. "Maybe later" dismisses for the
 * session (sessionStorage), not forever.
 *
 * The composition's value rows are re-pointed at the notification types the
 * backend actually sends (`Notification.NotificationType`): the mockup's
 * "wave alerts for 2025 Digital & Ninja batches", "zero advertising" and
 * "filtered for Hyderabad and Bengaluru hubs" claims describe batch/region
 * targeting and an ad system this project does not have.
 *
 * The mount decision (when the primer is eligible to appear) lives in
 * `PwaLayer`; this component is the modal and its copy.
 */
import { useState } from "react";
import { Megaphone, MessageSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { subscribeToPush, type PushOutcome } from "@/pwa/pushClient";

export const PRIMER_TITLE = "Enable push notifications?";
export const PRIMER_BODY =
  "Enable push notifications so you never miss when a candidate reports joining letter updates for your batch.";
export const PRIMER_ACCEPT = "Enable Alerts";
export const PRIMER_DISMISS = "Maybe later";

/** The composition's trust line — true as written: the primer is the only trigger. */
export const PRIMER_TRUST =
  "Your browser will ask for permission only after you choose Enable Alerts, and you can revoke it any time in your browser settings.";

/** The composition's value rows, mapped to the types the backend actually sends. */
const PRIMER_VALUES = [
  {
    icon: MessageSquare,
    title: "Replies to your posts and comments",
    body: "A push whenever another candidate replies to something you wrote.",
  },
  {
    icon: Megaphone,
    title: "Community announcements",
    body: "Moderator announcements reach you as they are published.",
  },
  {
    icon: Sparkles,
    title: "Milestone reactions and reminders",
    body: "Reactions on your timeline entries, plus your own timeline reminders.",
  },
] as const;

/** Session-scoped: a refusal lasts the visit, not the device. */
export const PRIMER_SESSION_KEY = "tjt.push_primer_dismissed";

export function primerDismissedThisSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PRIMER_SESSION_KEY) === "1";
}

export function dismissPrimerForSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PRIMER_SESSION_KEY, "1");
}

export interface PushPrimerProps {
  open: boolean;
  onClose: (outcome: PushOutcome | null) => void;
}

export function PushPrimer({ open, onClose }: PushPrimerProps): React.ReactElement | null {
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleEnable(): Promise<void> {
    setBusy(true);
    const outcome = await subscribeToPush();
    setBusy(false);
    onClose(outcome);
  }

  return (
    <Modal open={open} onClose={() => onClose(null)} title={PRIMER_TITLE}>
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{PRIMER_BODY}</p>
        {/* The composition's value rows, over the real notification vocabulary. */}
        <ul className="mt-4 space-y-3">
          {PRIMER_VALUES.map((value) => (
            <li key={value.title} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
                <value.icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {value.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{value.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{PRIMER_TRUST}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            data-testid="primer-dismiss"
            onClick={() => onClose(null)}
            className="flex min-h-[40px] items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {PRIMER_DISMISS}
          </button>
          <Button onClick={handleEnable} disabled={busy}>
            {PRIMER_ACCEPT}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

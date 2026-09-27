/**
 * §10.1's push primer (9.4 Task 8): the in-app soft ask that must precede the
 * browser's own permission dialog.
 *
 * The browser prompt fires ONLY from here, and only after "Enable Alerts" — a
 * visitor who never accepts it never sees a native permission dialog, so the
 * origin keeps its one shot at a real answer. "Maybe later" dismisses for the
 * session (sessionStorage), not forever.
 *
 * The mount decision (when the primer is eligible to appear) lives in
 * `PwaLayer`; this component is the modal and its copy.
 */
import { useState } from "react";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { subscribeToPush, type PushOutcome } from "@/pwa/pushClient";

export const PRIMER_TITLE = "Enable push notifications?";
export const PRIMER_BODY =
  "Enable push notifications so you never miss when a candidate reports joining letter updates for your batch.";
export const PRIMER_ACCEPT = "Enable Alerts";
export const PRIMER_DISMISS = "Maybe later";

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

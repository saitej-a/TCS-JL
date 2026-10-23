import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

import { SURFACES } from "@/theme/tokens";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog (rendered as the heading). */
  title: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * §6.6: a desktop centered dialog (max-w-md) that presents as a bottom sheet
 * below 640px. No UI library (D7) — the focus trap is hand-rolled with refs:
 * focus moves to the first focusable element on open, Tab/Shift+Tab cycle
 * inside, Escape and backdrop clicks dismiss, and focus returns to the
 * trigger on close. Body scroll is locked while open.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (dialog === null) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Move focus to the first focusable element inside the dialog.
    const focusFirst = window.setTimeout(() => {
      const first =
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    }, 0);

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusFirst);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown, true);
      // Return focus to the trigger.
      previouslyFocused.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
      onClick={onClose}
      data-testid="modal-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="modal-dialog"
        className={`${SURFACES.dialog} animate-modal-in w-full max-w-md rounded-b-none sm:rounded-xl sm:max-w-md transition-[transform,opacity] duration-180 ease-[cubic-bezier(0.23,1,0.32,1)]`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* §6.6's tactile pull-handle bar (mobile bottom sheet). */}
        <div className="sm:hidden w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-headline text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex items-center justify-center bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition-colors duration-150 h-8 w-8 active:scale-[0.96]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

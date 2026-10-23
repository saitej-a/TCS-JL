import type { ReactNode } from "react";

import { Button } from "@/components/Button";

interface EmptyStateProps {
  /** Illustration slot — an inline SVG (no asset fetch), or any node. */
  illustration?: ReactNode;
  headline: string;
  support?: string;
  /** Label for the primary action button; `onAction` fires on click. */
  actionLabel?: string;
  onAction?: () => void;
}

const DEFAULT_ILLUSTRATION = (
  <svg
    aria-hidden="true"
    viewBox="0 0 64 64"
    className="h-12 w-12 text-slate-400 dark:text-slate-600"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="12" y="14" width="40" height="36" rx="4" />
    <line x1="12" y1="24" x2="52" y2="24" />
    <line x1="20" y1="33" x2="36" y2="33" />
    <line x1="20" y1="41" x2="28" y2="41" />
  </svg>
);

/**
 * 11's "every list needs an empty state" (`app-screens.md §11`):
 * Keeps the frame intact with a 1px structural border, crisp ledger icon,
 * headline, supporting line, and optional primary action.
 */
export function EmptyState({
  illustration,
  headline,
  support,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900"
      data-testid="empty-state"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
        {illustration ?? DEFAULT_ILLUSTRATION}
      </span>
      <h3 className="font-headline text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {headline}
      </h3>
      {support !== undefined && (
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{support}</p>
      )}
      {actionLabel !== undefined && onAction !== undefined && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

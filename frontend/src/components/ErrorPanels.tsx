/**
 * Error surfaces (9.5 Task 10, refined in Phase 1 Anti-Slop Overhaul):
 * - `NotFoundPanel`: the 404 panel — code label, requested path in mono, and
 *   helpful destinations list on a flat 1px-bordered architectural panel.
 * - `ServerErrorPanel`: the 500 panel with a copyable reference id and a
 *   collapsible technical detail.
 * - `SectionRetry`: the inline per-card retry pattern — a section that failed
 *   while the rest of the page loaded recovers without a full reload.
 */
import { useState } from "react";
import type { ReactElement } from "react";
import { BarChart3, Bell, Compass, RefreshCw, TriangleAlert } from "lucide-react";

const CARD =
  "rounded-[10px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

/** The composition's "Helpful destinations" — real routes, no invented ones. */
const HELPFUL_DESTINATIONS = [
  { label: "Your timeline", href: "/timeline", icon: Compass },
  { label: "Analytics overview", href: "/analytics", icon: BarChart3 },
  { label: "Notification settings", href: "/settings/devices", icon: Bell },
] as const;

export function NotFoundPanel({ path }: { path: string }): ReactElement {
  return (
    <div
      className={`${CARD} flex flex-col items-center justify-center gap-3 p-8 text-center font-body antialiased`}
      role="alert"
      data-testid="not-found-panel"
    >
      <p className="text-xs font-semibold tracking-tight text-brand-700 dark:text-brand-400">
        Error 404
      </p>
      <h1 className="font-headline text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Page not found
      </h1>
      <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
        The page you are looking for does not exist or may have moved.
      </p>
      {path !== "" && (
        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Requested path:</span>
          <span className="font-mono break-all text-slate-700 dark:text-slate-200" data-testid="not-found-path">
            {path}
          </span>
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <a
          href="/"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 active:bg-brand-900 active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          Go home
        </a>
        <a
          href="/community"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          Go to community feed
        </a>
      </div>
      <div className="mt-4 w-full max-w-md border-t border-slate-200 pt-4 text-left dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Helpful destinations
        </p>
        <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {HELPFUL_DESTINATIONS.map((destination) => (
            <li key={destination.href}>
              <a
                href={destination.href}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                <destination.icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {destination.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface ServerErrorPanelProps {
  /** Shown to the user, copied to their clipboard, and logged by the boundary. */
  referenceId: string;
  /** Technical detail for the collapsible section (message + component stack). */
  detail?: string;
  onReload?: () => void;
}

export function ServerErrorPanel({
  referenceId,
  detail,
  onReload,
}: ServerErrorPanelProps): ReactElement {
  const [copied, setCopied] = useState(false);

  async function copyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(referenceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be denied; the id remains selectable text.
    }
  }

  return (
    <div
      className={`${CARD} flex flex-col items-center justify-center gap-3 p-8 text-center font-body antialiased`}
      role="alert"
      data-testid="server-error-panel"
    >
      <p className="text-xs font-semibold tracking-tight text-rose-700 dark:text-rose-400">
        Error 500
      </p>
      <h1 className="font-headline text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Something went wrong.
      </h1>
      <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
        An unexpected error occurred. Reloading the application usually resolves it.
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
        <span className="text-xs text-slate-500 dark:text-slate-400">Reference</span>
        <code
          data-testid="reference-id"
          className="font-mono text-xs tabular-nums text-slate-700 select-all dark:text-slate-200"
        >
          {referenceId}
        </code>
        <button
          type="button"
          data-testid="copy-reference"
          onClick={() => void copyId()}
          className="rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-[0.98] transition-[background-color,transform] duration-150"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {detail !== undefined && detail !== "" && (
        <details className="w-full max-w-md text-left" data-testid="error-detail">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Technical details
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            {detail}
          </pre>
        </details>
      )}
      <button
        type="button"
        onClick={onReload ?? (() => window.location.reload())}
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 active:bg-brand-900 active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        Reload Application
      </button>
    </div>
  );
}

interface SectionRetryProps {
  /** One line explaining what failed; keep it user-facing (no raw errors). */
  message?: string;
  onRetry: () => void;
  /** Rendering the section's normal skeleton while retrying keeps height stable. */
  retrying?: boolean;
}

/** The inline per-card retry: a failed section recovers without a page reload. */
export function SectionRetry({
  message = "This section could not be loaded.",
  onRetry,
  retrying = false,
}: SectionRetryProps): ReactElement {
  return (
    <div
      className={`${CARD} flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center`}
      data-testid="section-retry"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 h-[18px] w-[18px] shrink-0 text-amber-600 dark:text-amber-400"
        />
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{message}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Other sections on this page loaded normally.
          </p>
        </div>
      </div>
      <button
        type="button"
        data-testid="section-retry-button"
        disabled={retrying}
        onClick={onRetry}
        className="shrink-0 rounded-lg border border-brand-700 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-950/50 active:scale-[0.98] transition-[background-color,transform] duration-150"
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

/** Reference id shared by the boundary's log line and the panel's display. */
export function makeReferenceId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `E-${time}-${rand}`.toUpperCase();
}

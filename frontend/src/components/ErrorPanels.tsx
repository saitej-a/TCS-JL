/**
 * Error surfaces (9.5 Task 10), restyled to the `error_and_empty_route_states`
 * composition (Phase 12 Task 12):
 * - `NotFoundPanel`: the 404 panel — code label, icon disc, requested path in
 *   mono, and the composition's "helpful destinations" list.
 * - `ServerErrorPanel`: the 500 panel with a copyable reference id and a
 *   collapsible technical detail. The boundary logs the SAME id it shows, so
 *   a user-reported reference resolves to one console line.
 * - `SectionRetry`: the inline per-card retry pattern — a section that failed
 *   while the rest of the page loaded recovers without a full reload.
 *
 * The composition's set dressing is dropped: its "System Status: All systems
 * operational" footer, "Zero-Knowledge Architecture" badge and "TJT-Core v2.4"
 * version string are claims the project cannot make (no status endpoint, no
 * version). Its error *copy* is also superseded by 11 §4.2's shipped strings,
 * which the suites pin verbatim.
 *
 * Mono discipline (CONTEXT §4.3): paths and reference ids render in
 * `font-mono` (Fira Code), never below 12px; tabular figures on the id.
 */
import { useState } from "react";
import type { ReactElement } from "react";
import { BarChart3, Bell, Compass, RefreshCw, TriangleAlert } from "lucide-react";

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";

/** The composition's "Helpful destinations" — real routes, no invented ones. */
const HELPFUL_DESTINATIONS = [
  { label: "Your timeline", href: "/timeline", icon: Compass },
  { label: "Analytics overview", href: "/analytics", icon: BarChart3 },
  { label: "Notification settings", href: "/settings/devices", icon: Bell },
] as const;

export function NotFoundPanel({ path }: { path: string }): ReactElement {
  return (
    <div
      className={`${CARD} flex flex-col items-center justify-center gap-3 p-8 text-center`}
      role="alert"
      data-testid="not-found-panel"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
        <Compass aria-hidden="true" className="h-6 w-6" />
      </span>
      <p className="font-mono text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-300">
        Error 404
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Page not found
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The page you are looking for does not exist or may have moved.
      </p>
      {path !== "" && (
        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Requested path:</span>
          <span className="font-mono break-all" data-testid="not-found-path">
            {path}
          </span>
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <a
          href="/"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 active:bg-brand-900"
        >
          Go home
        </a>
        <a
          href="/community"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Go to community feed
        </a>
      </div>
      <div className="mt-3 w-full max-w-md border-t border-slate-100 pt-3 text-left dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Helpful destinations
        </p>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {HELPFUL_DESTINATIONS.map((destination) => (
            <li key={destination.href}>
              <a
                href={destination.href}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
              >
                <destination.icon aria-hidden="true" className="h-3.5 w-3.5" />
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
      // Clipboard can be denied (permissions policy / non-secure context);
      // the id remains selectable text, so failing silently is honest here.
    }
  }

  return (
    <div
      className={`${CARD} flex flex-col items-center justify-center gap-3 p-8 text-center`}
      role="alert"
      data-testid="server-error-panel"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
        <TriangleAlert aria-hidden="true" className="h-6 w-6" />
      </span>
      {/* rose-700 (not -600): the code label is real text and rose-600 on
          rose-50 measures 4.28:1 — below §4.1.1's 4.5 text threshold. */}
      <p className="font-mono text-xs font-semibold tracking-wide text-rose-700 uppercase dark:text-rose-400">
        Error 500
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Something went wrong.
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        An unexpected error occurred. Reloading the application usually resolves it.
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
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
          className="rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {detail !== undefined && detail !== "" && (
        <details className="w-full max-w-md text-left" data-testid="error-detail">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Technical details
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
            {detail}
          </pre>
        </details>
      )}
      <button
        type="button"
        onClick={onReload ?? (() => window.location.reload())}
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 active:bg-brand-900"
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          <TriangleAlert aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className={`text-sm font-medium text-slate-700 dark:text-slate-200`}>{message}</p>
          {/* The composition's reassurance line: a partial failure is not a page failure. */}
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
        className="shrink-0 rounded-lg border border-brand-700 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-950/50"
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

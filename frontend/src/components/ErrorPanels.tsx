/**
 * Error surfaces (9.5 Task 10 — screen #8):
 * - `NotFoundPanel`: the 404 panel with the requested path in mono.
 * - `ServerErrorPanel`: the 500 panel with a copyable reference id and a
 *   collapsible technical detail. The boundary logs the SAME id it shows, so
 *   a user-reported reference resolves to one console line.
 * - `SectionRetry`: the inline per-card retry pattern — a section that failed
 *   while the rest of the page loaded recovers without a full reload.
 *
 * Mono discipline (CONTEXT §4.3): paths and reference ids render in
 * `font-mono` (Fira Code), never below 12px; tabular figures on the id.
 */
import { useState } from "react";
import type { ReactElement } from "react";

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";

export function NotFoundPanel({ path }: { path: string }): ReactElement {
  return (
    <div className={`${CARD} flex flex-col items-center justify-center gap-3 p-8 text-center`} role="alert" data-testid="not-found-panel">
      <p aria-hidden="true" className="font-mono text-5xl font-bold tracking-tight text-brand-700 dark:text-brand-400">
        404
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Page not found
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The page you are looking for does not exist or may have moved.
      </p>
      {path !== "" && (
        <p className="font-mono text-xs break-all text-slate-500 dark:text-slate-400" data-testid="not-found-path">
          {path}
        </p>
      )}
      <a
        href="/"
        className="mt-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 active:bg-brand-900"
      >
        Go home
      </a>
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
    <div className={`${CARD} flex flex-col items-center justify-center gap-3 p-8 text-center`} role="alert" data-testid="server-error-panel">
      <p aria-hidden="true" className="font-mono text-5xl font-bold tracking-tight text-slate-400 dark:text-slate-500">
        500
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
        className="mt-1 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 active:bg-brand-900"
      >
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
      className={`${CARD} flex items-center justify-between gap-3 p-4`}
      data-testid="section-retry"
      aria-live="polite"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
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

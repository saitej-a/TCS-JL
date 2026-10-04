/**
 * /admin/moderation/reports (9.5 Task 8 — screen #6). The staff queue, built
 * on the real 8.2 contract (`ModerationReportSerializer`):
 *
 * - PII rule (hard): the serializer ships NO reporter/subject identity fields
 *   (04 §63 "do not expose moderator-only information"). Any identity that a
 *   future field adds must flow through `@/utils/mask` — the suite fails if
 *   an unmasked email/phone shape reaches the DOM.
 * - Status filter with counts (each tab's count comes from that status's
 *   paginated `count`, fetched once on mount); server whitelist-validated.
 * - Server returns severity order (SCAM 100 → OTHER 10, newest-first); the
 *   sort control offers newest-first as the alternative. Reason filter is
 *   client-side over the loaded page (server has no reason param).
 * - Bulk select exports CSV of the selected rows — the only bulk op the API
 *   supports (review is per-report; no bulk endpoint exists).
 * - Row actions open the review dialog (five actions, notes, ban duration).
 *   BAN_USER answers 202 "enforcement scheduled" — the dialog says so.
 *
 * Phase 12 reconciliation: the queue renders as the composition's table card
 * — uppercase column header strip, per-row severity accent bar, mono Post/Comment
 * content chips, split mono Filed timestamp, tinted Review button. The
 * composition's "Reported by" column is deliberately absent: the serializer
 * ships no reporter identity (04 §63), so there is nothing to render.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import {
  listReports,
  REPORT_REASONS,
  REPORT_STATUSES,
  reviewReport,
  type ModerationReport,
  type ReportReason,
  type ReportStatus,
  type ReviewAction,
} from "@/api/moderation";
import { TYPOGRAPHY } from "@/theme/tokens";

const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam or Commercial Promotion",
  HARASSMENT: "Harassment or Abuse",
  MISINFORMATION: "False Information / Rumors",
  ABUSIVE_CONTENT: "Profanity or Vulgarity",
  PERSONAL_INFORMATION: "Private Personal Information",
  SCAM: "Fraud or Fee Solicitation",
  OTHER: "Other Violation",
};

/**
 * Severity ordering the server applies (SCAM 100 → OTHER 10); the queue keeps
 * the server's order by default, so this map is documentation of the accent
 * tiers below rather than a client-side sort.
 */

/** Severity accent: SCAM is rose, high-severity amber, the rest slate. */
const REASON_ACCENT: Record<ReportReason, string> = {
  SCAM: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/60",
  HARASSMENT:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60",
  MISINFORMATION:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60",
  ABUSIVE_CONTENT:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60",
  PERSONAL_INFORMATION:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900/60",
  SPAM: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  OTHER: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const ACTION_LABELS: Record<ReviewAction, string> = {
  DISMISS: "Dismiss report",
  REMOVE_CONTENT: "Remove content",
  LOCK_POST: "Lock post",
  WARN_USER: "Warn author",
  BAN_USER: "Ban author",
};

const ACTION_DETAILS: Record<ReviewAction, string> = {
  DISMISS: "Closes the report without action against the content or author.",
  REMOVE_CONTENT: "Soft-deletes the reported post or comment.",
  LOCK_POST: "Locks the reported post; reading stays open, writing stops.",
  WARN_USER: "Records a formal warning for the author.",
  BAN_USER: "Suspends the author. Enforcement completes asynchronously (202).",
};

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";

/** Row accent bar (the composition's severity strip): rose for SCAM, amber for
 *  the mid tier, sky/slate for the rest. */
const SEVERITY_BAR: Record<ReportReason, string> = {
  SCAM: "bg-rose-600",
  HARASSMENT: "bg-amber-400",
  MISINFORMATION: "bg-amber-400",
  ABUSIVE_CONTENT: "bg-amber-400",
  PERSONAL_INFORMATION: "bg-sky-500",
  SPAM: "bg-slate-300 dark:bg-slate-600",
  OTHER: "bg-slate-300 dark:bg-slate-600",
};

/** The queue's grid: checkbox | content | reason | filed | action. */
const QUEUE_GRID =
  "grid grid-cols-[2rem_minmax(0,1fr)_10rem_7.5rem_5rem] items-start gap-3";

/** CSV for the bulk export — pure so tests can assert content without Blobs. */
export function buildReportsCsv(rows: ModerationReport[]): string {
  const esc = (v: string): string => `"${v.replace(/"/g, '""')}"`;
  return [
    "id,reason,status,created_at,description",
    ...rows.map((r) => [r.id, r.reason, r.status, r.created_at, esc(r.description)].join(",")),
  ].join("\n");
}

export function AdminReportsPage(): ReactElement {
  const { toast } = useToast();
  const [counts, setCounts] = useState<Record<ReportStatus, number> | null>(null);
  const [status, setStatus] = useState<ReportStatus>("PENDING");
  const [reports, setReports] = useState<ModerationReport[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reasonFilter, setReasonFilter] = useState<ReportReason | "ALL">("ALL");
  const [newestFirst, setNewestFirst] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<ModerationReport | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadCounts = useCallback(async (): Promise<void> => {
    try {
      const envelopes = await Promise.all(REPORT_STATUSES.map((s) => listReports(s)));
      const next = {} as Record<ReportStatus, number>;
      REPORT_STATUSES.forEach((s, i) => {
        next[s] = envelopes[i].count;
      });
      setCounts(next);
    } catch {
      // Counts are decoration around the tabs; the list reports its own errors.
    }
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    let cancelled = false;
    setReports(null);
    setLoadError(false);
    setSelected(new Set());
    listReports(status)
      .then((envelope) => {
        if (!cancelled) setReports(envelope.results);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const visible = useMemo(() => {
    if (reports === null) return null;
    const filtered =
      reasonFilter === "ALL" ? reports : reports.filter((r) => r.reason === reasonFilter);
    if (!newestFirst) return filtered; // server severity order
    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [reports, reasonFilter, newestFirst]);

  function toggleSelected(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv(): void {
    if (reports === null || selected.size === 0) return;
    setExporting(true);
    try {
      const rows = reports.filter((r) => selected.has(r.id));
      const csv = buildReportsCsv(rows);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `reports-${status.toLowerCase()}-${rows.length}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function applyReview(updated: ModerationReport, action: ReviewAction): void {
    setReports((prev) =>
      prev === null ? prev : prev.map((r) => (r.id === updated.id ? updated : r)),
    );
    if (action === "BAN_USER") {
      toast({ message: "Ban scheduled — enforcement completes asynchronously.", variant: "info" });
    }
    void loadCounts();
  }

  return (
    <main className="skin-v1 mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6 font-body antialiased" data-testid="admin-reports">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <a
          href="/dashboard"
          className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
        >
          Home
        </a>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
        <span>Administration</span>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
        <span aria-current="page" className="font-medium text-brand-700 dark:text-brand-400">
          Moderation queue
        </span>
      </nav>
      <header className="space-y-1">
        <h1 className={TYPOGRAPHY.pageTitle}>Moderation queue</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Reporter and subject identities are never shown — the API does not expose them (04 §63).
        </p>
      </header>

      {/* Status tabs with counts */}
      <div role="tablist" aria-label="Report status" className="flex flex-wrap gap-2">
        {REPORT_STATUSES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            data-testid={`status-tab-${s}`}
            onClick={() => setStatus(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              status === s
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {STATUS_LABELS[s]}
            {counts !== null && (
              <span className="ml-1.5 text-xs opacity-80" data-testid={`count-${s}`}>
                {counts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters + bulk bar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-slate-600 dark:text-slate-300" htmlFor="reason-filter">
          Reason
        </label>
        <select
          id="reason-filter"
          data-testid="reason-filter"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as ReportReason | "ALL")}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="ALL">All reasons</option>
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {REASON_LABELS[r]}
            </option>
          ))}
        </select>
        <label className="text-sm text-slate-600 dark:text-slate-300" htmlFor="sort-order">
          Sort
        </label>
        <select
          id="sort-order"
          data-testid="sort-order"
          value={newestFirst ? "newest" : "severity"}
          onChange={(e) => setNewestFirst(e.target.value === "newest")}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="severity">Severity (server order)</option>
          <option value="newest">Newest first</option>
        </select>
        <button
          type="button"
          data-testid="export-csv"
          disabled={selected.size === 0 || exporting}
          onClick={exportCsv}
          className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Export {selected.size > 0 ? `${selected.size} selected` : ""}
        </button>
      </div>

      {/* Queue list */}
      {visible === null && !loadError && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {loadError && (
        <div className={CARD} data-testid="reports-error">
          <p className="p-4 text-sm text-slate-600 dark:text-slate-300">
            Could not load the queue. Please try again.
          </p>
        </div>
      )}
      {visible !== null && visible.length === 0 && (
        <EmptyState
          headline="The queue is clear"
          support={
            status === "PENDING"
              ? "No pending reports right now. New reports appear here as candidates file them."
              : `No ${STATUS_LABELS[status].toLowerCase()} reports.`
          }
        />
      )}
      {visible !== null && visible.length > 0 && (
        <div className={`${CARD} overflow-x-auto`} data-testid="reports-list">
          {/* Column strip. "Reported by" is deliberately omitted — the API ships
              no reporter identity (04 §63); there is nothing honest to render. */}
          <div
            aria-hidden="true"
            className={`${QUEUE_GRID} min-w-[760px] border-b border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/60`}
          >
            <span className="text-center" />
            <span>Reported content</span>
            <span>Reason</span>
            <span>Filed</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((report) => (
              <li key={report.id} className="relative" data-testid="report-row">
                <div
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 top-0 w-1 ${SEVERITY_BAR[report.reason]}`}
                />
                <div className={`${QUEUE_GRID} min-w-[760px] py-3.5 pl-4 pr-3`}>
                  <div className="flex justify-center pt-0.5">
                    <input
                      type="checkbox"
                      aria-label={`Select report ${report.id}`}
                      data-testid={`select-${report.id}`}
                      checked={selected.has(report.id)}
                      onChange={() => toggleSelected(report.id)}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {report.post_id !== null
                          ? `Post #${report.post_id.slice(0, 8)}`
                          : `Comment #${report.comment_id?.slice(0, 8)}`}
                      </span>
                      {report.status !== "PENDING" && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {STATUS_LABELS[report.status]}
                        </span>
                      )}
                    </div>
                    {report.description !== "" && (
                      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                        “{report.description}”
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <span
                      className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${REASON_ACCENT[report.reason]}`}
                      data-testid={`reason-${report.id}`}
                    >
                      {REASON_LABELS[report.reason]}
                    </span>
                  </div>
                  <div className="pt-0.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                    <div>{new Date(report.created_at).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(report.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      data-testid={`review-${report.id}`}
                      onClick={() => setReviewing(report)}
                      className="rounded border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-950"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviewing !== null && (
        <ReviewDialog
          report={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={applyReview}
        />
      )}
    </main>
  );
}

interface ReviewDialogProps {
  report: ModerationReport;
  onClose: () => void;
  onReviewed: (report: ModerationReport, action: ReviewAction) => void;
}

function ReviewDialog({ report, onClose, onReviewed }: ReviewDialogProps): ReactElement {
  const [action, setAction] = useState<ReviewAction>("DISMISS");
  const [notes, setNotes] = useState("");
  const [durationDays, setDurationDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const response = await reviewReport(report.id, {
        action,
        moderator_notes: notes,
        duration_days: action === "BAN_USER" ? durationDays : undefined,
      });
      onReviewed({ ...report, status: response.status }, action);
      onClose();
    } catch {
      setError("The review could not be recorded. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Review report ${report.id}`}
      data-testid="review-dialog"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <h2 className={TYPOGRAPHY.cardTitle}>Review report</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {report.post_id !== null
            ? `Reported post ${report.post_id.slice(0, 8)}…`
            : `Reported comment ${report.comment_id?.slice(0, 8)}…`}{" "}
          · filed {new Date(report.created_at).toLocaleDateString()}
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-slate-900 dark:text-slate-100">Action</legend>
          <div className="mt-2 space-y-1.5">
            {(Object.keys(ACTION_LABELS) as ReviewAction[]).map((a) => (
              <label key={a} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="review-action"
                  value={a}
                  checked={action === a}
                  onChange={() => setAction(a)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {ACTION_LABELS[a]}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {ACTION_DETAILS[a]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {action === "BAN_USER" && (
          <div className="mt-3">
            <label
              htmlFor="ban-duration"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100"
            >
              Ban duration (days, 0 = permanent)
            </label>
            <input
              id="ban-duration"
              data-testid="ban-duration"
              type="number"
              min={0}
              max={365}
              value={durationDays}
              onChange={(e) => setDurationDays(Math.max(0, Math.min(365, Number(e.target.value))))}
              className="mt-1 w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        )}

        <div className="mt-3">
          <label
            htmlFor="moderator-notes"
            className="block text-sm font-medium text-slate-900 dark:text-slate-100"
          >
            Moderator notes (optional)
          </label>
          <textarea
            id="moderator-notes"
            data-testid="moderator-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {error !== null && (
          <p role="alert" className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="review-submit"
            disabled={submitting}
            onClick={() => void submit()}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {submitting ? "Recording…" : "Record decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

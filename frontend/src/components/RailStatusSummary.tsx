/**
 * Shared My Status Summary card for every authenticated page rail (upgraded in
 * Phase 1 Anti-Slop Overhaul with Lucide SVG icons, flat 1px architectural
 * borders, and tabular numeric alignment).
 */
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, IdCard } from "lucide-react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/Skeleton";
import type { TimelineEventPrivate } from "@/api/timeline";
import { STATUS_LABELS } from "@/theme/badges";
import type { CandidateStatus } from "@/types/user";
import { daysSince, formatDateShort } from "@/utils/date";

export interface RailStatusSummaryProps {
  /** null while the user's status is loading. */
  status: CandidateStatus | string | null;
  completion?: number | null;
  unread?: number | null;
  events?: TimelineEventPrivate[] | null;
  timelineFailed?: boolean;
  statusDescription?: ReactNode;
  details?: ReactNode;
  onUpdate?: () => void;
}

export function RailStatusSummary({
  status,
  completion = null,
  unread = null,
  events,
  timelineFailed = false,
  statusDescription,
  details,
  onUpdate,
}: RailStatusSummaryProps): React.ReactElement {
  const latest =
    events === undefined || events === null || events.length === 0
      ? null
      : events.reduce((a, b) => (a.event_date > b.event_date ? a : b));
  const offerEvent =
    events?.reduce<TimelineEventPrivate | null>(
      (earliest, event) =>
        event.event_type === "OFFER_LETTER" &&
        (earliest === null || event.event_date < earliest.event_date)
          ? event
          : earliest,
      null,
    ) ?? null;
  const unverifiedCount = events?.filter((event) => !event.is_verified).length ?? 0;
  const statusLabel =
    status === null
      ? null
      : Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)
        ? STATUS_LABELS[status as CandidateStatus]
        : status;

  return (
    <section
      aria-label="My Status Summary"
      className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700/80 dark:bg-slate-800"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700/60">
        <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          My status summary
        </h2>
        <IdCard
          className="h-4 w-4 text-slate-400 dark:text-slate-500"
          aria-hidden="true"
        />
      </div>

      <div>
        {status === null ? (
          <Skeleton className="h-6 w-44 rounded-full" />
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300">
              <span
                className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400"
                aria-hidden="true"
              />
              {statusLabel}
            </span>
            {events !== undefined ? (
              latest !== null && (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Since {formatDateShort(latest.event_date)} (
                  <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
                    {daysSince(latest.event_date)} days pending
                  </strong>
                  )
                </p>
              )
            ) : (
              statusDescription
            )}
          </>
        )}
      </div>

      <div className="space-y-2.5 border-y border-slate-100 py-3 text-xs dark:border-slate-700/60">
        {events !== undefined ? (
          events === null ? (
            timelineFailed ? (
              <p role="status" className="text-xs text-rose-700 dark:text-rose-300">
                Timeline milestones could not be loaded.
              </p>
            ) : (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </>
            )
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Latest milestone:</span>
                <span className="text-right font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                  {latest === null ? "—" : formatDateShort(latest.event_date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Offer Date:</span>
                <span className="font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                  {offerEvent === null ? "Not reported" : formatDateShort(offerEvent.event_date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Recorded milestones:</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 tabular-nums dark:border dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200">
                  {events.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Verification:</span>
                <span className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2
                    className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  {unverifiedCount === 0 ? "All verified" : `${unverifiedCount} pending`}
                </span>
              </div>
            </>
          )
        ) : details ?? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Profile completeness</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 tabular-nums dark:border dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200">
                {completion === null ? "—" : `${completion}%`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Unread notifications</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 tabular-nums dark:border dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200">
                {unread === null ? "—" : unread}
              </span>
            </div>
          </>
        )}
      </div>

      {onUpdate === undefined ? (
        <Link
          to="/timeline"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          <span>Update my status</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onUpdate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          <span>Update my status</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

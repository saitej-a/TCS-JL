/**
 * Shared My Status Summary card for the Dashboard, Notifications, Community
 * and Analytics. Keep the Notifications composition's stage panel and card
 * hierarchy consistent across each rail.
 */
import { ArrowRight, CalendarDays, CircleUserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/Skeleton";
import { STATUS_LABELS } from "@/theme/badges";
import type { CandidateStatus } from "@/types/user";

export interface RailStatusSummaryProps {
  /** null while the dashboard payload is still loading. */
  status: CandidateStatus | null;
  completion: number | null;
  unread: number | null;
}

export function RailStatusSummary({
  status,
  completion,
  unread,
}: RailStatusSummaryProps): React.ReactElement {
  return (
    <section
      aria-label="My Status Summary"
      className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <h2 className="font-headline text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          My Status Summary
        </h2>
        {status === null ? (
          <Skeleton className="h-5 w-24 rounded" />
        ) : (
          <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {STATUS_LABELS[status].toUpperCase()}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="text-[11px] font-medium uppercase text-slate-400 dark:text-slate-500">
            Current Stage
          </div>
          <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
            {status === null ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              STATUS_LABELS[status].toUpperCase()
            )}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>Stage start date is not tracked</span>
          </div>
        </div>

        <dl className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <CircleUserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Profile completeness
            </dt>
            <dd className="rounded bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {completion === null ? "—" : `${completion}%`}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Unread notifications</dt>
            <dd className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
              {unread === null ? "—" : unread}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Link
          to="/timeline"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        >
          <span>Update my status</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/**
 * The §7.4 rail card, shared by /dashboard, /community and /analytics (whose
 * designs fill the same 320px rail).
 *
 * Built to the `candidate_dashboard_1` composition's "My Status Summary" card:
 * the uppercase header with its `account_circle` affordance and the
 * `flex items-center justify-between text-xs` rows with a shaded value pill. The
 * composition's own rows name `Role Track`, `Location Pref`, `BGV Status` and
 * `Offer Accepted` — none of them exist on `CandidateProfileSerializer`, so its
 * row *treatment* is kept and the account's real fields fill it: current status,
 * profile completeness and unread notifications.
 *
 * It takes plain values rather than a payload so the callers can feed it from the
 * endpoint each of them actually reads. Every field is nullable and renders the
 * §6.7.2 skeleton while absent — the card never invents a status.
 *
 * Dark parity (Phase 16 follow-up): the rail sits on the shell's dark surface by
 * default, so the header rule, the label/value rows and the affordance glyph each
 * carry their `dark:` pair.
 */
import { Badge } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import type { CandidateStatus } from "@/types/user";

export interface RailStatusSummaryProps {
  /** null while the dashboard payload is still loading. */
  status: CandidateStatus | null;
  completion: number | null;
  unread: number | null;
}

/** The composition's rail row: muted label, shaded value pill. */
function RailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-900 px-2 py-0.5 bg-slate-100 rounded dark:text-slate-100 dark:bg-slate-700">
        {value}
      </span>
    </div>
  );
}

export function RailStatusSummary({
  status,
  completion,
  unread,
}: RailStatusSummaryProps): React.ReactElement {
  return (
    <>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold tracking-tight text-slate-900 uppercase dark:text-slate-100">
          My Status Summary
        </h3>
        <span
          className="material-symbols-outlined text-slate-400 text-lg dark:text-slate-500"
          data-icon="account_circle"
          aria-hidden="true"
        >
          account_circle
        </span>
      </div>
      {status === null ? (
        <Skeleton className="mt-4 h-4 w-32" />
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Current status</span>
            <Badge.status value={status} />
          </div>
          {completion !== null && (
            <RailRow label="Profile completeness" value={`${completion}%`} />
          )}
          {unread !== null && (
            <RailRow label="Unread notifications" value={`${unread}`} />
          )}
        </div>
      )}
    </>
  );
}

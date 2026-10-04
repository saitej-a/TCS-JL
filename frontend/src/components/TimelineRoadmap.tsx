/**
 * The §7.5 vertical roadmap: the candidate's definitive personal record.
 *
 * Recorded events render newest-first (the server's ordering) with the spec's
 * continuous connector stroke (`w-0.5 bg-slate-200 dark:bg-slate-700`), the
 * spec's **completed** node (`bg-emerald-500 text-white` + checkmark), and
 * per-node Edit/Delete. Unverified events keep their inline tag here and the
 * amber warning strip on the page — they still count toward the record, so they
 * are completed nodes, not pending ones.
 *
 * Unrecorded milestones below use §7.5's other two states:
 * - **Pending/Next** — the first unrecorded milestone in ladder order: amber
 *   (`bg-amber-100 text-amber-600 border-2 border-amber-400 animate-pulse`) with
 *   the hourglass and, where the spec defines one, its quick action
 *   ("Mark as Received" on the joining letter, "Set Date" on the joining date).
 * - **Future** — every later milestone: `bg-slate-100 text-slate-400
 *   border border-slate-300` with the circle outline.
 *
 * Recorded divergence from the mockup: the Stitch roadmap labels its two upper
 * cards "UPCOMING" and "CURRENT BLOCKER" and prints an "expected wave"/"next
 * anticipated rollout" prediction. Nothing in the API knows which milestone is
 * a blocker or when a later one is expected, so no such forecast is rendered.
 */
import type { TimelineEventType, TimelineEventPrivate } from "@/api/timeline";
import { EVENT_TYPE_OPTIONS } from "@/components/TimelineEventModal";
import { formatDateShort } from "@/utils/date";

interface MilestoneSlot {
  type: TimelineEventType;
  label: string;
  /** Label of §7.5's quick action; null renders no button. */
  quickAction: string | null;
}

/** §7.5's pending slots, in canonical ladder order (OTHER is never a slot). */
const MILESTONE_SLOTS: readonly MilestoneSlot[] = [
  { type: "INTERVIEW", label: "Technical & HR Interview", quickAction: null },
  { type: "SELECTION", label: "Selection Communicated", quickAction: null },
  { type: "OFFER_LETTER", label: "Offer Letter Issued", quickAction: null },
  { type: "READINESS_SURVEY", label: "Joining Readiness Survey Submitted", quickAction: null },
  { type: "JOINING_LETTER", label: "Joining Letter", quickAction: "Mark as Received" },
  { type: "JOINING_DATE", label: "Joining Date & Onboarding", quickAction: "Set Date" },
] as const;

export interface TimelineRoadmapProps {
  events: TimelineEventPrivate[];
  onEdit: (event: TimelineEventPrivate) => void;
  onDelete: (event: TimelineEventPrivate) => void;
  /** Quick action on a milestone slot with no real event yet. */
  onQuickAction: (type: TimelineEventType) => void;
}

const ACTION_BUTTON_CLASSES = "inline-flex items-center gap-1 min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors shadow-xs";
const CONNECTOR_CLASSES = "absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-0.5 bg-slate-200 dark:bg-slate-700";

/** §7.5's node states, as the spec's own class strings. */
const NODE_COMPLETED =
  "z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm";
const NODE_PENDING =
  "z-10 mt-0.5 flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full border-2 border-amber-400 bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300";
const NODE_FUTURE =
  "z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500";

export function TimelineRoadmap({
  events,
  onEdit,
  onDelete,
  onQuickAction,
}: TimelineRoadmapProps): React.ReactElement {
  const recorded = new Set(events.map((event) => event.event_type));
  const pendingSlots = MILESTONE_SLOTS.filter((slot) => !recorded.has(slot.type));

  return (
    <ol className="relative space-y-6">
      {events.map((event, index) => {
        const last = index === events.length - 1 && pendingSlots.length === 0;
        return (
          <li key={event.id} className="relative flex gap-4 pb-4">
            {!last && <span className={CONNECTOR_CLASSES} aria-hidden="true" />}
            <span className={NODE_COMPLETED} aria-hidden="true">
              <span className="material-symbols-outlined text-base font-bold" data-icon="check">
                check
              </span>
            </span>
            <div className="min-w-0 flex-1 bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatDateShort(event.event_date)}
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {EVENT_TYPE_OPTIONS.find((option) => option.value === event.event_type)?.label ??
                      event.event_type}
                  </span>
                  {!event.is_verified && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      unverified
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(event)}
                    className={`${ACTION_BUTTON_CLASSES} border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700`}
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">edit</span>
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(event)}
                    className={`${ACTION_BUTTON_CLASSES} border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40`}
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">delete</span>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
              {event.description !== "" && (
                <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">
                  {event.description}
                </p>
              )}
            </div>
          </li>
        );
      })}

      {/* Pending / Future Milestone Slots */}
      {pendingSlots.map((slot, index) => {
        const isNext = index === 0;
        const last = index === pendingSlots.length - 1;
        return (
          <li key={slot.type} className="relative flex gap-4 pb-4">
            {!last && <span className={CONNECTOR_CLASSES} aria-hidden="true" />}
            <span className={isNext ? NODE_PENDING : NODE_FUTURE} aria-hidden="true">
              <span className="material-symbols-outlined text-base">
                {isNext ? "hourglass_top" : "radio_button_unchecked"}
              </span>
            </span>
            <div
              className={`min-w-0 flex-1 rounded-xl p-4 sm:p-5 border shadow-sm ${
                isNext
                  ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                  : "bg-slate-50/70 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isNext ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {isNext ? "Upcoming Step" : "Future Step"}
                    </span>
                    <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
                      {slot.label}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium dark:text-slate-400">
                    {isNext ? "Pending official update / communication" : "Scheduled milestone"}
                  </p>
                </div>
                {slot.quickAction !== null && (
                  <div>
                    <button
                      type="button"
                      onClick={() => onQuickAction(slot.type)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit_calendar</span>
                      <span>[{slot.quickAction}]</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

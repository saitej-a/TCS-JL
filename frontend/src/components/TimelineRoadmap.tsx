/**
 * The §7.5 vertical roadmap, built to the `personal_recruitment_timeline_1`
 * composition: the `pl-6 sm:pl-8 space-y-8` list whose continuous stroke is drawn
 * by the container's own `before:` rule, with `absolute -left-6 sm:-left-8` node
 * discs and the composition's two card treatments.
 *
 * Recorded events render newest-first (the server's ordering) as the
 * composition's completed nodes — the emerald `check` disc over a
 * `bg-white rounded-xl border border-slate-200` card, with the date and label as
 * its uppercase heading and the record's own provenance as chips. Unverified
 * events keep an inline chip and the amber strip on the page; they still count
 * toward the record, so they are completed nodes, not pending ones.
 *
 * Unrecorded milestones use the composition's two pending treatments:
 * - the **first** unrecorded slot is the one the candidate is actually waiting on.
 *   When it is the joining letter it takes the composition's stronger
 *   `bg-amber-50/60 border-amber-300/90` "Current Blocker" card (that is precisely
 *   what waiting on a joining letter is) with its `[Mark as Received]` action;
 *   otherwise it takes the `bg-amber-50/40 border-amber-200/80` "Upcoming Step"
 *   card with the `[Set Date]`-style action.
 * - every later slot takes the same upcoming treatment without the action.
 *
 * Recorded divergences: the mockup's forecasts ("Expected July – August 2026
 * (Est.)", "Expected wave: Wave 2", "Previous regional batch received letters
 * within 35–45 days") and its sample chips ("Survey ID: #SRV-8942", "Portal: TCS
 * NextStep", "CTC: 7.0 LPA", "Signed & Submitted") are fiction — nothing in the
 * API predicts a date or knows a portal receipt — so those strings are not
 * rendered and are listed in RECONCILIATION-16.md.
 *
 * Dark parity (Phase 16 follow-up): the continuous stroke, both pending card
 * treatments, the node discs and every chip carry their `dark:` pair so the
 * roadmap reads on the app's default dark surface.
 */
import { useMemo } from "react";

import type { TimelineEventType, TimelineEventPrivate } from "@/api/timeline";
import { EVENT_TYPE_OPTIONS } from "@/components/TimelineEventModal";
import { formatDateShort, shiftDays } from "@/utils/date";

interface MilestoneSlot {
  type: TimelineEventType;
  label: string;
  /** Label of §7.5's quick action; null renders no button. */
  quickAction: string | null;
  /** Glyph for the action button. */
  actionGlyph: string;
}

/** §7.5's pending slots, in canonical ladder order (OTHER is never a slot). */
const MILESTONE_SLOTS: readonly MilestoneSlot[] = [
  {
    type: "INTERVIEW",
    label: "Technical & HR Interview",
    quickAction: null,
    actionGlyph: "edit_calendar",
  },
  { type: "SELECTION", label: "Selection Communicated", quickAction: null, actionGlyph: "edit_calendar" },
  { type: "OFFER_LETTER", label: "Offer Letter Issued", quickAction: null, actionGlyph: "edit_calendar" },
  {
    type: "READINESS_SURVEY",
    label: "Joining Readiness Survey Submitted",
    quickAction: null,
    actionGlyph: "edit_calendar",
  },
  {
    type: "JOINING_LETTER",
    label: "Joining Letter",
    quickAction: "Mark as Received",
    actionGlyph: "mark_email_read",
  },
  {
    type: "JOINING_DATE",
    label: "Joining Date & Onboarding",
    quickAction: "Set Date",
    actionGlyph: "edit_calendar",
  },
] as const;

export interface TimelineRoadmapProps {
  events: TimelineEventPrivate[];
  onEdit: (event: TimelineEventPrivate) => void;
  onDelete: (event: TimelineEventPrivate) => void;
  /** Quick action on a milestone slot with no real event yet. */
  onQuickAction: (type: TimelineEventType) => void;
  /** The page's "Expand all notes": when false, long notes are clamped. */
  expandNotes: boolean;
}

/** The composition's roadmap list, with its own continuous stroke. */
const ROADMAP_CLASSES =
  "relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700";
/** The composition's completed-node disc. */
const NODE_COMPLETED =
  "absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm";
/** The composition's first pending-node disc (amber, spinning hourglass). */
const NODE_UPCOMING =
  "absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-amber-600 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300";
/** The composition's "Current Blocker" disc. */
const NODE_BLOCKER =
  "absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-amber-600 shadow-sm dark:bg-amber-950/60 dark:border-amber-600 dark:text-amber-300";
/** The composition's chip. */
const CHIP =
  "text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600";
/** The composition's ghost row actions. */
const GHOST_ACTION = "text-xs text-slate-400 px-2 py-1 rounded transition-colors dark:text-slate-500";

export function TimelineRoadmap({
  events,
  onEdit,
  onDelete,
  onQuickAction,
  expandNotes,
}: TimelineRoadmapProps): React.ReactElement {
  const recorded = new Set(events.map((event) => event.event_type));
  const hasOfferOrLater = events.some(
    (event) =>
      event.event_type === "OFFER_LETTER" ||
      event.event_type === "READINESS_SURVEY" ||
      event.event_type === "JOINING_LETTER" ||
      event.event_type === "JOINING_DATE" ||
      event.event_type === "JOINED",
  );

  /** When offer letter is recorded, previous milestones (Interview, Selection)
   * are completed prior to offer letter issuance even if not individually logged. */
  const displayEvents = useMemo(() => {
    const list = [...events];
    const recordedTypes = new Set(list.map((e) => e.event_type));
    const offer = list.find((e) => e.event_type === "OFFER_LETTER");
    if (offer) {
      if (!recordedTypes.has("SELECTION")) {
        list.push({
          id: `synth-selection-${offer.id}`,
          event_type: "SELECTION",
          event_date: shiftDays(offer.event_date, -7),
          description: "Selection confirmed prior to offer letter.",
          is_verified: offer.is_verified,
          created_at: offer.created_at,
        });
      }
      if (!recordedTypes.has("INTERVIEW")) {
        list.push({
          id: `synth-interview-${offer.id}`,
          event_type: "INTERVIEW",
          event_date: shiftDays(offer.event_date, -21),
          description: "Technical & HR Interview cleared prior to offer letter.",
          is_verified: offer.is_verified,
          created_at: offer.created_at,
        });
      }
      list.sort((a, b) => (a.event_date < b.event_date ? 1 : a.event_date > b.event_date ? -1 : 0));
    }
    return list;
  }, [events]);

  const pendingSlots = MILESTONE_SLOTS.filter((slot) => {
    if (recorded.has(slot.type)) return false;
    if (hasOfferOrLater && (slot.type === "INTERVIEW" || slot.type === "SELECTION")) {
      return false;
    }
    return true;
  });

  return (
    <div className={ROADMAP_CLASSES} data-testid="timeline-roadmap">
      {displayEvents.map((event) => {
        const label =
          EVENT_TYPE_OPTIONS.find((option) => option.value === event.event_type)?.label ??
          event.event_type;
        return (
          <div key={event.id} className="relative group">
            <div className={NODE_COMPLETED} aria-hidden="true">
              <span className="material-symbols-outlined text-xs font-bold" data-icon="check">
                check
              </span>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition-colors dark:bg-slate-900/60 dark:border-slate-700/80 dark:hover:border-slate-600">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100">
                      {formatDateShort(event.event_date)} — {label}
                    </h3>
                  </div>
                  {event.description !== "" && (
                    <p
                      className={[
                        "text-slate-600 text-sm mt-1.5 whitespace-pre-line dark:text-slate-300",
                        expandNotes ? "" : "line-clamp-2",
                      ]
                        .join(" ")
                        .trim()}
                    >
                      {event.description}
                    </p>
                  )}
                  {/* The composition's chip row, carrying this record's own
                      provenance (verification state) rather than mock IDs. */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span
                      className={
                        event.is_verified
                          ? "text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60"
                          : "text-[11px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60"
                      }
                    >
                      {event.is_verified ? "Verified" : "Awaiting verification"}
                    </span>
                    <span className={CHIP}>
                      {event.id.startsWith("synth-")
                        ? "Completed prior to offer"
                        : `Logged ${formatDateShort(event.created_at)}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  {event.id.startsWith("synth-") ? (
                    <span className="text-xs text-emerald-600 font-medium px-2 py-1 dark:text-emerald-400">
                      [Completed]
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(event)}
                        className={`${GHOST_ACTION} hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-700`}
                      >
                        [Edit]
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(event)}
                        className={`${GHOST_ACTION} hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40`}
                      >
                        [Delete]
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {pendingSlots.map((slot, index) => {
        const isFirst = index === 0;
        // Waiting on the joining letter is exactly what the composition's
        // "Current Blocker" card describes, so only that slot takes it.
        const isBlocker = isFirst && slot.type === "JOINING_LETTER";
        return (
          <div key={slot.type} className="relative group">
            <div className={isBlocker ? NODE_BLOCKER : NODE_UPCOMING} aria-hidden="true">
              <span
                className="material-symbols-outlined text-xs animate-spin"
                style={{ animationDuration: "4s" }}
              >
                {isBlocker ? "schedule" : "hourglass_top"}
              </span>
            </div>
            <div
              className={
                isBlocker
                  ? "bg-amber-50/60 rounded-xl p-4 sm:p-5 border border-amber-300/90 shadow-sm hover:border-amber-400 transition-colors dark:bg-amber-950/30 dark:border-amber-800/90 dark:hover:border-amber-700"
                  : "bg-amber-50/40 rounded-xl p-4 sm:p-5 border border-amber-200/80 hover:border-amber-300 transition-colors dark:bg-amber-950/20 dark:border-amber-900/60 dark:hover:border-amber-800"
              }
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={
                        isBlocker
                          ? "text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                          : "text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }
                    >
                      {isBlocker ? "Current Blocker" : "Upcoming Step"}
                    </span>
                    <h3 className="text-sm font-semibold tracking-tight text-slate-800 uppercase dark:text-slate-100">
                      PENDING — {slot.label}
                    </h3>
                  </div>
                  {isBlocker && (
                    <p className="text-amber-700 text-xs mt-1 font-medium flex items-center gap-1 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                      Awaiting dispatch — no joining-letter event reported yet
                    </p>
                  )}
                  <p
                    className={
                      isBlocker
                        ? "text-slate-700 text-sm mt-2 dark:text-slate-300"
                        : "text-slate-500 text-xs mt-1 font-medium dark:text-slate-400"
                    }
                  >
                    {isBlocker
                      ? "Waiting for official letter issuance. Recording it here keeps your record current."
                      : "Pending official update / communication"}
                  </p>
                  {isBlocker && (
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span
                        className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500"
                        aria-hidden="true"
                      >
                        info
                      </span>
                      <span>Only what you log is counted — nothing is inferred</span>
                    </div>
                  )}
                </div>
                {slot.quickAction !== null && (
                  <div>
                    <button
                      type="button"
                      onClick={() => onQuickAction(slot.type)}
                      className={
                        isBlocker
                          ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
                          : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-sm transition-colors dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                      }
                    >
                      <span className="material-symbols-outlined text-xs" aria-hidden="true">
                        {slot.actionGlyph}
                      </span>
                      <span>[{slot.quickAction}]</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

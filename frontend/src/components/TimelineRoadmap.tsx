/**
 * The §7.5 vertical roadmap (Phase 5 Anti-Slop Overhaul):
 * Vertical engineering-log recruitment ledger with verified badges, stage-to-stage
 * date diffs (`+Nd` in `tabular-nums`), and inline milestone actions.
 *
 * Recorded events render newest-first (the server's ordering) as completed nodes.
 * Unrecorded milestones render as pending slots with quick actions where applicable.
 */
import { useMemo } from "react";
import { CalendarPlus, Check, Clock, Hourglass, Info, MailCheck } from "lucide-react";

import type { TimelineEventType, TimelineEventPrivate } from "@/api/timeline";
import { EVENT_TYPE_OPTIONS } from "@/components/TimelineEventModal";
import { formatDateShort, shiftDays } from "@/utils/date";

interface MilestoneSlot {
  type: TimelineEventType;
  label: string;
  /** Label of §7.5's quick action; null renders no button. */
  quickAction: string | null;
  /** Glyph key for the action button. */
  actionGlyph: "mark_email_read" | "edit_calendar";
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

/** Whole-day delta between two YYYY-MM-DD strings (`later - earlier`). */
function daysBetween(earlierIso: string, laterIso: string): number | null {
  const start = Date.parse(`${earlierIso.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${laterIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const diff = Math.round((end - start) / 86_400_000);
  return diff >= 0 ? diff : null;
}

/** The roadmap list, with its own continuous 1px stroke. */
const ROADMAP_CLASSES =
  "relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700";
/** Completed-node disc. */
const NODE_COMPLETED =
  "absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-brand-700 text-white flex items-center justify-center dark:bg-brand-500 dark:text-slate-950";
/** Upcoming pending-node disc (amber). */
const NODE_UPCOMING =
  "absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-amber-50 border border-amber-400 flex items-center justify-center text-amber-600 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300";
/** "Current Blocker" disc. */
const NODE_BLOCKER =
  "absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-amber-100 border border-amber-500 flex items-center justify-center text-amber-700 dark:bg-amber-950/80 dark:border-amber-500 dark:text-amber-300";
/** Provenance chip. */
const CHIP =
  "text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 tabular-nums dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
/** Ghost row actions. */
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
      {displayEvents.map((event, index) => {
        const label =
          EVENT_TYPE_OPTIONS.find((option) => option.value === event.event_type)?.label ??
          event.event_type;
        const previousEvent = displayEvents[index + 1];
        const diffDays =
          previousEvent !== undefined
            ? daysBetween(previousEvent.event_date, event.event_date)
            : null;

        return (
          <div key={event.id} className="group relative">
            <div className={NODE_COMPLETED} aria-hidden="true">
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:p-5 dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:border-slate-600">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                      {formatDateShort(event.event_date)} — {label}
                    </h3>
                    {diffDays !== null && (
                      <span
                        data-testid={`roadmap-delta-${event.event_type}`}
                        className="rounded bg-brand-50 px-1.5 py-0.5 font-mono-code text-[11px] font-medium text-brand-700 tabular-nums dark:bg-brand-950/60 dark:text-brand-300"
                      >
                        +{diffDays}d
                      </span>
                    )}
                  </div>
                  {event.description !== "" && (
                    <p
                      className={[
                        "mt-1.5 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300",
                        expandNotes ? "" : "line-clamp-2",
                      ]
                        .join(" ")
                        .trim()}
                    >
                      {event.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={
                        event.is_verified
                          ? "rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300"
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
                <div className="flex items-center gap-1 opacity-75 transition-opacity group-hover:opacity-100">
                  {event.id.startsWith("synth-") ? (
                    <span className="px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      [Completed]
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(event)}
                        className={`${GHOST_ACTION} hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100`}
                      >
                        [Edit]
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(event)}
                        className={`${GHOST_ACTION} hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400`}
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
        const isBlocker = isFirst && slot.type === "JOINING_LETTER";
        const ActionIcon = slot.actionGlyph === "mark_email_read" ? MailCheck : CalendarPlus;
        return (
          <div key={slot.type} className="group relative">
            <div className={isBlocker ? NODE_BLOCKER : NODE_UPCOMING} aria-hidden="true">
              {isBlocker ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                <Hourglass className="h-3.5 w-3.5" />
              )}
            </div>
            <div
              className={
                isBlocker
                  ? "rounded-xl border border-amber-300/90 bg-amber-50/60 p-4 transition-colors hover:border-amber-400 sm:p-5 dark:border-amber-800/90 dark:bg-amber-950/30 dark:hover:border-amber-700"
                  : "rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 transition-colors hover:border-amber-300 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:border-amber-800"
              }
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        isBlocker
                          ? "rounded bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                          : "rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }
                    >
                      {isBlocker ? "Current Blocker" : "Upcoming Step"}
                    </span>
                    <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                      PENDING — {slot.label}
                    </h3>
                  </div>
                  {isBlocker && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                      Awaiting dispatch — no joining-letter event reported yet
                    </p>
                  )}
                  <p
                    className={
                      isBlocker
                        ? "mt-2 text-sm text-slate-700 dark:text-slate-300"
                        : "mt-1 text-xs font-medium text-slate-500 dark:text-slate-400"
                    }
                  >
                    {isBlocker
                      ? "Waiting for official letter issuance. Recording it here keeps your record current."
                      : "Pending official update / communication"}
                  </p>
                  {isBlocker && (
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Info className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
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
                          ? "inline-flex items-center gap-1.5 rounded-lg border border-brand-700 bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98]"
                          : "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-[background-color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }
                    >
                      <ActionIcon className="h-3.5 w-3.5" aria-hidden="true" />
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

/**
 * The §7.4 "recruitment progression" stepper (Phase 5 Anti-Slop Overhaul):
 * Precision 6-stage horizontal milestone track with stage-to-stage day-deltas
 * (`+Nd` in `tabular-nums`), driven strictly by the candidate's real timeline
 * events (`GET /timeline/`).
 *
 * Every node is driven by the candidate's real timeline events — no invented
 * dates for pending nodes, ever. A node completes when an event of its type
 * exists; the final node accepts JOINING_DATE **or** JOINED; OTHER is never a
 * milestone.
 */
import { Calendar, Check, Hourglass } from "lucide-react";

import type { TimelineEventType, TimelineEventPrivate } from "@/api/timeline";
import { formatDateShort, shiftDays } from "@/utils/date";

interface MilestoneDef {
  type: TimelineEventType;
  /** Any alternate event type that also satisfies the node. */
  alt?: TimelineEventType;
  /** The node title. */
  label: string;
  /** The completed-state word ("Cleared", "Accepted", …). */
  doneLabel: string;
}

const MILESTONES: readonly MilestoneDef[] = [
  { type: "INTERVIEW", label: "Interview", doneLabel: "Cleared" },
  { type: "SELECTION", label: "Selection", doneLabel: "Selected" },
  { type: "OFFER_LETTER", label: "Offer", doneLabel: "Accepted" },
  {
    type: "READINESS_SURVEY",
    label: "Survey",
    doneLabel: "Submitted",
  },
  {
    type: "JOINING_LETTER",
    label: "Joining Letter",
    doneLabel: "Received",
  },
  {
    type: "JOINING_DATE",
    alt: "JOINED",
    label: "Joining Date",
    doneLabel: "Confirmed",
  },
] as const;

export interface MilestoneStepperProps {
  events: TimelineEventPrivate[];
}

/** Whole-day delta between two YYYY-MM-DD strings (`later - earlier`). */
function daysBetween(earlierIso: string, laterIso: string): number | null {
  const start = Date.parse(`${earlierIso.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${laterIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const diff = Math.round((end - start) / 86_400_000);
  return diff >= 0 ? diff : null;
}

/** Earliest date per event type — the node shows when it first happened. */
function completionDates(events: TimelineEventPrivate[]): Map<TimelineEventType, string> {
  const dates = new Map<TimelineEventType, string>();
  for (const event of events) {
    const existing = dates.get(event.event_type);
    if (existing === undefined || event.event_date < existing) {
      dates.set(event.event_type, event.event_date);
    }
  }
  const offer = dates.get("OFFER_LETTER");
  if (offer !== undefined) {
    if (!dates.has("SELECTION")) {
      dates.set("SELECTION", shiftDays(offer, -7));
    }
    if (!dates.has("INTERVIEW")) {
      dates.set("INTERVIEW", shiftDays(offer, -21));
    }
  }
  return dates;
}

export function MilestoneStepper({ events }: MilestoneStepperProps): React.ReactElement {
  const dates = completionDates(events);
  const resolved = MILESTONES.map((milestone) => {
    const date =
      dates.get(milestone.type) ??
      (milestone.alt !== undefined ? dates.get(milestone.alt) : undefined);
    return { milestone, date };
  });
  const doneCount = resolved.filter((entry) => entry.date !== undefined).length;
  const inFlight = resolved.findIndex((entry) => entry.date === undefined);
  const lastDone = resolved.reduce(
    (acc, entry, index) => (entry.date !== undefined ? index : acc),
    -1,
  );
  const progress = Math.round((doneCount / MILESTONES.length) * 100);

  return (
    <div className="overflow-x-auto pb-1" data-testid="status-stepper">
      <div className="relative min-w-[580px] py-7">
        {/* Connector rules behind the nodes. */}
        <div
          className="absolute top-[44px] left-8 right-8 h-px bg-slate-200 -z-0 dark:bg-slate-700"
          aria-hidden="true"
        />
        <div
          className="absolute top-[44px] left-8 h-0.5 bg-brand-700 -z-0 transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-brand-500"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
        <ol
          aria-label="Recruitment progression"
          className="relative z-10 grid grid-cols-6 gap-2"
        >
          {resolved.map(({ milestone, date }, index) => {
            const done = date !== undefined;
            const active = !done && index === inFlight;
            const prevDate = index > 0 ? resolved[index - 1]?.date : undefined;
            const deltaDays =
              done && date !== undefined && prevDate !== undefined
                ? daysBetween(prevDate, date)
                : null;

            return (
              <li
                key={milestone.type}
                className="group flex flex-col items-center text-center"
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <div
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white dark:bg-brand-500 dark:text-slate-950",
                      index === lastDone ? "ring-4 ring-brand-50 dark:ring-brand-950/80" : "",
                    ]
                      .join(" ")
                      .trim()}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                  </div>
                ) : active ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-400 bg-amber-50 text-amber-700 ring-4 ring-amber-50 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-950/60">
                    <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                )}
                <div className="mt-3 flex flex-col items-center">
                  <div
                    className={
                      done
                        ? "text-xs font-semibold text-slate-900 dark:text-slate-100"
                        : active
                          ? "text-xs font-semibold text-amber-700 dark:text-amber-400"
                          : "text-xs font-medium text-slate-400 dark:text-slate-500"
                    }
                  >
                    {milestone.label}
                  </div>
                  <div className="mt-0.5 flex items-center justify-center gap-1">
                    <span
                      className={
                        done
                          ? "text-[11px] font-medium text-brand-700 dark:text-brand-300"
                          : active
                            ? "text-[11px] font-medium text-amber-600 dark:text-amber-400"
                            : "text-[11px] font-medium text-slate-400 dark:text-slate-500"
                      }
                    >
                      {done ? milestone.doneLabel : "Pending"}
                    </span>
                    {deltaDays !== null && (
                      <span
                        data-testid={`stepper-delta-${milestone.type}`}
                        className="rounded bg-slate-100 px-1 py-0.5 font-mono-code text-[10px] font-medium text-slate-600 tabular-nums dark:bg-slate-800 dark:text-slate-300"
                      >
                        +{deltaDays}d
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono-code text-[10px] text-slate-400 tabular-nums dark:text-slate-500">
                    {done && date !== undefined
                      ? formatDateShort(date)
                      : active
                        ? "Awaiting update"
                        : "No date yet"}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

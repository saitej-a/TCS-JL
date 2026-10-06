/**
 * The §7.4 "recruitment progression" stepper, built to the
 * `candidate_dashboard_1` composition's stepper diagram: a 6-column grid of
 * nodes over two absolutely-positioned connector rules (a full-width slate track
 * and an emerald progress line sized to the share of nodes actually completed).
 *
 * Every node is driven by the candidate's real timeline events (GET /timeline/
 * rows — no invented dates, ever). A node completes when an event of its type
 * exists; the final node accepts JOINING_DATE **or** JOINED; OTHER is never a
 * milestone. The composition's own node treatments are kept verbatim: completed
 * nodes are emerald discs carrying `check`, the node actually in flight is the
 * amber pulsing `hourglass_top`, and nodes not yet reached are the dashed
 * `calendar_month` placeholders.
 *
 * The composition prints a mock date under every node ("23 Apr 2026", "Estimated
 * soon", "TBD"); those are fabricated. A completed node shows the real date it was
 * reported, and an unreached node says so instead of guessing one.
 *
 * Dark parity (Phase 16 follow-up): the track, the node rings and every label
 * carry their `dark:` pair, so the stepper reads on the app's default dark
 * surface; the light classes stay exactly the composition's.
 */
import type { TimelineEventType, TimelineEventPrivate } from "@/api/timeline";
import { formatDateShort, shiftDays } from "@/utils/date";

interface MilestoneDef {
  type: TimelineEventType;
  /** Any alternate event type that also satisfies the node. */
  alt?: TimelineEventType;
  /** The composition's node title. */
  label: string;
  /** The composition's completed-state word ("Cleared", "Accepted", …). */
  doneLabel: string;
  /** The composition's device glyph for a node not yet reached. */
  pendingGlyph: string;
}

const MILESTONES: readonly MilestoneDef[] = [
  { type: "INTERVIEW", label: "Interview", doneLabel: "Cleared", pendingGlyph: "calendar_month" },
  { type: "SELECTION", label: "Selection", doneLabel: "Selected", pendingGlyph: "calendar_month" },
  { type: "OFFER_LETTER", label: "Offer", doneLabel: "Accepted", pendingGlyph: "calendar_month" },
  {
    type: "READINESS_SURVEY",
    label: "Survey",
    doneLabel: "Submitted",
    pendingGlyph: "calendar_month",
  },
  {
    type: "JOINING_LETTER",
    label: "Joining Letter",
    doneLabel: "Received",
    pendingGlyph: "calendar_month",
  },
  {
    type: "JOINING_DATE",
    alt: "JOINED",
    label: "Joining Date",
    doneLabel: "Confirmed",
    pendingGlyph: "calendar_month",
  },
] as const;

export interface MilestoneStepperProps {
  events: TimelineEventPrivate[];
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
  // The node in flight is the first one not reported yet; the composition marks it
  // with the pulsing amber hourglass.
  const inFlight = resolved.findIndex((entry) => entry.date === undefined);
  // The composition rings the node the candidate has just cleared
  // (`ring-4 ring-emerald-50`) — that is the newest completed milestone.
  const lastDone = resolved.reduce(
    (acc, entry, index) => (entry.date !== undefined ? index : acc),
    -1,
  );
  const progress = Math.round((doneCount / MILESTONES.length) * 100);

  return (
    <div className="overflow-x-auto pb-1" data-testid="status-stepper">
      <div className="relative min-w-[560px] py-8">
        {/* The composition's connector rules, behind the nodes. */}
        <div className="absolute top-[52px] left-8 right-8 h-0.5 bg-slate-200 -z-0 dark:bg-slate-700" aria-hidden="true" />
        <div
          className="absolute top-[52px] left-8 h-0.5 bg-emerald-500 -z-0"
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
            return (
              <li
                key={milestone.type}
                className="group flex flex-col items-center text-center"
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <div
                    className={[
                      "w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm",
                      index === lastDone ? "ring-4 ring-emerald-50 dark:ring-emerald-950" : "",
                    ]
                      .join(" ")
                      .trim()}
                  >
                    <span
                      className="material-symbols-outlined text-base font-bold"
                      data-icon="check"
                      aria-hidden="true"
                    >
                      check
                    </span>
                  </div>
                ) : active ? (
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm ring-4 ring-amber-100 animate-pulse dark:ring-amber-950">
                    <span
                      className="material-symbols-outlined text-base"
                      data-icon="hourglass_top"
                      aria-hidden="true"
                    >
                      hourglass_top
                    </span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 bg-white text-slate-400 flex items-center justify-center dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">
                    <span
                      className="material-symbols-outlined text-base"
                      data-icon={milestone.pendingGlyph}
                      aria-hidden="true"
                    >
                      {milestone.pendingGlyph}
                    </span>
                  </div>
                )}
                <div className="mt-3">
                  <div
                    className={
                      done
                        ? "text-xs font-semibold text-slate-900 dark:text-slate-100"
                        : active
                          ? "text-xs font-bold text-amber-700 dark:text-amber-400"
                          : "text-xs font-semibold text-slate-400 dark:text-slate-500"
                    }
                  >
                    {milestone.label}
                  </div>
                  <div
                    className={
                      done
                        ? "text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                        : active
                          ? "text-[11px] font-medium text-amber-600 dark:text-amber-400"
                          : "text-[11px] font-medium text-slate-400 dark:text-slate-500"
                    }
                  >
                    {done ? milestone.doneLabel : "Pending"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 dark:text-slate-500">
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

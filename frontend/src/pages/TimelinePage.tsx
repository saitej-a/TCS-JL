/**
 * The §7.5 personal timeline, built to the
 * `personal_recruitment_timeline_1` composition: the `max-w-7xl` two-column
 * workspace whose center column holds the page header, the status bar with its
 * quick-stat chips and the `rounded-2xl` roadmap card, and whose rail holds the
 * composition's "MY STATUS SUMMARY" card. The vertical roadmap itself lives in
 * `TimelineRoadmap`.
 *
 * The candidate's status badge mirrors the server's forward-only sync (a mapped
 * event advances `current_status`; deletion never recalculates it).
 *
 * Destructive actions get a §6.6 confirm dialog, never an instant delete;
 * success and failure surface as §6.7.1 toasts; the server's validation message
 * renders inline in the modal, verbatim.
 *
 * Recorded divergences (RECONCILIATION-16.md): the composition's rail community
 * pulse (1,248 tracked / 210 received / 87 confirmed / 42 joined and their
 * "+84 this wk" deltas) and its external-community links are not copied — the
 * page reads no analytics endpoint and has no verified external channels. Its
 * quick-stat chips are, in contrast, all fillable from the record, so they are.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteTimelineEvent,
  listMyTimelineEvents,
  updateTimelineEvent,
  createTimelineEvent,
  type TimelineEventPrivate,
  type TimelineEventType,
} from "@/api/timeline";
import { getProfile } from "@/api/profile";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { RailStatusSummary } from "@/components/RailStatusSummary";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { TimelineEventModal } from "@/components/TimelineEventModal";
import { TimelineRoadmap } from "@/components/TimelineRoadmap";
import { useToast } from "@/components/Toast";
import { recordMilestoneAdded } from "@/pwa/installSignals";
import { STATUS_LABELS } from "@/theme/badges";
import type { CandidateStatus } from "@/types/user";
import { daysSince, formatDateShort, shiftDays } from "@/utils/date";

interface ModalState {
  /** Add mode when null, edit mode otherwise. */
  event: TimelineEventPrivate | null;
  /** Pre-set event type for quick actions ("Mark as Received" / "Set Date"). */
  presetType?: TimelineEventType;
}

/** The composition's quick-stat chip. */
function StatChip({
  glyph,
  label,
  value,
  accent,
}: {
  glyph: string;
  label: string;
  value: string;
  /** The composition's emerald "verified" variant. */
  accent?: boolean;
}) {
  return (
    <span
      className={
        accent
          ? "inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-md font-medium dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60"
          : "inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium dark:bg-slate-900/60 dark:text-slate-300 dark:border dark:border-slate-700/80"
      }
    >
      <span
        className={
          accent
            ? "material-symbols-outlined text-xs text-emerald-600 dark:text-emerald-400"
            : "material-symbols-outlined text-xs text-slate-500 dark:text-slate-400"
        }
        aria-hidden="true"
      >
        {glyph}
      </span>
      {label}:{" "}
      <strong className={accent ? "font-semibold text-emerald-900 dark:text-emerald-200" : "font-semibold text-slate-900 dark:text-slate-100"}>
        {value}
      </strong>
    </span>
  );
}

export function TimelinePage(): React.ReactElement {
  const { toast } = useToast();
  const [events, setEvents] = useState<TimelineEventPrivate[] | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TimelineEventPrivate | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** The composition's "Expand all notes" control. */
  const [expandNotes, setExpandNotes] = useState(false);

  const refresh = useCallback(async (): Promise<TimelineEventPrivate[]> => {
    const page = await listMyTimelineEvents();
    setEvents(page.results);
    return page.results;
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([refresh(), getProfile().then((profile) => profile.current_status)])
      .then(([, status]) => {
        if (!cancelled) setCurrentStatus(status);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function refreshStatus(): Promise<void> {
    const profile = await getProfile();
    setCurrentStatus(profile.current_status);
  }

  async function handleSubmit(payload: {
    event_type: TimelineEventType;
    event_date: string;
    description?: string;
    priorEvents?: {
      interviewDate?: string;
      selectionDate?: string;
    };
  }): Promise<void> {
    // Read the target once: `modal?.event === null || modal.event === undefined`
    // left `modal` unnarrowed (a null state dereferenced below) and only
    // typechecked because the build's project references were never gated.
    const editing = modal?.event ?? null;
    if (editing === null) {
      await createTimelineEvent({
        event_type: payload.event_type,
        event_date: payload.event_date,
        description: payload.description,
      });
      // §10.1's install trigger: account created + ≥1 timeline milestone
      // (9.4 Task 8). Only a real creation counts, not an edit.
      recordMilestoneAdded();
    } else {
      await updateTimelineEvent(editing.id, {
        event_type: payload.event_type,
        event_date: payload.event_date,
        description: payload.description,
      });
    }
    // When a person enters offer letter received date, mark previous events (Interview, Selection) as complete.
    // Distinct timeline dates are used (never the same date as the offer letter).
    if (payload.event_type === "OFFER_LETTER") {
      const recordedTypes = new Set((events ?? []).map((e) => e.event_type));
      const interviewDate =
        payload.priorEvents?.interviewDate || shiftDays(payload.event_date, -21);
      const selectionDate =
        payload.priorEvents?.selectionDate || shiftDays(payload.event_date, -7);

      if (payload.priorEvents !== undefined || editing === null) {
        if (!recordedTypes.has("INTERVIEW")) {
          await createTimelineEvent({
            event_type: "INTERVIEW",
            event_date: interviewDate,
            description: "Technical & HR Interview cleared prior to offer letter.",
          }).catch(() => {});
        }
        if (!recordedTypes.has("SELECTION")) {
          await createTimelineEvent({
            event_type: "SELECTION",
            event_date: selectionDate,
            description: "Selection confirmed prior to offer letter.",
          }).catch(() => {});
        }
      }
    }
    await Promise.all([refresh(), refreshStatus()]);
    toast({
      message: editing === null ? "Milestone event added." : "Milestone event updated.",
      variant: "success",
    });
    setModalOpen(false);
    setModal(null);
  }

  async function handleDelete(): Promise<void> {
    if (pendingDelete === null) return;
    setDeleting(true);
    try {
      await deleteTimelineEvent(pendingDelete.id);
      await refresh();
      toast({ message: "Milestone event deleted. Your status history is unchanged.", variant: "success" });
    } catch {
      toast({ message: "Could not delete the event. Please try again.", variant: "error" });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const list = events ?? [];
  const unverifiedCount = list.filter((event) => !event.is_verified).length;

  /** The composition's quick-stat chips, from the record itself. */
  const chips = useMemo(() => {
    const earliestOf = (type: TimelineEventType): TimelineEventPrivate | null => {
      const matches = list.filter((event) => event.event_type === type);
      if (matches.length === 0) return null;
      return matches.reduce((a, b) => (a.event_date < b.event_date ? a : b));
    };
    const offer = earliestOf("OFFER_LETTER");
    const survey = earliestOf("READINESS_SURVEY");
    const allVerified = list.length > 0 && unverifiedCount === 0;
    return {
      offerDays: offer === null ? null : daysSince(offer.event_date),
      surveyDays: survey === null ? null : daysSince(survey.event_date),
      allVerified: allVerified,
    };
  }, [list, unverifiedCount]);

  /** The rail's status line: since when, and how long that has been. */
  const latest = list.length === 0 ? null : list.reduce((a, b) => (a.event_date > b.event_date ? a : b));
  const offerEvent = useMemo(() => {
    const matches = list.filter((event) => event.event_type === "OFFER_LETTER");
    return matches.length === 0
      ? null
      : matches.reduce((a, b) => (a.event_date < b.event_date ? a : b));
  }, [list]);

  const openAdd = (presetType?: TimelineEventType) => {
    setModal({ event: null, presetType: presetType });
    setModalOpen(true);
  };

  return (
    <main
      className="skin-v1 flex-1 flex flex-col xl:flex-row p-6 gap-6 max-w-7xl w-full mx-auto font-body antialiased max-sm:p-4"
      data-testid="timeline-page"
    >
      {/* CENTER COLUMN */}
      <section className="flex-1 flex flex-col gap-6 min-w-0">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              MY RECRUITMENT TIMELINE
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Track, log, and verify each milestone in your TCS recruitment journey.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => openAdd()}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm transition-all active:scale-[0.98] dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                add_circle
              </span>
              <span>Add Milestone Event</span>
            </button>
          </div>
        </div>

        {/* Status bar with the record's own quick-stat chips */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 dark:bg-slate-800 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Current Status:
            </span>
            {currentStatus === null ? (
              <Skeleton className="h-6 w-40 rounded-full" />
            ) : (
              <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-300 font-semibold text-xs px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 dark:hover:bg-amber-900/60">
                <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" aria-hidden="true" />
                <span>{STATUS_LABELS[currentStatus as CandidateStatus] ?? currentStatus}</span>
                <span className="material-symbols-outlined text-xs text-amber-700 dark:text-amber-400" aria-hidden="true">
                  arrow_drop_down
                </span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {chips.offerDays !== null && (
              <StatChip glyph="calendar_month" label="Days since offer" value={`${chips.offerDays} days`} />
            )}
            {chips.surveyDays !== null && (
              <StatChip glyph="checklist" label="Survey completed" value={`${chips.surveyDays} days ago`} />
            )}
            {list.length > 0 && (
              <StatChip
                glyph="verified"
                label="Verification"
                value={chips.allVerified ? "Hash Verified" : `${unverifiedCount} pending`}
                accent={chips.allVerified}
              />
            )}
          </div>
        </div>

        {/* Roadmap card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-700/60 gap-2">
            <div>
              <h2 className="font-headline text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                MILESTONE TIMELINE
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reverse chronological view (Latest first)</p>
            </div>
            <div className="flex items-center gap-2">
              {events !== null && (
                <span className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300 dark:border dark:border-slate-700/80 px-2.5 py-1 rounded-full font-medium">
                  {events.length} {events.length === 1 ? "Milestone" : "Total Milestones"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setExpandNotes((open) => !open)}
                aria-pressed={expandNotes}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Expand all notes
              </button>
            </div>
          </div>

          {failed ? (
            <EmptyState
              headline="Your timeline could not be loaded"
              support="Check your connection and try again."
              actionLabel="Retry"
              onAction={() => window.location.reload()}
            />
          ) : events === null ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <TimelineRoadmap
              events={events}
              expandNotes={expandNotes}
              onEdit={(event) => {
                setModal({ event: event });
                setModalOpen(true);
              }}
              onDelete={(event) => setPendingDelete(event)}
              onQuickAction={(type) => openAdd(type)}
            />
          )}
        </div>
      </section>

      {/* RIGHT RAIL — the composition's MY STATUS SUMMARY card, real fields */}
      <aside className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
        <RailStatusSummary
          status={currentStatus}
          statusDescription={
            latest !== null && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Since {formatDateShort(latest.event_date)} (
                <strong className="text-slate-700 dark:text-slate-200">
                  {daysSince(latest.event_date)} days pending
                </strong>
                )
              </p>
            )
          }
          details={
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Latest milestone:</span>
                <span className="text-right font-semibold text-slate-800 dark:text-slate-200">
                  {latest === null ? "—" : formatDateShort(latest.event_date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Offer Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {offerEvent === null ? "Not reported" : formatDateShort(offerEvent.event_date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Recorded milestones:</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 dark:border dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200">
                  {list.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Verification:</span>
                <span className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span
                    className="material-symbols-outlined text-xs font-bold text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {unverifiedCount === 0 ? "All verified" : `${unverifiedCount} pending`}
                </span>
              </div>
            </>
          }
          onUpdate={() => openAdd()}
        />
      </aside>

      <TimelineEventModal
        open={modalOpen}
        event={
          modal?.event !== null && modal?.event !== undefined
            ? {
                id: modal.event.id,
                event_type: modal.event.event_type,
                event_date: modal.event.event_date,
                description: modal.event.description,
              }
            : null
        }
        presetType={modal?.presetType}
        onClose={() => {
          setModalOpen(false);
          setModal(null);
        }}
        onSubmit={(payload) => handleSubmit(payload)}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this event?"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This permanently removes the milestone from your record. Your current status never
          moves backwards, but the event itself cannot be recovered.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={() => void handleDelete()}>
            Delete event
          </Button>
        </div>
      </Modal>
    </main>
  );
}

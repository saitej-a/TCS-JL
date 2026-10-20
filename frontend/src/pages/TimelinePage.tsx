/**
 * The §7.5 personal timeline (Phase 5 Anti-Slop Overhaul):
 * Vertical engineering-log recruitment ledger with verified badges, date diffs,
 * and inline milestone actions.
 *
 * Behavior contracts preserved:
 * - Status badge mirrors the server's forward-only sync;
 * - Destructive actions require confirmation before DELETE;
 * - Server validation messages render inline in the modal verbatim.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ListChecks,
  PlusCircle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

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

/** Quick-stat chip in the timeline status bar. */
function StatChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span
      className={
        accent
          ? "inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300"
          : "inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-300"
      }
    >
      <Icon
        className={
          accent
            ? "h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
            : "h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
        }
        aria-hidden="true"
      />
      {label}:{" "}
      <strong
        className={
          accent
            ? "font-semibold text-emerald-900 tabular-nums dark:text-emerald-200"
            : "font-semibold text-slate-900 tabular-nums dark:text-slate-100"
        }
      >
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
    const editing = modal?.event ?? null;
    if (editing === null) {
      await createTimelineEvent({
        event_type: payload.event_type,
        event_date: payload.event_date,
        description: payload.description,
      });
      recordMilestoneAdded();
    } else {
      await updateTimelineEvent(editing.id, {
        event_type: payload.event_type,
        event_date: payload.event_date,
        description: payload.description,
      });
    }
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
      toast({
        message: "Milestone event deleted. Your status history is unchanged.",
        variant: "success",
      });
    } catch {
      toast({ message: "Could not delete the event. Please try again.", variant: "error" });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const list = useMemo(() => events ?? [], [events]);
  const unverifiedCount = list.filter((event) => !event.is_verified).length;

  /** Quick-stat chips derived strictly from the candidate's record. */
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

  const latest =
    list.length === 0 ? null : list.reduce((a, b) => (a.event_date > b.event_date ? a : b));
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
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6 font-body antialiased max-sm:p-4 xl:flex-row"
      data-testid="timeline-page"
    >
      {/* CENTER COLUMN */}
      <section className="flex min-w-0 flex-1 flex-col gap-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              My recruitment timeline
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Track, log, and verify each milestone in your TCS recruitment journey.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => openAdd()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>Add Milestone Event</span>
            </button>
          </div>
        </div>

        {/* Status bar with the record's own quick-stat chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Current status:
            </span>
            {currentStatus === null ? (
              <Skeleton className="h-6 w-40 rounded-full" />
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300">
                <span
                  className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400"
                  aria-hidden="true"
                />
                <span>{STATUS_LABELS[currentStatus as CandidateStatus] ?? currentStatus}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {chips.offerDays !== null && (
              <StatChip icon={Calendar} label="Days since offer" value={`${chips.offerDays} days`} />
            )}
            {chips.surveyDays !== null && (
              <StatChip
                icon={ListChecks}
                label="Survey completed"
                value={`${chips.surveyDays} days ago`}
              />
            )}
            {list.length > 0 && (
              <StatChip
                icon={ShieldCheck}
                label="Verification"
                value={chips.allVerified ? "Verified" : `${unverifiedCount} pending`}
                accent={chips.allVerified}
              />
            )}
          </div>
        </div>

        {/* Roadmap card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 dark:border-slate-700/80 dark:bg-slate-800">
          <div className="mb-6 flex flex-col justify-between gap-2 border-b border-slate-100 pb-6 sm:flex-row sm:items-center dark:border-slate-700/60">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Milestone timeline
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reverse chronological view (latest first)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {events !== null && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 tabular-nums dark:border dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-300">
                  {events.length} {events.length === 1 ? "Milestone" : "Total Milestones"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setExpandNotes((open) => !open)}
                aria-pressed={expandNotes}
                className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
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

      {/* RIGHT RAIL — shared status summary card */}
      <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-80">
        <RailStatusSummary
          status={currentStatus}
          statusDescription={
            latest !== null && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Since {formatDateShort(latest.event_date)} (
                <strong className="text-slate-700 tabular-nums dark:text-slate-200">
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
                  {list.length}
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

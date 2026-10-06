/**
 * The §7.5 add/edit timeline modal, restyled to the
 * `add_edit_milestone_modal` composition (Phase 12): uppercase field labels
 * with rose asterisks, the helper line under the type select, the live char
 * counter on the notes field, and the composition's footer (Esc hint left,
 * Cancel/Save right). Built on Modal.tsx (G-8).
 *
 * The write body stays exactly {event_type, event_date, description} —
 * `auto_update_status` is server-hardcoded (4.2 R4) and is never sent (the
 * composition's checkbox card is fiction and is not copied). A mapped event
 * advances `current_status` server-side (4.1's walk-the-chain), which the
 * auto-status note states in the UI.
 *
 * Validation is surfaced, not pre-empted: a date the server rejects
 * (e.g. the 730-day horizon, or a future JOINING_LETTER) renders the
 * server's message inline next to the field, verbatim.
 */
import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "@/api/errors";
import type { TimelineEventType } from "@/api/timeline";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Textarea } from "@/components/Textarea";
import { shiftDays } from "@/utils/date";

export const EVENT_TYPE_OPTIONS: readonly { value: TimelineEventType; label: string }[] = [
  { value: "INTERVIEW", label: "Technical & HR Interview" },
  { value: "SELECTION", label: "Selection Communicated" },
  { value: "OFFER_LETTER", label: "Offer Letter Issued" },
  { value: "READINESS_SURVEY", label: "Joining Readiness Survey Submitted" },
  { value: "JOINING_LETTER", label: "Joining Letter" },
  { value: "JOINING_DATE", label: "Joining Date & Onboarding" },
  { value: "JOINED", label: "Joined TCS" },
  { value: "OTHER", label: "Other" },
] as const;

export interface TimelineEventModalProps {
  open: boolean;
  /** Add mode when null, edit mode otherwise. */
  event: { id: string; event_type: TimelineEventType; event_date: string; description: string } | null;
  /** Pre-selected type for §7.5's quick actions ("Mark as Received" / "Set Date"). */
  presetType?: TimelineEventType;
  onClose: () => void;
  onSubmit: (payload: {
    event_type: TimelineEventType;
    event_date: string;
    description: string;
    priorEvents?: {
      interviewDate?: string;
      selectionDate?: string;
    };
  }) => Promise<void>;
}

export function TimelineEventModal({ open, event, presetType, onClose, onSubmit }: TimelineEventModalProps): React.ReactElement {
  const [eventType, setEventType] = useState<TimelineEventType>("OTHER");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [includePriorEvents, setIncludePriorEvents] = useState(true);
  const [interviewDate, setInterviewDate] = useState("");
  const [selectionDate, setSelectionDate] = useState("");
  const [customizedPrior, setCustomizedPrior] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const initialType = event?.event_type ?? presetType ?? "OTHER";
      const initialDate = event?.event_date ?? new Date().toISOString().slice(0, 10);
      setEventType(initialType);
      setEventDate(initialDate);
      setDescription(event?.description ?? "");
      setIncludePriorEvents(event === null);
      setInterviewDate(shiftDays(initialDate, -21));
      setSelectionDate(shiftDays(initialDate, -7));
      setCustomizedPrior(false);
      setFieldError(null);
      setFormError(null);
      setSaving(false);
    }
  }, [open, event, presetType]);

  const handleEventDateChange = (newDate: string) => {
    setEventDate(newDate);
    if (!customizedPrior) {
      setInterviewDate(shiftDays(newDate, -21));
      setSelectionDate(shiftDays(newDate, -7));
    }
  };

  async function handleSubmit(formEvent: FormEvent): Promise<void> {
    formEvent.preventDefault();
    setSaving(true);
    setFieldError(null);
    setFormError(null);
    try {
      const payload: {
        event_type: TimelineEventType;
        event_date: string;
        description: string;
        priorEvents?: {
          interviewDate?: string;
          selectionDate?: string;
        };
      } = {
        event_type: eventType,
        event_date: eventDate,
        description: description,
      };
      if (eventType === "OFFER_LETTER" && includePriorEvents) {
        payload.priorEvents = {
          interviewDate: interviewDate || shiftDays(eventDate, -21),
          selectionDate: selectionDate || shiftDays(eventDate, -7),
        };
      }
      await onSubmit(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        // DRF's raw field-errors shape lands in `details` (errors.ts): render
        // the first message for the field it names; anything else is form-wide.
        const details = error.details;
        if (details !== null && typeof details === "object" && !Array.isArray(details)) {
          const record = details as Record<string, unknown>;
          const dateMessages = record["event_date"];
          if (Array.isArray(dateMessages) && dateMessages.length > 0) {
            setFieldError(String(dateMessages[0]));
          } else {
            const first = Object.values(record)[0];
            if (first !== undefined) {
              setFormError(Array.isArray(first) ? String(first[0]) : String(first));
            }
          }
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={event === null ? "Add Timeline Milestone Event" : "Edit Timeline Milestone Event"}>
      <form onSubmit={(e) => void handleSubmit(e)} className="skin-v1 space-y-5 font-body">
        <div>
          <label
            htmlFor="timeline-event-type"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Event Milestone Type <span className="text-rose-500">*</span>
          </label>
          <select
            id="timeline-event-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as TimelineEventType)}
            required
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 dark:border-slate-600 dark:bg-slate-900"
          >
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.value})
              </option>
            ))}
          </select>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">info</span>
            <span>Milestones advance your status server-side; they never move it backwards.</span>
          </p>
        </div>

        <Input
          label="DATE OCCURRED *"
          type="date"
          value={eventDate}
          onChange={(e) => handleEventDateChange(e.target.value)}
          required
          errorText={fieldError ?? undefined}
        />

        {eventType === "OFFER_LETTER" && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <div className="flex items-start gap-2.5">
              <input
                id="auto-complete-prior"
                type="checkbox"
                checked={includePriorEvents}
                onChange={(e) => setIncludePriorEvents(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
              />
              <label
                htmlFor="auto-complete-prior"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Mark previous events (Interview & Selection) as complete
                <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                  Set the timeline for your interview and selection stages so each milestone is accurately dated.
                </p>
              </label>
            </div>

            {includePriorEvents && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                <Input
                  label="INTERVIEW DATE *"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => {
                    setInterviewDate(e.target.value);
                    setCustomizedPrior(true);
                  }}
                  required={includePriorEvents}
                />
                <Input
                  label="SELECTION DATE *"
                  type="date"
                  value={selectionDate}
                  onChange={(e) => {
                    setSelectionDate(e.target.value);
                    setCustomizedPrior(true);
                  }}
                  required={includePriorEvents}
                />
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="timeline-event-notes"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Description / Notes (Optional)
            </label>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500" aria-live="polite">
              {description.length} / 500 characters
            </span>
          </div>
          <Textarea
            id="timeline-event-notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Saving a milestone event automatically advances your current status to match (server-side). Your status never moves backwards.
        </p>

        {formError !== null && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {formError}
          </p>
        )}

        {/* The composition's footer: Esc hint left, Cancel/Save right. */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Esc
            </kbd>
            <span>to close</span>
          </span>
          <span className="flex items-center gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? "Saving..." : event === null ? "Add Event" : "Save Changes"}
            </button>
          </span>
        </div>
      </form>
    </Modal>
  );
}

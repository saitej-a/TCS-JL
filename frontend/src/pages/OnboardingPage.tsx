/**
 * The candidate onboarding wizard:
 * Step 1: Recruitment status ("What is your status?") + dynamic milestone date inputs
 *         (e.g., JRS asks interview date, offer letter date, and JRS date).
 * Step 2: Candidature details (Display name, Hiring stream, Region, Batch).
 * Step 3: Review & accuracy confirmation -> refreshUser() -> /dashboard.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  getProfile,
  saveProfileStep1,
  saveCurrentStatus,
  ProfileNotFoundError,
  type CandidateProfilePrivate,
  type HiringType,
  type ProfileWritePayload,
} from "@/api/profile";
import { Disclaimer } from "@/components/Disclaimer";
import { Input } from "@/components/Input";
import { createTimelineEvent, type TimelineEventType } from "@/api/timeline";
import type { CandidateStatus } from "@/types/user";
import { useAuth } from "@/context/AuthContext";
import { ErrorStrip } from "@/pages/authCard";

export interface StatusOption {
  status: CandidateStatus;
  label: string;
  description: string;
  defaultEvent: TimelineEventType;
}

export const STATUS_OPTIONS: ReadonlyArray<StatusOption> = [
  {
    status: "INTERVIEWED",
    label: "Interview completed",
    description: "Attended Technical & HR interview, awaiting results",
    defaultEvent: "INTERVIEW",
  },
  {
    status: "SELECTED",
    label: "Selection confirmed",
    description: "Cleared interview, received selection communication",
    defaultEvent: "SELECTION",
  },
  {
    status: "OFFER_RECEIVED",
    label: "Offer letter received",
    description: "Received official TCS offer letter, no joining letter yet",
    defaultEvent: "OFFER_LETTER",
  },
  {
    status: "READINESS_SURVEY",
    label: "Joining readiness survey (JRS) received",
    description: "Received or submitted the onboarding readiness survey on TCS portal",
    defaultEvent: "READINESS_SURVEY",
  },
  {
    status: "WAITING_FOR_JOINING_LETTER",
    label: "Waiting for joining letter",
    description: "Readiness survey submitted, awaiting official Joining Letter dispatch",
    defaultEvent: "JOINING_LETTER",
  },
  {
    status: "JOINING_LETTER_RECEIVED",
    label: "Joining letter received",
    description: "Received official Joining Letter (JL) with batch details",
    defaultEvent: "JOINING_LETTER",
  },
  {
    status: "JOINING_DATE_RECEIVED",
    label: "Joining date confirmed",
    description: "Joining date and reporting center confirmed",
    defaultEvent: "JOINING_DATE",
  },
  {
    status: "JOINED",
    label: "Joined TCS",
    description: "Onboarded and reported for Initial Learning Program (ILP)",
    defaultEvent: "JOINED",
  },
];

const BATCHES = ["2024", "2025", "2026", "2027"] as const;

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  REGISTERED: "Registered",
  INTERVIEWED: "Interview completed",
  SELECTED: "Selection confirmed",
  OFFER_RECEIVED: "Offer letter received",
  READINESS_SURVEY: "Joining readiness survey (JRS) received",
  WAITING_FOR_JOINING_LETTER: "Waiting for joining letter",
  JOINING_LETTER_RECEIVED: "Joining letter received",
  JOINING_DATE_RECEIVED: "Joining date confirmed",
  JOINED: "Joined TCS",
  WITHDRAWN: "Withdrawn",
  OTHER: "Not sure / other",
};

export interface MilestoneDates {
  interview_date: string;
  selection_date: string;
  offer_letter_date: string;
  survey_date: string;
  joining_letter_date: string;
  joining_date: string;
}

export interface DateFieldConfig {
  key: keyof MilestoneDates;
  label: string;
  helper: string;
  required: boolean;
  id: string;
}

export function getDateInputsForStatus(status: CandidateStatus): DateFieldConfig[] {
  switch (status) {
    case "INTERVIEWED":
      return [
        {
          key: "interview_date",
          label: "Interview date",
          helper: "Date you attended your TCS Technical / HR interview",
          required: true,
          id: "ob-interview-date",
        },
      ];
    case "SELECTED":
      return [
        {
          key: "interview_date",
          label: "Interview date (optional)",
          helper: "Date you attended your interview",
          required: false,
          id: "ob-interview-date",
        },
        {
          key: "selection_date",
          label: "Selection mail date",
          helper: "Date you received the official selection communication",
          required: true,
          id: "ob-selection-date",
        },
      ];
    case "OFFER_RECEIVED":
      return [
        {
          key: "interview_date",
          label: "Interview date (optional)",
          helper: "Date you attended your interview",
          required: false,
          id: "ob-interview-date",
        },
        {
          key: "offer_letter_date",
          label: "Offer letter date",
          helper: "Found on page 1 of your official offer letter",
          required: true,
          id: "ob-offer-date",
        },
      ];
    case "READINESS_SURVEY":
      return [
        {
          key: "interview_date",
          label: "Interview date (optional)",
          helper: "Date you attended your interview",
          required: false,
          id: "ob-interview-date",
        },
        {
          key: "offer_letter_date",
          label: "Offer letter date",
          helper: "Found on page 1 of your official offer letter",
          required: true,
          id: "ob-offer-date",
        },
        {
          key: "survey_date",
          label: "Joining readiness survey (JRS) date",
          helper: "Date you received or submitted the readiness survey",
          required: true,
          id: "ob-survey-date",
        },
      ];
    case "WAITING_FOR_JOINING_LETTER":
      return [
        {
          key: "interview_date",
          label: "Interview date (optional)",
          helper: "Date you attended your interview",
          required: false,
          id: "ob-interview-date",
        },
        {
          key: "offer_letter_date",
          label: "Offer letter date",
          helper: "Found on page 1 of your official offer letter",
          required: true,
          id: "ob-offer-date",
        },
        {
          key: "survey_date",
          label: "Joining readiness survey (JRS) date",
          helper: "Date you submitted the readiness survey",
          required: true,
          id: "ob-survey-date",
        },
      ];
    case "JOINING_LETTER_RECEIVED":
      return [
        {
          key: "interview_date",
          label: "Interview date (optional)",
          helper: "Date you attended your interview",
          required: false,
          id: "ob-interview-date",
        },
        {
          key: "offer_letter_date",
          label: "Offer letter date",
          helper: "Found on page 1 of your official offer letter",
          required: true,
          id: "ob-offer-date",
        },
        {
          key: "survey_date",
          label: "Joining readiness survey (JRS) date (optional)",
          helper: "Date you submitted the readiness survey",
          required: false,
          id: "ob-survey-date",
        },
        {
          key: "joining_letter_date",
          label: "Joining letter date",
          helper: "Date your official joining letter was issued",
          required: true,
          id: "ob-jl-date",
        },
      ];
    case "JOINING_DATE_RECEIVED":
      return [
        {
          key: "interview_date",
          label: "Interview date (optional)",
          helper: "Date you attended your interview",
          required: false,
          id: "ob-interview-date",
        },
        {
          key: "offer_letter_date",
          label: "Offer letter date",
          helper: "Found on page 1 of your official offer letter",
          required: true,
          id: "ob-offer-date",
        },
        {
          key: "survey_date",
          label: "Joining readiness survey (JRS) date (optional)",
          helper: "Date you submitted the readiness survey",
          required: false,
          id: "ob-survey-date",
        },
        {
          key: "joining_letter_date",
          label: "Joining letter date (optional)",
          helper: "Date your official joining letter was issued",
          required: false,
          id: "ob-jl-date",
        },
        {
          key: "joining_date",
          label: "Confirmed joining date",
          helper: "Official joining date specified in your joining letter",
          required: true,
          id: "ob-joining-date",
        },
      ];
    case "JOINED":
      return [
        {
          key: "interview_date",
          label: "Interview date (optional)",
          helper: "Date you attended your interview",
          required: false,
          id: "ob-interview-date",
        },
        {
          key: "offer_letter_date",
          label: "Offer letter date",
          helper: "Found on page 1 of your official offer letter",
          required: true,
          id: "ob-offer-date",
        },
        {
          key: "survey_date",
          label: "Joining readiness survey (JRS) date (optional)",
          helper: "Date you submitted the readiness survey",
          required: false,
          id: "ob-survey-date",
        },
        {
          key: "joining_letter_date",
          label: "Joining letter date (optional)",
          helper: "Date your official joining letter was issued",
          required: false,
          id: "ob-jl-date",
        },
        {
          key: "joining_date",
          label: "Joining date",
          helper: "Date you reported and onboarded",
          required: true,
          id: "ob-joining-date",
        },
      ];
    default:
      return [
        {
          key: "offer_letter_date",
          label: "Offer letter date",
          helper: "Found on page 1 of your official offer letter",
          required: true,
          id: "ob-offer-date",
        },
      ];
  }
}

const STEP_LABELS = ["Recruitment status", "Candidature details", "Review"] as const;

interface CandidatureState {
  display_name: string;
  public_identity_mode: "ANONYMOUS" | "DISPLAY_NAME";
  hiring_type: HiringType;
  region: string;
  batch: string;
}

function CardHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-100 pb-6 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-md tracking-wide shadow-sm">
          [TCSJL]
        </span>
        <div className="flex flex-col">
          <span className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
            TCSJL
          </span>
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
            Candidate Onboarding Portal
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        <span>Candidate Onboarding</span>
      </div>
    </header>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div aria-label={`Step ${step} of 3`} className="pt-6">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Step {step} of 3 — {STEP_LABELS[step - 1]}
        </span>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {step === 1 ? "33" : step === 2 ? "66" : "100"}% Completed
        </span>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-2.5">
        {STEP_LABELS.map((label, i) => {
          const seg = i + 1;
          return (
            <div key={label} className="flex flex-col gap-1.5">
              <div
                className={`h-2 w-full rounded-full ${seg <= step ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"}`}
              />
              <span
                className={`truncate text-[11px] ${
                  seg === step
                    ? "font-semibold text-indigo-600 dark:text-indigo-400"
                    : seg < step
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : "font-medium text-slate-400 dark:text-slate-500"
                }`}
              >
                {seg}. {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<CandidateProfilePrivate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Status & Milestone dates
  const [status, setStatus] = useState<CandidateStatus>("OFFER_RECEIVED");
  const [dates, setDates] = useState<MilestoneDates>({
    interview_date: "",
    selection_date: "",
    offer_letter_date: "",
    survey_date: "",
    joining_letter_date: "",
    joining_date: "",
  });

  // Step 2: Candidature details
  const [cand, setCand] = useState<CandidatureState>({
    display_name: "",
    public_identity_mode: "DISPLAY_NAME",
    hiring_type: "DIGITAL",
    region: "",
    batch: "2025",
  });

  // Step 3: Review accuracy confirmation
  const [confirmed, setConfirmed] = useState(false);

  // Load existing profile if resuming
  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((existing) => {
        if (cancelled) return;
        setProfile(existing);
        setCand({
          display_name: existing.display_name,
          public_identity_mode: existing.public_identity_mode,
          hiring_type: existing.hiring_type,
          region: existing.region,
          batch: existing.batch,
        });
        if (existing.current_status && existing.current_status !== "REGISTERED") {
          setStatus(existing.current_status);
        }
        setDates((prev) => ({
          ...prev,
          offer_letter_date: existing.offer_letter_date ?? "",
          interview_date: existing.interview_date ?? "",
          joining_date: existing.expected_joining_date ?? "",
        }));
        // If already set up past REGISTERED, let user land on review or status
        setStep(existing.current_status === "REGISTERED" ? 1 : 1);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ProfileNotFoundError) {
          setProfile(null);
          setLoading(false);
        } else {
          setError("Could not load your profile. Please refresh and try again.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeDateInputs = getDateInputsForStatus(status);
  const isStep1Valid = activeDateInputs.every(
    (field) => !field.required || Boolean(dates[field.key]),
  );

  function handleDateChange(key: keyof MilestoneDates, val: string) {
    setDates((prev) => ({ ...prev, [key]: val }));
  }

  function handleStep1Submit(event: FormEvent) {
    event.preventDefault();
    if (!isStep1Valid) return;
    setError(null);
    setStep(2);
  }

  async function persistStep2(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Persist CandidateProfile
      const payload: ProfileWritePayload = {
        display_name: cand.display_name.trim(),
        public_identity_mode: cand.public_identity_mode,
        batch: cand.batch,
        hiring_type: cand.hiring_type,
        region: cand.region.trim(),
        offer_letter_date: dates.offer_letter_date || null,
        interview_date: dates.interview_date || null,
        expected_joining_date: dates.joining_date || null,
      };
      const saved = await saveProfileStep1(payload, profile);
      setProfile(saved);

      // 2. Persist Timeline Milestones based on entered dates & status
      if (dates.interview_date) {
        await createTimelineEvent({
          event_type: "INTERVIEW",
          event_date: dates.interview_date,
          description: "Technical & HR Interview cleared.",
        }).catch(() => {});
      }
      if (dates.selection_date) {
        await createTimelineEvent({
          event_type: "SELECTION",
          event_date: dates.selection_date,
          description: "Selection confirmed.",
        }).catch(() => {});
      }
      if (dates.offer_letter_date) {
        await createTimelineEvent({
          event_type: "OFFER_LETTER",
          event_date: dates.offer_letter_date,
          description: "Official TCS offer letter received.",
        }).catch(() => {});
      }
      if (dates.survey_date) {
        await createTimelineEvent({
          event_type: "READINESS_SURVEY",
          event_date: dates.survey_date,
          description: "Joining Readiness Survey (JRS) submitted.",
        }).catch(() => {});
      }
      if (status === "WAITING_FOR_JOINING_LETTER") {
        await saveCurrentStatus("WAITING_FOR_JOINING_LETTER").catch(() => {});
      }
      if (dates.joining_letter_date) {
        await createTimelineEvent({
          event_type: "JOINING_LETTER",
          event_date: dates.joining_letter_date,
          description: "Official joining letter received.",
        }).catch(() => {});
      }
      if (dates.joining_date && status === "JOINING_DATE_RECEIVED") {
        await createTimelineEvent({
          event_type: "JOINING_DATE",
          event_date: dates.joining_date,
          description: "Official joining date confirmed.",
        }).catch(() => {});
      }
      if (dates.joining_date && status === "JOINED") {
        await createTimelineEvent({
          event_type: "JOINED",
          event_date: dates.joining_date,
          description: "Joined and onboarded.",
        }).catch(() => {});
      }

      setStep(3);
    } catch (err) {
      const apiError = err as { message?: string };
      setError(apiError?.message ?? "Could not save your details. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Could not refresh your session. Please reload.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500 dark:text-slate-400" role="status">
          Loading your profile…
        </p>
      </div>
    );
  }

  return (
    <div className="skin-v1 min-h-screen flex flex-col justify-between py-10 px-4 sm:px-6 md:px-8 selection:bg-indigo-100 selection:text-indigo-900 font-body text-slate-800 dark:text-slate-200 antialiased bg-[#F8FAFC] dark:bg-slate-950 bg-[radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] dark:bg-[radial-gradient(#334155_0.75px,transparent_0.75px)] [background-size:20px_20px]">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl transition-all sm:p-8 md:p-10 dark:border-slate-800 dark:bg-slate-800">
          <CardHeader />
          <StepIndicator step={step} />

          {error !== null && (
            <div className="mt-4">
              <ErrorStrip message={error} />
            </div>
          )}

          {/* STEP 1: Status & Milestone dates */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} noValidate>
              <h1 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
                What is your recruitment status?
              </h1>
              <p className="mb-6 mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Select your current stage in the TCS process. We will customize the milestone inputs
                for your journey.
              </p>

              {/* Status Selection Cards */}
              <div className="space-y-2.5 mb-6" role="radiogroup" aria-label="Recruitment status">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.status}
                    className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                      status === opt.status
                        ? "border-2 border-indigo-600 bg-indigo-50/70 text-indigo-950 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.status}
                      checked={status === opt.status}
                      onChange={() => setStatus(opt.status)}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Dynamic Milestone Date Inputs Based on Status */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-4 dark:border-indigo-900/50 dark:bg-indigo-950/20 mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span>Milestone dates for {STATUS_LABELS[status]}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Enter the dates for the stages you have completed.
                </p>

                <div className="space-y-4 pt-1">
                  {activeDateInputs.map((field) => (
                    <div key={field.key}>
                      <label
                        htmlFor={field.id}
                        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                      >
                        {field.label}
                      </label>
                      <Input
                        id={field.id}
                        type="date"
                        value={dates[field.key]}
                        onChange={(e) => handleDateChange(field.key, e.target.value)}
                        required={field.required}
                      />
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {field.helper}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 pt-6 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={!isStep1Valid}
                  className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-medium text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Continue</span>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Candidature details */}
          {step === 2 && (
            <form onSubmit={persistStep2} noValidate>
              <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Tell us about your candidature
              </h1>
              <p className="mb-6 mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                This powers your personal timeline and community benchmarks. You can update it in
                Settings anytime.
              </p>

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="ob-display-name"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    Community display name
                  </label>
                  <Input
                    id="ob-display-name"
                    value={cand.display_name}
                    onChange={(e) => setCand({ ...cand, display_name: e.target.value })}
                    placeholder="How the community sees you"
                    maxLength={50}
                    required={cand.public_identity_mode === "DISPLAY_NAME"}
                  />
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cand.public_identity_mode === "ANONYMOUS"}
                      onChange={(e) =>
                        setCand({
                          ...cand,
                          public_identity_mode: e.target.checked ? "ANONYMOUS" : "DISPLAY_NAME",
                        })
                      }
                    />
                    Stay anonymous (show “Anonymous Candidate” instead of a name)
                  </label>
                </div>

                <fieldset>
                  <div className="mb-1.5 flex items-center justify-between">
                    <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Hiring type
                    </legend>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Determines onboarding track
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    {(["PRIME", "DIGITAL", "NINJA", "OTHER"] as const).map((ht) => (
                      <label
                        key={ht}
                        className={`flex min-h-[44px] cursor-pointer flex-col justify-center rounded-xl px-3.5 py-2.5 transition-all ${
                          cand.hiring_type === ht
                            ? "border-2 border-indigo-600 bg-indigo-50/70 shadow-sm text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200"
                            : "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:text-slate-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="hiring_type"
                          value={ht}
                          checked={cand.hiring_type === ht}
                          onChange={() => setCand({ ...cand, hiring_type: ht })}
                          className="sr-only"
                        />
                        <span
                          className={`text-sm font-semibold ${
                            cand.hiring_type === ht
                              ? "text-indigo-900 dark:text-indigo-200"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {ht.toLowerCase()}
                        </span>
                        <span
                          className={`text-xs ${
                            cand.hiring_type === ht
                              ? "text-indigo-700/80"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {ht === "OTHER" ? "Not sure yet" : "Track"}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="ob-region"
                      className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      Region of joining
                    </label>
                    <Input
                      id="ob-region"
                      value={cand.region}
                      onChange={(e) => setCand({ ...cand, region: e.target.value })}
                      placeholder="e.g. Hyderabad"
                      required
                    />
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      Allocated ILP or preferred base location
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="ob-batch"
                      className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      Batch
                    </label>
                    <select
                      id="ob-batch"
                      value={cand.batch}
                      onChange={(e) => setCand({ ...cand, batch: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {BATCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      Graduation or recruitment cycle
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-100"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      arrow_back
                    </span>
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !cand.region.trim()}
                    className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-medium text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{saving ? "Saving..." : "Continue"}</span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: Review & Confirm */}
          {step === 3 && (
            <div>
              <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Review your details
              </h1>
              <p className="mb-6 mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Everything here can be updated later in Settings.
              </p>
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Current status
                  </dt>
                  <dd className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {STATUS_LABELS[status]}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      Edit
                    </button>
                  </dd>
                </div>

                {activeDateInputs.map((field) =>
                  dates[field.key] ? (
                    <div
                      key={field.key}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {field.label.replace(" *", "").replace(" (optional)", "")}
                      </dt>
                      <dd className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {dates[field.key]}
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          Edit
                        </button>
                      </dd>
                    </div>
                  ) : null,
                )}

                {[
                  [
                    "Display name",
                    cand.public_identity_mode === "ANONYMOUS" ? "Anonymous" : cand.display_name,
                    2,
                  ],
                  ["Hiring type", cand.hiring_type.toLowerCase(), 2],
                  ["Region of joining", cand.region, 2],
                  ["Batch", cand.batch, 2],
                ].map(([label, value, targetStep]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {String(label)}
                    </dt>
                    <dd className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {String(value)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(targetStep as 1 | 2)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        Edit
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>

              <label className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  data-testid="confirm-accuracy"
                />
                <span>I confirm these details are accurate to the best of my knowledge.</span>
              </label>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-100"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_back
                  </span>
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={!confirmed || saving}
                  onClick={finish}
                  className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{saving ? "Saving..." : "Finish and go to dashboard"}</span>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="mx-auto mt-6 max-w-xl text-center">
          <Disclaimer variant="footer" />
        </div>
      </div>
    </div>
  );
}

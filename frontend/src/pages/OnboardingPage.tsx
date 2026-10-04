/**
 * The §7.3 three-step onboarding wizard, rebuilt to the
 * `onboarding_wizard_step_1..3` compositions (Phase 12): the brand header row
 * with the live pill, the connected 3-segment progress tracker, the
 * radio-card hiring-type grid, selects with helper lines, and the
 * action-row-with-top-border footer pattern.
 *
 * Per-step persistence (the plan's resolution): step 1 saves via POST/PATCH
 * /profile/, step 2 saves `current_status` via PATCH (the walk-the-chain
 * side-channel), step 3 is review + confirm → refreshUser() flips the
 * truthful gate and releases /dashboard.
 *
 * Real API vocabulary (recorded divergences from the compositions, in
 * RECONCILIATION.md): hiring types are PRIME/DIGITAL/NINJA/OTHER — the
 * composition's "BPS" card does not exist in the API; there is no role
 * field (the composition's Role/Designation input is omitted); region is
 * free text (no city list); completion requires offer_letter_date.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  getProfile,
  saveProfileStep1,
  ProfileNotFoundError,
  type CandidateProfilePrivate,
  type HiringType,
  type ProfileWritePayload,
} from "@/api/profile";
import { Button } from "@/components/Button";
import { Disclaimer } from "@/components/Disclaimer";
import { Input } from "@/components/Input";
import { createTimelineEvent, type TimelineEventType } from "@/api/timeline";
import type { CandidateStatus } from "@/types/user";
import { useAuth } from "@/context/AuthContext";
import { ErrorStrip } from "@/pages/authCard";

/**
 * The status picks the wizard offers, in the 4.1 chain order. Each maps to the
 * timeline event type whose creation walks the chain (multi-hop OK, 4.1 D1);
 * WITHDRAWN/OTHER have no event semantics so the wizard does not offer them —
 * they remain reachable later via Settings (PATCH-only path, 3.2).
 */
const STATUS_PICKS: ReadonlyArray<{ status: CandidateStatus; event: TimelineEventType; label: string }> = [
  { status: "INTERVIEWED", event: "INTERVIEW", label: "Interview completed — I attended the TCS interview" },
  { status: "SELECTED", event: "SELECTION", label: "Selection confirmed — I have been selected" },
  { status: "OFFER_RECEIVED", event: "OFFER_LETTER", label: "Offer received — I have the offer letter, no joining letter yet" },
  { status: "READINESS_SURVEY", event: "READINESS_SURVEY", label: "Readiness survey submitted on the TCS portal" },
  { status: "WAITING_FOR_JOINING_LETTER", event: "JOINING_LETTER", label: "Joining letter received — waiting for the joining date" },
  { status: "JOINING_DATE_RECEIVED", event: "JOINING_DATE", label: "Joining date confirmed — I know my joining date" },
  { status: "JOINED", event: "JOINED", label: "Joined — I have onboarded" },
];

const BATCHES = ["2024", "2025", "2026", "2027"] as const;

const STATUS_LABELS: Record<CandidateStatus, string> = {
  REGISTERED: "Registered",
  INTERVIEWED: "Interviewed",
  SELECTED: "Selected",
  OFFER_RECEIVED: "Offer received — I have the offer letter, no joining letter yet",
  READINESS_SURVEY: "Readiness survey submitted",
  WAITING_FOR_JOINING_LETTER: "Waiting for my joining letter",
  JOINING_LETTER_RECEIVED: "Joining letter received",
  JOINING_DATE_RECEIVED: "Joining date confirmed",
  JOINED: "Joined — I have onboarded",
  WITHDRAWN: "Withdrawn",
  OTHER: "Not sure / other",
};

/** The composition's step names for the tracker (differs from the mocks'). */
const STEP_LABELS = ["Offer details", "Timeline status", "Review"] as const;

interface Step1State {
  display_name: string;
  public_identity_mode: "ANONYMOUS" | "DISPLAY_NAME";
  hiring_type: HiringType;
  region: string;
  batch: string;
  offer_letter_date: string;
}

/** Brand header row + live pill (the composition's card header). */
function CardHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-100 pb-6 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-md tracking-wide shadow-sm">
          [TJT]
        </span>
        <div className="flex flex-col">
          <span className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
            TCS Joining Tracker
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

/**
 * The composition's connected 3-segment tracker: each segment is a bar with
 * its numbered label under it; completed/active segments are brand-filled.
 */
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

  // Step 1 state
  const [s1, setS1] = useState<Step1State>({
    display_name: "",
    public_identity_mode: "DISPLAY_NAME",
    hiring_type: "DIGITAL",
    region: "",
    batch: "2025",
    offer_letter_date: "",
  });
  // Step 2 state: the pick drives both the displayed label and the event written.
  const [status, setStatus] = useState<CandidateStatus>("OFFER_RECEIVED");
  const [statusEvent, setStatusEvent] = useState<TimelineEventType>("OFFER_LETTER");
  const [statusDate, setStatusDate] = useState<string>("");
  // Step 3 state (review rows + accuracy confirmation)
  const [confirmed, setConfirmed] = useState(false);

  // Boot: load any existing profile (resumed wizard) and seed the fields.
  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((existing) => {
        if (cancelled) return;
        setProfile(existing);
        setS1({
          display_name: existing.display_name,
          public_identity_mode: existing.public_identity_mode,
          hiring_type: existing.hiring_type,
          region: existing.region,
          batch: existing.batch,
          offer_letter_date: existing.offer_letter_date ?? "",
        });
        setStatus(existing.current_status);
        // Resume at the first incomplete step (per-step persistence payoff).
        setStep(existing.offer_letter_date === null ? 1 : existing.current_status === "REGISTERED" ? 2 : 3);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ProfileNotFoundError) {
          setProfile(null); // first visit: step 1
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

  async function persistStep1(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload: ProfileWritePayload = {
        display_name: s1.display_name.trim(),
        public_identity_mode: s1.public_identity_mode,
        batch: s1.batch,
        hiring_type: s1.hiring_type,
        region: s1.region.trim(),
        offer_letter_date: s1.offer_letter_date,
      };
      const saved = await saveProfileStep1(payload, profile);
      setProfile(saved);
      setStep(2);
    } catch (err) {
      const apiError = err as { message?: string };
      setError(apiError?.message ?? "Could not save. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function persistStep2() {
    if (saving || statusDate === "") return;
    setSaving(true);
    setError(null);
    try {
      // The event creation walks the chain hop-by-hop server-side (4.1 D1),
      // advancing current_status legally — a REGISTERED user picking "Offer
      // received" becomes INTERVIEWED → SELECTED → OFFER_RECEIVED in one write.
      await createTimelineEvent({
        event_type: statusEvent,
        event_date: statusDate,
        description: `Recorded during onboarding (${status}).`,
      });
      setStep(3);
    } catch (err) {
      const apiError = err as { message?: string };
      setError(apiError?.message ?? "Could not record that milestone. Check the date and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      await refreshUser(); // /me/ re-read: the truthful gate releases.
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
    <div
      className="skin-v1 min-h-screen flex flex-col justify-between py-10 px-4 sm:px-6 md:px-8 selection:bg-indigo-100 selection:text-indigo-900 font-body text-slate-800 antialiased"
      style={{
        backgroundColor: "#F8FAFC",
        backgroundImage: "radial-gradient(#CBD5E1 0.75px, transparent 0.75px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl transition-all sm:p-8 md:p-10 dark:border-slate-800 dark:bg-slate-800">
          <CardHeader />
          <StepIndicator step={step} />

          {error !== null && (
            <div className="mt-4">
              <ErrorStrip message={error} />
            </div>
          )}

          {step === 1 && (
            <form onSubmit={persistStep1} noValidate>
              <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Tell us about your offer
              </h1>
              <p className="mb-6 mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                This powers your personal timeline. You can change it later in Settings.
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
                    value={s1.display_name}
                    onChange={(e) => setS1({ ...s1, display_name: e.target.value })}
                    placeholder="How the community sees you"
                    maxLength={50}
                    required
                  />
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={s1.public_identity_mode === "ANONYMOUS"}
                      onChange={(e) =>
                        setS1({
                          ...s1,
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
                  {/* The composition's radio-card grid, real vocabulary. */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    {(["PRIME", "DIGITAL", "NINJA", "OTHER"] as const).map((ht) => (
                      <label
                        key={ht}
                        className={`flex min-h-[44px] cursor-pointer flex-col justify-center rounded-xl px-3.5 py-2.5 transition-all ${
                          s1.hiring_type === ht
                            ? "border-2 border-indigo-600 bg-indigo-50/70 shadow-sm text-indigo-900"
                            : "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name="hiring_type"
                          value={ht}
                          checked={s1.hiring_type === ht}
                          onChange={() => setS1({ ...s1, hiring_type: ht })}
                          className="sr-only"
                        />
                        <span
                          className={`text-sm font-semibold ${
                            s1.hiring_type === ht
                              ? "text-indigo-900"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {ht.toLowerCase()}
                        </span>
                        <span
                          className={`text-xs ${
                            s1.hiring_type === ht
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
                    <label htmlFor="ob-region" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Region of joining
                    </label>
                    <Input
                      id="ob-region"
                      value={s1.region}
                      onChange={(e) => setS1({ ...s1, region: e.target.value })}
                      placeholder="e.g. Hyderabad"
                      required
                    />
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      Based on allocated ILP / base office
                    </p>
                  </div>
                  <div>
                    <label htmlFor="ob-batch" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Batch
                    </label>
                    <select
                      id="ob-batch"
                      value={s1.batch}
                      onChange={(e) => setS1({ ...s1, batch: e.target.value })}
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

                <div>
                  <label htmlFor="ob-offer-date" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Offer letter date
                  </label>
                  <Input
                    id="ob-offer-date"
                    type="date"
                    value={s1.offer_letter_date}
                    onChange={(e) => setS1({ ...s1, offer_letter_date: e.target.value })}
                    required
                  />
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                    Found on page 1 of your official offer letter
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-end border-t border-slate-100 pt-6 dark:border-slate-700">
                  <button
                    type="submit"
                    disabled={saving}
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

          {step === 2 && (
            <div>
              <h1 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Where are you in the process?
              </h1>
              <p className="mb-6 mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Pick the option that matches your latest official communication. It becomes a
                milestone on your timeline.
              </p>
              <div className="space-y-2">
                {STATUS_PICKS.map((pick) => (
                  <label
                    key={pick.status}
                    className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                      status === pick.status
                        ? "border-2 border-indigo-600 bg-indigo-50/70 text-indigo-900"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="current_status"
                      value={pick.status}
                      checked={status === pick.status}
                      onChange={() => {
                        setStatus(pick.status);
                        setStatusEvent(pick.event);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    {pick.label}
                  </label>
                ))}
                <div>
                  <label
                    htmlFor="ob-status-date"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    When did this happen?
                  </label>
                  <Input
                    id="ob-status-date"
                    type="date"
                    value={statusDate}
                    onChange={(e) => setStatusDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_back
                  </span>
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={saving || statusDate === ""}
                  onClick={persistStep2}
                  className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-medium text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{saving ? "Saving..." : "Continue"}</span>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-800">
                <span className="material-symbols-outlined text-sm" data-icon="info" aria-hidden="true">
                  info
                </span>
                <span>Reporting an accurate status keeps the community timeline trustworthy.</span>
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Review your details
              </h1>
              <p className="mb-6 mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Everything here can be updated later in Settings.
              </p>
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {[
                  ["Display name", s1.public_identity_mode === "ANONYMOUS" ? "Anonymous" : s1.display_name, 1],
                  ["Hiring type", s1.hiring_type.toLowerCase(), 1],
                  ["Region of joining", s1.region, 1],
                  ["Batch", s1.batch, 1],
                  ["Offer letter date", s1.offer_letter_date, 1],
                  ["Current status", STATUS_LABELS[status], 2],
                ].map(([label, value, targetStep]) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</span>
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
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
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

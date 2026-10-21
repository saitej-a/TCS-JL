/**
 * The §7.1 landing page, built on the drawn `product-performs` direction
 * (seed 1472701302, `.taste-skill/direction.json`) in the **Forest Emerald &
 * Warm Stone** palette.
 *
 * Blueprints implemented from `.taste-skill/direction.json`:
 * 1. Hero (`fragment-on-shaped-stage`): Left 5-col statement (`Know where you
 *    stand. Without the guesswork.`), supporting copy, and direct actions;
 *    Right 7-col chamfered Forest Emerald stage carrying the working
 *    interactive Recruitment Milestone & Cohort Ledger fragment (`data-ui`).
 * 2. Stats (`stats-total-and-its-receipt`): Giant tabular total on the left +
 *    paper ledger receipt slip (`data-ui`) with dotted leaders, real counts
 *    from `GET /api/v1/public/stats/`, an inverted total bar, and a zigzag
 *    bottom edge. Never fabricates telemetry on API failure.
 * 3. How It Works (`how-it-works-one-card-four-fields`): Four edge-to-edge
 *    colour fields across the viewport showing the same candidate record
 *    evolving through four states (`Offer logged` → `Survey recorded` →
 *    `Cohort benchmarked` → `JL confirmed`).
 * 4. Interactive Showcase (`showcase-one-row-three-states`): The product's
 *    central milestone row shown in three states (`Awaiting`, `Interactive`,
 *    `Recorded`) where the visitor can click `[Mark JL Received]` on the middle
 *    row to trigger the live state transition right on the page.
 * 5. FAQ (`faq-question-index-answer-pane`): Question index on the left with
 *    8px Forest Emerald indicator dots + sticky large-type answer pane on the
 *    right (and inline disclosure on mobile).
 * 6. Closing Action Tile (`cta-action-tile-row`): Wide centre Forest Emerald
 *    action tile flanked by two architectural side tiles.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock, Drama, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { getPublicStats, type PublicStats } from "@/api/stats";
import { Skeleton } from "@/components/Skeleton";
import { VisitorFooter } from "@/layouts/VisitorFooter";
import { VisitorHeader } from "@/layouts/VisitorHeader";

gsap.registerPlugin(useGSAP);

interface PipelineStageSpec {
  id: string;
  stage: string;
  windowLabel: string;
  summary: string;
  whatHappens: string;
  candidateTip: string;
  ledgerStatus: string;
  sampleNote: string;
}

const PIPELINE_STAGES: readonly PipelineStageSpec[] = [
  {
    id: "INTERVIEW_CLEARED",
    stage: "Interview Cleared",
    windowLabel: "Technical & HR evaluation",
    summary: "Technical, managerial, and HR interview rounds completed.",
    whatHappens:
      "Candidates record their interview date and hiring stream (Ninja, Digital, or Prime) so the community ledger can measure selection turnaround across regional drives.",
    candidateTip: "Log your interview date even if you added your account after receiving an offer.",
    ledgerStatus: "Cleared · TR + MR + HR",
    sampleNote: "Panel interview completed; NextStep portal updated to Under Evaluation.",
  },
  {
    id: "SELECTION_CONFIRMED",
    stage: "Selection Confirmed",
    windowLabel: "Interview to Selection window",
    summary: "Selection status communicated via portal or campus placement cell.",
    whatHappens:
      "Recording selection confirmation separates post-interview evaluation time from the post-offer waiting window.",
    candidateTip: "Keep your batch year and region accurate so your cohort slice is matched.",
    ledgerStatus: "Selected · Batch queued",
    sampleNote: "Selection mail received through placement cell; offer generation in queue.",
  },
  {
    id: "OFFER_RECEIVED",
    stage: "Offer Received",
    windowLabel: "Day 0 baseline",
    summary: "Offer letter accepted on NextStep portal; background check documents queued.",
    whatHappens:
      "Candidates log their offer acceptance date, hiring stream (Ninja, Digital, or Prime), and preferred training location so cohort wait-time deltas have an accurate start date.",
    candidateTip: "Record your exact offer acceptance date to anchor your personal timeline.",
    ledgerStatus: "Accepted · BGC documents queued",
    sampleNote: "Offer accepted on NextStep; Birth Certificate & NSR registration uploaded.",
  },
  {
    id: "READINESS_SURVEY",
    stage: "Survey Completed",
    windowLabel: "Offer to Survey benchmark",
    summary: "Readiness or location preference survey submitted; awaiting batch allocation.",
    whatHappens:
      "Batch readiness surveys often precede Joining Letter dispatches in waves. Tracking survey completion dates helps your cohort spot active dispatch windows by region.",
    candidateTip: "Compare your survey date against peers in the same stream and city.",
    ledgerStatus: "Submitted · 1st pref selected",
    sampleNote: "Readiness survey submitted with immediate availability and base city preference.",
  },
  {
    id: "JL_RECEIVED",
    stage: "JL Received",
    windowLabel: "Survey to JL benchmark",
    summary: "Joining Letter issued with initial onboarding stream and reporting instructions.",
    whatHappens:
      "When candidates mark JL Received, the cohort benchmark ledger recalculates minimum, median, and maximum wait days across batches with at least five verified entries.",
    candidateTip: "Filter the analytics ledger by your batch year and stream to see real wait ranges.",
    ledgerStatus: "Issued · ILP centre assigned",
    sampleNote: "Joining Letter issued on portal; praakriti / ILP pre-onboarding checklist unlocked.",
  },
  {
    id: "JOINED",
    stage: "Joined TCS",
    windowLabel: "Onboarding complete",
    summary: "First-day reporting and ILP onboarding completed at the assigned regional center.",
    whatHappens:
      "Completed timelines remain in the anonymous historical ledger so incoming batches can see end-to-end duration from offer letter to onboarding.",
    candidateTip: "Your email and personal identity remain hidden; only your chosen display mode appears.",
    ledgerStatus: "Onboarded · ILP Day 1 complete",
    sampleNote: "Document verification and employee ID induction completed at regional centre.",
  },
] as const;

interface CohortPreset {
  id: string;
  label: string;
  batch: string;
  stream: string;
  region: string;
  handle: string;
}

const COHORT_PRESETS: readonly CohortPreset[] = [
  {
    id: "digital-hyd",
    label: "2025 · Digital · Hyderabad",
    batch: "2025",
    stream: "Digital",
    region: "Hyderabad",
    handle: "Anonymous Candidate • 2025 • Digital • Hyderabad",
  },
  {
    id: "ninja-pune",
    label: "2025 · Ninja · Pune",
    batch: "2025",
    stream: "Ninja",
    region: "Pune",
    handle: "Anonymous Candidate • 2025 • Ninja • Pune",
  },
  {
    id: "prime-blr",
    label: "2025 · Prime · Bengaluru",
    batch: "2025",
    stream: "Prime",
    region: "Bengaluru",
    handle: "Anonymous Candidate • 2025 • Prime • Bengaluru",
  },
] as const;

const FOUR_FIELD_STAGES = [
  {
    clause: "First you log your offer baseline.",
    subclause: "No portal credentials, no PDF uploads. Just the date and your cohort slice.",
    bgClass: "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100",
    cardStatus: "Offer Accepted",
    cardBadgeClass: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    progressPct: 33,
    checklist: [
      { label: "Offer date anchored", done: true },
      { label: "Readiness survey logged", done: false },
      { label: "Joining letter issued", done: false },
    ],
    footerNote: "Identity: Anonymous Candidate",
  },
  {
    clause: "Then your readiness survey updates the wave.",
    subclause: "Every logged survey helps peers in your stream spot active batch dispatches.",
    bgClass: "bg-brand-50 text-slate-900 dark:bg-brand-950/50 dark:text-slate-100",
    cardStatus: "Survey Completed",
    cardBadgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300",
    progressPct: 66,
    checklist: [
      { label: "Offer date anchored", done: true },
      { label: "Readiness survey logged", done: true },
      { label: "Joining letter issued", done: false },
    ],
    footerNote: "Cohort slice: ≥5 rule active",
  },
  {
    clause: "Next, cohort benchmarks compute wait ranges.",
    subclause: "Slices under five candidates are automatically suppressed for k-anonymity.",
    bgClass: "bg-brand-100/75 text-slate-900 dark:bg-brand-950/80 dark:text-slate-100",
    cardStatus: "Waiting for JL",
    cardBadgeClass: "bg-brand-200/80 text-brand-950 dark:bg-brand-900 dark:text-brand-200",
    progressPct: 82,
    checklist: [
      { label: "Offer date anchored", done: true },
      { label: "Readiness survey logged", done: true },
      { label: "Cohort median unlocked", done: true },
    ],
    footerNote: "Benchmarked by stream & city",
  },
  {
    clause: "Finally, your Joining Letter closes the loop.",
    subclause: "Your completed record stays in the anonymous ledger for the next batch.",
    bgClass: "bg-brand-900 text-white dark:bg-brand-950 dark:text-slate-50",
    cardStatus: "JL Received",
    cardBadgeClass: "bg-emerald-400/20 text-emerald-200",
    progressPct: 100,
    checklist: [
      { label: "Offer date anchored", done: true },
      { label: "Readiness survey logged", done: true },
      { label: "Joining letter confirmed", done: true },
    ],
    footerNote: "Complete 6-stage record",
  },
] as const;

const FAQS = [
  {
    id: "faq-affiliation",
    question: "Is this officially linked to TCS?",
    answer:
      "No. This is an independent community project built by and for incoming candidates. It is not affiliated with, endorsed by, or operated by Tata Consultancy Services.",
    detail: "Independent community ledger · Zero corporate affiliation",
  },
  {
    id: "faq-verification",
    question: "Does the tracker verify my joining letter?",
    answer:
      "It cannot, and it does not collect one. There is no document upload and no connection to any TCS portal. Everything on the timeline is self-reported by candidates and shown as community-reported data.",
    detail: "Self-reported dates only · No PDF or portal scraping",
  },
  {
    id: "faq-privacy",
    question: "What can other candidates see about me?",
    answer:
      "Only your display name (or nothing at all in anonymous mode) plus the cohort details you choose to publish. Your email address, notification tokens and device list are never shown to other candidates.",
    detail: "Pseudonymous or Anonymous · Email masked everywhere",
  },
  {
    id: "faq-suppression",
    question: "Why are some batch or city charts hidden?",
    answer:
      "Whenever a filtered cohort slice has fewer than five candidate submissions, the platform suppresses the breakdown so small groups can never be singled out or de-anonymized.",
    detail: "k-anonymity threshold (<5 candidates suppressed)",
  },
] as const;

const FALLBACK =
  "Live stats are unavailable right now. They will return as soon as the community numbers do.";

export function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeStageId, setActiveStageId] = useState<string>("JL_RECEIVED");
  const [activeCohortId, setActiveCohortId] = useState<string>(COHORT_PRESETS[0].id);
  const [interactiveRowRecorded, setInteractiveRowRecorded] = useState<boolean>(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number>(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useGSAP(
    () => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-gsap='hero-copy']",
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "power3.out" },
        );
        gsap.fromTo(
          "[data-gsap='hero-stage']",
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 0.85, ease: "power3.inOut" },
        );
        gsap.fromTo(
          "[data-gsap='hero-ui']",
          { opacity: 0, y: 20, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, delay: 0.15, ease: "power3.out" },
        );
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const activeStageIndex = PIPELINE_STAGES.findIndex((stage) => stage.id === activeStageId);
  const resolvedStageIndex = activeStageIndex >= 0 ? activeStageIndex : 4;
  const activeStage = PIPELINE_STAGES[resolvedStageIndex];
  const activeCohort =
    COHORT_PRESETS.find((preset) => preset.id === activeCohortId) ?? COHORT_PRESETS[0];

  const statCells: Array<[string, number, string]> | null =
    stats === null
      ? null
      : [
          ["Candidates tracked", stats.registered_candidates, "Community accounts"],
          ["Community posts", stats.community_posts, "Discussions and replies"],
          ["Timeline events", stats.timeline_events, "Self-reported milestones"],
        ];

  const totalCommunityRecords =
    stats === null
      ? null
      : stats.registered_candidates + stats.community_posts + stats.timeline_events;

  const activeFaq = FAQS[activeFaqIndex] ?? FAQS[0];

  return (
    <div
      ref={rootRef}
      className="flex min-h-[100svh] flex-col overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-body antialiased selection:bg-brand-100 selection:text-brand-900 dark:selection:bg-brand-900 dark:selection:text-brand-100"
      data-testid="landing-page"
    >
      <VisitorHeader />

      <main className="flex-1 overflow-x-hidden">
        {/* ====================================================================
         * 1. HERO (`fragment-on-shaped-stage`)
         * Upper-left statement + single primary action; right chamfered Forest
         * Emerald stage carrying the live interactive milestone ledger (`data-ui`).
         * ================================================================== */}
        <section className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 sm:px-6 md:px-8 pt-8 sm:pt-10 md:pt-12 lg:pt-16 pb-12 sm:pb-16 md:pb-20 lg:pb-24">
          <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left column (columns 1–5): Headline + supporting sentence + actions */}
            <div className="lg:col-span-5 lg:pt-6">
              <h1
                data-gsap="hero-copy"
                className="font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-[3.35rem] text-balance leading-[1.03] dark:text-slate-50"
              >
                Know where you stand. Without the guesswork.
              </h1>
              <p
                data-gsap="hero-copy"
                className="mt-5 max-w-[42ch] text-base sm:text-[17px] leading-relaxed text-slate-600 dark:text-slate-300 text-balance"
              >
                An independent, community-built recruitment ledger for TCS candidates: track your
                six joining milestones, compare wait-time benchmarks by stream and city, and stay
                anonymous by default.
              </p>

              <div
                data-gsap="hero-copy"
                className="mt-8 flex flex-col sm:flex-row sm:flex-wrap items-center gap-3 w-full sm:w-auto"
              >
                <Link
                  to="/register"
                  className="inline-flex h-11 w-full sm:w-auto items-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98]"
                >
                  <span>Track my joining journey</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/analytics"
                  className="inline-flex h-11 w-full sm:w-auto items-center rounded-lg bg-white px-5 text-sm font-medium text-slate-800 ring-1 ring-inset ring-slate-300 transition-[background-color,transform] duration-150 hover:bg-slate-100 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700"
                >
                  Explore community stats
                </Link>
              </div>

              <div
                data-gsap="hero-copy"
                className="mt-8 rounded-xl bg-slate-100/90 p-4 dark:bg-slate-800/60"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Built for candidate privacy
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Zero document uploads. Zero NextStep or Ultimatix passwords. Switch between
                  Anonymous Candidate and Display Name at any time.
                </p>
                <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-brand-800 dark:text-brand-300 tabular-nums">
                  <span>Free &amp; pseudonymous</span>
                  <span aria-hidden="true">·</span>
                  <span>k-anonymity (&lt;5 suppressed)</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {stats === null
                      ? "Community-reported telemetry"
                      : `${stats.registered_candidates.toLocaleString("en-US")} candidates tracked`}
                  </span>
                </p>
              </div>
            </div>

            {/* Right column (columns 6–12): Shaped Forest Emerald stage + live `data-ui` fragment */}
            <div className="lg:col-span-7">
              <div
                data-gsap="hero-stage"
                style={{
                  clipPath: "polygon(36px 0, 100% 0, 100% 100%, 0 100%, 0 36px)",
                }}
                className="bg-brand-900 p-2 sm:p-3 md:p-4 lg:p-7 dark:bg-brand-950"
              >
                {/* Live interactive interface fragment (`data-ui`) */}
                <div
                  data-gsap="hero-ui"
                  data-ui="true"
                  className="overflow-hidden rounded-lg sm:rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  {/* Fragment top bar: Cohort slice switcher + live identity pill */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 bg-slate-100/80 px-3 sm:px-4 py-2.5 sm:py-3 dark:bg-slate-800/80">
                    <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
                      <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
                        <Drama className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] sm:text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {activeCohort.handle}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">
                          Recruitment milestone ledger · Interactive specimen
                        </p>
                      </div>
                    </div>

                    <div
                      role="group"
                      aria-label="Filter specimen cohort"
                      className="flex flex-wrap items-center gap-0.5 sm:gap-1 mt-2 sm:mt-0 w-full sm:w-auto"
                    >
                      {COHORT_PRESETS.map((preset) => {
                        const active = preset.id === activeCohort.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setActiveCohortId(preset.id)}
                            className={`rounded px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium transition-colors duration-150 ${
                              active
                                ? "bg-brand-700 text-white"
                                : "bg-white text-slate-600 hover:bg-slate-200/70 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                            }`}
                          >
                            {preset.stream} · {preset.region}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-2 sm:p-4 md:p-5">
                    {/* Visual 6-node horizontal progression track */}
                    <div className="mb-4 rounded-lg bg-slate-50 px-3.5 py-3 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
                        <span>
                          Pipeline progression ({resolvedStageIndex + 1} of {PIPELINE_STAGES.length}{" "}
                          stages)
                        </span>
                        <span className="font-mono text-brand-700 dark:text-brand-300 tabular-nums">
                          {activeStage.ledgerStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
                        {PIPELINE_STAGES.map((stage, idx) => {
                          const completed = idx <= resolvedStageIndex;
                          return (
                            <div
                              key={stage.id}
                              className={`h-1.5 rounded-full transition-colors duration-200 ${
                                completed
                                  ? "bg-brand-600 dark:bg-brand-400"
                                  : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive 6-stage selector tabs */}
                    <div
                      role="tablist"
                      aria-label="Recruitment pipeline stages"
                      className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2"
                    >
                      {PIPELINE_STAGES.map((stage, idx) => {
                        const selected = stage.id === activeStage.id;
                        const passed = idx < resolvedStageIndex;
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => setActiveStageId(stage.id)}
                            className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] ${
                              selected
                                ? "border-brand-600 bg-brand-50/90 text-brand-950 dark:border-brand-400 dark:bg-brand-950/60 dark:text-slate-50"
                                : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span className="flex w-full items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                              <span>Stage {idx + 1}</span>
                              {passed || selected ? (
                                <Check
                                  className="h-3 w-3 text-brand-700 dark:text-brand-400"
                                  aria-hidden="true"
                                />
                              ) : null}
                            </span>
                            <span className="mt-0.5 text-xs font-semibold leading-snug">
                              {stage.stage}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected stage inspection panel */}
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {activeStage.stage}
                        </h2>
                        <span className="rounded bg-brand-100/80 px-2 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                          {activeStage.windowLabel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                        {activeStage.summary}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {activeStage.whatHappens}
                      </p>
                      <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs dark:bg-slate-900/70">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {activeStage.candidateTip}
                          </span>
                          <Link
                            to="/timeline"
                            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                          >
                            Open timeline tracker
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Live community stats band inside the ledger frame (preserves `landing-stats` test contract) */}
                    <div className="mt-5" aria-label="Live community stats">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Community-reported, updated live
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Community-reported data, not official TCS metrics.
                        </p>
                      </div>

                      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3" data-testid="landing-stats">
                        {statCells === null && !failed && (
                          <>
                            <Skeleton className="h-20" />
                            <Skeleton className="h-20" />
                            <Skeleton className="h-20" />
                          </>
                        )}
                        {failed && (
                          <p
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-600 sm:col-span-3 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                            role="status"
                          >
                            {FALLBACK}
                          </p>
                        )}
                        {statCells !== null &&
                          statCells.map(([label, value, caption]) => (
                            <div
                              key={label}
                              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900"
                            >
                              <p className="font-mono text-xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
                                {value.toLocaleString("en-US")}
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                                {label}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {caption}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
         * 2. STATS: TOTAL AND ITS RECEIPT (`stats-total-and-its-receipt`)
         * Left: Section heading + giant tabular figure anchored at the bottom.
         * Right: Paper ledger slip with dotted leaders and zigzag bottom edge.
         * ================================================================== */}
        <section className="bg-slate-100/90 py-12 sm:py-16 md:py-20 lg:py-24 dark:bg-slate-950/60">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="grid items-stretch gap-8 sm:gap-10 lg:grid-cols-12">
              <div className="flex flex-col justify-between lg:col-span-6">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
                    Every milestone is a real submission.
                  </h2>
                  <p className="mt-3 max-w-[46ch] text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 text-balance">
                    No synthetic benchmarks and no scraped portals. When candidates log an offer,
                    survey, or joining letter, the public ledger updates immediately.
                  </p>
                </div>

                <div className="mt-12 lg:mt-20">
                  <p
                    data-testid="receipt-grand-total"
                    className="font-display text-[clamp(4.5rem,11vw,8.5rem)] font-semibold leading-[0.86] tracking-tight text-brand-800 tabular-nums dark:text-brand-400"
                  >
                    {totalCommunityRecords !== null
                      ? totalCommunityRecords.toLocaleString("en-US")
                      : failed
                        ? "Live"
                        : "···"}
                  </p>
                  <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {totalCommunityRecords !== null
                      ? "Total candidate records, timeline events, and discussion posts in the ledger"
                      : "Verified candidate submissions power every cohort calculation"}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-5 lg:col-start-8">
                <div
                  data-ui="true"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 10px), 95% 100%, 90% calc(100% - 10px), 85% 100%, 80% calc(100% - 10px), 75% 100%, 70% calc(100% - 10px), 65% 100%, 60% calc(100% - 10px), 55% 100%, 50% calc(100% - 10px), 45% 100%, 40% calc(100% - 10px), 35% 100%, 30% calc(100% - 10px), 25% 100%, 20% calc(100% - 10px), 15% 100%, 10% calc(100% - 10px), 5% 100%, 0 calc(100% - 10px))",
                  }}
                  className="bg-white p-6 pb-9 text-slate-900 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
                >
                  <div className="flex items-center justify-between pb-3">
                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      LEDGER AUDIT SLIP
                    </span>
                    <span className="font-mono text-xs text-brand-700 dark:text-brand-400">
                      COMMUNITY_REPORTED
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Live repository counts
                  </p>
                  <dl className="mt-2 space-y-2.5 text-sm">
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-700 dark:text-slate-300">Registered candidates</dt>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <dd className="font-mono font-semibold tabular-nums">
                        {stats !== null ? stats.registered_candidates.toLocaleString("en-US") : "—"}
                      </dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-700 dark:text-slate-300">Timeline milestones</dt>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <dd className="font-mono font-semibold tabular-nums">
                        {stats !== null ? stats.timeline_events.toLocaleString("en-US") : "—"}
                      </dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-700 dark:text-slate-300">Community threads</dt>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <dd className="font-mono font-semibold tabular-nums">
                        {stats !== null ? stats.community_posts.toLocaleString("en-US") : "—"}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Privacy &amp; verification rules
                  </p>
                  <dl className="mt-2 space-y-2.5 text-sm">
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-700 dark:text-slate-300">Tracked pipeline stages</dt>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <dd className="font-mono font-semibold tabular-nums">6</dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-700 dark:text-slate-300">Hiring streams indexed</dt>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <dd className="font-mono font-semibold tabular-nums">4</dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-700 dark:text-slate-300">k-anonymity floor</dt>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <dd className="font-mono font-semibold tabular-nums">&ge;5</dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-700 dark:text-slate-300">Document uploads stored</dt>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <dd className="font-mono font-semibold tabular-nums">0</dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-700 dark:text-slate-300">Third-party ad trackers</dt>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <dd className="font-mono font-semibold tabular-nums">0</dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-brand-700">
                    <span>Total ledger entries</span>
                    <span className="font-mono tabular-nums">
                      {totalCommunityRecords !== null
                        ? totalCommunityRecords.toLocaleString("en-US")
                        : "COMMUNITY"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
         * 3. HOW IT WORKS: ONE CARD, FOUR FIELDS (`how-it-works-one-card-four-fields`)
         * Four edge-to-edge colour fields across the viewport showing the same
         * candidate card advancing through four stages.
         * ================================================================== */}
        <section aria-label="How the recruitment ledger works">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-0">
            {FOUR_FIELD_STAGES.map((item, idx) => (
              <div
                key={item.cardStatus}
                className={`group flex min-h-[320px] sm:min-h-[420px] flex-col justify-between p-4 sm:p-6 lg:p-8 lg:min-h-[520px] ${item.bgClass}`}
              >
                <div>
                  {idx === 0 ? (
                    <h2 className="font-display text-2xl font-semibold tracking-tight">
                      Built by candidates, for candidates
                    </h2>
                  ) : (
                    <span className="inline-block font-mono text-xs opacity-60 tabular-nums">
                      0{idx + 1} / 04
                    </span>
                  )}
                </div>

                {/* The evolving candidate timeline card (`data-ui`) */}
                <div
                  data-ui="true"
                  className="my-8 rounded-xl border border-slate-200/90 bg-white p-4 text-slate-900 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1.5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      2025 · Digital · Hyderabad
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.cardBadgeClass}`}
                    >
                      {item.cardStatus}
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-600 dark:bg-brand-400"
                      style={{ width: `${item.progressPct}%` }}
                    />
                  </div>

                  <ul className="mt-3.5 space-y-1.5 text-xs">
                    {item.checklist.map((check) => (
                      <li key={check.label} className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                            check.done
                              ? "bg-brand-600 text-white dark:bg-brand-500"
                              : "border border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                          }`}
                        >
                          {check.done && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </span>
                        <span
                          className={
                            check.done
                              ? "font-medium text-slate-800 dark:text-slate-200"
                              : "text-slate-400 dark:text-slate-500"
                          }
                        >
                          {check.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-3 pt-2.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {item.footerNote}
                  </p>
                </div>

                <div>
                  <p className="font-display text-lg sm:text-xl md:text-2xl font-semibold leading-snug tracking-tight">
                    {item.clause}
                  </p>
                  <p className="mt-1.5 text-xs sm:text-sm opacity-80 leading-relaxed">
                    {item.subclause}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ====================================================================
         * 4. SHOWCASE: ONE ROW, THREE STATES (`showcase-one-row-three-states`)
         * The central milestone row shown three times: Awaiting, Interactive
         * (live button the visitor can click), and Recorded.
         * ================================================================== */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="lg:grid lg:grid-cols-12 lg:gap-6 sm:gap-8">
            <div className="lg:col-span-8 lg:col-start-4">
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
                One milestone row, three states
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-balance">
                Try clicking <strong className="font-semibold text-slate-900 dark:text-slate-200">[Mark as Received]</strong> on the middle row to see how a single click updates your status and cohort ledger.
              </p>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 space-y-6 sm:space-y-8 lg:space-y-10">
            {/* State 1: Awaiting */}
            <div className="grid items-center gap-3 sm:gap-4 lg:grid-cols-12 lg:gap-6 sm:lg:gap-8">
              <div className="lg:col-span-3 lg:text-right">
                <span className="font-display text-base sm:text-lg font-medium text-slate-500 dark:text-slate-400">
                  Awaiting
                </span>
              </div>
              <div className="lg:col-span-8">
                <div
                  data-ui="true"
                  className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 w-full sm:w-auto">
                      <span className="mt-0.5 flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="rounded bg-amber-100 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                            Current Blocker
                          </span>
                          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            PENDING: Joining Letter
                          </h3>
                        </div>
                        <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                          Awaiting dispatch. Only what you log is counted; nothing is inferred.
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                      No date yet
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* State 2: Interactive (Visitor can click to toggle!) */}
            <div className="grid items-center gap-3 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-3 lg:text-right">
                <span className="font-display text-lg font-semibold text-brand-700 dark:text-brand-400">
                  {interactiveRowRecorded ? "Updated live" : "Try it live"}
                </span>
              </div>
              <div className="lg:col-span-8">
                <div
                  data-ui="true"
                  data-testid="interactive-showcase-row"
                  className={`rounded-xl border p-4 sm:p-5 transition-colors duration-200 ${
                    interactiveRowRecorded
                      ? "border-brand-600 bg-brand-50/60 dark:border-brand-500 dark:bg-brand-950/40"
                      : "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/25"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          interactiveRowRecorded
                            ? "bg-brand-700 text-white dark:bg-brand-500"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {interactiveRowRecorded ? (
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                              interactiveRowRecorded
                                ? "bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-200"
                                : "bg-amber-200 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200"
                            }`}
                          >
                            {interactiveRowRecorded ? "Verified Milestone" : "Action Ready"}
                          </span>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {interactiveRowRecorded
                              ? "Oct 20, 2026: Joining Letter Received"
                              : "Joining Letter dispatch received?"}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          {interactiveRowRecorded
                            ? "Status automatically advanced to JL Received. Cohort wait-time median recalculated."
                            : "Click the quick action to record your Joining Letter and advance your status."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="interactive-row-toggle"
                      onClick={() => setInteractiveRowRecorded((prev) => !prev)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                        interactiveRowRecorded
                          ? "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                          : "bg-brand-700 text-white hover:bg-brand-800"
                      }`}
                    >
                      {interactiveRowRecorded ? (
                        <span>Reset demo row</span>
                      ) : (
                        <>
                          <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                          <span>[Mark as Received]</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* State 3: Recorded */}
            <div className="grid items-center gap-3 sm:gap-4 lg:grid-cols-12 lg:gap-6 sm:lg:gap-8">
              <div className="lg:col-span-3 lg:text-right">
                <span className="font-display text-base sm:text-lg font-medium text-slate-500 dark:text-slate-400">
                  Recorded
                </span>
              </div>
              <div className="lg:col-span-8">
                <div
                  data-ui="true"
                  className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 w-full sm:w-auto">
                      <span className="mt-0.5 flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" aria-hidden="true" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="rounded bg-emerald-50 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Verified
                          </span>
                          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                            Oct 14, 2026: Offer Letter Issued
                          </h3>
                        </div>
                        <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                          Peer-corroborated timeline entry · Digital · Hyderabad cohort
                        </p>
                      </div>
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono text-[10px] sm:text-[11px] font-medium text-slate-700 tabular-nums dark:bg-slate-800 dark:text-slate-300">
                      Day 0 anchor
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
         * 5. COMMUNITY DISCUSSIONS BAND
         * Direct bridge to `/community` with real thread count.
         * ================================================================== */}
        <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-3 sm:gap-4 rounded-xl bg-white p-4 sm:p-5 md:p-6 lg:p-6 sm:flex-row sm:items-center dark:bg-slate-800/70">
            <div className="flex items-start gap-2 sm:gap-3.5 w-full sm:w-auto">
              <span className="mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                  Community discussions
                </h2>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-balance">
                  {stats === null
                    ? "Read what candidates are reporting across batches and cities, or add your own update."
                    : `${stats.community_posts.toLocaleString("en-US")} discussions started so far. Read what candidates are reporting, or add your own update.`}
                </p>
              </div>
            </div>
            <Link
              to="/community"
              className="flex h-10 sm:min-h-[44px] shrink-0 items-center rounded-lg bg-slate-100 px-3 sm:px-4 text-xs sm:text-sm font-medium text-slate-800 transition-[background-color,transform] duration-150 hover:bg-slate-200/80 active:scale-[0.98] dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              Open the community feed
            </Link>
          </div>
        </section>

        {/* ====================================================================
         * 6. FAQ: QUESTION INDEX, ONE ANSWER PANE (`faq-question-index-answer-pane`)
         * Left columns 1–5: Question index with 8px Forest Emerald indicator dots.
         * Right columns 7–12: Sticky answer pane in large editorial type (24–28px).
         * ================================================================== */}
        <section
          className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24"
          aria-label="Frequently asked questions"
        >
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="text-base sm:text-lg font-medium text-slate-500 dark:text-slate-400">
                Common questions
              </h2>
              <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4">
                {FAQS.map((faq, idx) => {
                  const selected = idx === activeFaqIndex;
                  return (
                    <div key={faq.id} className="rounded-xl bg-white p-3 sm:p-4 dark:bg-slate-800/60">
                      <button
                        type="button"
                        onClick={() => setActiveFaqIndex(idx)}
                        onMouseEnter={() => setActiveFaqIndex(idx)}
                        onFocus={() => setActiveFaqIndex(idx)}
                        aria-expanded={selected}
                        className="flex w-full items-center gap-2 sm:gap-3 text-left text-sm sm:text-base md:text-[17px] font-semibold transition-colors duration-150"
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-150 ${
                            selected
                              ? "bg-brand-600 dark:bg-brand-400"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                        <span
                          className={
                            selected
                              ? "text-slate-900 dark:text-slate-50"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          }
                        >
                          {faq.question}
                        </span>
                      </button>
                      {/* Inline answer visible on all viewports for screen readers & tests, styled as mobile disclosure below lg */}
                      <p
                        className={`mt-2 pl-4 sm:pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400 ${
                          selected ? "block lg:hidden" : "sr-only"
                        }`}
                      >
                        {faq.answer}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop sticky answer pane */}
            <div className="hidden lg:col-span-6 lg:col-start-7 lg:block">
              <div className="sticky top-28 rounded-2xl bg-white p-8 dark:bg-slate-800/70">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-700 dark:text-brand-400">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{activeFaq.detail}</span>
                </div>
                <p className="mt-4 font-display text-2xl leading-[1.35] font-normal text-slate-900 dark:text-slate-100">
                  {activeFaq.answer}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
         * 7. CLOSING ACTION TILE ROW (`cta-action-tile-row`)
         * Wide centre tile in Forest Emerald flanked by two architectural tiles.
         * ================================================================== */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-24">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
            <div
              aria-hidden="true"
              className="hidden rounded-2xl bg-slate-200/80 lg:col-span-2 lg:flex lg:flex-col lg:justify-end lg:p-6 dark:bg-slate-800"
            >
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                2024 · 2025 · 2026
              </span>
            </div>

            <div className="flex min-h-[240px] sm:min-h-[280px] flex-col justify-center rounded-2xl bg-brand-800 p-6 sm:p-8 md:p-10 lg:p-12 text-white lg:col-span-8 dark:bg-brand-900">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white text-balance">
                Add your timeline to the cohort ledger.
              </h2>
              <p className="mt-3 max-w-[48ch] text-sm sm:text-base leading-relaxed text-brand-100 text-balance">
                Create an account in under a minute, pick Anonymous or Display Name mode, and see
                where your batch stands today.
              </p>
              <div className="mt-5 sm:mt-7 flex flex-col sm:flex-row sm:flex-wrap items-center gap-3 w-full sm:w-auto">
                <Link
                  to="/register"
                  className="inline-flex h-11 w-full sm:w-auto items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-brand-950 transition-[background-color,transform] duration-150 hover:bg-brand-50 active:scale-[0.98]"
                >
                  <span>Start tracking free</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/community"
                  className="inline-flex h-11 w-full sm:w-auto items-center rounded-lg bg-brand-900/70 px-5 text-sm font-medium text-brand-50 transition-[background-color,transform] duration-150 hover:bg-brand-900 active:scale-[0.98]"
                >
                  Browse discussions first
                </Link>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="hidden rounded-2xl bg-brand-950 lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:p-6"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />
              <span className="font-mono text-xs text-brand-300">k &ge; 5</span>
            </div>
          </div>
        </section>
      </main>

      <VisitorFooter />
    </div>
  );
}

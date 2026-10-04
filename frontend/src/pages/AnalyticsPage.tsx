/**
 * The §7.9 analytics screen (9.4 Task 6), rebuilt to the
 * `community_analytics_trends` composition (Phase 12 Task 11).
 *
 * The composition is a stale-v1 export (the v1 accent palette, the earlier
 * display font, and a glyph font); per D-01 its *structure* governs and the v2
 * palette is repainted on top. The
 * composition's chart and KPI anatomy is adopted wherever the real API feeds
 * it — and, where it names data the API does not ship, the block is dropped and
 * the omission recorded in RECONCILIATION.md rather than faked:
 * - the "hash-verified telemetry" badge and the KPI month-over-month deltas have
 *   no API field (`data_source` is COMMUNITY_REPORTED — nothing is verified);
 * - Export CSV / Share Report and the "Verified only"/"Exclude outliers" filter
 *   pills have no endpoints or filter params behind them;
 * - the wait-time rows are drawn per *baseline* (offer / survey), which is how
 *   7.2's API reports them, not per hiring stream as the mockup shows;
 * - the 💡 "44% faster turnaround" observation is an invented statistic.
 *
 * Three honesty rules govern every block (kept from 9.4, unchanged):
 * - **Suppression** (4.2 D2 / 7.2): a suppressed payload renders the
 *   UI-SPEC insufficient-data line — never zeros, never fabricated numbers.
 *   The `suppressed` union forces the narrowing at compile time.
 * - **UI-04**: the header disclaimer is `Disclaimer variant="analytics"`, the
 *   same string 9.2's footer already renders from `src/content/disclaimer.ts`.
 *   There is no second copy.
 * - **No invented vocabulary**: filter options are the values the analytics
 *   whitelist endpoints themselves return (batches / hiring-types / regions),
 *   fetched once unfiltered. A hardcoded option list would let a visitor pick
 *   a value the API 400s.
 */
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Hourglass,
  Lock,
  MailCheck,
  Shield,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  getAnalyticsOverview,
  getBatchBreakdown,
  getHiringTypeBreakdown,
  getRegionBreakdown,
  getStatusDistribution,
  type AnalyticsFilters,
  type AnalyticsOverview,
  type HiringTypeBreakdown,
  type StatusDistribution,
  type WaitTimeMetric,
} from "@/api/analytics";
import { getDashboard } from "@/api/dashboard";
import { ApiError } from "@/api/errors";
import { Disclaimer } from "@/components/Disclaimer";
import { RailStatusSummary } from "@/components/RailStatusSummary";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { RailPortal } from "@/layouts/AppShell";
import { TYPOGRAPHY } from "@/theme/tokens";
import type { CandidateStatus } from "@/types/user";

const CARD =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800 sm:p-6";

/** §5.6/UI-04 — the one analytics disclaimer string (single content module). */
const TITLE = "COMMUNITY RECRUITMENT BENCHMARKS & ANALYTICS";
const SUBTITLE =
  "Community-Reported Data • Voluntary Candidate Submissions • Not Official TCS Data";

const SECTION_OVERVIEW = "OVERVIEW KPI CARDS:";
const SECTION_STREAMS = "BREAKDOWN BY HIRING STREAM:";
const SECTION_DISTRIBUTION = "CANDIDATE STATUS DISTRIBUTION:";
const SECTION_WAIT_TIMES = "AVERAGE COMMUNITY WAIT TIMES (SURVEY TO JOINING LETTER):";

const SUPPRESSION_TITLE = "PRIVACY SUPPRESSION NOTICE";
const SUPPRESSION_BODY =
  "To prevent identification of individual candidates, data breakdowns with fewer than 5 submissions are automatically suppressed.";

/** UI-SPEC's D1 insufficient-data line — used for every suppressed block. */
export const INSUFFICIENT_DATA =
  "Not enough community data yet. Breakdowns appear once more candidates report.";

/** §7.9's wait-time row copy: `Average {n} days (Range: {min} to {max} days)`. */
export function waitTimeRowCopy(
  average: number,
  min: number,
  max: number,
): string {
  return `Average ${average} days (Range: ${min} to ${max} days)`;
}

/** The six spec/row keys → their stacked-bar segment and legend dot colors. */
const GROUP_COLORS: Record<string, string> = {
  WAITING_FOR_JL: "bg-amber-500",
  JL_RECEIVED: "bg-brand-600",
  JOINING_DATE_RECEIVED: "bg-sky-500",
  JOINED: "bg-emerald-500",
  SURVEY_OFFER_STAGE: "bg-slate-400",
  WITHDRAWN_OTHER: "bg-rose-400",
};

function groupColor(statusGroup: string): string {
  return GROUP_COLORS[statusGroup] ?? "bg-slate-300 dark:bg-slate-600";
}

/**
 * The composition's two-tone stream bars: the solid lead segment is the row's
 * share of the cohort, the tinted tail is that row's still-waiting share — both
 * real numbers off the returned row, never an assumed total.
 */
const STREAM_COLORS: Record<string, { lead: string; tail: string; dot: string }> = {
  DIGITAL: { lead: "bg-brand-600", tail: "bg-brand-300", dot: "bg-brand-600" },
  NINJA: { lead: "bg-sky-600", tail: "bg-sky-300", dot: "bg-sky-500" },
  PRIME: { lead: "bg-violet-600", tail: "bg-violet-300", dot: "bg-violet-600" },
};

function streamColors(hiringType: string): { lead: string; tail: string; dot: string } {
  return (
    STREAM_COLORS[hiringType] ?? {
      lead: "bg-slate-500",
      tail: "bg-slate-300",
      dot: "bg-slate-400",
    }
  );
}

/** Thousands separators with an explicit locale, so the string is stable. */
function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

interface FilterOptions {
  batch: string[];
  stream: string[];
  region: string[];
}

interface RailData {
  status: CandidateStatus;
  completion: number | null;
  unread: number | null;
}

function uniqueSorted(values: readonly unknown[]): string[] {
  // A row missing its label field must not become an `<option>` with an
  // undefined value — only real strings are offerable filters.
  const strings = values.filter((value): value is string => typeof value === "string" && value !== "");
  return Array.from(new Set(strings)).sort((a, b) => a.localeCompare(b));
}

/**
 * Filter option lists, taken from the whitelist endpoints' own returned rows.
 * A suppressed payload yields an empty list — an honest "we know of none"
 * rather than a fabricated option the API would reject.
 */
function optionsFrom(payloads: {
  batches: Awaited<ReturnType<typeof getBatchBreakdown>>;
  streams: Awaited<ReturnType<typeof getHiringTypeBreakdown>>;
  regions: Awaited<ReturnType<typeof getRegionBreakdown>>;
}): FilterOptions {
  return {
    batch:
      payloads.batches.suppressed === false
        ? uniqueSorted(payloads.batches.results.map((row) => row.batch))
        : [],
    stream:
      payloads.streams.suppressed === false
        ? uniqueSorted(payloads.streams.results.map((row) => row.hiring_type))
        : [],
    region:
      payloads.regions.suppressed === false
        ? uniqueSorted(payloads.regions.results.map((row) => row.region))
        : [],
  };
}

/** The UI-SPEC insufficient-data line, used by every suppressed block. */
function InsufficientData(): React.ReactElement {
  return (
    <p
      data-testid="insufficient-data"
      className="text-sm text-slate-600 dark:text-slate-300"
    >
      {INSUFFICIENT_DATA}
    </p>
  );
}

interface Kpi {
  label: string;
  key: "total_candidates" | "waiting_for_joining_letter" | "joining_letters_reported" | "joined_reported";
  tone: string;
  chip: string;
  icon: typeof Users;
  /** The composition's descriptive sub-line — never a numeric claim. */
  caption: string;
  /** Composition's status dot caption, when it has one instead of a sub-line. */
  dot?: { label: string; className: string };
}

/** §7.9's four KPI cards, in spec order, over the overview payload. */
const KPIS: readonly Kpi[] = [
  {
    label: "Total Candidates",
    key: "total_candidates",
    tone: "text-slate-900 dark:text-slate-100",
    chip: "bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300",
    icon: Users,
    caption: "Aggregated candidate submissions",
  },
  {
    label: "Waiting for JL",
    key: "waiting_for_joining_letter",
    tone: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    icon: Hourglass,
    caption: "Awaiting official onboarding dispatch",
    dot: { label: "Active pool", className: "bg-amber-500" },
  },
  {
    label: "Reported JL Recvd",
    key: "joining_letters_reported",
    tone: "text-brand-700 dark:text-brand-300",
    chip: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
    icon: MailCheck,
    caption: "Joining letters with reporting dates",
  },
  {
    label: "Reported Joined",
    key: "joined_reported",
    tone: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    icon: CheckCircle2,
    caption: "Onboarding and ILP officially commenced",
    dot: { label: "Inducted", className: "bg-emerald-500" },
  },
];

function KpiCard({
  label,
  value,
  tone,
  chip,
  icon: Icon,
  caption,
  dot,
  badge,
}: {
  label: string;
  value: string;
  tone: string;
  chip: string;
  icon: typeof Users;
  caption: string;
  dot?: { label: string; className: string };
  badge?: string;
}): React.ReactElement {
  return (
    <div className={`${CARD} transition-shadow hover:shadow-md`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={`${TYPOGRAPHY.badgePill} uppercase tracking-wide text-slate-500 dark:text-slate-400`}>
          {label}
        </p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${chip}`}>
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <p className={`text-3xl font-extrabold tracking-tight ${tone}`}>{value}</p>
        {badge !== undefined && (
          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
            {badge}
          </span>
        )}
        {badge === undefined && dot !== undefined && (
          <span className={`flex items-center gap-1 text-[11px] font-medium ${tone}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot.className}`} />
            {dot.label}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
  );
}

function OverviewSection({
  overview,
}: {
  overview: AnalyticsOverview | null;
}): React.ReactElement {
  // The composition's "25.6% conv." chip — arithmetic over the real payload,
  // omitted (not zeroed) when the cohort total cannot carry a share.
  const conversion =
    overview !== null && !overview.suppressed && overview.total_candidates > 0
      ? `${((overview.joining_letters_reported / overview.total_candidates) * 100).toFixed(1)}% conv.`
      : undefined;

  return (
    <section aria-label="Overview KPI cards">
      <h2 className={`${TYPOGRAPHY.sectionHeader} uppercase`}>{SECTION_OVERVIEW}</h2>
      {overview === null ? (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <div key={kpi.key} className={CARD} aria-busy="true">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-16" />
            </div>
          ))}
        </div>
      ) : overview.suppressed ? (
        <div className={`${CARD} mt-3`}>
          <InsufficientData />
        </div>
      ) : (
        <div
          data-testid="kpi-grid"
          className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {KPIS.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={String(overview[kpi.key])}
              tone={kpi.tone}
              chip={kpi.chip}
              icon={kpi.icon}
              caption={kpi.caption}
              dot={kpi.dot}
              badge={kpi.key === "joining_letters_reported" ? conversion : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StreamBreakdownSection({
  band,
}: {
  band: HiringTypeBreakdown | null;
}): React.ReactElement {
  // The composition's footer stat, recomputed from the returned rows: the
  // stream with the highest reported-joining-letter rate. Nothing invented.
  const best =
    band !== null && !band.suppressed
      ? band.results
          .filter((row) => row.candidate_count > 0)
          .map((row) => ({
            hiring_type: row.hiring_type,
            rate: (row.joining_letter_reported / row.candidate_count) * 100,
          }))
          .sort((a, b) => b.rate - a.rate)[0] ?? null
      : null;

  return (
    <section aria-label="Breakdown by hiring stream" className="lg:col-span-6">
      <div className={`${CARD} h-full`}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className={`${TYPOGRAPHY.subheadLabel} font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100`}>
              {SECTION_STREAMS}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Volume and distribution by recruitment profile
            </p>
          </div>
          {band !== null && !band.suppressed && band.results.length > 0 && (
            <span className="shrink-0 rounded bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              {band.results.length} Active Track{band.results.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {band === null ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : band.suppressed ? (
          <InsufficientData />
        ) : band.results.length === 0 ? (
          <InsufficientData />
        ) : (
          <>
            <ul className="space-y-5">
              {band.results.map((row) => {
                // Share bars are drawn from this row's own slice of the cohort,
                // never from an assumed total.
                const share =
                  band.total_in_cohort > 0
                    ? (row.candidate_count / band.total_in_cohort) * 100
                    : 0;
                // The bar's tinted tail is the row's own still-waiting slice.
                const waitingShare =
                  band.total_in_cohort > 0
                    ? (row.waiting_for_joining_letter / band.total_in_cohort) * 100
                    : 0;
                const colors = streamColors(row.hiring_type);
                return (
                  <li key={row.hiring_type} data-testid={`stream-${row.hiring_type}`}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 rounded-full ${colors.dot}`}
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {row.hiring_type}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">
                          ·
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {row.candidate_count} candidates ({share.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {row.waiting_for_joining_letter} waiting
                        </span>
                        {" · "}
                        <span className="font-semibold text-brand-700 dark:text-brand-300">
                          {row.joining_letter_reported} recvd JL
                        </span>
                      </div>
                    </div>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        data-testid={`stream-bar-${row.hiring_type}`}
                        className={`h-full rounded-l-full ${colors.lead}`}
                        style={{ width: `${share.toFixed(1)}%` }}
                      />
                      <div
                        aria-hidden="true"
                        className={`h-full ${colors.tail}`}
                        style={{ width: `${waitingShare.toFixed(1)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            {best !== null && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900/40">
                <span className="text-slate-600 dark:text-slate-300">Highest reporting rate:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {best.hiring_type} ({best.rate.toFixed(1)}% reported a joining letter)
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function StatusDistributionSection({
  distribution,
}: {
  distribution: StatusDistribution | null;
}): React.ReactElement {
  return (
    <section aria-label="Candidate status distribution" className="lg:col-span-6" data-testid="analytics-distribution">
      <div className={`${CARD} h-full`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className={`${TYPOGRAPHY.subheadLabel} font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100`}>
              {SECTION_DISTRIBUTION}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Lifecycle stage across all verified submissions
            </p>
          </div>
          {distribution !== null && !distribution.suppressed && (
            <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              100% Total Cohort
            </span>
          )}
        </div>

        {distribution === null ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : distribution.suppressed ? (
          <InsufficientData />
        ) : distribution.results.length === 0 ? (
          <InsufficientData />
        ) : (
          <>
            {/* Stacked bar: one flex row, each segment's width = its share. */}
            <div
              data-testid="distribution-bar"
              className="mb-5 flex h-4 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner dark:bg-slate-700"
            >
              {distribution.results
                .filter((row) => row.share > 0)
                .map((row) => (
                  <div
                    key={row.status_group}
                    data-testid={`distribution-segment-${row.status_group}`}
                    className={`h-full ${groupColor(row.status_group)}`}
                    style={{ width: `${row.share}%` }}
                    title={`${row.label}: ${row.share}%`}
                  />
                ))}
            </div>
            {/* Legend row cards — one column on the narrowest screens, two at sm. */}
            <ul
              data-testid="distribution-legend"
              className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2"
            >
              {distribution.results.map((row) => (
                <li
                  key={row.status_group}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 shrink-0 rounded ${groupColor(row.status_group)}`}
                    />
                    <span className="text-slate-700 dark:text-slate-200">{row.label}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {row.candidate_count}{" "}
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      ({row.share}%)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/** Position of `value` on a 0→max track, clamped so a bad payload cannot escape. */
function trackPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

/**
 * One wait-time row in the composition's three-part anatomy: labelled value on
 * the left, the min→max range track with its median pin in the middle, and the
 * range/n read-out on the right. Every mark comes from the metric's own
 * `min_days` / `median_days` / `max_days` / `sample_size` — the API ships all
 * four, so the pin is real data rather than a decorative mark.
 */
function WaitTimeRow({
  metric,
  label,
}: {
  metric: WaitTimeMetric | undefined;
  label: string;
}): React.ReactElement {
  const ok = metric !== undefined && !metric.suppressed ? metric : null;
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 first:border-0 first:pt-0 md:flex-row md:items-center md:gap-4 dark:border-slate-700">
      <div className="w-full shrink-0 md:w-56">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</p>
        {/* The composition's badge slot carries the real `baseline` value, and
            §7.9's one-line Average/Range copy sits under the label. */}
        {ok !== null && (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Baseline: {ok.baseline.toLowerCase().replace(/_/g, " ")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {waitTimeRowCopy(ok.average_days, ok.min_days, ok.max_days)}
            </p>
          </>
        )}
      </div>
      <div className="flex-1">
        {ok === null ? (
          <InsufficientData />
        ) : (
          <>
            <div className="mb-1 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>Min: {ok.min_days} days</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Median {ok.median_days}d
              </span>
              <span>Max: {ok.max_days} days</span>
            </div>
            <div className="relative flex h-4 items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              {/* The min→max band (the track itself spans 0→max). */}
              <div
                aria-hidden="true"
                className="absolute right-0 h-2.5 rounded-full bg-brand-100 dark:bg-brand-900/60"
                style={{ left: `${trackPercent(ok.min_days, ok.max_days)}%` }}
              />
              {/* The median pin. */}
              <div
                aria-hidden="true"
                className="absolute h-4 w-1.5 rounded-full bg-brand-600 shadow"
                style={{ left: `${trackPercent(ok.median_days, ok.max_days)}%` }}
              />
            </div>
          </>
        )}
      </div>
      <div className="w-full shrink-0 text-right md:w-32">
        {ok !== null && (
          <>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {ok.min_days} – {ok.max_days} days
            </span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              n={ok.sample_size} reported
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function WaitTimesSection({
  overview,
}: {
  overview: AnalyticsOverview | null;
}): React.ReactElement {
  const rows: ReadonlyArray<{
    key: "offer_to_joining_letter" | "survey_to_joining_letter";
    label: string;
  }> = [
    { key: "offer_to_joining_letter", label: "Offer letter to joining letter" },
    { key: "survey_to_joining_letter", label: "Survey to joining letter" },
  ];
  return (
    <section aria-label="Average community wait times">
      <div className={CARD}>
        <div className="mb-5 flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-700 sm:flex-row sm:items-center">
          <div>
            <h2 className={`${TYPOGRAPHY.subheadLabel} font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100`}>
              {SECTION_WAIT_TIMES}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Calculated duration between readiness survey completion and letter release
            </p>
          </div>
          {overview !== null && !overview.suppressed && (
            <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-600" />
                Cohort median
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-4 rounded bg-brand-100 dark:bg-brand-900/60" />
                Min–max range
              </span>
            </div>
          )}
        </div>
        {overview === null ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : overview.suppressed ? (
          <InsufficientData />
        ) : (
          <div className="space-y-5">
            {rows.map(({ key, label }) => (
              <div key={key} data-testid={`wait-${key}`}>
                <WaitTimeRow metric={overview.wait_times[key]} label={label} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SuppressionNotice(): React.ReactElement {
  return (
    <section
      aria-label="Privacy suppression notice"
      className="flex flex-col items-start justify-between gap-4 rounded-xl bg-brand-900 p-5 shadow-sm dark:bg-brand-950 md:flex-row md:items-center"
    >
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-800 bg-brand-800/60">
          <Shield aria-hidden="true" className="h-[22px] w-[22px] text-brand-200" />
        </span>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight text-white">
            {SUPPRESSION_TITLE}
          </h3>
          <p className="mt-0.5 text-xs text-brand-200">{SUPPRESSION_BODY}</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-700 bg-brand-800/80 px-3 py-1.5 text-xs font-medium text-brand-100">
        <Lock aria-hidden="true" className="h-4 w-4 text-emerald-400" />
        k-anonymity (k ≥ 5) enforced
      </span>
    </section>
  );
}

/** The named-parameter message for a rejected filter (7.2 D-12's 400 body). */
function filterErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.details !== null && typeof error.details === "object") {
    const details = error.details as { detail?: unknown; param?: unknown };
    if (typeof details.detail === "string") return details.detail;
  }
  if (error instanceof ApiError) return error.message;
  return "The analytics filters could not be applied.";
}

const FILTER_DEBOUNCE_MS = 200;

export function AnalyticsPage(): React.ReactElement {
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [band, setBand] = useState<HiringTypeBreakdown | null>(null);
  const [distribution, setDistribution] = useState<StatusDistribution | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [rail, setRail] = useState<RailData | null>(null);

  // Overview is unfiltered by API design (`/analytics/overview/` accepts no
  // filter params), and the option lists are read once from the unfiltered
  // whitelist endpoints — neither belongs in the filter-dependent effect.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAnalyticsOverview(),
      getBatchBreakdown(),
      getHiringTypeBreakdown(),
      getRegionBreakdown(),
    ]).then(([overviewPayload, batches, streams, regions]) => {
      if (cancelled) return;
      setOverview(overviewPayload);
      setOptions(optionsFrom({ batches, streams, regions }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setRail(null);
      return;
    }
    let cancelled = false;
    getDashboard()
      .then((payload) => {
        if (cancelled) return;
        setRail({
          status: payload.profile.current_status,
          completion: payload.profile.completion_percentage,
          unread: payload.community.unread_notifications,
        });
      })
      .catch(() => {
        // The rail is decoration on a public page — a failure leaves it empty
        // rather than failing the analytics read the visitor actually came for.
        if (!cancelled) setRail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Filter-dependent reads, debounced so a visitor clicking through the selects
  // does not fire a request per keystroke/change (§7.9: filters refetch).
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      Promise.all([
        getStatusDistribution(filters),
        // The stream band follows batch/region but not the stream filter itself
        // — filtering it by stream would collapse the breakdown to one row.
        getHiringTypeBreakdown({ batch: filters.batch, region: filters.region }),
      ])
        .then(([distributionPayload, bandPayload]) => {
          if (cancelled) return;
          setDistribution(distributionPayload);
          setBand(bandPayload);
          setFilterError(null);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setDistribution(null);
          setBand(null);
          setFilterError(filterErrorMessage(error));
        });
    }, FILTER_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filters]);

  const generatedLabel =
    overview !== null && !overview.suppressed
      ? new Date(overview.generated_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const activeFilters: ReadonlyArray<{ label: string; value: string }> = [
    filters.batch !== undefined ? { label: "Batch", value: filters.batch } : null,
    filters.hiring_type !== undefined
      ? { label: "Stream", value: filters.hiring_type }
      : null,
    filters.region !== undefined ? { label: "Region", value: filters.region } : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);

  return (
    <>
      <RailPortal>
        {isAuthenticated && (
          <RailStatusSummary
            status={rail?.status ?? null}
            completion={rail?.completion ?? null}
            unread={rail?.unread ?? null}
          />
        )}
      </RailPortal>

      <main className="skin-v1 mx-auto max-w-5xl space-y-6 p-4 lg:p-8 font-body antialiased" data-testid="analytics-page">
        {/* The composition's context row. */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          <Link to="/community" className="hover:text-brand-700 dark:hover:text-brand-300">
            Community Intelligence
          </Link>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            /
          </span>
          <span aria-current="page" className="font-semibold text-slate-800 dark:text-slate-200">
            Cohort Benchmarks &amp; Telemetry
          </span>
        </nav>

        {/* Header card: attribution badge, title, cohort meta, filter bar. */}
        <div className={`${CARD} relative overflow-hidden`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-64 w-64 rounded-full bg-brand-50/70 blur-3xl dark:bg-brand-900/20"
          />
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
              {SUBTITLE}
            </div>
            <h1 className={`${TYPOGRAPHY.pageTitle} uppercase text-slate-900 dark:text-white`}>
              {TITLE}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {overview !== null && !overview.suppressed && (
                <>
                  <span>
                    Cohort Sample:{" "}
                    <strong className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatCount(overview.total_candidates)} Candidates
                    </strong>
                  </span>
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" />
                </>
              )}
              {generatedLabel !== null && (
                <>
                  <span>Generated {generatedLabel}</span>
                  {activeFilters.length > 0 && (
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" />
                  )}
                </>
              )}
              {activeFilters.map((entry) => (
                <span
                  key={entry.label}
                  className="font-medium text-brand-700 dark:text-brand-300"
                >
                  {entry.label}: {entry.value}
                </span>
              ))}
            </div>
            {/* UI-04: the same disclaimer string 9.2's footer renders. */}
            <Disclaimer variant="analytics" className="mt-2" />

            <FilterRow
              filters={filters}
              options={options}
              onChange={(next) => setFilters(next)}
            />
          </div>
        </div>

        {filterError !== null && (
          <p
            role="alert"
            data-testid="filter-error"
            className="rounded-lg border border-rose-200/60 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {filterError}
          </p>
        )}

        <OverviewSection overview={overview} />

        <div className="grid gap-6 lg:grid-cols-12">
          <StreamBreakdownSection band={band} />
          <StatusDistributionSection distribution={distribution} />
        </div>

        <WaitTimesSection overview={overview} />
        <SuppressionNotice />
      </main>
    </>
  );
}

interface FilterRowProps {
  filters: AnalyticsFilters;
  options: FilterOptions | null;
  onChange: (next: AnalyticsFilters) => void;
}

/**
 * Batch/Stream/Region pill selects (the composition's inline filter bar).
 * Options are the API's own returned values — never a hardcoded list.
 */
function FilterRow({ filters, options, onChange }: FilterRowProps): React.ReactElement {
  const select =
    "cursor-pointer border-0 bg-transparent p-0 pr-4 text-xs font-bold text-slate-800 focus:ring-0 dark:text-slate-100";
  const pill =
    "flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900/40";
  const label = "font-medium text-slate-500 dark:text-slate-400";
  return (
    <section
      aria-label="Analytics filters"
      className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-700"
    >
      <div className={pill}>
        <label htmlFor="analytics-batch" className={label}>
          Batch:
        </label>
        <select
          id="analytics-batch"
          className={select}
          value={filters.batch ?? ""}
          onChange={(event) =>
            onChange({ ...filters, batch: event.target.value === "" ? undefined : event.target.value })
          }
        >
          <option value="">All batches</option>
          {(options?.batch ?? []).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className={pill}>
        <label htmlFor="analytics-stream" className={label}>
          Stream:
        </label>
        <select
          id="analytics-stream"
          className={select}
          value={filters.hiring_type ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              hiring_type: event.target.value === "" ? undefined : event.target.value,
            })
          }
        >
          <option value="">All streams</option>
          {(options?.stream ?? []).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className={pill}>
        <label htmlFor="analytics-region" className={label}>
          Region:
        </label>
        <select
          id="analytics-region"
          className={select}
          value={filters.region ?? ""}
          onChange={(event) =>
            onChange({ ...filters, region: event.target.value === "" ? undefined : event.target.value })
          }
        >
          <option value="">All regions</option>
          {(options?.region ?? []).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

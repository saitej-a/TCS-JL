/**
 * The §7.9 analytics screen (Phase 5 Anti-Slop Overhaul):
 * - Report-card & legend-table layout (`app-screens.md §5`) with typographic KPIs
 *   (`tabular-nums`, zero icon-in-tinted-square boxes);
 * - Sentence-case section headers (no ALL-CAPS headers with colons);
 * - Single-hue Forest Emerald (`brand-*`) & Warm Stone (`slate-*`) accent ladder
 *   distribution bars;
 * - Dignified `<5` k-anonymity suppression notice and strict honesty rules.
 */
import { useEffect, useState } from "react";
import { Lock, Shield, TriangleAlert } from "lucide-react";
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
import { ApiError } from "@/api/errors";
import { Disclaimer } from "@/components/Disclaimer";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { TYPOGRAPHY } from "@/theme/tokens";

const CARD =
  "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800 sm:p-6";

/** Sentence-case headings — zero ALL-CAPS tracked headers or trailing colons. */
const TITLE = "Community recruitment benchmarks & analytics";
const SUBTITLE =
  "Community-reported data · Voluntary candidate submissions · Not official TCS data";

const SECTION_OVERVIEW = "Overview benchmarks";
const SECTION_STREAMS = "Breakdown by hiring stream";
const SECTION_DISTRIBUTION = "Candidate status distribution";
const SECTION_WAIT_TIMES = "Community wait times (offer & survey to joining letter)";

const SUPPRESSION_TITLE = "Privacy suppression notice";
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

/**
 * Single-hue Forest Emerald (`brand-*`) & Warm Stone (`slate-*`) tonal ladder
 * with amber reserved strictly for the active waiting stage (`Accent ladder` direction).
 */
const GROUP_COLORS: Record<string, string> = {
  JOINED: "bg-brand-800 dark:bg-brand-400",
  JOINING_DATE_RECEIVED: "bg-brand-600 dark:bg-brand-500",
  JL_RECEIVED: "bg-brand-500 dark:bg-brand-600",
  WAITING_FOR_JL: "bg-amber-500 dark:bg-amber-400",
  SURVEY_OFFER_STAGE: "bg-slate-400 dark:bg-slate-500",
  WITHDRAWN_OTHER: "bg-slate-300 dark:bg-slate-600",
};

function groupColor(statusGroup: string): string {
  return GROUP_COLORS[statusGroup] ?? "bg-slate-300 dark:bg-slate-600";
}

/**
 * Single-hue stream bars using the Forest Emerald (`brand-*`) tonal ladder:
 * solid lead segment = row's share of cohort; pale tint tail = still-waiting share.
 */
const STREAM_COLORS: Record<string, { lead: string; tail: string; dot: string }> = {
  PRIME: {
    lead: "bg-brand-800 dark:bg-brand-400",
    tail: "bg-brand-200 dark:bg-brand-900/70",
    dot: "bg-brand-800 dark:bg-brand-400",
  },
  DIGITAL: {
    lead: "bg-brand-600 dark:bg-brand-500",
    tail: "bg-brand-200 dark:bg-brand-900/60",
    dot: "bg-brand-600 dark:bg-brand-500",
  },
  NINJA: {
    lead: "bg-brand-500 dark:bg-brand-600",
    tail: "bg-brand-100 dark:bg-brand-950/80",
    dot: "bg-brand-500 dark:bg-brand-600",
  },
};

function streamColors(hiringType: string): { lead: string; tail: string; dot: string } {
  return (
    STREAM_COLORS[hiringType] ?? {
      lead: "bg-slate-500",
      tail: "bg-slate-200 dark:bg-slate-700",
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

function uniqueSorted(values: readonly unknown[]): string[] {
  const strings = values.filter(
    (value): value is string => typeof value === "string" && value !== "",
  );
  return Array.from(new Set(strings)).sort((a, b) => a.localeCompare(b));
}

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
  key:
    | "total_candidates"
    | "waiting_for_joining_letter"
    | "joining_letters_reported"
    | "joined_reported";
  tone: string;
  caption: string;
  dot?: { label: string; className: string };
}

/** §7.9's four typographic KPI report cards (no icon-in-tinted-square boxes). */
const KPIS: readonly Kpi[] = [
  {
    label: "Total Candidates",
    key: "total_candidates",
    tone: "text-slate-900 dark:text-slate-100",
    caption: "Aggregated candidate submissions",
  },
  {
    label: "Waiting for JL",
    key: "waiting_for_joining_letter",
    tone: "text-amber-600 dark:text-amber-400",
    caption: "Awaiting official onboarding dispatch",
    dot: { label: "Active pool", className: "bg-amber-500" },
  },
  {
    label: "Reported JL Recvd",
    key: "joining_letters_reported",
    tone: "text-brand-700 dark:text-brand-300",
    caption: "Joining letters with reporting dates",
  },
  {
    label: "Reported Joined",
    key: "joined_reported",
    tone: "text-emerald-700 dark:text-emerald-400",
    caption: "Onboarding and ILP officially commenced",
    dot: { label: "Inducted", className: "bg-emerald-500" },
  },
];

function KpiCard({
  label,
  value,
  tone,
  caption,
  dot,
  badge,
}: {
  label: string;
  value: string;
  tone: string;
  caption: string;
  dot?: { label: string; className: string };
  badge?: string;
}): React.ReactElement {
  return (
    <div className={CARD}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className={`${TYPOGRAPHY.badgePill} tracking-tight text-slate-500 dark:text-slate-400`}>
          {label}
        </p>
        {badge !== undefined && (
          <span className="rounded bg-brand-50 px-1.5 py-0.5 font-mono-code text-[11px] font-semibold text-brand-700 tabular-nums dark:bg-brand-950/60 dark:text-brand-300">
            {badge}
          </span>
        )}
        {badge === undefined && dot !== undefined && (
          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${tone}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot.className}`} />
            {dot.label}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <p className={`font-display text-3xl font-bold tracking-tight tabular-nums ${tone}`}>
          {value}
        </p>
      </div>
      <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-700/80 dark:text-slate-400">
        {caption}
      </p>
    </div>
  );
}

function OverviewSection({
  overview,
}: {
  overview: AnalyticsOverview | null;
}): React.ReactElement {
  const conversion =
    overview !== null && !overview.suppressed && overview.total_candidates > 0
      ? `${((overview.joining_letters_reported / overview.total_candidates) * 100).toFixed(1)}% conv.`
      : undefined;

  return (
    <section aria-label="Overview KPI cards">
      <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {SECTION_OVERVIEW}
      </h2>
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
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {SECTION_STREAMS}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Volume and distribution by recruitment profile
            </p>
          </div>
          {band !== null && !band.suppressed && band.results.length > 0 && (
            <span className="shrink-0 rounded bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 tabular-nums dark:bg-brand-900/50 dark:text-brand-300">
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
                const share =
                  band.total_in_cohort > 0
                    ? (row.candidate_count / band.total_in_cohort) * 100
                    : 0;
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
                        <span className="text-slate-600 tabular-nums dark:text-slate-300">
                          {row.candidate_count} candidates ({share.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 tabular-nums dark:text-slate-400">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {row.waiting_for_joining_letter} waiting
                        </span>
                        {" · "}
                        <span className="font-semibold text-brand-700 dark:text-brand-300">
                          {row.joining_letter_reported} recvd JL
                        </span>
                      </div>
                    </div>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
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
                <span className="text-slate-600 dark:text-slate-300">Highest reporting rate</span>
                <span className="font-semibold text-slate-900 tabular-nums dark:text-slate-100">
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
    <section
      aria-label="Candidate status distribution"
      className="lg:col-span-6"
      data-testid="analytics-distribution"
    >
      <div className={`${CARD} h-full`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {SECTION_DISTRIBUTION}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Lifecycle stage across all reported submissions
            </p>
          </div>
          {distribution !== null && !distribution.suppressed && (
            <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 tabular-nums dark:bg-slate-700 dark:text-slate-300">
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
            {/* Single-hue tonal ladder stacked bar (zero inner shadow). */}
            <div
              data-testid="distribution-bar"
              className="mb-5 flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
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
            {/* Legend table rows — two columns at sm. */}
            <ul
              data-testid="distribution-legend"
              className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2"
            >
              {distribution.results.map((row) => (
                <li
                  key={row.status_group}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-sm ${groupColor(row.status_group)}`}
                    />
                    <span className="text-slate-700 dark:text-slate-200">{row.label}</span>
                  </div>
                  <span className="font-mono-code font-bold text-slate-900 tabular-nums dark:text-slate-100">
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
        {ok !== null && (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Baseline: {ok.baseline.toLowerCase().replace(/_/g, " ")}
            </p>
            <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
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
            <div className="mb-1 flex justify-between font-mono-code text-[11px] text-slate-400 tabular-nums dark:text-slate-500">
              <span>Min: {ok.min_days} days</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Median {ok.median_days}d
              </span>
              <span>Max: {ok.max_days} days</span>
            </div>
            <div className="relative flex h-3.5 items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                aria-hidden="true"
                className="absolute right-0 h-2 rounded-full bg-brand-100 dark:bg-brand-900/60"
                style={{ left: `${trackPercent(ok.min_days, ok.max_days)}%` }}
              />
              <div
                aria-hidden="true"
                className="absolute h-3.5 w-1.5 rounded-full bg-brand-700 dark:bg-brand-400"
                style={{ left: `${trackPercent(ok.median_days, ok.max_days)}%` }}
              />
            </div>
          </>
        )}
      </div>
      <div className="w-full shrink-0 text-right md:w-32">
        {ok !== null && (
          <>
            <span className="font-mono-code text-xs font-semibold text-slate-800 tabular-nums dark:text-slate-100">
              {ok.min_days} – {ok.max_days} days
            </span>
            <p className="font-mono-code text-[10px] text-slate-400 tabular-nums dark:text-slate-500">
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
        <div className="mb-5 flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center dark:border-slate-700">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {SECTION_WAIT_TIMES}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Calculated duration between offer/survey milestones and joining letter release
            </p>
          </div>
          {overview !== null && !overview.suppressed && (
            <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-700 dark:bg-brand-400" />
                Cohort median
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-4 rounded bg-brand-100 dark:bg-brand-900/60"
                />
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

/** Dignified `<5` k-anonymity suppression notice (flat architectural ledger card). */
function SuppressionNotice(): React.ReactElement {
  return (
    <section
      aria-label="Privacy suppression notice"
      className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div className="flex items-start gap-3">
        <Shield
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400"
        />
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {SUPPRESSION_TITLE}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{SUPPRESSION_BODY}</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono-code text-xs font-medium text-slate-700 tabular-nums dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Lock aria-hidden="true" className="h-3.5 w-3.5 text-brand-700 dark:text-brand-400" />
        k-anonymity (k ≥ 5) enforced
      </span>
    </section>
  );
}

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
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [band, setBand] = useState<HiringTypeBreakdown | null>(null);
  const [distribution, setDistribution] = useState<StatusDistribution | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

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
    let cancelled = false;
    const handle = setTimeout(() => {
      Promise.all([
        getStatusDistribution(filters),
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
    <main
      className="w-full max-w-none space-y-6 p-4 font-body antialiased lg:p-8"
      data-testid="analytics-page"
    >
      <PageHeader
        className="overflow-hidden"
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
            {SUBTITLE}
          </span>
        }
        title={TITLE}
      >
        <div className="relative z-10">
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {overview !== null && !overview.suppressed && (
              <>
                <span>
                  Cohort sample:{" "}
                  <strong className="font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                    {formatCount(overview.total_candidates)} candidates
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
          <Disclaimer variant="analytics" className="mt-2" />

          <FilterRow
            filters={filters}
            options={options}
            onChange={(next) => setFilters(next)}
          />
        </div>
      </PageHeader>

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
  );
}

interface FilterRowProps {
  filters: AnalyticsFilters;
  options: FilterOptions | null;
  onChange: (next: AnalyticsFilters) => void;
}

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
            onChange({
              ...filters,
              batch: event.target.value === "" ? undefined : event.target.value,
            })
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
            onChange({
              ...filters,
              region: event.target.value === "" ? undefined : event.target.value,
            })
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

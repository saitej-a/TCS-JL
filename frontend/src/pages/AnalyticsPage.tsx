/**
 * The §7.9 analytics screen (9.4 Task 6): read-public community recruitment
 * benchmarks over 7.2's analytics API plus 9.4's D1 status-distribution
 * aggregate.
 *
 * Three honesty rules govern every block:
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
  getAnalyticsOverview,
  getBatchBreakdown,
  getHiringTypeBreakdown,
  getRegionBreakdown,
  getStatusDistribution,
  type AnalyticsFilters,
  type AnalyticsOverview,
  type HiringTypeBreakdown,
  type StatusDistribution,
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
  "rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800";

/** §5.6/UI-04 — the one analytics disclaimer string (single content module). */
const TITLE = "COMMUNITY RECRUITMENT BENCHMARKS & ANALYTICS";
const SUBTITLE =
  "Community-Reported Data • Voluntary Candidate Submissions • Not Official TCS Data";

const SECTION_OVERVIEW = "OVERVIEW KPI CARDS:";
const SECTION_STREAMS = "BREAKDOWN BY HIRING STREAM:";
const SECTION_DISTRIBUTION = "CANDIDATE STATUS DISTRIBUTION:";
const SECTION_WAIT_TIMES = "AVERAGE COMMUNITY WAIT TIMES (SURVEY TO JOINING LETTER):";

const SUPPRESSION_TITLE = "🛡️ PRIVACY SUPPRESSION NOTICE:";
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

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}): React.ReactElement {
  return (
    <div className={CARD}>
      <p className={`${TYPOGRAPHY.badgePill} uppercase text-slate-500 dark:text-slate-400`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

interface Kpi {
  label: string;
  key: "total_candidates" | "waiting_for_joining_letter" | "joining_letters_reported" | "joined_reported";
  tone: string;
}

/** §7.9's four KPI cards, in spec order, over the overview payload. */
const KPIS: readonly Kpi[] = [
  { label: "Total Candidates", key: "total_candidates", tone: "text-slate-900 dark:text-slate-100" },
  {
    label: "Waiting for JL",
    key: "waiting_for_joining_letter",
    tone: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "Reported JL Recvd",
    key: "joining_letters_reported",
    tone: "text-brand-600 dark:text-brand-300",
  },
  { label: "Reported Joined", key: "joined_reported", tone: "text-emerald-600 dark:text-emerald-400" },
];

function OverviewSection({
  overview,
}: {
  overview: AnalyticsOverview | null;
}): React.ReactElement {
  return (
    <section aria-label="Overview KPI cards">
      <h2 className={TYPOGRAPHY.sectionHeader}>{SECTION_OVERVIEW}</h2>
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
  return (
    <section aria-label="Breakdown by hiring stream">
      <h2 className={TYPOGRAPHY.sectionHeader}>{SECTION_STREAMS}</h2>
      <div className={`${CARD} mt-3`}>
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
          <ul className="space-y-3">
            {band.results.map((row) => {
              // Share bars are drawn from this row's own slice of the cohort,
              // never from an assumed total.
              const share =
                band.total_in_cohort > 0
                  ? (row.candidate_count / band.total_in_cohort) * 100
                  : 0;
              return (
                <li key={row.hiring_type} data-testid={`stream-${row.hiring_type}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`${TYPOGRAPHY.bodySecondary} text-slate-700 dark:text-slate-200`}>
                      {row.hiring_type}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {row.candidate_count}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      data-testid={`stream-bar-${row.hiring_type}`}
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${share.toFixed(1)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
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
    <section aria-label="Candidate status distribution">
      <h2 className={TYPOGRAPHY.sectionHeader}>{SECTION_DISTRIBUTION}</h2>
      <div className={`${CARD} mt-3`}>
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
              className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
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
            {/* Legend — wraps on narrow widths (UI-SPEC backstop). */}
            <ul data-testid="distribution-legend" className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {distribution.results.map((row) => (
                <li key={row.status_group} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${groupColor(row.status_group)}`}
                  />
                  <span>{row.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {row.candidate_count}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">({row.share}%)</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function WaitTimesSection({
  overview,
}: {
  overview: AnalyticsOverview | null;
}): React.ReactElement {
  const rows: ReadonlyArray<{ key: "offer_to_joining_letter" | "survey_to_joining_letter"; label: string }> = [
    { key: "offer_to_joining_letter", label: "Offer letter to joining letter" },
    { key: "survey_to_joining_letter", label: "Survey to joining letter" },
  ];
  return (
    <section aria-label="Average community wait times">
      <h2 className={TYPOGRAPHY.sectionHeader}>{SECTION_WAIT_TIMES}</h2>
      <div className={`${CARD} mt-3 space-y-3`}>
        {overview === null ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : overview.suppressed ? (
          <InsufficientData />
        ) : (
          rows.map(({ key, label }) => {
            const metric = overview.wait_times[key];
            return (
              <div key={key} data-testid={`wait-${key}`}>
                <p className={`${TYPOGRAPHY.bodySecondary} text-slate-700 dark:text-slate-200`}>{label}</p>
                {/* A suppressed (or absent) metric has no numbers to show — the
                    copy, never zeros and never a crash on a public page. */}
                {metric === undefined || metric.suppressed ? (
                  <InsufficientData />
                ) : (
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    {waitTimeRowCopy(metric.average_days, metric.min_days, metric.max_days)}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function SuppressionNotice(): React.ReactElement {
  return (
    <section aria-label="Privacy suppression notice" className={`${CARD} border-dashed`}>
      <p className={`${TYPOGRAPHY.subheadLabel} text-slate-700 dark:text-slate-200`}>
        {SUPPRESSION_TITLE}
      </p>
      <p className={`${TYPOGRAPHY.caption} mt-1`}>{SUPPRESSION_BODY}</p>
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

      <main className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <header>
          <h1 className={TYPOGRAPHY.pageTitle}>{TITLE}</h1>
          <p className={`${TYPOGRAPHY.bodySecondary} mt-2 text-slate-600 dark:text-slate-300`}>
            {SUBTITLE}
          </p>
          {/* UI-04: the same disclaimer string 9.2's footer renders. */}
          <Disclaimer variant="analytics" className="mt-2" />
        </header>

        <FilterRow
          filters={filters}
          options={options}
          onChange={(next) => setFilters(next)}
        />
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

        <div className="grid gap-4 lg:grid-cols-2">
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

/** Batch/Stream/Region selects. Options are the API's own returned values. */
function FilterRow({ filters, options, onChange }: FilterRowProps): React.ReactElement {
  const select =
    "mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
  const label = `${TYPOGRAPHY.subheadLabel} text-slate-700 dark:text-slate-200`;
  return (
    <section aria-label="Analytics filters" className={CARD}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
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
        <div>
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
        <div>
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
      </div>
    </section>
  );
}

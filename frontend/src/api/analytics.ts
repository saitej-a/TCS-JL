/**
 * Analytics API (04 §47–§53, 9.4 D1) — the analytics screen's data layer.
 *
 * The suppression union is the compile-time discipline: a payload is either
 * `suppressed: true` with no numbers (04 §53's shape) or a full payload with
 * rows — a caller cannot read a count off a suppressed response without the
 * narrowing showing it. Shapes mirror `apps/analytics/services.py` exactly.
 */
import { apiGet } from "@/api/client";

/** Every analytics response's attribution envelope (ANAL-05, always present). */
interface AnalyticsMeta {
  data_source: string;
  disclaimer: string;
}

export interface AnalyticsSuppressed extends AnalyticsMeta {
  suppressed: true;
  message: string;
}

/** One breakdown row (batches / hiring-types / regions share this shape). */
export interface BreakdownRow {
  candidate_count: number;
  waiting_for_joining_letter: number;
  joining_letter_reported: number;
}

export interface BatchRow extends BreakdownRow {
  batch: string;
}

export interface HiringTypeRow extends BreakdownRow {
  hiring_type: string;
}

export interface RegionRow extends BreakdownRow {
  region: string;
}

interface BreakdownPayloadBase extends AnalyticsMeta {
  suppressed: false;
  total_in_cohort: number;
  generated_at: string;
}

export type BatchBreakdown =
  | AnalyticsSuppressed
  | (BreakdownPayloadBase & { results: BatchRow[] });

export type HiringTypeBreakdown =
  | AnalyticsSuppressed
  | (BreakdownPayloadBase & { results: HiringTypeRow[] });

export type RegionBreakdown =
  | AnalyticsSuppressed
  | (BreakdownPayloadBase & { results: RegionRow[] });

/** One status-distribution row (9.4 D1): server label + group key + share. */
export interface StatusDistributionRow {
  status_group: string;
  label: string;
  candidate_count: number;
  /** Percent of the filtered cohort, one decimal. */
  share: number;
}

export type StatusDistribution =
  | AnalyticsSuppressed
  | (BreakdownPayloadBase & { results: StatusDistributionRow[] });

/** One wait-time metric (7.2 D-14/D-16) — its own suppression state. */
export type WaitTimeMetric =
  | AnalyticsSuppressed
  | (AnalyticsMeta & {
      suppressed: false;
      baseline: string;
      baseline_source_counts: Record<string, number>;
      sample_size: number;
      average_days: number;
      median_days: number;
      min_days: number;
      max_days: number;
      generated_at: string;
    });

export interface OverviewPayload extends AnalyticsMeta {
  suppressed: false;
  total_candidates: number;
  waiting_for_joining_letter: number;
  joining_letters_reported: number;
  joined_reported: number;
  wait_times: {
    offer_to_joining_letter: WaitTimeMetric;
    survey_to_joining_letter: WaitTimeMetric;
  };
  generated_at: string;
}

export type AnalyticsOverview = AnalyticsSuppressed | OverviewPayload;

/** The analytics filters, shared by every breakdown endpoint. */
export interface AnalyticsFilters {
  batch?: string;
  hiring_type?: string;
  region?: string;
}

export function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return apiGet<AnalyticsOverview>("/analytics/overview/");
}

export function getBatchBreakdown(filters: AnalyticsFilters = {}): Promise<BatchBreakdown> {
  return apiGet<BatchBreakdown>("/analytics/batches/", { ...filters });
}

export function getHiringTypeBreakdown(
  filters: AnalyticsFilters = {},
): Promise<HiringTypeBreakdown> {
  return apiGet<HiringTypeBreakdown>("/analytics/hiring-types/", { ...filters });
}

export function getRegionBreakdown(filters: AnalyticsFilters = {}): Promise<RegionBreakdown> {
  return apiGet<RegionBreakdown>("/analytics/regions/", { ...filters });
}

/** 9.4 D1: the one aggregate that takes all three filters together. */
export function getStatusDistribution(
  filters: AnalyticsFilters = {},
): Promise<StatusDistribution> {
  return apiGet<StatusDistribution>("/analytics/status-distribution/", { ...filters });
}

/**
 * Moderation API (04 §68–§70), typed to the SHIPPED serializers — not the
 * mock. Reconciled field by field against `ModerationReportSerializer`:
 * deliberately NO reporter email/identity (04 §63) and NO
 * reviewed_by/reviewed_at/moderator_notes in list shape.
 */
import { apiGet, apiPost } from "@/api/client";
import type { Paginated } from "@/types/api";

export const REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "MISINFORMATION",
  "ABUSIVE_CONTENT",
  "PERSONAL_INFORMATION",
  "SCAM",
  "OTHER",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REVIEW_ACTIONS = [
  "DISMISS",
  "REMOVE_CONTENT",
  "LOCK_POST",
  "WARN_USER",
  "BAN_USER",
] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export interface ModerationReport {
  id: string;
  reason: ReportReason;
  status: ReportStatus;
  post_id: string | null;
  comment_id: string | null;
  description: string;
  created_at: string;
}

export function listReports(status: ReportStatus): Promise<Paginated<ModerationReport>> {
  // Query string embedded (not axios params): the server reads request.query_params
  // identically, and the test adapter matches on config.url, which excludes params.
  return apiGet<Paginated<ModerationReport>>(`/moderation/reports/?status=${status}`);
}

export interface ReviewResponse {
  id: string;
  status: ReportStatus;
  action: ReviewAction;
  /** Present only on BAN_USER (202): enforcement completes asynchronously. */
  detail?: string;
}

export function reviewReport(
  reportId: string,
  body: { action: ReviewAction; moderator_notes?: string; duration_days?: number },
): Promise<ReviewResponse> {
  return apiPost<ReviewResponse>(`/moderation/reports/${reportId}/review/`, body);
}

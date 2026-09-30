/**
 * The notification row's presentation maps (Phase 14 D-01).
 *
 * Every class list below is transcribed **verbatim** from the five rows of the
 * `notification_center` composition — this module is the markup's data, and
 * `NotificationRow.tsx` only renders it. Keeping them here (rather than inline in
 * the component) matches the repo's existing convention for class maps
 * (`theme/badges.ts`) and keeps the component a component.
 *
 * The library ships five row treatments; the product's vocabulary has exactly
 * those five types plus two it draws no row for:
 *
 *   REPLY            → row 1 · indigo chip · `forum`    · quoted callout · action
 *   VOTE_MILESTONE   → row 2 · amber chip  · `thumb_up` · meta line      · action
 *   ANNOUNCEMENT     → row 3 · violet chip · `campaign` · badge + prose  · action
 *   COMMENT          → row 4 · slate chip  · `forum`    · plain quote    · none
 *   TIMELINE_REMINDER→ row 5 · emerald chip· `pin_drop` · prose          · action
 *   MODERATION       → no row exists in the library (recorded divergence)
 *   SYSTEM           → no row exists in the library (recorded divergence)
 *
 * MODERATION and SYSTEM take the advisory treatment: a platform notice is what
 * the document's violet `campaign` row already draws, and inventing a new colour
 * for them would mean the markup is no longer the composition's.
 */
import type { NotificationType } from "@/types/notifications";

export interface RowAction {
  label: string;
  /** The composition's class list for this row's action. */
  className: string;
  /** The ligature the action carries, where the document shows one. */
  glyph?: string;
}

/** Which of the document's four body shapes a row uses. */
export type RowBody = "callout" | "quote" | "prose" | "meta" | "none";

export interface RowTreatment {
  /** The icon chip's full class list (tint + border + size). */
  chip: string;
  /** The `data-icon` ligature name the document uses here. */
  glyph: string;
  /** The category line's class list, or the badge's when `badge` is true. */
  label: string;
  /** True where the document draws the category as a pill instead of a line. */
  badge: boolean;
  /** The headline line's class list. */
  primary: string;
  body: RowBody;
  action: RowAction | null;
}

const VIEW_DISCUSSION: RowAction = {
  label: "View Discussion",
  className:
    "px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-2xs transition-colors",
};

const VIEW_POST: RowAction = {
  label: "View Post",
  className:
    "px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors",
};

const READ_NOTICE: RowAction = {
  label: "Read Notice",
  className:
    "px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs transition-colors flex items-center gap-1.5",
  glyph: "open_in_new",
};

const UPDATE_STATUS: RowAction = {
  label: "Update My Status",
  className:
    "px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors",
};

/** Row 3's treatment — shared with the two types the library does not draw. */
const ADVISORY: RowTreatment = {
  chip: "h-10 w-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0",
  glyph: "campaign",
  label:
    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 tracking-wide",
  badge: true,
  primary: "text-sm font-semibold text-slate-900 mt-1 leading-snug",
  body: "prose",
  action: READ_NOTICE,
};

export const ROW_TREATMENTS: Record<NotificationType, RowTreatment> = {
  REPLY: {
    chip: "h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0",
    glyph: "forum",
    label: "text-xs font-semibold text-indigo-600 uppercase tracking-wider",
    badge: false,
    primary: "text-sm text-slate-700 mt-1 leading-snug",
    body: "callout",
    action: VIEW_DISCUSSION,
  },
  COMMENT: {
    chip: "h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0",
    glyph: "forum",
    label: "text-xs font-medium text-slate-400 uppercase tracking-wider",
    badge: false,
    primary: "text-sm text-slate-800 mt-1 leading-snug",
    body: "quote",
    action: null,
  },
  VOTE_MILESTONE: {
    chip: "h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0",
    glyph: "thumb_up",
    label: "text-xs font-semibold text-amber-600 uppercase tracking-wider",
    badge: false,
    primary: "text-sm text-slate-700 mt-1 leading-snug",
    body: "meta",
    action: VIEW_POST,
  },
  ANNOUNCEMENT: ADVISORY,
  TIMELINE_REMINDER: {
    chip: "h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0",
    glyph: "pin_drop",
    label: "text-xs font-medium text-emerald-700 uppercase tracking-wider",
    badge: false,
    primary: "text-sm font-semibold text-slate-900 mt-1 leading-snug",
    body: "prose",
    action: UPDATE_STATUS,
  },
  MODERATION: ADVISORY,
  SYSTEM: ADVISORY,
};

/** The composition's category lines, carrying the app's real labels (9.4). */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  COMMENT: "Discussion Activity",
  REPLY: "Comment Reply",
  VOTE_MILESTONE: "Milestone Upvote",
  ANNOUNCEMENT: "Official Advisory",
  TIMELINE_REMINDER: "Tracker Reminder",
  MODERATION: "Moderation",
  SYSTEM: "System",
};

/**
 * The three in-app alert categories the composition's preferences card lists.
 * Its middle item names a region-scoped dispatch ("JL Wave dispatches
 * (Hyderabad)") that the API does not filter by, so the slot carries the
 * product's real third category instead — same item count, same frame, real
 * vocabulary (recorded in RECONCILIATION-14.md).
 */
export const IN_APP_ALERT_GROUPS: string[] = [
  "Discussion activity & replies",
  "Milestone upvotes",
  "Official advisories & reminders",
];

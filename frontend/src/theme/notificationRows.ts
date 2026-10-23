/**
 * The notification row's presentation maps (upgraded in Phase 1 Anti-Slop Overhaul).
 *
 * Uses the canonical Deep Cerulean (`brand-*`) Accent Ladder, flat 1px borders,
 * and semantic status tints across all notification types.
 */
import type { NotificationType } from "@/types/notifications";

export interface RowAction {
  label: string;
  /** The class list for this row's action. */
  className: string;
  /** Semantic icon key for the action button. */
  glyph?: string;
}

/** Which of the four body shapes a row uses. */
export type RowBody = "callout" | "quote" | "prose" | "meta" | "none";

export interface RowTreatment {
  /** The icon chip's full class list (tint + border + size). */
  chip: string;
  /** The icon key used by NotificationRow to render a Lucide SVG icon. */
  glyph: string;
  /** The category line's class list, or the badge's when `badge` is true. */
  label: string;
  /** True where the category renders as a pill instead of a line. */
  badge: boolean;
  /** The headline line's class list. */
  primary: string;
  body: RowBody;
  action: RowAction | null;
}

const VIEW_DISCUSSION: RowAction = {
  label: "View Discussion",
  className:
    "px-3 py-1 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-medium text-xs transition-colors active:scale-[0.98]",
};

const VIEW_POST: RowAction = {
  label: "View Post",
  className:
    "px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors active:scale-[0.98] dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-200",
};

const READ_NOTICE: RowAction = {
  label: "Read Notice",
  className:
    "px-3 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium text-xs transition-colors flex items-center gap-1.5 active:scale-[0.98] dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-900/60",
  glyph: "open_in_new",
};

const UPDATE_STATUS: RowAction = {
  label: "Update My Status",
  className:
    "px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors active:scale-[0.98] dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200",
};

/** Advisory row treatment — shared by ANNOUNCEMENT, MODERATION, and SYSTEM. */
const ADVISORY: RowTreatment = {
  chip: "h-9 w-9 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 flex-shrink-0 dark:bg-brand-950/50 dark:border-brand-900/60 dark:text-brand-300",
  glyph: "campaign",
  label:
    "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
  badge: true,
  primary: "text-sm font-semibold text-slate-900 mt-1 leading-snug dark:text-slate-100",
  body: "prose",
  action: READ_NOTICE,
};

export const ROW_TREATMENTS: Record<NotificationType, RowTreatment> = {
  REPLY: {
    chip: "h-9 w-9 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 flex-shrink-0 dark:bg-brand-950/50 dark:border-brand-900/60 dark:text-brand-300",
    glyph: "forum",
    label: "text-xs font-semibold text-brand-700 dark:text-brand-400",
    badge: false,
    primary: "text-sm text-slate-700 mt-1 leading-snug dark:text-slate-200",
    body: "callout",
    action: VIEW_DISCUSSION,
  },
  COMMENT: {
    chip: "h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300",
    glyph: "forum",
    label: "text-xs font-medium text-slate-500 dark:text-slate-400",
    badge: false,
    primary: "text-sm text-slate-800 mt-1 leading-snug dark:text-slate-200",
    body: "quote",
    action: null,
  },
  VOTE_MILESTONE: {
    chip: "h-9 w-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0 dark:bg-amber-950/50 dark:border-amber-900/60 dark:text-amber-300",
    glyph: "thumb_up",
    label: "text-xs font-semibold text-amber-700 dark:text-amber-400",
    badge: false,
    primary: "text-sm text-slate-700 mt-1 leading-snug dark:text-slate-200",
    body: "meta",
    action: VIEW_POST,
  },
  ANNOUNCEMENT: ADVISORY,
  TIMELINE_REMINDER: {
    chip: "h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0 dark:bg-emerald-950/50 dark:border-emerald-900/60 dark:text-emerald-300",
    glyph: "pin_drop",
    label: "text-xs font-medium text-emerald-700 dark:text-emerald-400",
    badge: false,
    primary: "text-sm font-semibold text-slate-900 mt-1 leading-snug dark:text-slate-100",
    body: "prose",
    action: UPDATE_STATUS,
  },
  MODERATION: ADVISORY,
  SYSTEM: ADVISORY,
};

/** Category lines carrying the app's real notification labels (9.4). */
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
 * The three in-app alert categories the preferences card lists.
 */
export const IN_APP_ALERT_GROUPS: string[] = [
  "Discussion activity & replies",
  "Milestone upvotes",
  "Official advisories & reminders",
];

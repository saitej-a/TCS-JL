/**
 * One §7.10 notification row, rebuilt to the `notification_center` composition
 * (Phase 12): leading read/unread dot, tinted lucide icon chip, the type label
 * as the category line, the server headline, and the quoted body as a
 * border-l callout.
 *
 * Field mapping (recorded, because the mockup shows one sentence and the API
 * ships two fields): `title` is the server's headline ("New Reply to Your
 * Comment") and `message` is the human sentence — for COMMENT/REPLY it carries
 * the quoted comment preview, for ANNOUNCEMENT it carries the announcement
 * body. The row renders the headline as the primary line and `message` as the
 * quoted snippet, so the composition's quoted-preview affordance is real rather
 * than invented. No field is synthesised.
 *
 * Icons (Phase 12 G-4): the type glyphs are lucide components — the emoji
 * vocabulary is retired. Presentational only: the click lives in the page
 * (§7.10's read-then-navigate ordering is page behaviour, not row behaviour).
 */
import {
  Bell,
  type LucideIcon,
  MapPin,
  MessageSquare,
  Megaphone,
  ShieldHalf,
  ThumbsUp,
} from "lucide-react";

import type { NotificationItem, NotificationType } from "@/types/notifications";
import { TYPOGRAPHY } from "@/theme/tokens";
import { timeAgoLong } from "@/utils/date";

/** Phase 12 icon mapping: composition glyph → lucide, per the closed type set. */
export const NOTIFICATION_GLYPHS: Record<NotificationType, LucideIcon> = {
  COMMENT: MessageSquare,
  REPLY: MessageSquare,
  VOTE_MILESTONE: ThumbsUp,
  ANNOUNCEMENT: Megaphone,
  TIMELINE_REMINDER: MapPin,
  MODERATION: ShieldHalf,
  SYSTEM: Bell,
};

/** The composition's category-line tint per type (repainted to v2 pairs). */
const GLYPH_TINTS: Record<NotificationType, string> = {
  COMMENT: "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
  REPLY: "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
  VOTE_MILESTONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  ANNOUNCEMENT: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  TIMELINE_REMINDER: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  MODERATION: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  SYSTEM: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const TYPE_LABELS: Record<NotificationType, string> = {
  COMMENT: "Discussion Activity",
  REPLY: "Comment Reply",
  VOTE_MILESTONE: "Milestone Upvote",
  ANNOUNCEMENT: "Official Advisory",
  TIMELINE_REMINDER: "Tracker Reminder",
  MODERATION: "Moderation",
  SYSTEM: "System",
};

export interface NotificationRowProps {
  item: NotificationItem;
  onSelect: (item: NotificationItem) => void;
}

export function NotificationRow({ item, onSelect }: NotificationRowProps): React.ReactElement {
  const Glyph = NOTIFICATION_GLYPHS[item.type];
  return (
    <li>
      <button
        type="button"
        data-testid={`notification-row-${item.id}`}
        onClick={() => onSelect(item)}
        className={`flex w-full items-start gap-3.5 px-3 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:px-5 ${
          item.is_read ? "opacity-80 hover:opacity-100" : "bg-brand-50/20 dark:bg-brand-950/10"
        }`}
      >
        {/* The composition's leading status dot. */}        <span
          aria-hidden="true"
          data-testid={`marker-${item.is_read ? "read" : "unread"}-${item.id}`}
          className="block shrink-0 translate-y-1.5"
          title={item.is_read ? "Already read" : "Unread notification"
          }
        >
          <span
            className={`block h-2.5 w-2.5 rounded-full ${
              item.is_read
                ? "border border-slate-300 bg-transparent dark:border-slate-600"
                : "bg-brand-600 ring-4 ring-brand-100 dark:ring-brand-900/60"
            }`}
          />
        </span>

        <span
          aria-hidden="true"
          data-testid={`notification-glyph-${item.id}`}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${GLYPH_TINTS[item.type]}`}
        >
          <Glyph className="h-5 w-5" strokeWidth={1.75} />
        </span>

        <span className="min-w-0 flex-1">
          {/* Category label + relative time (the composition's header line). */}
          <span className="flex items-center justify-between gap-2">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                item.is_read
                  ? "text-slate-400 dark:text-slate-500"
                  : TYPOGRAPHY.badgePill + " text-brand-700 dark:text-brand-400"
              }`}
            >
              {TYPE_LABELS[item.type]}
            </span>
            <span className={`${TYPOGRAPHY.caption} whitespace-nowrap`}>
              {timeAgoLong(item.created_at)}
            </span>
          </span>

          <span className={`mt-1 block ${TYPOGRAPHY.bodySecondary} text-slate-800 dark:text-slate-100`}>
            {item.title}
          </span>

          {item.message !== "" && (
            <span
              data-testid={`notification-snippet-${item.id}`}
              className="mt-2 block border-l-2 border-brand-500 bg-slate-50 py-2 pl-2.5 text-xs italic leading-relaxed text-slate-600 dark:border-brand-400 dark:bg-slate-800 dark:text-slate-300"
            >
              {item.message}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

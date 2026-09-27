/**
 * One §7.10 notification row: type glyph in a tinted badge, the read/unread
 * marker with its long-form relative time, the server's headline, and the
 * optional quoted body beneath it.
 *
 * Field mapping (recorded, because the mockup shows one sentence and the API
 * ships two fields): `title` is the server's headline ("New Reply to Your
 * Comment") and `message` is the human sentence — for COMMENT/REPLY it carries
 * the quoted comment preview, for ANNOUNCEMENT it carries the announcement
 * body. The row renders the headline as the primary line and `message` as the
 * quoted snippet, so the quoted-preview affordance in the design is real rather
 * than invented. No field is synthesised.
 *
 * Presentational only: the click lives in the page (§7.10's read-then-navigate
 * ordering is page behaviour, not row behaviour).
 */
import type { NotificationItem, NotificationType } from "@/types/notifications";
import { TYPOGRAPHY } from "@/theme/tokens";
import { timeAgoLong } from "@/utils/date";

/** 05 §7.10's glyph vocabulary, per the model's closed type set. */
export const NOTIFICATION_GLYPHS: Record<NotificationType, string> = {
  COMMENT: "💬",
  REPLY: "💬",
  VOTE_MILESTONE: "▲",
  ANNOUNCEMENT: "📢",
  TIMELINE_REMINDER: "📍",
  MODERATION: "🛡️",
  SYSTEM: "🔔",
};

const GLYPH_TINTS: Record<NotificationType, string> = {
  COMMENT: "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
  REPLY: "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300",
  VOTE_MILESTONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  ANNOUNCEMENT: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  TIMELINE_REMINDER: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  MODERATION: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  SYSTEM: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export interface NotificationRowProps {
  item: NotificationItem;
  onSelect: (item: NotificationItem) => void;
}

export function NotificationRow({ item, onSelect }: NotificationRowProps): React.ReactElement {
  return (
    <li>
      <button
        type="button"
        data-testid={`notification-row-${item.id}`}
        onClick={() => onSelect(item)}
        className={`flex w-full gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
          item.is_read ? "" : "bg-brand-50/40 dark:bg-brand-950/20"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
            GLYPH_TINTS[item.type]
          }`}
        >
          {NOTIFICATION_GLYPHS[item.type]}
        </span>

        <span className="min-w-0 flex-1">
          {/* Marker + relative time (§7.10's meta line). */}
          <span className="flex flex-wrap items-center gap-2">
            {item.is_read ? (
              <span
                data-testid={`marker-read-${item.id}`}
                className={`${TYPOGRAPHY.badgePill} text-slate-400 dark:text-slate-500`}
              >
                ○ READ
              </span>
            ) : (
              <span
                data-testid={`marker-unread-${item.id}`}
                className={`${TYPOGRAPHY.badgePill} text-brand-600 dark:text-brand-400`}
              >
                ● UNREAD
              </span>
            )}
            <span className={TYPOGRAPHY.caption}>{timeAgoLong(item.created_at)}</span>
          </span>

          <span className={`mt-1 block ${TYPOGRAPHY.bodySecondary} text-slate-800 dark:text-slate-100`}>
            {item.title}
          </span>

          {item.message !== "" && (
            <span
              data-testid={`notification-snippet-${item.id}`}
              className="mt-1 block text-sm italic text-slate-500 dark:text-slate-400"
            >
              “{item.message}”
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

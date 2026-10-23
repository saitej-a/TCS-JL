/**
 * One §7.10 notification row (upgraded in Phase 1 Anti-Slop Overhaul):
 * Deep Cerulean (`brand-*`) unread markers and callout borders, Lucide SVG icons
 * replacing Material Symbols font ligatures, and flat 1px architectural rows.
 */
import type { ComponentType } from "react";
import {
  Bell,
  ExternalLink,
  MapPin,
  Megaphone,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";

import {
  NOTIFICATION_TYPE_LABELS,
  ROW_TREATMENTS,
  type RowAction,
} from "@/theme/notificationRows";
import type { NotificationItem } from "@/types/notifications";
import { timeAgoLong } from "@/utils/date";

export interface NotificationRowProps {
  item: NotificationItem;
  /** Row click: §7.10's mark-read-then-navigate, owned by the page. */
  onSelect: (item: NotificationItem) => void;
  /** The row's action button, whose target the page decides. */
  onAction: (item: NotificationItem) => void;
}

const GLYPH_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  forum: MessageSquare,
  thumb_up: ThumbsUp,
  campaign: Megaphone,
  pin_drop: MapPin,
};

export function NotificationRow({
  item,
  onSelect,
  onAction,
}: NotificationRowProps): React.ReactElement {
  const treatment = ROW_TREATMENTS[item.type];
  const action: RowAction | null = treatment.action;
  const read = item.is_read;
  const GlyphIcon = GLYPH_ICONS[treatment.glyph] ?? Bell;

  return (
    <article
      data-testid={`notification-row-${item.id}`}
      role="button"
      tabIndex={0}
      aria-label={`${NOTIFICATION_TYPE_LABELS[item.type]}: ${item.title}`}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
      className={`p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group ${
        read
          ? "bg-white opacity-85 hover:opacity-100 dark:bg-slate-900"
          : "bg-brand-50/25 border-l-2 border-l-brand-600 dark:bg-brand-950/30 dark:border-l-brand-400"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Leading status dot: filled + ringed when unread. */}
        <div className="pt-1.5 flex-shrink-0" title={read ? "Already read" : "Unread notification"}>
          <span
            data-testid={`marker-${read ? "read" : "unread"}-${item.id}`}
            className={
              read
                ? "h-2.5 w-2.5 rounded-full border border-slate-300 bg-transparent block dark:border-slate-600"
                : "h-2.5 w-2.5 rounded-full bg-brand-700 ring-4 ring-brand-100 block dark:bg-brand-400 dark:ring-brand-900/60"
            }
          />
        </div>

        {/* Tinted icon chip with Lucide SVG icon. */}
        <div data-testid={`notification-glyph-${item.id}`} className={treatment.chip}>
          <GlyphIcon className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {treatment.badge ? (
              <div className="flex items-center gap-1.5">
                <span className={treatment.label}>{NOTIFICATION_TYPE_LABELS[item.type]}</span>
              </div>
            ) : (
              <p className={treatment.label}>{NOTIFICATION_TYPE_LABELS[item.type]}</p>
            )}
            <time className="text-xs text-slate-400 whitespace-nowrap tabular-nums dark:text-slate-500">
              {timeAgoLong(item.created_at)}
            </time>
          </div>

          <div className={treatment.primary}>{item.title}</div>

          {item.message !== "" && treatment.body === "callout" && (
            <blockquote
              data-testid={`notification-snippet-${item.id}`}
              className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border-l-2 border-brand-600 mt-2 font-normal leading-relaxed dark:text-slate-300 dark:bg-slate-800 dark:border-brand-400"
            >
              {item.message}
            </blockquote>
          )}

          {item.message !== "" && treatment.body === "quote" && (
            <blockquote
              data-testid={`notification-snippet-${item.id}`}
              className="text-xs text-slate-500 italic mt-1.5 font-normal dark:text-slate-400"
            >
              {item.message}
            </blockquote>
          )}

          {item.message !== "" && treatment.body === "prose" && (
            <p
              data-testid={`notification-snippet-${item.id}`}
              className="text-xs text-slate-600 mt-1 leading-relaxed dark:text-slate-300"
            >
              {item.message}
            </p>
          )}

          {item.message !== "" && treatment.body === "meta" && (
            <p
              data-testid={`notification-snippet-${item.id}`}
              className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 dark:text-slate-400"
            >
              <TrendingUp className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span>{item.message}</span>
            </p>
          )}

          {action !== null && (
            <div className={treatment.body === "meta" ? "mt-3" : "mt-3 flex items-center gap-2"}>
              <button
                type="button"
                data-testid={`notification-action-${item.id}`}
                aria-label={`${action.label} — ${item.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onAction(item);
                }}
                className={action.className}
              >
                {action.glyph === "open_in_new" && (
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{action.label}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

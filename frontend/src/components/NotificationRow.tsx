/**
 * One §7.10 notification row, rebuilt to the `notification_center`
 * composition's markup **verbatim** (Phase 14 D-01): the classes, the nesting,
 * the Material Symbols ligatures and the per-kind tint are the document's — the
 * class maps live in `@/theme/notificationRows`.
 *
 * Field mapping (recorded — the mockup writes one sentence where the API ships
 * two): `title` is the server's headline and `message` the human sentence, and
 * each treatment puts them in the two content slots the composition draws —
 * headline in the primary line, message in the callout (rows 1/4), the meta line
 * (row 2) or the prose paragraph (rows 3/5). A message-less item drops the second
 * slot, exactly as the composition's own rows vary.
 *
 * Literal markup, not literal behaviour: the composition's affordances are React
 * (G-5). The row is clickable and keyboard-activatable (§7.10's
 * read-then-navigate lives in the page), and the per-kind action button is the
 * composition's own. `data-testid`/`aria-*` attributes are additive — no class or
 * element of the document changed to make this testable.
 */
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
  /** The composition's own action button, whose target the page decides. */
  onAction: (item: NotificationItem) => void;
}

export function NotificationRow({
  item,
  onSelect,
  onAction,
}: NotificationRowProps): React.ReactElement {
  const treatment = ROW_TREATMENTS[item.type];
  const action: RowAction | null = treatment.action;
  const read = item.is_read;

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
      className={`p-4 sm:p-5 hover:bg-slate-50/80 transition-colors cursor-pointer group ${
        read ? "bg-white opacity-85 hover:opacity-100" : "bg-indigo-50/20"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* The composition's leading status dot: filled + ringed when unread. */}
        <div className="pt-1.5 flex-shrink-0" title={read ? "Already read" : "Unread notification"}>
          <span
            data-testid={`marker-${read ? "read" : "unread"}-${item.id}`}
            className={
              read
                ? "h-2.5 w-2.5 rounded-full border border-slate-300 bg-transparent block"
                : "h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 block"
            }
          />
        </div>

        {/* The tinted icon chip — a Material Symbols ligature, not a component.
            `notification-snippet-*` marks the row's message line whichever of the
            document's four body shapes carries it. */}
        <div data-testid={`notification-glyph-${item.id}`} className={treatment.chip}>
          <span
            className="material-symbols-outlined text-[20px]"
            data-icon={treatment.glyph}
            aria-hidden="true"
          >
            {treatment.glyph}
          </span>
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
            <time className="text-xs text-slate-400 whitespace-nowrap">
              {timeAgoLong(item.created_at)}
            </time>
          </div>

          <div className={treatment.primary}>{item.title}</div>

          {item.message !== "" && treatment.body === "callout" && (
            <blockquote
              data-testid={`notification-snippet-${item.id}`}
              className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border-l-2 border-indigo-500 mt-2 font-normal leading-relaxed"
            >
              {item.message}
            </blockquote>
          )}

          {item.message !== "" && treatment.body === "quote" && (
            <blockquote
              data-testid={`notification-snippet-${item.id}`}
              className="text-xs text-slate-500 italic mt-1.5 font-normal"
            >
              {item.message}
            </blockquote>
          )}

          {item.message !== "" && treatment.body === "prose" && (
            <p
              data-testid={`notification-snippet-${item.id}`}
              className="text-xs text-slate-600 mt-1 leading-relaxed"
            >
              {item.message}
            </p>
          )}

          {item.message !== "" && treatment.body === "meta" && (
            <p
              data-testid={`notification-snippet-${item.id}`}
              className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"
            >
              <span
                className="material-symbols-outlined text-[14px] text-amber-500"
                data-icon="trending_up"
                aria-hidden="true"
              >
                trending_up
              </span>
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
                  // The row's own click must not also fire: this button is its own
                  // destination (the reminder's action goes to the timeline).
                  event.stopPropagation();
                  onAction(item);
                }}
                className={action.className}
              >
                {action.glyph !== undefined && (
                  <span
                    className="material-symbols-outlined text-[15px]"
                    data-icon={action.glyph}
                    aria-hidden="true"
                  >
                    {action.glyph}
                  </span>
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

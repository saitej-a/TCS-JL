/**
 * Chat Message Bubble Component (Phase 5 Anti-Slop Overhaul):
 * - Supports consecutive-author message grouping (`groupedWithPrev`) to eliminate
 *   repeated author headers on back-to-back messages from the same candidate;
 * - Crisp 1px borders, spring reply quotes (`--ease-out`), and `:active` press
 *   scaling on action buttons.
 */

import { Reply, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import { timeAgo } from "@/utils/date";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  groupedWithPrev?: boolean;
  onDelete?: (id: string) => void;
  onReply?: (message: ChatMessage) => void;
}

function formatDisplayName(value?: string | null) {
  if (!value || value === "Anonymous Candidate") return "Anonymous";
  return value;
}

export function MessageBubble({
  message,
  isOwn,
  groupedWithPrev = false,
  onDelete,
  onReply,
}: MessageBubbleProps) {
  const authorName = formatDisplayName(message.author.display_name);
  const cohort = [message.author.batch, message.author.hiring_type]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={`flex flex-col ${groupedWithPrev ? "mb-1.5" : "mb-3.5"} ${
        isOwn ? "items-end" : "items-start"
      }`}
      data-testid={`message-bubble-${message.id}`}
      data-grouped={groupedWithPrev ? "true" : undefined}
    >
      <div
        className={
          groupedWithPrev
            ? "sr-only"
            : "mb-1 flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400"
        }
      >
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {authorName}
        </span>
        {cohort && <span className="text-[11px] opacity-80">{cohort}</span>}
        <span aria-hidden="true">•</span>
        <time className="tabular-nums" dateTime={message.created_at}>
          {timeAgo(message.created_at)}
        </time>
      </div>

      <div className="group relative max-w-[85%] sm:max-w-lg">
        {message.reply_to && (
          <div
            className={`mb-1.5 rounded-lg border-l-2 bg-slate-100/80 px-3 py-1.5 text-xs transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-slate-800/60 ${
              isOwn
                ? "border-brand-700 text-brand-900 dark:border-brand-400 dark:text-brand-200"
                : "border-slate-400 text-slate-700 dark:border-slate-500 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <Reply className="h-3 w-3 rotate-180" aria-hidden="true" />
              <span>{formatDisplayName(message.reply_to.author.display_name)}</span>
            </div>
            <p className="line-clamp-1 truncate italic text-slate-500 dark:text-slate-400">
              {message.reply_to.body}
            </p>
          </div>
        )}

        {message.is_deleted ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-100 px-4 py-2.5 text-sm italic text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-500">
            {message.body}
          </div>
        ) : (
          <div
            className={`break-words whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
              isOwn
                ? "rounded-tr-sm border border-brand-200/80 bg-brand-50 text-brand-950 dark:border-brand-800/60 dark:bg-brand-950/50 dark:text-brand-100"
                : "rounded-tl-sm border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            }`}
          >
            {message.body}
          </div>
        )}

        {/* Message action buttons */}
        {!message.is_deleted && (
          <div
            className={`absolute top-1.5 flex items-center gap-1 ${
              isOwn
                ? "-left-16 flex-row-reverse sm:-left-16"
                : "-right-16 flex-row sm:-right-16"
            } opacity-80 transition-opacity duration-150 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100`}
          >
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full p-1.5 text-slate-400 transition-[background-color,color,transform] duration-150 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.96] dark:hover:bg-brand-950/30 dark:hover:text-brand-400"
                aria-label="Reply to message"
                title="Reply to message"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
            )}

            {message.can_delete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(message.id)}
                className="flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full p-1.5 text-slate-400 transition-[background-color,color,transform] duration-150 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.96] dark:hover:bg-rose-950/30"
                aria-label="Delete message"
                title="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

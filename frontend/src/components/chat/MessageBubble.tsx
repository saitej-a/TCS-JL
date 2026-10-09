/**
 * Chat Message Bubble Component (Phase 13 D-06, D-11, ui-ux-pro-max).
 */

import { Reply, Trash2 } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import { timeAgo } from "@/utils/date";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onDelete?: (id: string) => void;
  onReply?: (message: ChatMessage) => void;
}

function formatDisplayName(value?: string | null) {
  if (!value || value === "Anonymous Candidate") return "Anonymous";
  return value;
}

export function MessageBubble({ message, isOwn, onDelete, onReply }: MessageBubbleProps) {
  const authorName = formatDisplayName(message.author.display_name);
  const cohort = [message.author.batch, message.author.hiring_type]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={`flex flex-col mb-4 ${isOwn ? "items-end" : "items-start"}`}
      data-testid={`message-bubble-${message.id}`}
    >
      <div className="flex items-center gap-2 mb-1 px-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {authorName}
        </span>
        {cohort && <span className="text-[11px] opacity-80">{cohort}</span>}
        <span>•</span>
        <time dateTime={message.created_at}>{timeAgo(message.created_at)}</time>
      </div>

      <div className="relative group max-w-[85%] sm:max-w-lg">
        {message.reply_to && (
          <div
            className={`mb-1.5 px-3 py-1.5 rounded-xl text-xs border-l-2 bg-slate-100/80 dark:bg-slate-800/60 backdrop-blur ${
              isOwn
                ? "border-brand-500 text-brand-900 dark:text-brand-200"
                : "border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="font-semibold text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Reply className="w-3 h-3 rotate-180" />
              <span>{formatDisplayName(message.reply_to.author.display_name)}</span>
            </div>
            <p className="truncate line-clamp-1 italic text-slate-500 dark:text-slate-400">
              {message.reply_to.body}
            </p>
          </div>
        )}

        {message.is_deleted ? (
          <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 italic text-sm">
            {message.body}
          </div>
        ) : (
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
              isOwn
                ? "rounded-tr-sm bg-brand-50 border border-brand-200/80 text-brand-950 dark:bg-brand-950/50 dark:border-brand-800/60 dark:text-brand-100"
                : "rounded-tl-sm bg-white border border-slate-200/90 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            }`}
          >
            {message.body}
          </div>
        )}

        {/* Message action buttons */}
        {!message.is_deleted && (
          <div
            className={`absolute top-2 flex items-center gap-1 ${
              isOwn
                ? "-left-16 sm:-left-16 flex-row-reverse"
                : "-right-16 sm:-right-16 flex-row"
            } opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-all`}
          >
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="p-1.5 rounded-full text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 min-w-[28px] min-h-[28px] flex items-center justify-center transition-colors"
                aria-label="Reply to message"
                title="Reply to message"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            )}

            {message.can_delete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(message.id)}
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 min-w-[28px] min-h-[28px] flex items-center justify-center transition-colors"
                aria-label="Delete message"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

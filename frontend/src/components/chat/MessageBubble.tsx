/**
 * Chat Message Bubble Component (Phase 13 D-06, D-11, ui-ux-pro-max).
 */

import { Trash2 } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import { timeAgo } from "@/utils/date";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onDelete?: (id: string) => void;
}

export function MessageBubble({ message, isOwn, onDelete }: MessageBubbleProps) {
  const authorName = message.author.display_name || "Anonymous Candidate";
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

        {message.can_delete && !message.is_deleted && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            className="absolute top-2 -left-8 sm:-left-9 p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Delete message"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

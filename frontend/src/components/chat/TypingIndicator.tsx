/**
 * Typing Indicator with Wave Animation (Phase 15 Task 3, 15-UI-SPEC).
 *
 * Renders a polite status row above the composer when other room participants
 * are typing. Uses v2 brand token colors and handles motion reduction.
 */

import type { ChatTypingUser } from "@/types/chat";

export interface TypingIndicatorProps {
  users: ChatTypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (!users || users.length === 0) {
    return null;
  }

  let text = "";
  if (users.length === 1) {
    text = `${users[0].display_name} is typing\u2026`;
  } else if (users.length === 2) {
    text = `${users[0].display_name} and ${users[1].display_name} are typing\u2026`;
  } else {
    text = "Several people are typing\u2026";
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400"
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 animate-typing-wave motion-reduce:animate-none" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 animate-typing-wave motion-reduce:animate-none [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 animate-typing-wave motion-reduce:animate-none [animation-delay:300ms]" />
      </span>
      <span className="truncate max-w-[12rem]">{text}</span>
    </p>
  );
}

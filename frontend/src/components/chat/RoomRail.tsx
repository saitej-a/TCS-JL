/**
 * Chat Room Rail & Mobile Pills Component (Phase 13 D-09, D-11, ui-ux-pro-max).
 */

import { Hash, MessageCircle } from "lucide-react";
import type { ChatRoom } from "@/types/chat";

interface RoomRailProps {
  rooms: ChatRoom[];
  activeSlug: string;
  onSelectRoom: (slug: string) => void;
}

export function RoomRailDesktop({
  rooms,
  activeSlug,
  onSelectRoom,
}: RoomRailProps) {
  return (
    <aside
      className="hidden lg:flex flex-col w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 h-full shrink-0"
      aria-label="Chat channels"
    >
      <div className="flex items-center gap-2 px-3 py-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <MessageCircle className="w-3.5 h-3.5" />
        <span>Channels</span>
      </div>

      <nav className="flex flex-col gap-1 overflow-y-auto">
        {rooms.map((room) => {
          const isActive = room.slug === activeSlug;
          return (
            <button
              key={room.slug}
              type="button"
              onClick={() => onSelectRoom(room.slug)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Hash
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span className="truncate">{room.label}</span>
              </div>
              {room.message_count > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-brand-200/60 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200 font-semibold"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {room.message_count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function RoomPillsMobile({
  rooms,
  activeSlug,
  onSelectRoom,
}: RoomRailProps) {
  return (
    <div
      className="flex lg:hidden overflow-x-auto gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 scrollbar-none"
      aria-label="Channel tabs"
    >
      {rooms.map((room) => {
        const isActive = room.slug === activeSlug;
        return (
          <button
            key={room.slug}
            type="button"
            onClick={() => onSelectRoom(room.slug)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 min-h-[36px] ${
              isActive
                ? "bg-brand-600 text-white font-medium shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Hash className="w-3 h-3" />
            <span>{room.label}</span>
          </button>
        );
      })}
    </div>
  );
}

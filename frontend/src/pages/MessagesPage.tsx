/**
 * Messages View — Single common channel & category rooms (Phase 5 Anti-Slop Overhaul):
 * - `100dvh` mobile-safe flex layout (`h-[calc(100dvh-64px)]`);
 * - Consecutive-author message grouping (`groupedWithPrev`);
 * - Spring reply quotes (`--ease-out`) and zero `w-10 h-10` icon-in-tinted-square
 *   chrome boxes.
 */

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowDown,
  Hash,
  MessageCircle,
  Plus,
  Reply,
  Send,
  WifiOff,
  X,
} from "lucide-react";

import { createChatRoom, listChatRooms } from "@/api/chat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import {
  RoomPillsMobile,
  RoomRailDesktop,
} from "@/components/chat/RoomRail";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useAuth } from "@/context/AuthContext";
import { useChatRoom } from "@/hooks/useChatRoom";
import type { ChatMessage, ChatRoom } from "@/types/chat";

function formatDisplayName(value?: string | null) {
  if (!value || value === "Anonymous Candidate") return "Anonymous";
  return value;
}

export function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get("room") || "general";

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [inputBody, setInputBody] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isScrolledUp, setIsScrolledUp] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newRoomLabel, setNewRoomLabel] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);
  const isStaff = user?.is_staff === true;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    typingUsers,
    isDegraded,
    isLoading,
    hasMore,
    error,
    loadOlder,
    sendMessage,
    deleteMessage,
    notifyTyping,
  } = useChatRoom(activeSlug);

  // 1. Fetch available rooms
  useEffect(() => {
    let active = true;
    listChatRooms()
      .then((data) => {
        if (active) setRooms(data);
      })
      .catch(() => {
        if (active) {
          setRooms([
            {
              id: "fallback-general",
              slug: "general",
              label: "General",
              is_default: true,
              is_archived: false,
              message_count: 0,
              last_message_at: null,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const activeRoom = rooms.find((r) => r.slug === activeSlug) || {
    id: "active",
    slug: activeSlug,
    label: activeSlug.charAt(0).toUpperCase() + activeSlug.slice(1),
    is_default: activeSlug === "general",
    is_archived: false,
    message_count: 0,
    last_message_at: null,
    created_at: "",
  };

  const handleSelectRoom = (slug: string) => {
    setSearchParams({ room: slug });
  };

  const handleCreateRoom = async (event: FormEvent) => {
    event.preventDefault();
    if (!newRoomLabel.trim() || isCreatingRoom) return;

    setIsCreatingRoom(true);
    setCreateRoomError(null);
    try {
      const room = await createChatRoom(newRoomLabel.trim());
      setRooms((current) => [...current, room].sort((a, b) => a.slug.localeCompare(b.slug)));
      setNewRoomLabel("");
      setIsCreateOpen(false);
      handleSelectRoom(room.slug);
    } catch {
      setCreateRoomError("Could not create the channel. Check the name and try again.");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // 2. Auto-scroll logic
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView?.({ behavior });
  }, []);

  useEffect(() => {
    if (!isScrolledUp) {
      scrollToBottom("instant");
    }
  }, [messages, isScrolledUp, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrolledUp(distanceToBottom > 120);
  };

  // 3. Send message handler
  const handleSend = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputBody.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await sendMessage(trimmed, replyingTo?.id);
      setInputBody("");
      setReplyingTo(null);
      setIsScrolledUp(false);
      setTimeout(() => scrollToBottom("smooth"), 50);
    } catch {
      // Error handled by hook or display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      data-testid="messages-page"
      className="flex h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950"
    >
      {/* Mobile/Tablet Pill Navigation */}
      <RoomPillsMobile
        rooms={rooms}
        activeSlug={activeSlug}
        onSelectRoom={handleSelectRoom}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Rail */}
        <RoomRailDesktop
          rooms={rooms}
          activeSlug={activeSlug}
          onSelectRoom={handleSelectRoom}
        />

        {/* Chat Pane */}
        <main
          className="flex h-full flex-1 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          aria-label={`Chat channel: ${activeRoom.label}`}
        >
          {/* Channel Header — flat architectural header without icon-in-tinted-square box */}
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
            <div>
              <h1 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Hash
                  className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400"
                  aria-hidden="true"
                />
                <span>{activeRoom.label}</span>
                {activeRoom.is_default && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Default Channel
                  </span>
                )}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {activeRoom.slug === "general"
                  ? "Welcome to #General — open channel for all candidates."
                  : `Discussions and updates related to ${activeRoom.label}.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isStaff && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateRoomError(null);
                    setIsCreateOpen(true);
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-[background-color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create channel
                </button>
              )}
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isDegraded ? "animate-pulse bg-amber-500" : "bg-emerald-500"
                }`}
                title={isDegraded ? "Reconnecting..." : "Live updates active"}
              />
              <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
                {isDegraded ? "Reconnecting" : "Live"}
              </span>
            </div>
          </header>

          {isCreateOpen && isStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <form
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-chat-room-title"
                onSubmit={handleCreateRoom}
                className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div>
                  <h2
                    id="create-chat-room-title"
                    className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Create message channel
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    All members will be able to join this channel.
                  </p>
                </div>
                <label
                  htmlFor="new-chat-room-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Channel name
                </label>
                <input
                  id="new-chat-room-name"
                  autoFocus
                  maxLength={100}
                  value={newRoomLabel}
                  onChange={(event) => setNewRoomLabel(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
                {createRoomError && (
                  <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                    {createRoomError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="min-h-10 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newRoomLabel.trim() || isCreatingRoom}
                    className="min-h-10 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                  >
                    {isCreatingRoom ? "Creating…" : "Create channel"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Degraded Connection Banner */}
          {isDegraded && (
            <div
              className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
              role="status"
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>
                Live updates paused — reconnecting. Messages will send via backup.
              </span>
            </div>
          )}

          {/* Message Log */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="relative flex-1 space-y-1 overflow-y-auto px-4 py-4 sm:px-6 lg:pb-4"
            role="log"
            aria-live="polite"
            aria-label={`${activeRoom.label} messages`}
          >
            {hasMore && (
              <div className="mb-4 flex justify-center">
                <button
                  type="button"
                  onClick={loadOlder}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Load earlier messages
                </button>
              </div>
            )}

            {isLoading && messages.length === 0 ? (
              <div className="mx-auto max-w-lg space-y-4 py-8">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-12 w-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="flex items-start justify-end gap-3">
                  <div className="flex flex-1 flex-col items-end space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-10 w-56 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="mb-2 h-8 w-8 text-rose-500" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {error}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                <MessageCircle className="mb-3 h-6 w-6 text-slate-400" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No messages yet
                </p>
                <p className="mt-1 text-xs">
                  Start the conversation in #{activeRoom.label}.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const prev = index > 0 ? messages[index - 1] : undefined;
                const groupedWithPrev =
                  prev !== undefined &&
                  prev.author.id === msg.author.id &&
                  !prev.is_deleted &&
                  !msg.is_deleted;
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.author.id === user?.id}
                    groupedWithPrev={groupedWithPrev}
                    onDelete={deleteMessage}
                    onReply={(targetMsg) => setReplyingTo(targetMsg)}
                  />
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Jump to Bottom Button */}
          {isScrolledUp && (
            <button
              type="button"
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-24 right-8 z-10 flex min-h-[36px] items-center gap-1.5 rounded-full border border-brand-800 bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-brand-800 active:scale-[0.98]"
              aria-label="Jump to latest messages"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span>New messages</span>
            </button>
          )}

          {/* Composer Footer */}
          <footer className="fixed bottom-0 left-0 right-0 z-40 shrink-0 border-t border-slate-200 bg-white p-4 pb-[env(safe-area-inset-bottom,12px)] lg:relative lg:static dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto max-w-4xl">
              {replyingTo && (
                <div
                  className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 border-l-2 border-l-brand-700 bg-slate-50 px-3 py-2 text-xs transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] dark:border-slate-700 dark:border-l-brand-400 dark:bg-slate-800/80"
                  data-testid="reply-banner"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Reply className="h-3.5 w-3.5 shrink-0 rotate-180 text-brand-700 dark:text-brand-400" />
                    <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-300">
                      Replying to {formatDisplayName(replyingTo.author.display_name)}:
                    </span>
                    <span className="truncate italic text-slate-500 dark:text-slate-400">
                      {replyingTo.is_deleted ? "This message was removed." : replyingTo.body}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label="Cancel reply"
                    title="Cancel reply"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <TypingIndicator users={typingUsers} />
              <form onSubmit={handleSend}>
                <div className="relative flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 transition-[border-color,box-shadow] duration-150 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20 dark:border-slate-700/80 dark:bg-slate-800/80">
                  <textarea
                    value={inputBody}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputBody(val);
                      if (val.trim()) {
                        notifyTyping();
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${activeRoom.label}...`}
                    maxLength={2000}
                    rows={2}
                    className="max-h-36 min-h-[48px] w-full resize-none border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
                    aria-label={`Message #${activeRoom.label}`}
                  />
                  <button
                    type="submit"
                    disabled={!inputBody.trim() || isSubmitting}
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg bg-brand-700 p-3 text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-brand-700"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-slate-400">
                  <span className="hidden sm:inline">
                    Press{" "}
                    <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">
                      Enter
                    </kbd>{" "}
                    to send,{" "}
                    <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800">
                      Shift+Enter
                    </kbd>{" "}
                    for newline
                  </span>
                  <span className="ml-auto tabular-nums">{inputBody.length}/2000</span>
                </div>
              </form>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

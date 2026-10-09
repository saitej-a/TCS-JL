/**
 * Messages View — Single common channel & category rooms (Phase 13 D-01, D-08, D-11, ui-ux-pro-max).
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
        // Fallback room if API fails
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
    <div className="flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
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
          className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-hidden"
          aria-label={`Chat channel: ${activeRoom.label}`}
        >
          {/* Channel Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {activeRoom.label}
                  {activeRoom.is_default && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      Default Channel
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeRoom.slug === "general"
                    ? "Welcome to #General — open channel for all candidates."
                    : `Discussions and updates related to ${activeRoom.label}.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isStaff && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateRoomError(null);
                    setIsCreateOpen(true);
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create channel
                </button>
              )}
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isDegraded
                    ? "bg-amber-500 animate-pulse"
                    : "bg-emerald-500"
                }`}
                title={isDegraded ? "Reconnecting..." : "Live updates active"}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
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
                className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
              >
                <div>
                  <h2 id="create-chat-room-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Create message channel
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    All members will be able to join this channel.
                  </p>
                </div>
                <label htmlFor="new-chat-room-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Channel name
                </label>
                <input
                  id="new-chat-room-name"
                  autoFocus
                  maxLength={100}
                  value={newRoomLabel}
                  onChange={(event) => setNewRoomLabel(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
                {createRoomError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{createRoomError}</p>}
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
                    className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
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
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs shrink-0"
              role="status"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>
                Live updates paused — reconnecting. Messages will send via backup.
              </span>
            </div>
          )}

          {/* Message Log */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-28 lg:pb-4 space-y-2 relative"
            role="log"
            aria-live="polite"
            aria-label={`${activeRoom.label} messages`}
          >
            {hasMore && (
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={loadOlder}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Load earlier messages
                </button>
              </div>
            )}

            {isLoading && messages.length === 0 ? (
              <div className="space-y-4 py-8 max-w-lg mx-auto">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="w-64 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                  </div>
                </div>
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 space-y-2 flex flex-col items-end">
                    <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="w-56 h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {error}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No messages yet
                </p>
                <p className="text-xs mt-1">
                  Start the conversation in #{activeRoom.label}.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.author.id === user?.id}
                  onDelete={deleteMessage}
                  onReply={(targetMsg) => setReplyingTo(targetMsg)}
                />
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Jump to Bottom Button */}
          {isScrolledUp && (
            <button
              type="button"
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-24 right-8 px-3 py-2 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-all flex items-center gap-1.5 text-xs font-semibold z-10 min-h-[36px]"
              aria-label="Jump to latest messages"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>New messages</span>
            </button>
          )}

          {/* Composer Footer */}
          <footer className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 fixed bottom-0 left-0 right-0 z-40 lg:static lg:relative pb-[env(safe-area-inset-bottom,12px)]">
            <div className="max-w-4xl mx-auto">
              {replyingTo && (
                <div
                  className="mb-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  data-testid="reply-banner"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Reply className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0 rotate-180" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                      Replying to {replyingTo.author.display_name || "Anonymous Candidate"}:
                    </span>
                    <span className="truncate italic text-slate-500 dark:text-slate-400">
                      {replyingTo.is_deleted ? "This message was removed." : replyingTo.body}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                    aria-label="Cancel reply"
                    title="Cancel reply"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <TypingIndicator users={typingUsers} />
              <form onSubmit={handleSend}>
                <div className="relative flex items-end gap-2 p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
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
                    className="w-full px-3 py-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-h-[48px] max-h-36"
                    aria-label={`Message #${activeRoom.label}`}
                  />
                  <button
                    type="submit"
                    disabled={!inputBody.trim() || isSubmitting}
                    className="p-3 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 transition-colors shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 px-2 text-[11px] text-slate-400">
                  <span className="hidden sm:inline">
                    Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Enter</kbd> to send, <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Shift+Enter</kbd> for newline
                  </span>
                  <span className="ml-auto">
                    {inputBody.length}/2000
                  </span>
                </div>
              </form>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

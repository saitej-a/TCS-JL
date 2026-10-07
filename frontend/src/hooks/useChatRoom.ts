/**
 * Real-time Chat Room Hook (Phase 13 D-04, D-05, D-08).
 *
 * Manages WebSocket connection, single-use ticket acquisition,
 * message streaming, deduplication, reconnect sync, and silent REST fallback.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteChatMessage,
  fetchWsTicket,
  listChatMessages,
  sendChatMessage,
} from "@/api/chat";
import { API_BASE_URL } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { ChatMessage, ChatTypingUser, ChatWsFrame } from "@/types/chat";

export const TYPING_THROTTLE_MS = 2000;

export type ChatConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface UseChatRoomResult {
  messages: ChatMessage[];
  typingUsers: ChatTypingUser[];
  status: ChatConnectionStatus;
  isDegraded: boolean;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadOlder: () => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  notifyTyping: () => void;
}

export function useChatRoom(roomSlug: string, overrideUserId?: string): UseChatRoomResult {
  const { user } = useAuth();
  const currentUserId = overrideUserId || user?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<ChatTypingUser[]>([]);
  const [status, setStatus] = useState<ChatConnectionStatus>("connecting");
  const [isDegraded, setIsDegraded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const historyRequestRef = useRef<number>(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const lastTypingSentRef = useRef<number>(0);

  // 1. Load initial history via REST
  const loadInitialHistory = useCallback(async () => {
    const requestId = ++historyRequestRef.current;
    setIsLoading(true);
    setError(null);
    setMessages([]);
    messagesRef.current = [];
    setHasMore(false);
    try {
      const data = await listChatMessages(roomSlug);
      if (isMountedRef.current && requestId === historyRequestRef.current) {
        // Wire returns newest first; reverse so log displays chronologically (oldest top, newest bottom)
        const chronological = [...data.results].reverse();
        setMessages(chronological);
        setHasMore(data.has_more);
      }
    } catch (err: unknown) {
      if (isMountedRef.current && requestId === historyRequestRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      }
    } finally {
      if (isMountedRef.current && requestId === historyRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, [roomSlug]);

  // 2. Connect WebSocket with ticket. The connection lifecycle is scoped to this
  //    effect: when the room changes, the previous socket's handlers are detached
  //    before it is closed, so a late close event can never flip this room's
  //    status to "paused" or schedule a reconnect against the room we left.
  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;

    const connect = async () => {
      try {
        const { ticket } = await fetchWsTicket();
        if (cancelled) return;

        const wsUrl = new URL(`/ws/chat/${roomSlug}/`, API_BASE_URL || window.location.origin);
        wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
        wsUrl.searchParams.set("ticket", ticket);

        const ws = new WebSocket(wsUrl.toString());
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          setStatus("connected");
          setIsDegraded(false);
          reconnectAttempt = 0;

          // If we have messages, sync any newer ones that arrived while connecting/reconnecting
          const latest = messagesRef.current[messagesRef.current.length - 1];
          if (latest) {
            ws.send(JSON.stringify({ action: "sync", after: latest.created_at }));
          }
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const frame: ChatWsFrame = JSON.parse(event.data);

            if (frame.type === "chat.message") {
              setMessages((prev) => {
                if (prev.some((m) => m.id === frame.message.id)) {
                  return prev;
                }
                return [...prev, frame.message];
              });
            } else if (frame.type === "chat.message_deleted") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === frame.message_id
                    ? {
                        ...m,
                        is_deleted: true,
                        body: "This message was removed.",
                      }
                    : m,
                ),
              );
            } else if (frame.type === "chat.replay") {
              setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const newItems = frame.messages.filter(
                  (m) => !existingIds.has(m.id),
                );
                if (newItems.length === 0) return prev;
                return [...prev, ...newItems];
              });
            } else if (frame.type === "chat.typing") {
              if (frame.user.id === currentUserId) return;
              if (frame.is_typing) {
                setTypingUsers((prev) => {
                  const existingIdx = prev.findIndex((u) => u.id === frame.user.id);
                  const item: ChatTypingUser = {
                    id: frame.user.id,
                    display_name: frame.user.display_name,
                    expires_at: frame.expires_at,
                  };
                  if (existingIdx >= 0) {
                    const next = [...prev];
                    next[existingIdx] = item;
                    return next;
                  }
                  return [...prev, item];
                });
              } else {
                setTypingUsers((prev) => prev.filter((u) => u.id !== frame.user.id));
              }
            }
          } catch {
            // Ignore malformed frames
          }
        };

        ws.onerror = () => {
          if (cancelled) return;
          setStatus("error");
          setIsDegraded(true);
        };

        ws.onclose = (event) => {
          if (cancelled) return;
          setStatus("disconnected");
          setIsDegraded(true);

          // Reconnect with exponential backoff if not closed cleanly
          if (event.code !== 1000 && event.code !== 4401 && event.code !== 4404) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 15000);
            reconnectAttempt += 1;
            reconnectTimeout = setTimeout(() => {
              if (!cancelled) {
                connect();
              }
            }, delay);
          }
        };
      } catch {
        if (cancelled) return;
        setStatus("disconnected");
        setIsDegraded(true);
      }
    };

    setStatus("connecting");
    setTypingUsers([]);
    loadInitialHistory();
    connect();

    const expiryInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const active = prev.filter((u) => {
          const expMs = Date.parse(u.expires_at);
          return isNaN(expMs) ? false : expMs > now;
        });
        if (active.length === prev.length) return prev;
        return active;
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(expiryInterval);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close(1000);
      }
    };
  }, [roomSlug, loadInitialHistory, currentUserId]);

  // 3. Send message via WS or REST fallback
  const sendMessage = useCallback(
    async (body: string) => {
      const cleanBody = body.trim();
      if (!cleanBody) return;

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "send", body: cleanBody }));
        ws.send(JSON.stringify({ action: "typing", is_typing: false }));
      } else {
        // Fallback to REST POST
        const sent = await sendChatMessage(roomSlug, cleanBody);
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
      }
    },
    [roomSlug],
  );

  // 4. Notify typing with throttle
  const notifyTyping = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    ws.send(JSON.stringify({ action: "typing", is_typing: true }));
  }, []);

  // 4. Delete message via WS or REST fallback
  const deleteMessage = useCallback(
    async (messageId: string) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "delete", message_id: messageId }));
      } else {
        await deleteChatMessage(messageId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, is_deleted: true, body: "This message was removed." }
              : m,
          ),
        );
      }
    },
    [],
  );

  // 5. Load older messages (pagination)
  const loadOlder = useCallback(async () => {
    if (!hasMore || messages.length === 0) return;
    const oldest = messages[0];
    const requestId = historyRequestRef.current;
    try {
      const data = await listChatMessages(roomSlug, oldest.created_at);
      if (isMountedRef.current && requestId === historyRequestRef.current) {
        const older = [...data.results].reverse();
        setMessages((prev) => [...older, ...prev]);
        setHasMore(data.has_more);
      }
    } catch {
      // Failure to load older is non-fatal
    }
  }, [hasMore, messages, roomSlug]);

  return {
    messages,
    typingUsers,
    status,
    isDegraded,
    isLoading,
    hasMore,
    error,
    loadOlder,
    sendMessage,
    deleteMessage,
    notifyTyping,
  };
}

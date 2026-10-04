/**
 * Chat API client module (Phase 13 D-03, D-05).
 */
import { apiGet, apiPost } from "@/api/client";
import type {
  ChatMessage,
  ChatMessageListResponse,
  ChatRoom,
  ChatWsTicketResponse,
} from "@/types/chat";

export async function listChatRooms(): Promise<ChatRoom[]> {
  return apiGet<ChatRoom[]>("/chat/rooms/");
}

export async function listChatMessages(
  slug: string,
  before?: string,
): Promise<ChatMessageListResponse> {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return apiGet<ChatMessageListResponse>(`/chat/rooms/${slug}/messages/${query}`);
}

export async function sendChatMessage(
  slug: string,
  body: string,
): Promise<ChatMessage> {
  return apiPost<ChatMessage>(`/chat/rooms/${slug}/messages/`, { body });
}

export async function deleteChatMessage(id: string): Promise<ChatMessage> {
  return apiPost<ChatMessage>(`/chat/messages/${id}/delete/`);
}

export async function fetchWsTicket(): Promise<ChatWsTicketResponse> {
  return apiPost<ChatWsTicketResponse>("/chat/ws-ticket/");
}

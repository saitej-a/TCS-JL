/**
 * Chat API client module (Phase 13 D-03, D-05).
 */
import { apiGet, apiPost } from "@/api/client";
import type { Paginated } from "@/types/api";
import type {
  AdminMember,
  ChatMessage,
  ChatMessageListResponse,
  ChatRoom,
  ChatWsTicketResponse,
} from "@/types/chat";

export async function listChatRooms(): Promise<ChatRoom[]> {
  return apiGet<ChatRoom[]>("/chat/rooms/");
}

export function createChatRoom(label: string): Promise<ChatRoom> {
  return apiPost<ChatRoom>("/chat/rooms/", { label });
}

export function listAdminMembers(page = 1): Promise<Paginated<AdminMember>> {
  return apiGet<Paginated<AdminMember>>(`/chat/admin/members/?page=${page}`);
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
  reply_to_id?: string,
): Promise<ChatMessage> {
  const payload: { body: string; reply_to_id?: string } = { body };
  if (reply_to_id) {
    payload.reply_to_id = reply_to_id;
  }
  return apiPost<ChatMessage>(`/chat/rooms/${slug}/messages/`, payload);
}

export async function deleteChatMessage(id: string): Promise<ChatMessage> {
  return apiPost<ChatMessage>(`/chat/messages/${id}/delete/`);
}

export async function fetchWsTicket(): Promise<ChatWsTicketResponse> {
  return apiPost<ChatWsTicketResponse>("/chat/ws-ticket/");
}

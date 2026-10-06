/**
 * Chat domain types (Phase 13 D-02, D-03).
 */

export interface ChatRoom {
  id: string;
  slug: string;
  label: string;
  is_default: boolean;
  is_archived: boolean;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface AdminMember {
  id: string;
  email: string;
  display_name: string;
  batch: string | null;
  hiring_type: string | null;
  region: string | null;
  current_status: string | null;
}

export interface ChatAuthor {
  id: string;
  display_name: string;
  batch: string | null;
  hiring_type: string | null;
  region: string | null;
  avatar_seed?: number;
}

export interface ChatMessage {
  id: string;
  room: string;
  room_slug: string;
  author: ChatAuthor;
  body: string;
  is_deleted: boolean;
  created_at: string;
  can_delete: boolean;
}

export interface ChatWsTicketResponse {
  ticket: string;
  expires_at: string;
}

export interface ChatMessageListResponse {
  results: ChatMessage[];
  has_more: boolean;
}

export interface ChatTypingUser {
  id: string;
  display_name: string;
  expires_at: string;
}

export type ChatWsFrame =
  | { type: "chat.joined"; room: string }
  | { type: "chat.message"; message: ChatMessage }
  | { type: "chat.message_deleted"; message_id: string }
  | { type: "chat.replay"; messages: ChatMessage[] }
  | { type: "chat.error"; error: { code: string; message: string } }
  | {
      type: "chat.typing";
      room: string;
      room_slug?: string;
      user: { id: string; display_name: string };
      is_typing: boolean;
      expires_at: string;
    };

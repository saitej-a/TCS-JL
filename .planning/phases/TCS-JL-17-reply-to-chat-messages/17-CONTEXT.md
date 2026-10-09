# Phase 17: Reply to Chat Messages Context

## Overview
Phase 17 introduces the ability for candidates and moderators to reply to existing messages in chat channels (CHAT-04). This allows threaded conversational context without leaving the real-time stream.

## Key Design Decisions
1. **Schema & Foreign Key**: `ChatMessage.reply_to` is a self-referential `ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies")`. If a parent message is soft-deleted or removed, replies retain their reference but show tombstone preview text ("This message was removed.").
2. **Channel Isolation**: A reply cannot reference a message in a different channel. `send_message()` service enforces `reply_to.room_id == room.id`, raising `InvalidMessageError(code="invalid_reply_target")`.
3. **Transport Agnostic**: Both WebSocket frames (`{ "action": "send", "body": "...", "reply_to_id": "..." }`) and REST fallback (`POST /api/v1/chat/rooms/:slug/messages/` with `{ body, reply_to_id }`) accept the reply reference.
4. **UI & Accessibility**:
   - Quoted preview is rendered above the child message bubble with the parent author's name and truncated snippet.
   - Composer displays a dismissible reply banner above the input when replying to a message.
   - Reply button on each message bubble triggers quoting.

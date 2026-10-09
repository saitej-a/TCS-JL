# Phase 17-01 Summary: Reply to Chat Messages

## Outcomes
- **Backend Schema & Services**:
  - Added self-referential `reply_to` on `ChatMessage` with migration `0002_chatmessage_reply_to.py`.
  - Added `ChatMessageReplySummarySerializer` to safely expose parent message snippet without leaking internal sensitive fields.
  - Added cross-channel validation in `apps/chat/services.py:send_message`.
  - Integrated `reply_to_id` in `ChatMessageListCreateView` and Channels `ChatConsumer`.
  - Added backend tests for services, REST API, and WebSocket consumer.
- **Frontend Real-time & UI**:
  - Updated `types/chat.ts` with `ChatMessageReplySummary` and `reply_to` on `ChatMessage`.
  - Updated `useChatRoom` and `sendChatMessage` to send `reply_to_id` across WebSockets and REST fallback.
  - Updated `MessageBubble` to render a quote preview badge and a reply action button.
  - Updated `MessagesPage` with interactive reply bar above the composer with cancel button.
  - Added full test coverage in `MessageBubble.test.tsx` and `MessagesPage.test.tsx`.

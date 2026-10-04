---
phase: 15-fix-real-time-chat-and-add-a-typing-wave-indicator
plan: 15-02
subsystem: ui-and-backend
tags: [channels, websockets, typing-indicator, presence, tailwind, react, vitest, redis]

# Dependency graph
requires:
  - phase: 15-01
    provides: the verified live ASGI transport, daphne service, nginx proxying, and scripts/ws_live_probe.py harness
provides:
  - "Server-authoritative, room-scoped typing presence in ChatConsumer with 6s Redis TTL and 1.5s throttle"
  - "Sender exclusion in chat_typing broadcast and defensive client filtering by current user ID"
  - "Automatic presence clearing on message send and abrupt disconnect"
  - "ChatWsFrame typing union member and ChatTypingUser type definition"
  - "useChatRoom hook returning typingUsers and notifyTyping with 2000ms throttle and 1s auto-expiry sweeping"
  - "--animate-typing-wave token and @keyframes typing-wave inside index.css @theme block"
  - "TypingIndicator component rendering staggered 3-dot wave animation with polite status announcements"
  - "Full unit tests in test_ws_typing.py, TypingIndicator.test.tsx, MessagesPage.test.tsx and live probe coverage"
affects: [chat, messages-page]

# Actuals
actuals:
  tasks: 3
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-authoritative presence: typing writes only to Redis TTL keys, no DB rows, identity strictly extracted from authenticated session"
    - "Three-layer clear guarantee: explicit stop event on send/disconnect, server-side 6s Redis TTL, and 1s client-side sweep"
    - "Wave animation token: declared in Tailwind v4 CSS-first @theme block with motion-reduce:animate-none accessibility guard"

key-files:
  created:
    - apps/chat/tests/test_ws_typing.py
    - frontend/src/components/chat/TypingIndicator.tsx
    - frontend/src/components/chat/TypingIndicator.test.tsx
    - .planning/phases/TCS-JL-15-fix-real-time-chat-and-add-a-typing-wave-indicator/15-02-SUMMARY.md
  modified:
    - apps/chat/consumers.py
    - frontend/src/types/chat.ts
    - frontend/src/hooks/useChatRoom.ts
    - frontend/src/index.css
    - frontend/src/pages/MessagesPage.tsx
    - frontend/src/pages/MessagesPage.test.tsx
    - scripts/ws_live_probe.py
---

# Plan 15-02 Summary: Real-Time Typing Presence & Wave Indicator

## What Was Done

1. **Backend Typing Presence (Task 1):**
   - Added `TYPING_TTL_SECONDS = 6` and `TYPING_MIN_INTERVAL_SECONDS = 1.5` constants to `apps/chat/consumers.py`.
   - Implemented `action: "typing"` in `receive_json` with 1.5s per-connection throttle and `database_sync_to_async`-wrapped Redis cache writes (`chat_typing:{room_slug}:{user_id}`).
   - Derives `display_name` through `CommunityAuthorSerializer` and broadcasts `chat_typing` group event with future UTC `expires_at`.
   - Implemented `chat_typing` group handler that excludes `self.channel_name` so the sender never receives their own typing broadcast.
   - Clears presence immediately on successful message send and on WebSocket disconnect.
   - Created `apps/chat/tests/test_ws_typing.py` with 6 test cases verifying broadcast, sender exclusion, throttle, Redis TTL, send/disconnect cleanup, and zero database writes.

2. **Frontend Transport & Expiry State (Task 2):**
   - Extended `ChatWsFrame` union with `chat.typing` frame and exported `ChatTypingUser` interface in `frontend/src/types/chat.ts`.
   - Updated `frontend/src/hooks/useChatRoom.ts` to return `typingUsers: ChatTypingUser[]` and `notifyTyping: () => void`.
   - Added 2000ms client throttle (`TYPING_THROTTLE_MS`) for `notifyTyping` and an additive 1-second interval sweeping expired typists.
   - Emits `is_typing: false` on message send so peers immediately hide the typing indicator without waiting for TTL.
   - Ignores typing frames where `user.id === currentUserId` for defence-in-depth against self-echo.

3. **Wave Indicator & Composer Integration (Task 3):**
   - Declared `--animate-typing-wave` and `@keyframes typing-wave` inside `@theme` in `frontend/src/index.css` (opacity 0.35 → 1 → 0.35, 0 → -2px → 0 lift).
   - Created `frontend/src/components/chat/TypingIndicator.tsx` returning a `<p role="status" aria-live="polite">` row with three staggered dots (`bg-brand-500 dark:bg-brand-400`, `[animation-delay:150ms]`, `[animation-delay:300ms]`, `motion-reduce:animate-none`) and truncated caption text.
   - Wired `TypingIndicator` into `frontend/src/pages/MessagesPage.tsx` above the composer form inside `footer .max-w-4xl.mx-auto`, triggering `notifyTyping` only on non-blank input changes.
   - Extended `scripts/ws_live_probe.py` with a `typing` check asserting start frame with future expiry, sender exclusion, and clearance latency on send.
   - Added unit test suites `TypingIndicator.test.tsx` and extended `MessagesPage.test.tsx` with 5 new presence tests (17 tests total in test file).

## Recorded Decisions

- **D-15-04:** Superseded `13-UI-SPEC.md`'s rejected typing indicator note specifically for in-room channel typing presence, fulfilling the user's explicit request for wave-style animation in channel chat.

## Verification

```bash
# Pytest (42 passed)
docker compose exec -T web python -m pytest apps/chat -q

# Frontend Vitest (301 tests across 52 test files, 100% green)
cd frontend && npx vitest run

# TypeScript typecheck
cd frontend && npm run typecheck

# ESLint clean on modified files
cd frontend && npx eslint src/components/chat/TypingIndicator.tsx src/hooks/useChatRoom.ts src/pages/MessagesPage.tsx

# Live end-to-end probe through Nginx (all 5 checks passed)
docker compose exec -T web python scripts/ws_live_probe.py
# -> [probe] handshake PASS both sockets joined room general
# -> [probe] delivery PASS message received within 0.012s
# -> [probe] typing PASS typing frame observed for Anonymous Candidate with future expiry; sender excluded; cleared on send in 0.014s
# -> [probe] idle PASS both sockets survived 75s idle period
# -> [probe] auth PASS consumed ticket rejected
```

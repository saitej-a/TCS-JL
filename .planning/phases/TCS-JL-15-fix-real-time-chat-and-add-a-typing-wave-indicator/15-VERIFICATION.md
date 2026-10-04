---
phase: 15-fix-real-time-chat-and-add-a-typing-wave-indicator
verified: 2026-10-04
status: passed
---

# VERIFICATION 15 — Fix real-time chat and add a typing wave indicator

**Phase:** 15 · **Verified:** 2026-10-04 · **Plans:** `15-01-PLAN.md` (infra/transport) & `15-02-PLAN.md` (typing presence & wave indicator)
**Requirements:** CHAT-01 (real-time chat channel delivery), CHAT-03 (typing wave indicator)
**Goal (ROADMAP 15):** Fix real-time message delivery across ASGI, nginx, daphne, redis and postgres, and introduce server-authoritative typing presence with wave animation above composer.
**Verdict:** ✅ **PASS** — all must-haves re-derived green across both plans, backed by live network probe evidence cross-process and cross-proxy.

---

## 1. Re-derived Evidence Sources

| Source | Command | Result (verbatim) |
|---|---|---|
| Nginx WS upgrade | `curl -isS -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' http://localhost/ws/chat/general/` | `HTTP/1.1 403 Access denied` (Channels rejection, proving `/ws/` served by Daphne ASGI, not WSGI 404) |
| Backend chat tests | `docker compose exec -T web python -m pytest apps/chat -q` | `42 passed in 26.49s` (consumer, typing, rest, services, models) |
| Frontend test suite | `cd frontend && npx vitest run` | `Test Files 52 passed (52)` / `Tests 301 passed (301)` |
| Frontend typecheck | `cd frontend && npm run typecheck` (`tsc --noEmit`) | clean (exit code 0, no errors) |
| Frontend lint | `cd frontend && npx eslint src/components/chat/TypingIndicator.tsx src/hooks/useChatRoom.ts src/pages/MessagesPage.tsx` | clean (exit code 0, 0 errors, 0 warnings) |
| Live network probe | `docker compose exec -T web python scripts/ws_live_probe.py` | `handshake PASS`, `delivery PASS (0.012s)`, `typing PASS (0.014s)`, `idle PASS (75s survival)`, `auth PASS (consumed ticket rejected)` |

---

## 2. Must-Haves Verification Matrix

| # | Must-Have Truth | Status | Evidence |
|---|---|---|---|
| 1 | F-1: `/ws/` served by ASGI daphne process on `config.asgi:application` | ✅ PASS | Curl returns 403 Access denied from Channels; `docker compose ps` shows `asgi` healthy |
| 2 | F-2: Authenticated idle WebSocket survives 75s through Nginx without cull | ✅ PASS | `[probe] idle PASS both sockets survived 75s idle period` with `proxy_read_timeout 3600s;` |
| 3 | F-3: WebSocket router wrapped in `AllowedHostsOriginValidator` | ✅ PASS | Disallowed origins rejected with connection refusal in unit test `test_connect_disallowed_origin_rejected` |
| 4 | F-6: Backend test suite runnable in container | ✅ PASS | `pytest 8.4.2` + `websockets==17.2` pinned in `requirements-dev.txt`, 42 tests passing |
| 5 | Cross-process real-time delivery | ✅ PASS | `[probe] delivery PASS message received within 0.012s` over real WebSocket network client |
| 6 | Typing presence server-authoritative & room-scoped | ✅ PASS | Redis TTL key `chat_typing:{room_slug}:{user_id}`, `apps/chat/tests/test_ws_typing.py` (6 passed) |
| 7 | Sender exclusion | ✅ PASS | Typist channel excluded from `chat_typing` broadcast; client filters own user ID |
| 8 | Presence cannot stick | ✅ PASS | Cleared on send, on disconnect, on 6s Redis TTL, and on 1s client sweep |
| 9 | Wave indicator token & animation | ✅ PASS | `--animate-typing-wave` & `@keyframes typing-wave` in `index.css`, `motion-reduce:animate-none` |
| 10 | 4-branch copy contract | ✅ PASS | 1 user (`Priya is typing…`), 2 (`Priya and Sam are typing…`), 3+ (`Several people are typing…`), 0 (null) |

---

## 3. Human Verification Items (UAT)

The following items are subjective/visual verification points for manual verification:

1. **Wave animation visual feel:** Open `/messages` in light and dark mode; verify the 3 dots render with staggered cadence and legible slate text.
2. **Reduced motion compliance:** Enable OS reduced-motion preference; verify wave animation is suppressed while dots and text remain visible.
3. **Multi-user presence:** Open two browsers as distinct candidates on `#General`; typing in one displays the wave indicator on the other, never on the typing user's screen.

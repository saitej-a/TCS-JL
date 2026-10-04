# Phase 13 — Context: Message in a single common channel

**Gathered:** 2026-09-30 · **Scope confirmed with the user:** full-stack (backend + API + UI),
one global room shared by all users **plus** per-category rooms, WebSocket realtime via
Django Channels.

This file stores the decisions the plan and executor build on. The discussion log (below)
holds the alternatives that lost.

---

## D-01 — Net-new feature; the MVP deferrals are superseded, recorded not silent

`01_PRODUCT_REQUIREMENTS.md` §879–880 marks "Private messaging" and "Global real-time chat"
as ✗ deferred (§967–968 lists them as future enhancements; §1003 states the MVP prioritizes
core over "real-time community chat"). No chat/messaging code, spec section, or DB design
exists anywhere. This phase **supersedes the deferral in the narrow scope recorded here —
a single shared channel, not private messaging** — and the supersession must be written
where the deferral lives:

- `01_PRODUCT_REQUIREMENTS.md` §879–880, §967–968, §1003 — the ✗ chat deferral line gains a
  dated note: *"Single shared-channel messaging shipped in Phase 13 (global room + per-category
  rooms, no private messaging, no DMs)."* Private messaging stays deferred.
- `03_DATABASE_DESIGN.md` gains a ChatMessage entity section (03 documents every shipped
  model; leaving it out would make the docs lie).
- `04_API_SPECIFICATION.md` gains the chat REST endpoints + WS wire contract.
- `05_UI_UX_SPECIFICATION.md` gains the Messages screen section.
- `.planning/REQUIREMENTS.md` gains CHAT-01 (and CHAT-02 for the deferral boundary).

**Not in scope (recorded as the deferral's surviving half):** private DMs, 1:1 chat,
typing indicators beyond the shipped presence surface, message editing beyond the
delete-tombstone, E2E encryption, threading inside a room.

## D-02 — One app, one model, rooms are rows: `ChatRoom` + `ChatMessage`

New app `apps/chat/` (matches the existing app layout: models/services/serializers/views/
urls/tests). Two models, mirroring the Post/Comment shape:

- **`ChatRoom`** — `id` UUID pk, `slug` (unique, CharField 40, lowercase), `label`,
  `is_default` bool, `is_archived` bool. Seeded by the same settings-driven mechanism as
  `POST_CATEGORIES`: `CHAT_ROOMS` in `config/settings/base.py` defines `[("general", "General"), ...]`
  derived from `POST_CATEGORIES` + the `GENERAL` global room. A management command/sync
  function ensures rows exist at startup (analogous to how the categories validator reads the
  setting at call time — no room row is ever referenced by a stale settings snapshot).
- **`ChatMessage`** — `id` UUID pk, `room` FK→ChatRoom (`PROTECT`, related_name=`messages`),
  `author` FK→`settings.AUTH_USER_MODEL` (`PROTECT` — the 5.1 D2 author-policy precedent:
  anonymized rows are the tombstone), `body` TextField (validated ≤ 2000 chars, not blank),
  `is_deleted` bool (soft-delete tombstone like Post), `edited_at` DateTimeField null (the
  **only** mutable field — see D-06), `created_at` auto_now_add.

Indexes: `("room", "-created_at")` named `idx_chatmsg_room_created` (the room-history read
is the whole product), `("author", "created_at")`. Meta ordering `["-created_at"]`.

Anti-spam follows the moderation stack, in order: `validate_not_blank` + length validator on
`body` (mirrors community `validate_not_blank`/`validate_title_length`), a
`MESSAGE_DUPLICATE_WINDOW` (default 10s) per-author debounce in cache (the
`DUPLICATE_POST_WINDOW` 8.1 D6 precedent, cache-keyed by author+body hash), and the same
error envelope `{error:{code,message}}` with code `duplicate_message`.

## D-03 — REST: list rooms, paginated history, POST send (the non-WS fallback contract)

Under `/api/v1/chat/` (URLConf included by `config/urls.py` like every other app):

| Endpoint | Method | Auth | Notes |
|---|---|---|---|
| `/chat/rooms/` | GET | authenticated | list of active rooms (slug, label, message_count, last_message_at), NOT paginated (bounded list, ~13) |
| `/chat/rooms/{slug}/messages/` | GET | authenticated | paginated history (`PAGE_SIZE` 30 via a page-size override — chat needs a deeper default than the global 20), `?before=` cursor (an ISO timestamp) for "load older" |
| `/chat/rooms/{slug}/messages/` | POST | authenticated | send a message; returns the wire shape the WS broadcasts. This is the **fallback transport** (D-04) and the **catch-up endpoint** after reconnect (D-08) |

Responses use the standard envelope + `AuthorPublicSerializer` rendering of `author`
(anonymity rules inherited free — the anonymous user's batch of chat rows render
"Anonymous Candidate" through the same resolve_public_display_name path). Writes run
through `services.send_message` so REST and WS share one validated write path.

Throttles: `chat_writes` ScopedRateThrottle (write scope, 20/min/user — chatty but bounded),
`chat_reads` (120/min/user) following the community throttle pattern.

## D-04 — Realtime transport: Django Channels + channels-redis, daphne serves on Docker

Django Channels 4.x with a `channels_redis` layer backed by the existing Redis
(`REDIS_URL`). Decisions inside the decision:

- **`config/asgi.py` becomes real** — `ProtocolTypeRouter` (http → the DRF ASGI app,
  websocket → `AuthMiddlewareStack` → chat `URLRouter`). The file's current docstring says
  "reserved for later phases" — this is the phase that reserves it.
- **Dev + prod Docker entrypoints switch from gunicorn to daphne** for ASGI serving.
  gunicorn's sync workers literally cannot accept WS upgrades, so keeping gunicorn would
  produce a shipped-but-dead config. daphne `config.asgi:application --bind 0.0.0.0:8000`
  serves HTTP and WS on one port — nginx conf gains the `Upgrade`/`Connection` headers on a
  dedicated `location /ws/` block routing to the same upstream.
- **Vercel records an honest boundary.** `vercel.json` builds/migrates the Django side but
  the WS transport is documented as Docker-only: the frontend degrades to the REST
  fallback (D-08) when the WS can't connect (which includes the Vercel-served frontend
  pointing at a Vercel-hosted API — the PWA's offline-first posture already accepts this
  class of degradation).
- **No `INSTALLED_APPS=daphne` trick**: `runserver` keeps dev ergonomics by running
  daphne via the ASGI application; the docker entrypoint owns the real serving command.
  Tests run against the sync consumer via `channels.testing.WebsocketCommunicator`.

## D-05 — WS auth: short-lived one-use ticket (the memory-only access-token answer)

`tokenStore.ts` holds the access token **in memory only** (9.1 D1, 06 §3.3) — there is no
token a WS handshake can read from storage, and stuffing JWTs into WS query strings puts
them in access logs. The pattern:

1. `POST /api/v1/chat/ws-ticket/` (JWT-protected) returns `{ticket, expires_at}` —
   a single-use opaque random token (secrets.token_urlsafe(32)), stored in cache (Redis
   db0) for 60s under `ws-ticket:{ticket}` → user id, **deleted on first use**.
2. The WS connects to `/ws/chat/{room_slug}/?ticket=...`; the consumer's auth step pops the
   cache key — hit authenticates `scope["user"]`, miss (used/expired/forged) closes with
   code 4401.
3. The frontend fetches a fresh ticket per (re)connect. Ticket TTL 60s covers the
   handshake gap only; revoking is free (delete the cache key).

This keeps: no persistent credential in any URL bar the 60s single-use ticket, no new
auth dependency, and the ticket flow is testable (`extract_ws_user`/`authenticate_ticket`
unit tests + a closed-socket integration test).

## D-06 — Message lifecycle: send → broadcast → soft-delete tombstone; no edit

- **Send** (`consumer.receive_json` → `services.send_message`) validates
  (not blank, ≤2000, duplicate-debounce), persists, broadcasts
  `{"type": "chat.message", "message": {...}}` to the room group
  (`chat.room.{slug}` — slug must be slug-regex validated, any other group is refused).
- **Soft delete** (author or staff): `POST /chat/messages/{id}/delete/` sets
  `is_deleted=True`; broadcast `{"type": "chat.message_deleted", "message_id": ...}` to the
  room. The tombstone row remains (author FK is PROTECT — 5.1 D2 author policy), rendered
  as "This message was removed" (05 tombstone precedent from comments).
- **No edit.** Chat messages don't get an edit affordance: the MVP surface stays
  send/delete only, mirroring how the community spec shipped (no comment edit — only
  delete-tombstone). `edited_at` is **dropped from the model** — no field ships dead.
  (Correction of the earlier D-02 draft, recorded here: the model lands without `edited_at`.)

## D-07 — Presence is deliberately out of scope

No online indicators, no typing status, no "N people here" counter. The room's realtime
grammar is: messages appear, deletes appear, history catches up. Presence infrastructure
(groups per-user broadcast, heartbeat) is real scope with real privacy surface
(01 §420-435's data-minimization posture) — recording the exclusion keeps the phase honest
rather than shipping a half-presence. A follow-up phase may add it on the same group
plumbing.

## D-08 — Client realtime policy: WS-first with catch-up, silent degrade to REST fallback

State machine (event-sourced by the ticket/WS lifecycle, not ad-hoc flags):

- `connecting → open → (degraded | closed)`; on any close (not a clean logout) →
  re-open with fresh ticket + exponential backoff (1s, 2s, 4s, ... cap 30s, jitter).
- On (re)open: `GET /chat/rooms/{slug}/messages/?before=<nothing>` is **not** re-fetched
  wholesale; the client sends `{"type":"sync","after": <last seen created_at>}` and the
  consumer replays room messages newer than the cursor via the same group
  (`chat.replay` → burst of `chat.message` frames). Kill two problems: no
  duplicate-append logic against the paginated list (the consumer filters by the cursor)
  and reconnects cost nothing if nothing was missed.
- While `closed`/`degraded`: the composer stays usable — sends POST to the REST fallback
  (D-03) and the UI banners "Live updates paused — reconnecting". No message is
  optimistic-other-than-locally: the POST response appends immediately (its own client
  echo via WS is deduped by id).
- Offline (the PWA's `OfflineBanner` state): same REST fallback, same banner, consistent
  with the shipping offline posture.

## D-09 — Frontend: one page, room = URL state, WS hook + store mirroring the unread pattern

- **Route**: `/messages` under `RequireAuth` (chat is authenticated-only — 01 §879 defers
  public-facing chat; visitors keep their read-only community access and see no Messages nav
  item; server rejects WS + REST writes without a valid session anyway).
- **Nav**: a `Messages` entry in `NAV_ITEMS` (sidebar) + `MOBILE_TABS` (mobile bar) replaces
  nothing — it joins the six entries. Icon `MessageCircle` (lucide; `MessagesSquare` already
  means Community — distinct icon, distinct surface).
- **Room selection = search param** (`/messages?room=general`), defaulting to `general` —
  linkable, back/forward-consistent, mirrors the feed's URL-state discipline.
- **API modules**: `api/chat.ts` (listRooms, listMessages, sendMessage, deleteMessage,
  fetchWsTicket) + `types/chat.ts` (ChatRoom, ChatMessage, ChatMessageEvent, wire union) —
  thin typed wrappers over `apiGet/apiPost` per house style.
- **WS hook**: `hooks/useChatRoom(roomSlug)` returns `{messages, status, send, remove}`;
  internally manages the ticket → WS → sync → dedupe lifecycle (D-08) plus a
  module-level connection refcount so AppShell could later share one socket across pages
  (not needed for this phase; the hook is page-scoped and closes on unmount).
- **Tests** mirror `CommunityFeedPage.test.tsx`: mock the `api/chat` module; drive the
  hook's returned controls for UI states; a small `wsMock` helper fakes the WS class so
  open/message/close events are deterministically testable (vi.mock a `wsClient` module).

## D-10 — Channels testing strategy pinned at plan time

- **Sync consumers in tests**: tests drive the consumer via
  `channels.testing.WebsocketCommunicator` + `django_db` — deterministic, no event-loop
  port juggling; the async consumer methods remain async.
- **Layer off in unit tests**: `CHANNEL_LAYERS` set to `InMemoryChannelLayer` for tests via
  a fixture in the root `conftest.py` (the `no_vapid_config` precedent — hermetic by
  default, restored by fixture). Integration tests that need cross-consumer broadcast use
  two communicators on the same layer.
- **The `settings` module discovers the app**: `INSTALLED_APPS` gains
  `"channels"` + `"apps.chat.apps.ChatConfig"`.
- **Wire contract tests** pin: room welcome frame (`chat.joined`), join/leave presence
  ignored (D-07), message broadcast shape (D-06), delete broadcast (D-06), invalid room
  slug (accept_then_close 4404), bad ticket (4401), non-member write (4403 if a room ever
  gains membership — today every active room is open to any authenticated user).

## D-11 — UI: the chat surface follows the 12-phase design system, authentically

This is not a Stitch composition (none exists for chat), so it **extends the design
system** rather than reconciling one: the same v2 token vocabulary
(`bg-surface`, `border-default`, `brand-*`, `TYPOGRAPHY`, 44px targets, `dark` class
strategy, lucide icons only), and the same interaction vocabulary the
`PostCard`/`CommentThread` suite ships (skeleton-then-content, honest error/empty states,
keyboard-accessible composer, `aria-live=polite` log region). The full design contract is
`13-UI-SPEC.md`. Header: room label + description; body: the message log
(`aria-role=log`, newest at bottom, auto-scroll pinned unless the user scrolled up, "N
new messages" pill); composer: textarea + send (Enter=send, Shift+Enter=newline,
disabled while empty/no WS with REST fallback active); room list: desktop left rail
(slugs+labels+unread placeholder count hidden in v1), mobile: horizontal room pills row.

---

## Discussion log (alternatives that lost)

- **Global room only, no category rooms** (the phase phrase read literally) — the user
  explicitly chose "both": a general room every user lands in by default *plus* per-category
  rooms mirroring `POST_CATEGORIES`. Cost accepted: the room list is settings-derived, and
  rooms beyond `general` inherit category moderation posture (no per-room timezone of
  rules — the same report flow covers chat, recorded in the UI copy).
- **Polling instead of WS** — rejected: the user opted for realtime, and the polling
  fallback this phase ships (D-08) already covers the WS-unavailable deployments.
- **Per-user DMs** — explicitly out (D-01); the phase title says "single common channel",
  the requirement records CHAT-01's "no private messaging" clause.
- **Client-side `EventSource`/SSE** — rejected: DRF has no SSE story, and Channels gives
  the consumer model we already need for group broadcast; SSE would need the same ASGI
  infra to be useful.
- **Storing coordinates/presence** — D-07.
- **Room membership model** (join/leave, moderator-pinned rooms) — deferred; rooms are
  globally visible to all authenticated users (the phase name is the requirement), so the
  room list is settings-derived and static in v1.

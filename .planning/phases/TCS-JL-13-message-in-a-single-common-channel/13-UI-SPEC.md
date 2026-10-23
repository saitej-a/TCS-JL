# Phase 13 — UI Specification: Messages (single shared channel + per-category rooms)

**Architecture note:** this is a **net-new surface with no Stitch composition** (Phase 12's
library covers neither chat nor messaging). It therefore **extends the v2 design system** the
same way the shipped community surfaces do (05 §7.x) — it does not reconcile a composition.
Source of truth: the repo's own token vocabulary, the interaction grammar of the shipped
`CommentThread`/`PostCard` suites, and the ui-ux-pro-max product/rationale data (`colors`,
`typography`, `ux-guidelines` catalogs) for the composition-level decisions below.

## Screen contract

1. **Authenticated only.** `/messages` lives under `RequireAuth` (AppShell). Visitors see no
   Messages nav item (server also rejects chat REST + WS without a session). Room is URL
   state: `/messages?room=general`, default `general` — linkable, honest back/forward.
2. **One shared channel.** The Messages screen is a single multi-room chat: a global
   `General` room every authenticated user lands in, plus per-category rooms mirroring the
   community `POST_CATEGORIES` vocabulary (CHAT-01). No DMs, no private threads (recorded
   deferral — CHAT-02).
3. **Realtime-first, REST-degrading.** When the WebSocket is open, messages stream live
   (D-04/D-08); when it is closed (degraded/offline/Vercel-hosted) the composer POSTs via
   REST and a live-updates banner shows. The UI is identical in both modes — the transport
   is a detail behind the hook (D-09), never a mode the user reads.
4. **Send/delete grammar.** Send a message, delete your own (or staff delete) → tombstone
   "This message was removed". No edit affordance ships. Anonymity renders through
   `AuthorPublicSerializer` — anonymous-candidate rows read "Anonymous Candidate" exactly as
   comments do.

## Token & theme contract (unchanged contracts, applied here)

- All palette, type, surface, radius, spacing, and elevation through the **v2 token
  vocabulary** (`brand-*` sky scale, `TYPOGRAPHY` / `SURFACES` from `theme/tokens.ts`,
  `bg-surface` / `border-default` / `dark` semantic aliases). Never raw indigo, never a new
  scheme. Rebuild closes with `grep -nE "indigo|Inter|material-symbols" <touched files>` →
  zero hits.
- Dark mode through the existing `dark` class strategy (no new theming mechanism).
- lucide-react icons only. `MessageCircle` is the nav glyph (distinct from Community's
  `MessagesSquare`).

## Responsive contract

- **Desktop ≥1280 (`app_shell` 3-col):** the shell's layout stands. Messages is a
  **two-pane** surface inside the center column: a 240px room rail (room list) + the room
  log line to `<630px *available-center-col>` — the message content column is
  width-constrained (`max-w-2xl mx-auto`) so long lines stay readable on the wide center
  column.
- **Tablet 640–1279 (sidebar persists):** room rail collapses to a horizontal room pill
  row above the log (the feed's `CategoryTabs` precedent), room switch via pills.
- **Mobile <640 (5-tab bar):** same as tablet — a compact pill row plus the log; the 44px
  composer target applies, no separate chat toolbar (05 §5.4's 44px targets).

## Layout anatomy (top → bottom)

1. **Header (`Header`):** room label (`TYPOGRAPHY.h2`) + one-line description
   ("Welcome to General — join the conversation." from the room seed), right-aligned
   room count when >1 room (`N rooms` text, muted). Sticky within the pane.
2. **Room rail (desktop) / pill row (<1280):** the active room is visually identified
   (rail: `bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300` — the
   nav-link active recipe; pills: same on the pill). Room label + muted subline
   (`message_count`/`last_message_at` via wire when present). General is the first entry,
   pinned above the category rooms.
3. **Message log (`role="log"`, `aria-live="polite"`):** one `<ul>`; a message row = a
   `MessageBubble` (author pill + body). Newest at bottom; a scroll container pinned to
   bottom auto-scrolls on new messages **unless** the user has scrolled up (honest
   reading), showing a "↓ N new" pill to jump back down. The composer is always
   reachable.
   - **Author affordance:** `IdentityPill`-style — public display name (or the
     anonymized sentinel) + batch/hiring-type when the wire provides them, never the real
     identity link (no profile navigation is added for chat authors; the pill is
     informational for this phase).
   - **Own messages** render aligned right with a light brand tint
     (`bg-brand-600 text-white` bubble, or `bg-brand-50 dark:bg-brand-950/60 text-primary`
     bubble with a right-aligned author) so the log reads as conversation, not a feed.
   - **Tombstone** renders as an inline muted row: "This message was removed." (the 05
     comment-tombstone phrasing), author-agnostic, not clickable.
   - **Time:** relative (`timeAgo` — the shipped `utils/date` formatter) under the last
     message a user sent or in a hover title; not on every row (noise).
4. **Live-updates banner (only when degraded/offline):** a slim `OfflineBanner`-style strip
   above the composer: "Live updates paused — reconnecting" (muted, brand icon `WifiOff`
   from lucide). Composer stays enabled (REST fallback). Completely absent when the WS is
   open.
5. **Composer (`form`):** a `Textarea` (48px min, auto-grow to 6 lines) + `Send` icon
   button (44px target). Enter sends, Shift+Enter newline. Disabled state only while truly
   empty fit or still connecting on first load with no REST path — otherwise always
   enabled (sends queue via the hook's fallback). `aria-label="Message {room}"`,
   `maxLength=2000` (server contract).

## Message row anatomy (single component `MessageRow`)

```
┌─ (own, right-aligned) ──────────────────┐
│  [Author pill]                    [12:04]│
│  ┌───────────────────────────────────┐  │
│  │ body text (pre-wrap, ≤2000) [🗑]   │  │
│  └───────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

- **Delete** renders only on own messages + staff (server authoritative; the client
  renders the affordance from the wire `can_delete`, never from client-side role guesses —
  same contract `CommentThread` uses for Report). Delete → optimistic tombstone +
  `DELETE` call; revert on failure + toast (the `Toast` component).
- **Collaboration affordances negligible:** no reactions, no emoji picker, no mention
  autocomplete — collectively recorded as deferred (CHAT-02 surface).

## States

- **Loading:** skeleton list rows (`Skeleton` component — the `SkeletonCard` precedent,
  rounded bubbles) + disabled composer until the first history resolves; the socket may
  open during this and accelerate it (history + stream merge by id).
- **Error:** a scoped `EmptyState`-style panel inside the pane (not a full-page error) with
  a Retry button that re-fetches history and re-attempts the socket — never bounces the
  user out of the shell.
- **Empty room:** centered `EmptyState` ("No messages yet. Start the conversation.") —
  the honest empty state, with the composer prominent below.

## Accessibility & interaction pins

- Message log is `role="log"` + `aria-live="polite"` (region aria-label = room label).
- Composer: label present, 44px target, Enter-to-send with a visible "press Enter to send"
  hint on desktop (and a `Shift+Enter` newline hint), mobile `enterkeyhint="send"`.
- Focus management: on room switch, focus moves to the log top or the composer (chooser's
  call, but it must move somewhere sensible — never assume focus).
- New-message "down" pill is a real button (focusable, `aria-label="Jump to latest"`).
- Color contrast: bubble text meets the 05 §4.1.1 contrast gates (white-on-brand-600 and
  brand-50-on-surface both pass; the script's audit covers the touched files' pairs).
- Reduced motion: auto-scroll is instant-on-update (a scroll is not an animation; no
  smooth-scroll choreography that fights screen readers).

## Data contract (frontend types consumed)

- `ChatRoom { id, slug, label, is_default, message_count, last_message_at }`
- `ChatMessage { id, room, author: PublicAuthor, body, is_deleted, created_at, can_delete }`
- Wire union for the socket frames (D-06): `{type:'chat.message',message}` ·
  `{type:'chat.message_deleted',message_id}` · `{type:'chat.replay',message}`(burst) ·
  `{type:'chat.joined',room}`. Unknown frame types are ignored (forward-compatible with a
  later presence phase).

## Rejected renderings (binding)

- No presence/typing/online dots (D-07) — the UI never implies them; no placeholder dots.
- No "members" list, no "copy link to message", no emoji reactions, no edit affordance.
- No separate chat chrome/nav beyond the one `Messages` item; no per-room routes —
  `/messages?room=` only (room is state, not a nav dimension).
- No optimistic send **before** the wire confirms id (dedupe correctness wins); the
  message appends on confirm, POST fallback appends on its own response.
- No infinite auto-scroll against history: an explicit "Load older" button/edge (infinite
  scroll is a 04 contract decision the plan must pin — the UI supports a paged
  `?before=` cursor with a manual "Show earlier" affordance rather than the feed's
  infinite-style paging).

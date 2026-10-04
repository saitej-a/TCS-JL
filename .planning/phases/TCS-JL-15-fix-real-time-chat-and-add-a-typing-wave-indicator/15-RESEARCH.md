# Phase 15: Fix real-time chat and add a typing wave indicator — Research

**Researched:** 2026-10-03
**Domain:** Real-time messaging — Django Channels 4.3.2 + channels-redis over an nginx reverse proxy, consumed by a React hook (`useChatRoom`)
**Confidence:** HIGH for the failure mechanism (live evidence gathered this session, reproducible commands below); MEDIUM-HIGH for the presence design (established pattern, not yet exercised in this codebase)

---

<user_constraints>
## User Constraints

**No CONTEXT.md exists for this phase** — `/gsd-discuss-phase` was not run. The decisions below were taken with the user at the planning gate on 2026-10-03 and are **binding on the planner/executor**; they carry the weight a CONTEXT.md decision would carry.

### Locked Decisions

- **D-15-01 — Indicator shape and placement.** The typing indicator is **three animated wave dots plus the typist's name**, rendered in a row **directly above the composer** (inside the composer footer, above the `form`). Not dots-only, and not in the channel header.
- **D-15-02 — Research performed.** This phase runs with research (not the skip path used by Phases 13 and 14, neither of which has a RESEARCH.md).
- **D-15-03 — The phase authors its own UI contract.** `15-UI-SPEC.md` is written by this phase to satisfy the blocking `ui.plan-gate` (`frontend: true, hasUiSpec: false, block: true`); the `/gsd-ui-phase` skill is **not installed** in this project (`.claude/skills/` holds no `gsd-ui-phase`).
- **D-15-04 — The Phase 13 boundary is superseded for typing only.** `13-UI-SPEC.md`'s "Rejected renderings (binding)" says *"No presence/typing/online dots (D-07)"*. Phase 15 deliberately reopens that single line for **in-room typing presence** and nothing else; the other rejected renderings (members list, reactions, edit, per-room routes) remain in force. Phase 13's UI-SPEC also already anticipated this: *"Unknown frame types are ignored (forward-compatible with a later presence phase)."*

### Claude's Discretion

- Presence TTL length, frame/action names, throttle windows, and whether stop-frames are explicit or purely TTL-driven.
- Service topology for serving `/ws/` (separate ASGI service vs. replacing the HTTP server).
- The exact `@keyframes` values and the reduced-motion fallback rendering.

### Deferred Ideas (OUT OF SCOPE)

- Direct messages, threads, reactions/emoji, mentions, message editing, per-message read receipts.
- Room-list "who is online" presence dots.
- Multi-instance scale-out tuning of the channel layer beyond what `channels-redis` already provides.

</user_constraints>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| WebSocket upgrade + frame routing for `/ws/chat/<room>/` | API/Backend — a real **ASGI** process | Edge (nginx) | Only an ASGI server can answer `101 Switching Protocols`; nginx proxies the upgrade but cannot create it. The current stack runs WSGI here — see F-1. |
| Typing presence state (who is composing, and when it expires) | API/Backend — Redis via Django's cache | — | Server-authoritative TTL is what makes a stuck indicator impossible; a client-only timer cannot be trusted across tab closes. |
| Indicator rendering + wave animation timing | Browser/Client | — | Pure CSS animation; the server sends state, never animation steps. |
| Single-use ticket auth for the socket | API/Backend | Browser/Client | `WsTicketView` already mints a 60 s single-use ticket (Phase 13 D-05); the client only carries it. |
| Message delivery fan-out | API/Backend — channel layer group | — | `chat_room_<slug>` group broadcast already exists in `ChatConsumer`. |

</architectural_responsibility_map>

---

<research_summary>
## Summary

The user's report — *"The real time messages are not working"* — is **reproduced and root-caused at the infrastructure layer**, not in the application code. The running dev stack serves `/ws/` from **gunicorn, a WSGI server**: `tcsjl-web-1` runs `gunicorn config.wsgi:application`. WSGI has no WebSocket handshake, so a `GET /ws/chat/general/` carrying the standard upgrade headers is answered with Django's **404** page and **no `Upgrade` header**, both through nginx (`localhost:80`) and directly against `web:8000`. The browser's `new WebSocket(...)` therefore fails immediately → `onerror` + `onclose` → `isDegraded = true` → the amber dot and *"Live updates paused — reconnecting"* banner, with messages quietly falling back to REST. That is precisely the reported symptom, and it is invisible to the unit suite.

Two further live-stack defects sit behind the first one, both in the same request path: `nginx/nginx.dev.conf` and `nginx/nginx.prod.conf` declare **no `proxy_read_timeout`** for `/ws/` (nginx's default is 60 s), so an established socket would be culled after a minute of silence even once the upgrade works; and `config/asgi.py` wires `URLRouter` with **no origin validation**, which the phase goal names explicitly ("host/origin checks"). The frontend channel-switch bug (`useChatRoom`'s shared mounted-ref across socket generations) was a second, independent cause of the same banner — **already fixed and unit-verified**, and must not be re-fixed.

The feature half is a small, conventional addition: server-authoritative typing presence scoped to the existing room group, with a Redis TTL so a closed tab cannot leave a stuck indicator, plus a CSS wave animation built from the repo's own token layer. The recommended sequence is strict: **make the upgrade work and prove delivery with two live clients before writing any typing code**, because a typing feature built on an unverified transport would ship the same way Phase 13 did.

**Primary recommendation:** Run `/ws/` from a **daphne** (ASGI) service — keep gunicorn for HTTP — add the WS proxy timeouts, then prove delivery end to end with a two-client probe through nginx, and only then land the presence work on the proven transport.

</research_summary>

---

<root_cause_findings>
## Findings — evidence gathered this session

### F-1 (BLOCKER): `/ws/` is served by a WSGI process, so the WebSocket upgrade can never complete

| Evidence | Detail |
|----------|--------|
| Running container's command | `docker inspect tcsjl-web-1` → `["/app/docker/entrypoint.sh","gunicorn","config.wsgi:application","--bind","0.0.0.0:8000", ...]` |
| Compose definition | `docker-compose.yml` `web:` service command (line 8-9) — the same gunicorn/WSGI invocation |
| Live probe through nginx | `curl -i -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' http://localhost/ws/chat/general/?ticket=fake` → `HTTP/1.1 404 Not Found`, `Server: nginx/1.27.5`, **no `Upgrade` header** |
| Live probe direct to the app | `http.client` from inside `web` → `status: 404`, `upgrade header: None` |
| Nothing runs the ASGI app | `grep -rn "daphne\|config.asgi"` across compose/shell/Dockerfile → the only hit is `requirements.txt:19` (`daphne==4.2.3`) |

Django's WSGI handler has no route for `/ws/chat/...` (the socket paths live only in `apps/chat/routing.py`, consumed by `config/asgi.py`), so the request dies as a 404 before Channels is ever involved.

### F-2 (HIGH): the `/ws/` proxy location has no read timeout, so sockets would be culled after 60 s

`nginx/nginx.dev.conf` and `nginx/nginx.prod.conf` both set `proxy_http_version 1.1` and the `Upgrade`/`Connection` headers (correct, and already present) but set **neither `proxy_read_timeout` nor `proxy_send_timeout`**. nginx's default `proxy_read_timeout` is 60 s, and the application sends no keepalive ping — so a quiet room loses its socket every minute, and any message sent during the reconnect window is only recovered by the `sync` catch-up path. A regression test for this must outlive 60 s of idleness, which is why the live probe (below) is the only honest place to assert it.

### F-3 (MEDIUM): no origin validation on the WebSocket router

`config/asgi.py` builds `ProtocolTypeRouter({"websocket": URLRouter(websocket_urlpatterns)})` with no `channels.security.websocket.AllowedHostsOriginValidator`. Ticket auth (single-use, 60 s, Redis) still gates every connection, so this is hardening rather than an open door — but the phase goal names "host/origin checks" as part of what must be proven, and the validator is the standard mechanism.

### F-4 (MEDIUM): the ASGI module's settings default is `production`

`config/asgi.py:8` does `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")`. Compose sets `DJANGO_SETTINGS_MODULE` per service so containers are unaffected, but a bare `daphne config.asgi:application` on a developer machine silently loads production settings. Any new ASGI service must set the environment explicitly.

### F-5 (already fixed — do NOT re-fix): the channel-switch banner

`frontend/src/hooks/useChatRoom.ts` now scopes the socket lifecycle to an effect keyed by `[roomSlug, loadInitialHistory]`, with a per-run `cancelled` flag, detached handlers before close, per-run backoff, and request-id-guarded history. The regression test lives in `frontend/src/pages/MessagesPage.test.tsx` ("stays live when switching channels"). This is a **precondition**, not a task.

### F-6 (test-environment blocker for the executor)

Neither place that has the code can currently run the chat backend tests:

| Location | Has | Missing |
|----------|-----|---------|
| `web` container | `channels 4.3.2`, `daphne`, `redis 6.4.0`, `pip 24.0`, reachable PyPI | `pytest`, `pytest-django` (`python -m pytest` → "No module named pytest") |
| local `.venv` | `django`, `pytest 8.4.2`, `requests`, `httpx` | the whole WS stack (`channels`, `daphne`), and **no `pip`** (only `ensurepip`) |

So `apps/chat/tests/test_ws_consumer.py` (179 lines) cannot be executed in either interpreter as things stand. Wave 0 must fix this before any `<automated>` backend verify can be trusted.

</root_cause_findings>

---

<standard_stack>
## Standard Stack

No new runtime dependency is required — everything the fix needs is already pinned, and the only addition is a dev-only client library for the live probe.

### Core (already in `requirements.txt`)

| Library | Version | Purpose | Why this one |
|---------|---------|---------|--------------|
| `channels` | 4.3.2 | ASGI protocol routing, consumers, group broadcast | already drives `ChatConsumer`; the corrected topology just needs a server that actually runs it |
| `channels-redis` | 4.3.0 | Channel layer over the existing Redis | already configured (`config/settings/base.py` `CHANNEL_LAYERS.hosts`) |
| `daphne` | 4.2.3 | The ASGI server (`daphne config.asgi:application`) | the reference ASGI server for Channels; already installed in the image |
| `redis` / `django-redis` | 6.4.0 / 6.0.0 | Presence TTL keys + ticket cache | the cache backend is already Redis in every non-test environment |

### Supporting

| Library | Version | Purpose | When to use |
|---------|---------|---------|-------------|
| `websockets` | latest compatible | Client for the two-socket live probe | **new, dev-only** — `requirements-dev.txt`; keeps the probe a real network client rather than an in-process communicator |
| `tailwindcss` | 4.1.4 | Anonymous `@theme` token + `@keyframes` for the wave | CSS-first config is already the project's mechanism (`frontend/src/index.css`) |
| `vitest` | 2.1.8 | Component/hook/page tests | the repo's frontend runner (`cd frontend && npx vitest run`) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| A dedicated `asgi` (daphne) service | `gunicorn -k uvicorn.workers.UvicornWorker config.asgi:application` for the `web` service | Servable, but it makes HTTP and WS share one process/timeout profile and changes prod's HTTP server; the separate service keeps the HTTP path this project has already hardened untouched. |
| `websockets` client for the probe | `channels.testing.WebsocketCommunicator` | In-process, bypasses nginx and Redis entirely — it cannot see F-1 or F-2, which is the whole point of this phase's verification half. |
| Redis TTL presence | Pure client-side "stop typing" timers | Cannot survive a closed tab, a dropped socket, or a crash — the indicator sticks. Rejected. |

**Installation (Wave 0 — inside the running topology, where the WS stack already lives):**

```bash
docker compose exec -T web python -m pip install -r requirements-dev.txt
```
</standard_stack>

---

<architecture_patterns>
## Architecture Patterns

### Recommended topology

```
Browser ──┬── HTTP  ──► nginx :80 ──► web:8000   (gunicorn, config.wsgi — unchanged)
          └── /ws/  ──► nginx :80 ──► asgi:8000  (daphne, config.asgi — NEW)
                                        │
                                        └──► Redis  (channel layer + presence TTL + ws-ticket)
```

### Pattern 1: ASGI server for the socket path only

Add a dedicated service to `docker-compose.yml` (and `docker-compose.prod.yml`) running
`daphne -b 0.0.0.0 -p 8000 config.asgi:application` with the same `env_file`, volumes, and
dependency gates as `web`, then point only the `/ws/` location at it
(`set $upstream_ws http://asgi:8000;`). HTTP traffic keeps its existing gunicorn tuning.

### Pattern 2: Presence as a TTL key, broadcast as an event with an expiry

The consumer writes `chat_typing:<room_slug>:<user_id>` with `timeout = TYPING_TTL` on every
`typing` action, and `group_send`s a single frame carrying `expires_at`. Clients hold the typist
in state until `expires_at` (plus a small grace) and clear it locally even if the stop frame never
arrives. Three independent mechanisms therefore prevent a stuck indicator: explicit stop on
send/blur/disconnect, the Redis TTL, and the client's expiry timer.

### Pattern 3: Exclude the sender's own channel

The group event carries `sender_channel = self.channel_name`; the handler returns early when
`event["sender_channel"] == self.channel_name`. Without this, a user sees their own name in the
wave row while typing — the single most common defect in hand-rolled typing indicators.

### Pattern 4: One identity vocabulary

The typist's `{id, display_name}` comes from the **same** `CommunityAuthorSerializer` that
`ChatMessageSerializer` uses for `author`, so the wave row and the message author pill can never
disagree — including the anonymized-candidate sentinel.

### Pattern 5: The animation is a token, not a one-off class

Declare the keyframes and the animation shorthand in the Tailwind v4 `@theme` block in
`frontend/src/index.css` (alongside `--color-*` / `--font-*`), so the wave is a first-class token
the way the type roles and radii already are — and pair it with a `motion-reduce` fallback that
still renders a legible static indicator.
</architecture_patterns>

<anti_patterns>
### Anti-Patterns to Avoid

- **Trusting a green unit suite for delivery.** `conftest.py` swaps in `InMemoryChannelLayer`, so every existing WS test proves the consumer's logic and *nothing* about nginx, daphne, Redis, or the browser.
- **Client-only presence timers.** A closed tab or a killed socket leaves the indicator on forever.
- **Broadcasting on every keystroke.** One frame per ~2 s per typist is enough; per-keystroke fan-out is the classic way to make a typing feature expensive.
- **Adding a second WebSocket library to the frontend.** The browser's own `WebSocket` is already wrapped by `useChatRoom`; a library would duplicate reconnect semantics.
- **Switching the HTTP server to ASGI "because Channels".** HTTP is not the broken half; changing it re-opens hardening this project already verified.
- **Re-fixing `useChatRoom`'s channel-switch lifecycle.** F-5 is done and tested; touching it again risks the regression the test was written to prevent.
</anti_patterns>

<common_pitfalls>
## Common Pitfalls

| # | Pitfall | Mitigation this phase must pin |
|---|---------|-------------------------------|
| 1 | nginx's 60 s default read timeout silently culls a working socket | Set `proxy_read_timeout`/`proxy_send_timeout` on `/ws/` in **both** confs, and assert survival with a >70 s idle probe |
| 2 | WebSocket frames bypass DRF throttles (`chat_reads`/`chat_writes`) | Give the `typing` action its own minimum-interval guard on the connection, independent of DRF |
| 3 | Django's `cache` API is synchronous inside an async consumer | Wrap cache reads/writes in `database_sync_to_async`, exactly as `_authenticate_ticket` already does |
| 4 | `InMemoryChannelLayer` in tests hides cross-process bugs | Keep unit tests on InMemory, but prove delivery only in the live probe; never cite the unit suite as delivery evidence |
| 5 | Backend tests cannot run anywhere today (F-6) | Wave 0 installs `requirements-dev.txt` where the WS stack lives before any backend `<automated>` verify is relied on |
| 6 | `config/asgi.py` defaults to production settings (F-4) | Any new ASGI service sets `DJANGO_SETTINGS_MODULE` explicitly in compose |
| 7 | A stale `docker compose` config silently keeps serving WSGI after the conf changes | The live probe asserts the upgrade, not the file contents; the conf edit alone is not proof |
</common_pitfalls>

---

<validation_architecture>
## Validation Architecture

The phase's own goal states the bar: *"must not treat a green unit suite as evidence."* Both known root causes (F-1, F-2) are **invisible** to in-process tests, so validation runs in three layers and the live layer is the one that gates completion.

### Layer 1 — Unit (fast, per task)

| What | Command |
|------|---------|
| Backend (chat app, incl. consumer) | `docker compose exec -T web python -m pytest apps/chat -q` |
| Frontend (hook/page/component) | `cd frontend && npx vitest run src/pages/MessagesPage.test.tsx` |
| Type + lint gates | `cd frontend && npm run typecheck && npx eslint <touched files>` |

### Layer 2 — Contract (fast, per task)

Frame shapes are asserted on both sides of the wire: backend tests assert the exact `chat.typing`
payload the consumer emits; the frontend union in `frontend/src/types/chat.ts` is asserted by a
test that feeds a captured frame through the hook. A change to one side without the other fails.

### Layer 3 — Live end-to-end (MANDATORY, phase-gating)

A real network client through the real proxy against the real stack:

1. `docker compose up -d` (all services healthy, `nginx` publishing :80).
2. Two users authenticate over HTTP (`POST /api/v1/auth/login/`), each mints a ticket
   (`POST /api/v1/chat/ws-ticket/`).
3. Both open `ws://localhost/ws/chat/general/?ticket=<ticket>` — **assert the handshake completes
   with 101** (this is the assertion F-1 currently fails).
4. A sends `{"action":"send","body":"..."}` → **B receives `chat.message` within 5 s** (delivery).
5. Idle for **>70 s** → **both sockets are still open** (this is the assertion F-2 currently fails).
6. Typing: A sends `{"action":"typing","is_typing":true}` → B receives `chat.typing` with A's
   display name and a future `expires_at`, and **A itself receives nothing** (sender exclusion).
7. A sends a `send` → **B receives `chat.typing` with `is_typing:false`** (or the TTL expires) and
   the indicator state clears within `TYPING_TTL + 1 s`.

### Wave 0 requirements

- [ ] `docker compose exec -T web python -m pip install -r requirements-dev.txt` — pytest into the interpreter that has Channels (F-6).
- [ ] `websockets` appended to `requirements-dev.txt` — the probe's client.
- [ ] `scripts/ws_live_probe.py` — the Layer 3 script (prints a pass/fail line per assertion).

### Manual-only verifications

| Behaviour | Why manual | Instructions |
|-----------|-----------|--------------|
| The wave animation actually looks like a wave (stagger, cadence, legibility in dark mode) | Visual judgement; no assertion captures "reads as a wave" | Open `/messages`, type in the composer in one browser, watch the other browser's row above the composer |
| Reduced-motion behaviour | Requires an OS/browser setting | Enable "reduce motion", confirm the indicator stays legible and static |

</validation_architecture>

---

<open_questions>
## Open Questions

1. **Topology: separate ASGI service vs. ASGI as the `web` command?** Recommendation: separate `asgi` service (daphne) and route only `/ws/` to it — prod parity with the already-hardened HTTP path, and no change to HTTP timeouts. Resolve at execution if the prod compose differs.
2. **Presence TTL value.** Recommendation: `TYPING_TTL = 6` seconds, client clears at `expires_at + 1`. Long enough to bridge a typing pause, short enough that a stuck indicator self-heals promptly.
3. **Is browser-level verification available in this thread?** Nice-to-have only; the mandated evidence is the two-client CLI probe, which does not depend on any browser automation.
</open_questions>

---

<sources>
## Sources

### Primary (HIGH confidence — read or executed this session)

- `docker-compose.yml` (`web` command), `docker inspect tcsjl-web-1` → gunicorn/WSGI serves :8000.
- Live probes 2026-10-03: `curl` upgrade request through nginx → `404`, no `Upgrade`; `http.client` from inside `web` → `404`, `Upgrade: None`.
- `nginx/nginx.dev.conf`, `nginx/nginx.prod.conf` — `/ws/` locations carry the upgrade headers but no read/send timeouts.
- `config/asgi.py` — router wiring, settings default, absence of an origin validator.
- `apps/chat/consumers.py` — `chat.joined|message|message_deleted|replay|error`, ticket auth, group name, `database_sync_to_async` usage.
- `apps/chat/views.py` (`WsTicketView`, 60 s single-use ticket), `apps/chat/serializers.py` (`CommunityAuthorSerializer` reuse), `apps/chat/services.py`, `apps/chat/validators.py`.
- `frontend/src/hooks/useChatRoom.ts`, `frontend/src/pages/MessagesPage.tsx`, `frontend/src/api/chat.ts`, `frontend/src/types/chat.ts`.
- `frontend/src/index.css` (`@theme` token block), `frontend/src/theme/tokens.ts` (`TYPOGRAPHY`, `SURFACES`), `frontend/package.json`.
- `conftest.py` (InMemoryChannelLayer), `pytest.ini`, `.github/workflows/ci.yml` (`python -m pytest`).
- `docker ps` / in-container `python -m pip install --dry-run` → pip 24.0 with reachable PyPI; `python -m pytest` absent.
- `.planning/ROADMAP.md` Phase 13/15 entries; `.planning/phases/TCS-JL-13-…/13-UI-SPEC.md` (D-07 typing rejection, and its "later presence phase" note).

### Secondary (MEDIUM confidence — standard documented behaviour, confirm against vendor docs during execution)

- nginx `proxy_read_timeout` default of 60 s, and that WebSocket proxying requires the two timeout directives to outlive the socket.
- WSGI's lack of a WebSocket upgrade path (why gunicorn cannot serve `/ws/`).
- `channels.security.websocket.AllowedHostsOriginValidator` as the origin-check mechanism.
- Tailwind v4 CSS-first `@theme` supporting `--animate-*` tokens and `@keyframes` in the same block.

### Tertiary

- General industry practice for typing indicators (TTL presence + sender exclusion). Not a citation; recorded because it informed Patterns 2-3.
</sources>

---

## Metadata

**Confidence breakdown:**

- Root cause of the reported failure (F-1): **HIGH** — reproduced with two independent probes against the running stack.
- Proxy timeout defect (F-2) and origin gap (F-3): **HIGH** for the config facts, **MEDIUM** for their end-user impact (F-2 only bites once F-1 is fixed).
- Test-environment gap (F-6): **HIGH** — directly observed.
- Presence design and TTL: **MEDIUM-HIGH** — conventional pattern, unexercised in this codebase.
- Topology recommendation: **MEDIUM** — recommended, not measured (the prod compose has not been read for its `web` command in this session).

**Research date:** 2026-10-03

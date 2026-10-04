---
phase: "15"
slug: "fix-real-time-chat-and-add-a-typing-wave-indicator"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-03"
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.4.2 + pytest-django 4.11.1 (backend, `asyncio_mode = auto`); vitest 2.1.8 (frontend) |
| **Config file** | `pytest.ini` (`DJANGO_SETTINGS_MODULE = config.settings.test`); `frontend/vitest.config.ts` |
| **Quick run command** | `docker compose exec -T web python -m pytest apps/chat -q` · `cd frontend && npx vitest run src/pages/MessagesPage.test.tsx` |
| **Full suite command** | `docker compose exec -T web python -m pytest -q` · `cd frontend && npx vitest run` |
| **Estimated runtime** | ~60 s backend quick · ~45 s frontend file · ~3 min frontend full · **live probe ≈ 2.5 min** (dominated by the >70 s idle-survival assertion) |

**Wave 0 caveat (from `15-RESEARCH.md` F-6):** neither interpreter can run the backend chat tests today — the `web` container has `channels`/`daphne`/`redis` but no `pytest`, and the local `.venv` has `pytest` but no WS stack and no `pip`. The backend quick/full commands above are therefore **Wave 0 gated**, not currently runnable.

---

## Sampling Rate

- **After every task commit:** Run the task's own `<automated>` command (quick run).
- **After every plan wave:** Run the full suite for the touched side(s) plus `cd frontend && npm run typecheck`.
- **Before `/gsd-verify-work`:** Full backend + frontend suites green **and** `scripts/ws_live_probe.py` passing.
- **Max feedback latency:** ~120 s per task; the live probe runs once per wave, never per task.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | CHAT-01 | T-15-01 / T-15-02 | `/ws/` upgrade is served by an ASGI process; unauthenticated upgrades still refused by the origin validator | config + live | `docker compose up -d && curl -isS -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' http://localhost/ws/chat/general/` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | CHAT-01 | T-15-01 | Ticket auth still single-use; a replayed ticket is refused | unit + live | `docker compose exec -T web python -m pytest apps/chat/tests/test_ws_consumer.py -q` | ✅ | ⬜ pending |
| 15-01-03 | 01 | 1 | CHAT-01 | T-15-02 | Delivery survives an idle socket (no silent 60 s cull) | live E2E | `docker compose exec -T web python -m scripts.ws_live_probe --assert delivery,idle` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 2 | CHAT-03 | T-15-03 / T-15-04 | Typing frames are per-connection throttled; sender never echoes to itself | unit | `docker compose exec -T web python -m pytest apps/chat/tests/test_ws_typing.py -q` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 2 | CHAT-03 | T-15-03 | Presence cannot stick: TTL expiry, explicit stop, and disconnect all clear it | unit | `docker compose exec -T web python -m pytest apps/chat/tests/test_ws_typing.py -q -k "expire or stop or disconnect"` | ❌ W0 | ⬜ pending |
| 15-02-03 | 02 | 2 | CHAT-03 | T-15-05 | Indicator renders the v2 tokens only, honours reduced motion, and clears on expiry | unit + live | `cd frontend && npx vitest run src/components/chat/TypingIndicator.test.tsx src/pages/MessagesPage.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `docker compose exec -T web python -m pip install -r requirements-dev.txt` — puts pytest/pytest-django into the interpreter that already has `channels`/`daphne` (F-6). PyPI reachability verified this session (`pip install --dry-run` succeeded).
- [ ] `websockets` appended to `requirements-dev.txt` — the live probe's real network client.
- [ ] `scripts/ws_live_probe.py` — Layer 3 harness: logs in two users, opens two sockets through nginx, asserts upgrade / delivery / idle survival / typing frames.
- [ ] `apps/chat/tests/test_ws_typing.py` — new module for the presence tests (the existing consumer suite stays as it is).
- [ ] `frontend/src/components/chat/TypingIndicator.test.tsx` — new component suite.

*Backend Wave 0 is a real prerequisite, not boilerplate: without it every backend `<automated>` command in this phase fails on an import error rather than on its assertion.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The indicator reads as a *wave* (staggered cadence, legible in light and dark, name truncation sane) | CHAT-03 | Visual judgement; no assertion captures "reads as a wave" | With the stack up, open `/messages` in two browsers as two users; type in one composer and watch the other's row above the composer. Check both themes. |
| Reduced-motion behaviour | CHAT-03 | Requires an OS/browser setting | Enable "reduce motion" at the OS level, reload, confirm the indicator is static but still legible and still appears/disappears correctly. |
| Two-user typing in the same room | CHAT-03 | Requires two authenticated sessions | Log in as two users in separate profiles, both on `#General`; confirm only the other user's name appears (never your own). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s per task; live probe ≤ 3 min once per wave
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

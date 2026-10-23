---
phase: 15-fix-real-time-chat-and-add-a-typing-wave-indicator
plan: 15-01
subsystem: infra-and-backend
tags: [daphne, asgi, channels, websockets, nginx, redis, docker-compose, pytest]

# Dependency graph
requires:
  - phase: 13-message-in-a-single-common-channel
    provides: the chat data model, REST views, channels consumer, and routing
provides:
  - "ASGI service running daphne (config.asgi:application) on docker compose dev and prod topologies"
  - "Hardened nginx reverse proxy routing /ws/ to the ASGI service with 3600s timeouts and buffering disabled"
  - "Origin-validated WebSocket router via AllowedHostsOriginValidator"
  - "Backend test suite runnable in container with pytest/pytest-django and pinned websockets==17.2"
  - "ChatMessageSerializer room serialization fixed for msgpack/channels_redis compatibility"
  - "scripts/ws_live_probe.py live verification tool asserting handshake, delivery, auth, and 75s idle survival"
affects: [15-02, messages-page]

# Actuals
actuals:
  tasks: 3
  commits: 1

# Tech tracking
tech-stack:
  added:
    - "websockets==17.2 (dev-only for live WS probe)"
  patterns:
    - "ASGI + WSGI split: Gunicorn serves HTTP traffic, Daphne serves WebSocket traffic via docker network"
    - "Nginx proxy_pass to ASGI with long timeouts (3600s) preventing silent drops during idle chat"
    - "Real network client verification: scripts/ws_live_probe.py proves end-to-end delivery through nginx -> daphne -> redis -> postgres -> consumer"

key-files:
  created:
    - scripts/ws_live_probe.py
    - .planning/phases/TCS-JL-15-fix-real-time-chat-and-add-a-typing-wave-indicator/15-01-SUMMARY.md
  modified:
    - docker-compose.yml
    - docker-compose.prod.yml
    - nginx/nginx.dev.conf
    - nginx/nginx.prod.conf
    - config/asgi.py
    - requirements-dev.txt
    - apps/chat/tests/test_ws_consumer.py
    - apps/chat/serializers.py
---

# Plan 15-01 Summary: Real-Time WebSocket Transport & Hardened Upgrade Path

## What Was Done

1. **ASGI Process & Topology Setup (Task 1):**
   - Added an `asgi` container service to `docker-compose.yml` and `docker-compose.prod.yml` running `daphne -b 0.0.0.0 -p 8000 config.asgi:application`.
   - Updated `nginx/nginx.dev.conf` and `nginx/nginx.prod.conf` to direct `/ws/` to `$upstream_ws http://asgi:8000;`, adding `proxy_read_timeout 3600s;`, `proxy_send_timeout 3600s;`, and `proxy_buffering off;`.
   - Wrapped WebSocket routing in `config/asgi.py` with `AllowedHostsOriginValidator(URLRouter(websocket_urlpatterns))`.
   - Verified that unticketed upgrade requests return `403 Forbidden` from Channels rather than `404 Not Found` from WSGI/gunicorn.

2. **Backend Suite In-Container Readiness & Contract Assertions (Task 2):**
   - Installed `pytest`, `pytest-django`, `pytest-asyncio`, and pinned `websockets==17.2` into `requirements-dev.txt` and the `web` container.
   - Extended `apps/chat/tests/test_ws_consumer.py` to assert consumed-ticket rejection (close code `4401`), unknown room rejection (`4404`), disallowed origin rejection, and the `chat.joined` frame contract.
   - All 36 backend tests in `apps/chat` pass cleanly.

3. **Live Network Probe & Cross-Process Delivery Fix (Task 3):**
   - Identified and fixed a bug where `ChatMessageSerializer` returned `room` as a `UUID` object, causing `channels_redis`'s `msgpack` serializer to crash with `TypeError: can not serialize 'UUID' object`. Declared `room = serializers.UUIDField(source="room_id", read_only=True)`.
   - Created `scripts/ws_live_probe.py` supporting `--assert handshake,delivery,auth,idle` (and `typing` for Plan 15-02).
   - Proven live through nginx:
     - `handshake`: both sockets connect and receive `{"type": "chat.joined", "room": "general"}`
     - `delivery`: User A sends message, User B receives `chat.message` within 0.013s
     - `idle`: both sockets survive a 75-second idle period with zero dropped frames or disconnects
     - `auth`: single-use ticket reuse is rejected

## Verification

```bash
# Nginx syntax and WS 403 refusal
docker compose exec -T nginx nginx -t
curl.exe -i --max-time 10 -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" "http://localhost/ws/chat/general/"
# -> HTTP/1.1 403 Access denied

# Pytest in container
docker compose exec -T web python -m pytest apps/chat -q
# -> 36 passed in 21s

# Live end-to-end probe
docker compose exec -T web python scripts/ws_live_probe.py
# -> [probe] handshake PASS both sockets joined room general
# -> [probe] delivery PASS message received within 0.013s
# -> [probe] idle PASS both sockets survived 75s idle period
# -> [probe] auth PASS consumed ticket rejected
```

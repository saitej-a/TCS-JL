#!/usr/bin/env python3
"""Live WebSocket probe for end-to-end verification (Phase 15 Task 3).

Proves real-time message delivery and typing presence cross-process and cross-proxy:
nginx -> daphne (ASGI) -> ChatConsumer -> Redis channel layer -> Postgres.
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Bootstrap Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
import django

django.setup()

from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_datetime
from apps.chat.services import ensure_default_rooms
import websockets

User = get_user_model()

PROBE_USER_A = "probe-user-a@example.com"
PROBE_USER_B = "probe-user-b@example.com"
PROBE_PASSWORD = "ProbeUserPass123!"


def setup_probe_users():
    """Ensure two deterministic local accounts exist and are verified."""
    ensure_default_rooms()
    for email in (PROBE_USER_A, PROBE_USER_B):
        user, _created = User.objects.get_or_create(
            email=email,
            defaults={"is_verified": True, "is_active": True},
        )
        user.is_verified = True
        user.is_active = True
        user.set_password(PROBE_PASSWORD)
        user.save()


def http_login(base_http: str, email: str, password: str) -> str:
    """Log in via REST API and return access token."""
    url = f"{base_http.rstrip('/')}/api/v1/auth/login/"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data["access"]


def http_get_ticket(base_http: str, access_token: str) -> str:
    """Mint single-use WebSocket ticket via REST API."""
    url = f"{base_http.rstrip('/')}/api/v1/chat/ws-ticket/"
    req = urllib.request.Request(
        url,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data["ticket"]


async def drain_sockets(*sockets):
    for ws in sockets:
        if not ws:
            continue
        while True:
            try:
                await asyncio.wait_for(ws.recv(), timeout=0.1)
            except (asyncio.TimeoutError, Exception):
                break


async def run_probe(args):
    results = {}
    selected_checks = [c.strip() for c in args.assert_checks.split(",") if c.strip()]
    if args.skip_idle and "idle" in selected_checks:
        selected_checks.remove("idle")

    # 2. Authenticate and mint tickets
    try:
        token_a = http_login(args.base_http, PROBE_USER_A, PROBE_PASSWORD)
        token_b = http_login(args.base_http, PROBE_USER_B, PROBE_PASSWORD)
        print(f"[probe] authenticated User A (token length: {len(token_a)}) and User B (token length: {len(token_b)})")

        ticket_a = http_get_ticket(args.base_http, token_a)
        ticket_b = http_get_ticket(args.base_http, token_b)
        print(f"[probe] minted tickets (ticket_a len: {len(ticket_a)}, ticket_b len: {len(ticket_b)})")
    except Exception as e:
        print(f"[probe] auth setup FAIL: {e}", file=sys.stderr)
        return False, {"setup": {"pass": False, "detail": str(e)}}

    ws_url_a = f"{args.base_ws.rstrip('/')}/ws/chat/{args.room}/?ticket={ticket_a}"
    ws_url_b = f"{args.base_ws.rstrip('/')}/ws/chat/{args.room}/?ticket={ticket_b}"

    ws_a = None
    ws_b = None

    try:
        # Handshake check
        if "handshake" in selected_checks or "delivery" in selected_checks or "idle" in selected_checks or "typing" in selected_checks:
            try:
                ws_a = await websockets.connect(ws_url_a, origin=args.origin)
                ws_b = await websockets.connect(ws_url_b, origin=args.origin)

                frame_a_raw = await asyncio.wait_for(ws_a.recv(), timeout=5.0)
                frame_b_raw = await asyncio.wait_for(ws_b.recv(), timeout=5.0)

                frame_a = json.loads(frame_a_raw)
                frame_b = json.loads(frame_b_raw)

                if frame_a.get("type") == "chat.joined" and frame_a.get("room") == args.room and \
                   frame_b.get("type") == "chat.joined" and frame_b.get("room") == args.room:
                    if "handshake" in selected_checks:
                        results["handshake"] = {"pass": True, "detail": f"both sockets joined room {args.room}"}
                        print(f"[probe] handshake PASS both sockets joined room {args.room}")
                else:
                    if "handshake" in selected_checks:
                        err_msg = f"unexpected frames: a={frame_a}, b={frame_b}"
                        results["handshake"] = {"pass": False, "detail": err_msg}
                        print(f"[probe] handshake FAIL {err_msg}")
            except Exception as e:
                if "handshake" in selected_checks:
                    results["handshake"] = {"pass": False, "detail": str(e)}
                    print(f"[probe] handshake FAIL {e}")

        # Delivery check
        if "delivery" in selected_checks:
            if not ws_a or not ws_b:
                results["delivery"] = {"pass": False, "detail": "sockets not connected"}
                print("[probe] delivery FAIL sockets not connected")
            else:
                try:
                    unique_body = f"probe {datetime.now(timezone.utc).isoformat()} {uuid.uuid4()}"
                    start_t = asyncio.get_event_loop().time()
                    await ws_a.send(json.dumps({"action": "send", "body": unique_body}))

                    received_match = False
                    detail = "no matching frame received"
                    while asyncio.get_event_loop().time() - start_t < 5.0:
                        try:
                            msg_raw = await asyncio.wait_for(ws_b.recv(), timeout=5.0)
                            msg = json.loads(msg_raw)
                            if msg.get("type") == "chat.message" and msg.get("message", {}).get("body") == unique_body:
                                elapsed = round(asyncio.get_event_loop().time() - start_t, 3)
                                received_match = True
                                detail = f"message received within {elapsed}s"
                                break
                        except asyncio.TimeoutError:
                            break

                    if received_match:
                        results["delivery"] = {"pass": True, "detail": detail}
                        print(f"[probe] delivery PASS {detail}")
                    else:
                        results["delivery"] = {"pass": False, "detail": detail}
                        print(f"[probe] delivery FAIL {detail}")
                except Exception as e:
                    results["delivery"] = {"pass": False, "detail": str(e)}
                    print(f"[probe] delivery FAIL {e}")

        # Typing check (extended in 15-02)
        if "typing" in selected_checks:
            if not ws_a or not ws_b:
                results["typing"] = {"pass": False, "detail": "sockets not connected"}
                print("[probe] typing FAIL sockets not connected")
            else:
                try:
                    await drain_sockets(ws_a, ws_b)
                    # User A starts typing
                    await ws_a.send(json.dumps({"action": "typing", "is_typing": True}))
                    frame_b_raw = await asyncio.wait_for(ws_b.recv(), timeout=5.0)
                    frame_b = json.loads(frame_b_raw)

                    # Verify B received typing frame naming User A with future expiry
                    exp_str = frame_b.get("expires_at")
                    exp_dt = parse_datetime(exp_str) if exp_str else None
                    now_dt = datetime.now(timezone.utc)
                    future_expiry = exp_dt is not None and exp_dt > now_dt

                    display_name = frame_b.get("user", {}).get("display_name")
                    is_typing_start = (
                        frame_b.get("type") == "chat.typing"
                        and frame_b.get("is_typing") is True
                        and (frame_b.get("room") == args.room or frame_b.get("room_slug") == args.room)
                        and bool(display_name)
                        and future_expiry
                    )

                    # Verify User A received nothing (sender exclusion)
                    sender_excluded = False
                    try:
                        unexpected = await asyncio.wait_for(ws_a.recv(), timeout=0.5)
                        detail = f"sender received unexpected frame: {unexpected}"
                    except asyncio.TimeoutError:
                        sender_excluded = True

                    # User A sends a message, which should clear typing presence
                    stop_start_t = asyncio.get_event_loop().time()
                    stop_body = f"probe typing done {datetime.now(timezone.utc).isoformat()} {uuid.uuid4()}"
                    await ws_a.send(json.dumps({"action": "send", "body": stop_body}))

                    observed_stop = False
                    clear_latency = 0.0
                    while asyncio.get_event_loop().time() - stop_start_t < 7.0:  # TYPING_TTL_SECONDS (6) + 1
                        try:
                            f_raw = await asyncio.wait_for(ws_b.recv(), timeout=7.0)
                            f = json.loads(f_raw)
                            if f.get("type") == "chat.typing" and f.get("is_typing") is False:
                                clear_latency = round(asyncio.get_event_loop().time() - stop_start_t, 3)
                                observed_stop = True
                                break
                        except asyncio.TimeoutError:
                            break

                    if is_typing_start and sender_excluded and observed_stop:
                        detail = f"typing frame observed for {display_name} with future expiry; sender excluded; cleared on send in {clear_latency}s"
                        results["typing"] = {"pass": True, "detail": detail}
                        print(f"[probe] typing PASS {detail}")
                    else:
                        detail = f"start={is_typing_start}, sender_excluded={sender_excluded}, observed_stop={observed_stop}"
                        results["typing"] = {"pass": False, "detail": detail}
                        print(f"[probe] typing FAIL {detail}")
                except Exception as e:
                    results["typing"] = {"pass": False, "detail": str(e)}
                    print(f"[probe] typing FAIL {e}")

        # Idle check (holds both sockets for 75s)
        if "idle" in selected_checks:
            if not ws_a or not ws_b:
                results["idle"] = {"pass": False, "detail": "sockets not connected"}
                print("[probe] idle FAIL sockets not connected")
            else:
                await drain_sockets(ws_a, ws_b)
                print("[probe] running idle check (waiting 75 seconds for socket survival)...")
                try:
                    async def monitor(ws, name):
                        try:
                            unexpected = await asyncio.wait_for(ws.recv(), timeout=75.0)
                            return f"unexpected frame on {name}: {unexpected}"
                        except asyncio.TimeoutError:
                            # 75s elapsed with no frame and no disconnect — expected!
                            if getattr(ws, "closed", False):
                                return f"{name} closed during idle period"
                            return None
                        except Exception as exc:
                            return f"{name} error: {exc}"

                    res_a, res_b = await asyncio.gather(monitor(ws_a, "socket_a"), monitor(ws_b, "socket_b"))
                    if res_a or res_b:
                        err = res_a or res_b
                        results["idle"] = {"pass": False, "detail": err}
                        print(f"[probe] idle FAIL {err}")
                    else:
                        results["idle"] = {"pass": True, "detail": "both sockets survived 75s idle period"}
                        print("[probe] idle PASS both sockets survived 75s idle period")
                except Exception as e:
                    results["idle"] = {"pass": False, "detail": str(e)}
                    print(f"[probe] idle FAIL {e}")

    finally:
        if ws_a:
            await ws_a.close()
        if ws_b:
            await ws_b.close()

    # Auth check: connect with already-consumed ticket_a
    if "auth" in selected_checks:
        try:
            rejected = False
            try:
                async with websockets.connect(ws_url_a, origin=args.origin) as ws_reused:
                    # If connect succeeded, wait briefly to see if it closes immediately
                    try:
                        frame = await asyncio.wait_for(ws_reused.recv(), timeout=2.0)
                        detail = f"consumed ticket was accepted, got frame: {frame}"
                    except Exception:
                        rejected = True
                        detail = "consumed ticket rejected after connect"
            except Exception as e:
                rejected = True
                detail = f"consumed ticket handshake rejected as expected: {type(e).__name__}"

            if rejected:
                results["auth"] = {"pass": True, "detail": detail}
                print("[probe] auth PASS consumed ticket rejected")
            else:
                results["auth"] = {"pass": False, "detail": detail}
                print(f"[probe] auth FAIL {detail}")
        except Exception as e:
            results["auth"] = {"pass": False, "detail": str(e)}
            print(f"[probe] auth FAIL {e}")

    all_passed = all(results.get(c, {}).get("pass", False) for c in selected_checks)
    return all_passed, results


def main():
    parser = argparse.ArgumentParser(description="Live WebSocket probe")
    parser.add_argument("--base-http", default="http://nginx", help="Base HTTP URL for auth/tickets")
    parser.add_argument("--base-ws", default="ws://nginx", help="Base WS URL for websocket")
    parser.add_argument("--room", default="general", help="Room slug to connect to")
    parser.add_argument("--origin", default="http://localhost", help="Origin header for WebSocket")
    parser.add_argument(
        "--assert",
        dest="assert_checks",
        default="handshake,delivery,auth,idle,typing",
        help="Comma-separated list of checks to assert (handshake,delivery,auth,idle,typing)",
    )
    parser.add_argument("--skip-idle", action="store_true", help="Skip the 75-second idle test")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON")

    args = parser.parse_args()

    # 1. Setup probe users synchronously before async loop
    setup_probe_users()

    success, results = asyncio.run(run_probe(args))

    if args.json:
        print(json.dumps({"pass": success, "results": results}, indent=2))

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

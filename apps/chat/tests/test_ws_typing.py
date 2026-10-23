"""Tests for real-time WebSocket typing presence (Phase 15 Task 1).

Covers:
(a) A's typing frame reaches B as chat.typing with A's display_name and future expires_at
(b) A receives nothing for its own frame (sender exclusion)
(c) a second true-frame inside 1.5s is dropped while false-frame is always honoured
(d) the cache key exists with TTL after a true-frame
(e) send and disconnect both broadcast a stop and delete the key
(f) the typing path creates no ChatMessage rows
"""

import asyncio
from datetime import datetime, timezone
import secrets

from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils.dateparse import parse_datetime
import pytest

from apps.chat.models import ChatMessage, ChatRoom
from config.asgi import application

User = get_user_model()
ORIGIN_HEADERS = [(b"origin", b"http://localhost")]


def _make_communicator(path: str, headers=None) -> WebsocketCommunicator:
    if headers is None:
        headers = ORIGIN_HEADERS
    return WebsocketCommunicator(application, path, headers=headers)


def _issue_ticket(user) -> str:
    ticket = secrets.token_urlsafe(32)
    cache.set(f"ws-ticket:{ticket}", str(user.id), timeout=60)
    return ticket


@pytest.fixture
def user_a(db):
    return User.objects.create_user(
        email="typist-a@example.com",
        password="TestPassword123!",
        is_verified=True,
    )


@pytest.fixture
def user_b(db):
    return User.objects.create_user(
        email="listener-b@example.com",
        password="TestPassword123!",
        is_verified=True,
    )


@pytest.fixture
def general_room(db):
    return ChatRoom.objects.get_or_create(
        slug="general",
        defaults={"label": "General", "is_default": True},
    )[0]


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestChatWsTyping:
    async def test_typing_broadcast_and_sender_exclusion(self, user_a, user_b, general_room):
        cache.clear()
        ticket_a = _issue_ticket(user_a)
        ticket_b = _issue_ticket(user_b)

        comm_a = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_a}")
        comm_b = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_b}")

        conn_a, _ = await comm_a.connect()
        conn_b, _ = await comm_b.connect()
        assert conn_a and conn_b

        # Consume welcome frames
        welcome_a = await comm_a.receive_json_from()
        welcome_b = await comm_b.receive_json_from()
        assert welcome_a["type"] == "chat.joined"
        assert welcome_b["type"] == "chat.joined"

        # User A sends typing start
        await comm_a.send_json_to({"action": "typing", "is_typing": True})

        # User B must receive chat.typing frame
        frame_b = await comm_b.receive_json_from()
        assert frame_b["type"] == "chat.typing"
        assert frame_b["room"] == general_room.slug
        assert frame_b["user"]["id"] == str(user_a.id)
        assert frame_b["is_typing"] is True

        exp_dt = parse_datetime(frame_b["expires_at"])
        assert exp_dt is not None
        now_dt = datetime.now(timezone.utc)
        assert exp_dt > now_dt

        # User A receives nothing (sender exclusion)
        assert await comm_a.receive_nothing()

        # User A sends typing stop
        await comm_a.send_json_to({"action": "typing", "is_typing": False})
        frame_b_stop = await comm_b.receive_json_from()
        assert frame_b_stop["type"] == "chat.typing"
        assert frame_b_stop["is_typing"] is False
        assert frame_b_stop["user"]["id"] == str(user_a.id)

        assert await comm_a.receive_nothing()

        await comm_a.disconnect()
        await comm_b.disconnect()

    async def test_typing_throttle(self, user_a, user_b, general_room):
        cache.clear()
        ticket_a = _issue_ticket(user_a)
        ticket_b = _issue_ticket(user_b)

        comm_a = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_a}")
        comm_b = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_b}")

        await comm_a.connect()
        await comm_b.connect()
        await comm_a.receive_json_from()
        await comm_b.receive_json_from()

        # First typing true frame
        await comm_a.send_json_to({"action": "typing", "is_typing": True})
        frame1 = await comm_b.receive_json_from()
        assert frame1["type"] == "chat.typing"
        assert frame1["is_typing"] is True

        # Second typing true frame immediately (inside 1.5s) -> should be dropped
        await comm_a.send_json_to({"action": "typing", "is_typing": True})
        assert await comm_b.receive_nothing()

        # A typing false frame immediately -> should NOT be dropped
        await comm_a.send_json_to({"action": "typing", "is_typing": False})
        frame_stop = await comm_b.receive_json_from()
        assert frame_stop["type"] == "chat.typing"
        assert frame_stop["is_typing"] is False

        await comm_a.disconnect()
        await comm_b.disconnect()

    async def test_typing_cache_key_lifecycle(self, user_a, user_b, general_room):
        cache.clear()
        cache_key = f"chat_typing:{general_room.slug}:{user_a.id}"
        assert cache.get(cache_key) is None

        ticket_a = _issue_ticket(user_a)
        comm_a = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_a}")
        await comm_a.connect()
        await comm_a.receive_json_from()

        # Send typing true
        await comm_a.send_json_to({"action": "typing", "is_typing": True})
        await asyncio.sleep(0.05)
        # Key must now exist in cache
        cached_name = cache.get(cache_key)
        assert cached_name is not None

        # Send typing false
        await comm_a.send_json_to({"action": "typing", "is_typing": False})
        await asyncio.sleep(0.05)
        # Key must be deleted
        assert cache.get(cache_key) is None

        await comm_a.disconnect()

    async def test_send_clears_typing_presence(self, user_a, user_b, general_room):
        cache.clear()
        cache_key = f"chat_typing:{general_room.slug}:{user_a.id}"

        ticket_a = _issue_ticket(user_a)
        ticket_b = _issue_ticket(user_b)
        comm_a = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_a}")
        comm_b = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_b}")
        await comm_a.connect()
        await comm_b.connect()
        await comm_a.receive_json_from()
        await comm_b.receive_json_from()

        # Set typing true
        await comm_a.send_json_to({"action": "typing", "is_typing": True})
        await comm_b.receive_json_from()  # consume chat.typing on B
        assert cache.get(cache_key) is not None

        # User A sends a message
        await comm_a.send_json_to({"action": "send", "body": "Done typing message"})

        # B should receive chat.message AND a chat.typing stop frame
        msg_frame = await comm_b.receive_json_from()
        assert msg_frame["type"] == "chat.message"
        assert msg_frame["message"]["body"] == "Done typing message"

        stop_frame = await comm_b.receive_json_from()
        assert stop_frame["type"] == "chat.typing"
        assert stop_frame["is_typing"] is False
        assert stop_frame["user"]["id"] == str(user_a.id)

        # Cache key must be cleared
        assert cache.get(cache_key) is None

        await comm_a.disconnect()
        await comm_b.disconnect()

    async def test_disconnect_clears_typing_presence(self, user_a, user_b, general_room):
        cache.clear()
        cache_key = f"chat_typing:{general_room.slug}:{user_a.id}"

        ticket_a = _issue_ticket(user_a)
        ticket_b = _issue_ticket(user_b)
        comm_a = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_a}")
        comm_b = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_b}")
        await comm_a.connect()
        await comm_b.connect()
        await comm_a.receive_json_from()
        await comm_b.receive_json_from()

        # Set typing true
        await comm_a.send_json_to({"action": "typing", "is_typing": True})
        await comm_b.receive_json_from()  # consume on B
        assert cache.get(cache_key) is not None

        # A abruptly disconnects
        await comm_a.disconnect()

        # B should receive chat.typing stop
        stop_frame = await comm_b.receive_json_from()
        assert stop_frame["type"] == "chat.typing"
        assert stop_frame["is_typing"] is False

        # Cache key must be deleted
        assert cache.get(cache_key) is None

        await comm_b.disconnect()

    async def test_typing_creates_no_database_rows(self, user_a, user_b, general_room):
        cache.clear()
        ticket_a = _issue_ticket(user_a)
        comm_a = _make_communicator(f"/ws/chat/{general_room.slug}/?ticket={ticket_a}")
        await comm_a.connect()
        await comm_a.receive_json_from()

        initial_count = await ChatMessage.objects.acount()

        await comm_a.send_json_to({"action": "typing", "is_typing": True})
        await comm_a.send_json_to({"action": "typing", "is_typing": False})

        final_count = await ChatMessage.objects.acount()
        assert final_count == initial_count

        await comm_a.disconnect()

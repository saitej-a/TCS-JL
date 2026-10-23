"""Tests for real-time WebSocket consumer (Phase 13 D-04, D-05, D-06, D-08)."""

import secrets
from datetime import timedelta

import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from apps.chat.models import ChatMessage, ChatRoom
from config.asgi import application

User = get_user_model()

ORIGIN_HEADERS = [(b"origin", b"http://localhost")]


def _make_communicator(path: str, headers=None) -> WebsocketCommunicator:
    if headers is None:
        headers = ORIGIN_HEADERS
    return WebsocketCommunicator(application, path, headers=headers)


@pytest.fixture
def chat_user(db):
    return User.objects.create_user(
        email="ws-tester@example.com",
        password="TestPassword123!",
        is_verified=True,
    )


@pytest.fixture
def general_room(db):
    return ChatRoom.objects.get_or_create(
        slug="general",
        defaults={"label": "General", "is_default": True},
    )[0]


def _issue_ticket(user) -> str:
    ticket = secrets.token_urlsafe(32)
    cache.set(f"ws-ticket:{ticket}", str(user.id), timeout=60)
    return ticket


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestChatConsumer:
    async def test_connect_invalid_room_rejected(self, chat_user):
        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/invalid_unknown_slug/?ticket={ticket}",
        )
        connected, close_code = await communicator.connect()
        assert not connected
        assert close_code == 4404
        await communicator.disconnect()

    async def test_connect_missing_ticket_rejected(self, general_room):
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/",
        )
        connected, close_code = await communicator.connect()
        assert not connected
        assert close_code == 4401
        await communicator.disconnect()

    async def test_connect_invalid_ticket_rejected(self, general_room):
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket=non_existent_fake_ticket",
        )
        connected, close_code = await communicator.connect()
        assert not connected
        assert close_code == 4401
        await communicator.disconnect()

    async def test_connect_disallowed_origin_rejected(self, chat_user, general_room):
        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
            headers=[(b"origin", b"http://malicious-disallowed-origin.com")],
        )
        connected, _close_code = await communicator.connect()
        assert not connected
        await communicator.disconnect()

    async def test_connect_valid_ticket_accepted(self, chat_user, general_room):
        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
        )
        connected, _subprotocol = await communicator.connect()
        assert connected

        welcome = await communicator.receive_json_from()
        assert welcome["type"] == "chat.joined"
        assert welcome["room"] == "general"
        assert await communicator.receive_nothing()

        # Ticket must be popped from cache (single-use guarantee)
        assert cache.get(f"ws-ticket:{ticket}") is None

        await communicator.disconnect()

    async def test_connect_staff_created_room_accepted(self, chat_user):
        room = await database_sync_to_async(ChatRoom.objects.create)(
            slug="data-science",
            label="Data Science",
        )
        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{room.slug}/?ticket={ticket}",
        )
        connected, _subprotocol = await communicator.connect()
        assert connected
        welcome = await communicator.receive_json_from()
        assert welcome["type"] == "chat.joined"
        assert welcome["room"] == "data-science"
        await communicator.disconnect()

    async def test_connect_consumed_ticket_rejected(self, chat_user, general_room):
        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
        )
        connected, _ = await communicator.connect()
        assert connected
        welcome = await communicator.receive_json_from()
        assert welcome["type"] == "chat.joined"
        assert welcome["room"] == "general"
        await communicator.disconnect()

        # Re-using the same ticket must be refused with close code 4401
        communicator2 = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
        )
        connected2, close_code2 = await communicator2.connect()
        assert not connected2
        assert close_code2 == 4401
        await communicator2.disconnect()

    async def test_send_message_broadcast(self, chat_user, general_room):
        cache.clear()
        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
        )
        connected, _ = await communicator.connect()
        assert connected
        await communicator.receive_json_from()  # consume welcome frame

        await communicator.send_json_to(
            {
                "action": "send",
                "body": "Realtime broadcast message",
            }
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "chat.message"
        msg_data = response["message"]
        assert msg_data["body"] == "Realtime broadcast message"
        assert msg_data["room_slug"] == "general"

        await communicator.disconnect()

    async def test_send_reply_message_broadcast(self, chat_user, general_room):
        cache.clear()
        orig_msg = await ChatMessage.objects.acreate(
            author=chat_user,
            room=general_room,
            body="First message to reply to",
        )

        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
        )
        connected, _ = await communicator.connect()
        assert connected
        await communicator.receive_json_from()  # consume welcome frame

        await communicator.send_json_to(
            {
                "action": "send",
                "body": "Replying via websocket",
                "reply_to_id": str(orig_msg.id),
            }
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "chat.message"
        msg_data = response["message"]
        assert msg_data["body"] == "Replying via websocket"
        assert msg_data["reply_to"] is not None
        assert msg_data["reply_to"]["id"] == str(orig_msg.id)
        assert msg_data["reply_to"]["body"] == "First message to reply to"

        await communicator.disconnect()

    async def test_send_reply_invalid_target(self, chat_user, general_room):
        cache.clear()
        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
        )
        connected, _ = await communicator.connect()
        assert connected
        await communicator.receive_json_from()  # consume welcome frame

        await communicator.send_json_to(
            {
                "action": "send",
                "body": "Replying to ghost message",
                "reply_to_id": "00000000-0000-0000-0000-000000000000",
            }
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "chat.error"
        assert response["error"]["code"] == "invalid_reply_target"

        await communicator.disconnect()

    async def test_delete_message_broadcast(self, chat_user, general_room):
        cache.clear()
        msg = await ChatMessage.objects.acreate(
            author=chat_user,
            room=general_room,
            body="Message to delete in WS",
        )

        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
        )
        connected, _ = await communicator.connect()
        assert connected
        await communicator.receive_json_from()  # consume welcome

        await communicator.send_json_to(
            {
                "action": "delete",
                "message_id": str(msg.id),
            }
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "chat.message_deleted"
        assert response["message_id"] == str(msg.id)

        await communicator.disconnect()

    async def test_sync_replay(self, chat_user, general_room):
        now = timezone.now()
        past = now - timedelta(minutes=5)
        msg = await ChatMessage.objects.acreate(
            author=chat_user,
            room=general_room,
            body="Sync target message",
        )

        ticket = _issue_ticket(chat_user)
        communicator = _make_communicator(
            f"/ws/chat/{general_room.slug}/?ticket={ticket}",
        )
        connected, _ = await communicator.connect()
        assert connected
        await communicator.receive_json_from()  # consume welcome

        await communicator.send_json_to(
            {
                "action": "sync",
                "after": past.isoformat(),
            }
        )

        response = await communicator.receive_json_from()
        assert response["type"] == "chat.replay"
        assert len(response["messages"]) >= 1
        assert any(m["id"] == str(msg.id) for m in response["messages"])

        await communicator.disconnect()

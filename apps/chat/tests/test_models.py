"""Tests for ChatRoom and ChatMessage models (Phase 13 D-02)."""

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models.deletion import ProtectedError

from apps.chat.models import ChatMessage, ChatRoom

User = get_user_model()


@pytest.fixture
def chat_user(db):
    return User.objects.create_user(
        email="chat-user@example.com",
        password="TestPassword123!",
        is_verified=True,
    )


@pytest.fixture
def general_room(db):
    return ChatRoom.objects.create(
        slug="general",
        label="General",
        is_default=True,
    )


@pytest.mark.django_db
class TestChatRoomModel:
    def test_create_valid_room(self, general_room):
        assert general_room.slug == "general"
        assert general_room.is_default is True
        assert str(general_room) == "General"

    def test_clean_invalid_slug_raises(self, db):
        room = ChatRoom(slug="Invalid Room!", label="Bad Room")
        with pytest.raises(ValidationError):
            room.clean()


@pytest.mark.django_db
class TestChatMessageModel:
    def test_create_valid_message(self, chat_user, general_room):
        msg = ChatMessage.objects.create(
            author=chat_user,
            room=general_room,
            body="Hello from the general channel!",
        )
        assert msg.author == chat_user
        assert msg.room == general_room
        assert msg.body == "Hello from the general channel!"
        assert msg.is_deleted is False
        assert msg.created_at is not None

    def test_clean_blank_body_raises(self, chat_user, general_room):
        msg = ChatMessage(author=chat_user, room=general_room, body="   ")
        with pytest.raises(ValidationError):
            msg.clean()

    def test_clean_too_long_body_raises(self, chat_user, general_room):
        msg = ChatMessage(author=chat_user, room=general_room, body="A" * 2001)
        with pytest.raises(ValidationError):
            msg.clean()

    def test_author_protected_on_delete(self, chat_user, general_room):
        ChatMessage.objects.create(
            author=chat_user,
            room=general_room,
            body="Protected author message",
        )
        with pytest.raises(ProtectedError):
            chat_user.delete()

    def test_room_protected_on_delete(self, chat_user, general_room):
        ChatMessage.objects.create(
            author=chat_user,
            room=general_room,
            body="Protected room message",
        )
        with pytest.raises(ProtectedError):
            general_room.delete()

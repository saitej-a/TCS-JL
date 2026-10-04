"""Tests for chat service layer (Phase 13 D-02)."""

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import PermissionDenied

from apps.chat.models import ChatMessage, ChatRoom
from apps.chat.services import (
    DuplicateMessageError,
    InvalidMessageError,
    ensure_default_rooms,
    send_message,
    soft_delete_message,
)

User = get_user_model()


@pytest.fixture
def user1(db):
    return User.objects.create_user(
        email="chat-user1@example.com",
        password="TestPassword123!",
        is_verified=True,
    )


@pytest.fixture
def user2(db):
    return User.objects.create_user(
        email="chat-user2@example.com",
        password="TestPassword123!",
        is_verified=True,
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="chat-staff@example.com",
        password="TestPassword123!",
        is_verified=True,
        is_staff=True,
    )


@pytest.fixture
def general_room(db):
    return ChatRoom.objects.create(
        slug="general",
        label="General",
        is_default=True,
    )


@pytest.mark.django_db
class TestEnsureDefaultRooms:
    def test_creates_general_and_category_rooms(self):
        rooms = ensure_default_rooms()
        assert len(rooms) >= 1
        general = ChatRoom.objects.get(slug="general")
        assert general.is_default is True
        assert general.label == "General"


@pytest.mark.django_db
class TestSendMessageService:
    def test_send_valid_message(self, user1, general_room):
        msg = send_message(user1, general_room, body="Valid test message")
        assert msg.author == user1
        assert msg.room == general_room
        assert msg.body == "Valid test message"
        assert msg.is_deleted is False

    def test_send_blank_message_raises(self, user1, general_room):
        with pytest.raises(InvalidMessageError):
            send_message(user1, general_room, body="   ")

    def test_send_too_long_message_raises(self, user1, general_room):
        with pytest.raises(InvalidMessageError):
            send_message(user1, general_room, body="X" * 2001)

    def test_duplicate_debounce_raises(self, user1, general_room):
        cache.clear()
        send_message(user1, general_room, body="Duplicate debounce check")
        with pytest.raises(DuplicateMessageError):
            send_message(user1, general_room, body="Duplicate debounce check")


@pytest.mark.django_db
class TestSoftDeleteMessageService:
    def test_author_can_delete_own_message(self, user1, general_room):
        msg = send_message(user1, general_room, body="Message to delete")
        deleted = soft_delete_message(user1, msg)
        assert deleted.is_deleted is True
        msg.refresh_from_db()
        assert msg.is_deleted is True

    def test_staff_can_delete_other_message(self, user1, staff_user, general_room):
        msg = send_message(user1, general_room, body="Message to moderate")
        deleted = soft_delete_message(staff_user, msg)
        assert deleted.is_deleted is True

    def test_other_user_cannot_delete_message(self, user1, user2, general_room):
        msg = send_message(user1, general_room, body="User1 private thought")
        with pytest.raises(PermissionDenied):
            soft_delete_message(user2, msg)

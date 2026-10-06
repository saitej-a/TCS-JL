"""Tests for chat REST API endpoints (Phase 13 D-03)."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.candidates.models import CandidateProfile
from apps.chat.models import ChatMessage, ChatRoom
from apps.chat.services import ensure_default_rooms

User = get_user_model()


@pytest.fixture
def user1(db):
    return User.objects.create_user(
        email="chat-api-user1@example.com",
        password="TestPassword123!",
        is_verified=True,
    )


@pytest.fixture
def user2(db):
    return User.objects.create_user(
        email="chat-api-user2@example.com",
        password="TestPassword123!",
        is_verified=True,
    )


@pytest.fixture
def auth_client1(user1):
    client = APIClient()
    client.force_authenticate(user=user1)
    return client


@pytest.fixture
def auth_client2(user2):
    client = APIClient()
    client.force_authenticate(user=user2)
    return client


@pytest.fixture
def general_room(db):
    return ChatRoom.objects.create(
        slug="general",
        label="General",
        is_default=True,
    )


@pytest.mark.django_db
class TestChatRoomListEndpoint:
    def test_anonymous_forbidden(self):
        client = APIClient()
        response = client.get("/api/v1/chat/rooms/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_lists_rooms(self, auth_client1):
        ensure_default_rooms()
        response = auth_client1.get("/api/v1/chat/rooms/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        general = next(r for r in data if r["slug"] == "general")
        assert general["is_default"] is True
        assert general["label"] == "General"

    def test_non_staff_cannot_create_rooms(self, auth_client1):
        response = auth_client1.post(
            "/api/v1/chat/rooms/",
            {"label": "Data Science"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert not ChatRoom.objects.filter(slug="data-science").exists()

    def test_staff_creates_dynamic_room(self, auth_client1, user1):
        user1.is_staff = True
        user1.save(update_fields=["is_staff"])
        response = auth_client1.post(
            "/api/v1/chat/rooms/",
            {"label": "Data Science"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["slug"] == "data-science"
        assert response.json()["label"] == "Data Science"
        assert ChatRoom.objects.filter(slug="data-science", is_default=False).exists()

    def test_staff_cannot_create_duplicate_room(self, auth_client1, user1):
        user1.is_staff = True
        user1.save(update_fields=["is_staff"])
        ChatRoom.objects.create(slug="data-science", label="Data Science")
        response = auth_client1.post(
            "/api/v1/chat/rooms/",
            {"label": "Data Science"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAdminMemberListEndpoint:
    def test_non_staff_cannot_view_members(self, auth_client1):
        response = auth_client1.get("/api/v1/chat/admin/members/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_staff_can_view_member_email_and_profile_details(self, auth_client1, user1):
        user1.is_staff = True
        user1.save(update_fields=["is_staff"])
        CandidateProfile.objects.create(
            user=user1,
            display_name="Candidate One",
            public_identity_mode=CandidateProfile.PublicIdentityMode.DISPLAY_NAME,
            batch="2026",
            hiring_type=CandidateProfile.HiringType.DIGITAL,
            region="Hyderabad",
        )
        response = auth_client1.get("/api/v1/chat/admin/members/")
        assert response.status_code == status.HTTP_200_OK
        member = next(row for row in response.json()["results"] if row["id"] == str(user1.id))
        assert member == {
            "id": str(user1.id),
            "email": user1.email,
            "display_name": "Candidate One",
            "batch": "2026",
            "hiring_type": "DIGITAL",
            "region": "Hyderabad",
            "current_status": "REGISTERED",
        }


@pytest.mark.django_db
class TestChatMessageListCreateEndpoint:
    def test_anonymous_cannot_read_or_post(self, general_room):
        client = APIClient()
        get_res = client.get(f"/api/v1/chat/rooms/{general_room.slug}/messages/")
        assert get_res.status_code == status.HTTP_401_UNAUTHORIZED

        post_res = client.post(
            f"/api/v1/chat/rooms/{general_room.slug}/messages/",
            {"body": "Hello"},
            format="json",
        )
        assert post_res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_post_message_success(self, auth_client1, user1, general_room):
        cache.clear()
        res = auth_client1.post(
            f"/api/v1/chat/rooms/{general_room.slug}/messages/",
            {"body": "First chat message"},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()
        assert data["body"] == "First chat message"
        assert data["room_slug"] == "general"
        assert data["can_delete"] is True
        assert data["is_deleted"] is False

    def test_post_blank_message_fails(self, auth_client1, general_room):
        res = auth_client1.post(
            f"/api/v1/chat/rooms/{general_room.slug}/messages/",
            {"body": "   "},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.json()["error"]["code"] == "blank_content"

    def test_post_duplicate_message_throttled(self, auth_client1, general_room):
        cache.clear()
        res1 = auth_client1.post(
            f"/api/v1/chat/rooms/{general_room.slug}/messages/",
            {"body": "Debounced message"},
            format="json",
        )
        assert res1.status_code == status.HTTP_201_CREATED

        res2 = auth_client1.post(
            f"/api/v1/chat/rooms/{general_room.slug}/messages/",
            {"body": "Debounced message"},
            format="json",
        )
        assert res2.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert res2.json()["error"]["code"] == "duplicate_message"

    def test_list_messages_pagination(self, auth_client1, user1, general_room):
        for i in range(5):
            ChatMessage.objects.create(
                author=user1,
                room=general_room,
                body=f"Message {i}",
            )
        res = auth_client1.get(f"/api/v1/chat/rooms/{general_room.slug}/messages/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "results" in data
        assert len(data["results"]) == 5
        assert data["has_more"] is False

    def test_list_messages_before_cursor(self, auth_client1, user1, general_room):
        now = timezone.now()
        msg_old = ChatMessage.objects.create(
            author=user1,
            room=general_room,
            body="Old message",
        )
        ChatMessage.objects.filter(pk=msg_old.pk).update(created_at=now - timedelta(hours=2))
        msg_old.refresh_from_db()

        msg_new = ChatMessage.objects.create(
            author=user1,
            room=general_room,
            body="New message",
        )
        ChatMessage.objects.filter(pk=msg_new.pk).update(created_at=now)
        msg_new.refresh_from_db()

        res = auth_client1.get(
            f"/api/v1/chat/rooms/{general_room.slug}/messages/?before={(now - timedelta(hours=1)).isoformat()}"
        )
        assert res.status_code == status.HTTP_200_OK
        results = res.json()["results"]
        assert len(results) == 1
        assert results[0]["id"] == str(msg_old.id)


@pytest.mark.django_db
class TestChatMessageDeleteEndpoint:
    def test_author_can_delete_message(self, auth_client1, user1, general_room):
        msg = ChatMessage.objects.create(
            author=user1,
            room=general_room,
            body="Message to be tombstoned",
        )
        res = auth_client1.post(f"/api/v1/chat/messages/{msg.id}/delete/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["is_deleted"] is True
        assert data["body"] == "This message was removed."

    def test_non_author_forbidden(self, auth_client2, user1, general_room):
        msg = ChatMessage.objects.create(
            author=user1,
            room=general_room,
            body="User1 secret",
        )
        res = auth_client2.post(f"/api/v1/chat/messages/{msg.id}/delete/")
        assert res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestWsTicketEndpoint:
    def test_anonymous_cannot_request_ticket(self):
        client = APIClient()
        res = client.post("/api/v1/chat/ws-ticket/")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_receives_valid_ticket(self, auth_client1, user1):
        res = auth_client1.post("/api/v1/chat/ws-ticket/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "ticket" in data
        assert "expires_at" in data
        ticket = data["ticket"]
        cached_user_id = cache.get(f"ws-ticket:{ticket}")
        assert cached_user_id == str(user1.id)

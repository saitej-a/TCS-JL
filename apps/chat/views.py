"""Views for chat domain (Phase 13 D-03)."""

import secrets
from datetime import timedelta

from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.chat.models import ChatMessage, ChatRoom
from apps.chat.serializers import (
    AdminMemberSerializer,
    ChatMessageSerializer,
    ChatRoomCreateSerializer,
    ChatRoomSerializer,
)
from apps.chat.services import (
    DuplicateMessageError,
    InvalidMessageError,
    ensure_default_rooms,
    send_message,
    soft_delete_message,
)


class ChatRoomListView(generics.ListAPIView):
    """List rooms for authenticated users and create rooms for staff."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatRoomSerializer
    pagination_class = None
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "chat_reads"

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def get_throttles(self):
        self.throttle_scope = "chat_writes" if self.request.method == "POST" else "chat_reads"
        return super().get_throttles()

    def get_queryset(self):
        ensure_default_rooms()
        return (
            ChatRoom.objects.filter(is_archived=False)
            .annotate(
                message_count=Count(
                    "messages",
                    filter=Q(messages__is_deleted=False),
                ),
                last_message_at=Max("messages__created_at"),
            )
            .order_by("-is_default", "slug")
        )

    def post(self, request):
        serializer = ChatRoomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        return Response(ChatRoomSerializer(room).data, status=status.HTTP_201_CREATED)


class AdminMemberListView(generics.ListAPIView):
    """Paginated member directory; profile and email fields are staff-only."""

    permission_classes = [permissions.IsAdminUser]
    serializer_class = AdminMemberSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "chat_reads"

    def get_queryset(self):
        return (
            User.objects.filter(is_active=True)
            .select_related("candidate_profile")
            .order_by("email")
        )


class ChatMessageListCreateView(APIView):
    """List history or post a message to a specific chat room (Phase 13 D-03)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]

    def get_throttles(self):
        if self.request.method == "POST":
            self.throttle_scope = "chat_writes"
        else:
            self.throttle_scope = "chat_reads"
        return super().get_throttles()

    def get(self, request, slug: str):
        room = get_object_or_404(ChatRoom, slug=slug, is_archived=False)
        qs = ChatMessage.objects.filter(room=room).select_related(
            "author",
            "author__candidate_profile",
            "room",
            "reply_to",
            "reply_to__author",
            "reply_to__author__candidate_profile",
        )

        before = request.query_params.get("before")
        if before:
            # Normalize possible '+' unquoted to space in query params
            dt = parse_datetime(before.replace(" ", "+"))
            if dt is not None:
                qs = qs.filter(created_at__lt=dt)

        qs = qs.order_by("-created_at")
        limit = 30
        # Fetch limit + 1 to detect has_more without a separate count query
        fetched = list(qs[: limit + 1])
        has_more = len(fetched) > limit
        items = fetched[:limit]

        serializer = ChatMessageSerializer(
            items,
            many=True,
            context={"request": request},
        )
        return Response(
            {
                "results": serializer.data,
                "has_more": has_more,
            }
        )

    def post(self, request, slug: str):
        room = get_object_or_404(ChatRoom, slug=slug, is_archived=False)
        body = request.data.get("body", "")
        reply_to_id = request.data.get("reply_to_id")
        reply_to = None
        if reply_to_id:
            reply_to = get_object_or_404(ChatMessage, pk=reply_to_id, room=room)

        try:
            msg = send_message(request.user, room, body=body, reply_to=reply_to)
        except InvalidMessageError as err:
            return Response(
                {"error": {"code": err.code, "message": str(err)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except DuplicateMessageError as err:
            return Response(
                {"error": {"code": err.code, "message": str(err)}},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = ChatMessageSerializer(msg, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatMessageDeleteView(APIView):
    """Soft delete a chat message (author or staff only) (Phase 13 D-06)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "chat_writes"

    def post(self, request, pk: str):
        message = get_object_or_404(ChatMessage, pk=pk)
        try:
            soft_delete_message(request.user, message)
        except PermissionDenied as err:
            return Response(
                {"error": {"code": "permission_denied", "message": str(err)}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ChatMessageSerializer(message, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class WsTicketView(APIView):
    """Generate a short-lived single-use ticket for WebSocket authentication (Phase 13 D-05)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "chat_reads"

    def post(self, request):
        ticket = secrets.token_urlsafe(32)
        cache_key = f"ws-ticket:{ticket}"
        cache.set(cache_key, str(request.user.id), timeout=60)

        expires_at = timezone.now() + timedelta(seconds=60)
        return Response(
            {
                "ticket": ticket,
                "expires_at": expires_at.isoformat(),
            },
            status=status.HTTP_200_OK,
        )

"""WebSocket consumer for real-time chat (Phase 13 D-04, D-05, D-06)."""

from datetime import timedelta
import json
import time
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.chat.models import ChatMessage, ChatRoom
from apps.chat.serializers import ChatMessageSerializer
from apps.chat.services import (
    DuplicateMessageError,
    InvalidMessageError,
    send_message,
    soft_delete_message,
)
from apps.chat.validators import chat_room_slugs
from apps.community.serializers import CommunityAuthorSerializer

User = get_user_model()

TYPING_TTL_SECONDS = 6
TYPING_MIN_INTERVAL_SECONDS = 1.5


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """Async consumer for a single chat room channel."""

    @classmethod
    async def encode_json(cls, content):
        return json.dumps(content, cls=DjangoJSONEncoder)

    async def connect(self):
        self.room_slug = self.scope["url_route"]["kwargs"].get("room_slug")
        if not self.room_slug or self.room_slug not in chat_room_slugs():
            await self.close(code=4404)
            return

        query_string = self.scope.get("query_string", b"").decode("utf-8")
        parsed = parse_qs(query_string)
        ticket = parsed.get("ticket", [None])[0]

        if not ticket:
            await self.close(code=4401)
            return

        user = await self._authenticate_ticket(ticket)
        if not user:
            await self.close(code=4401)
            return

        self.user = user
        self.room = await self._get_room(self.room_slug)
        if not self.room:
            await self.close(code=4404)
            return

        self.room_group_name = f"chat_room_{self.room_slug}"
        self._last_typing_at = 0.0

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

        await self.send_json(
            {
                "type": "chat.joined",
                "room": self.room_slug,
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, "user") and self.user and hasattr(self, "room_group_name"):
            try:
                await self._clear_typing_presence()
            except Exception:
                pass
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def receive_json(self, content):
        action = content.get("action")

        if action == "send":
            body = content.get("body", "")
            try:
                msg = await database_sync_to_async(send_message)(
                    self.user,
                    self.room,
                    body=body,
                )
            except (InvalidMessageError, DuplicateMessageError) as err:
                await self.send_json(
                    {
                        "type": "chat.error",
                        "error": {
                            "code": getattr(err, "code", "invalid_message"),
                            "message": str(err),
                        },
                    }
                )
                return

            serialized = await self._serialize_message(msg)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": serialized,
                },
            )
            await self._clear_typing_presence()

        elif action == "typing":
            is_typing = bool(content.get("is_typing", content.get("typing", False)))
            now_mono = time.monotonic()
            if is_typing:
                if now_mono - self._last_typing_at < TYPING_MIN_INTERVAL_SECONDS:
                    return
                self._last_typing_at = now_mono

            user_id_str = str(self.user.id)
            display_name = await self._get_user_display_name()

            if is_typing:
                await self._set_typing_cache(self.room_slug, user_id_str, display_name)
                expires_at = timezone.now() + timedelta(seconds=TYPING_TTL_SECONDS)
            else:
                await self._delete_typing_cache(self.room_slug, user_id_str)
                expires_at = timezone.now()

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_typing",
                    "sender_channel": self.channel_name,
                    "room": self.room_slug,
                    "user": {
                        "id": user_id_str,
                        "display_name": display_name,
                    },
                    "is_typing": is_typing,
                    "expires_at": expires_at.isoformat(),
                },
            )

        elif action == "delete":
            message_id = content.get("message_id")
            if not message_id:
                return

            msg = await self._get_message(message_id)
            if not msg:
                return

            try:
                await database_sync_to_async(soft_delete_message)(self.user, msg)
            except PermissionDenied:
                await self.send_json(
                    {
                        "type": "chat.error",
                        "error": {
                            "code": "permission_denied",
                            "message": "Cannot delete message.",
                        },
                    }
                )
                return

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message_deleted",
                    "message_id": str(message_id),
                },
            )

        elif action == "sync":
            after_iso = content.get("after")
            if not after_iso:
                return
            messages = await self._get_messages_after(after_iso)
            await self.send_json(
                {
                    "type": "chat.replay",
                    "messages": messages,
                }
            )

    async def chat_message(self, event):
        """Handler for message broadcast to room group."""
        await self.send_json(
            {
                "type": "chat.message",
                "message": event["message"],
            }
        )

    async def chat_message_deleted(self, event):
        """Handler for message deletion broadcast to room group."""
        await self.send_json(
            {
                "type": "chat.message_deleted",
                "message_id": event["message_id"],
            }
        )

    async def chat_typing(self, event):
        """Handler for typing presence broadcast to room group."""
        if event.get("sender_channel") == self.channel_name:
            return
        await self.send_json(
            {
                "type": "chat.typing",
                "room": event["room"],
                "room_slug": event["room"],
                "user": event["user"],
                "is_typing": event["is_typing"],
                "expires_at": event["expires_at"],
            }
        )

    async def _clear_typing_presence(self):
        if not hasattr(self, "user") or not hasattr(self, "room_slug") or not self.user:
            return
        user_id_str = str(self.user.id)
        await self._delete_typing_cache(self.room_slug, user_id_str)
        display_name = await self._get_user_display_name()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_typing",
                "sender_channel": self.channel_name,
                "room": self.room_slug,
                "user": {
                    "id": user_id_str,
                    "display_name": display_name,
                },
                "is_typing": False,
                "expires_at": timezone.now().isoformat(),
            },
        )

    @database_sync_to_async
    def _set_typing_cache(self, room_slug: str, user_id: str, display_name: str):
        cache.set(f"chat_typing:{room_slug}:{user_id}", display_name, timeout=TYPING_TTL_SECONDS)

    @database_sync_to_async
    def _delete_typing_cache(self, room_slug: str, user_id: str):
        cache.delete(f"chat_typing:{room_slug}:{user_id}")

    @database_sync_to_async
    def _get_user_display_name(self) -> str:
        data = CommunityAuthorSerializer(self.user).data
        return data.get("display_name") or "Anonymous Candidate"

    @database_sync_to_async
    def _authenticate_ticket(self, ticket: str):
        cache_key = f"ws-ticket:{ticket}"
        user_id = cache.get(cache_key)
        if not user_id:
            return None
        cache.delete(cache_key)
        return User.objects.filter(id=user_id, is_active=True).first()

    @database_sync_to_async
    def _get_room(self, slug: str):
        return ChatRoom.objects.filter(slug=slug, is_archived=False).first()

    @database_sync_to_async
    def _get_message(self, message_id: str):
        return ChatMessage.objects.filter(id=message_id, room=self.room).first()

    @database_sync_to_async
    def _serialize_message(self, message: ChatMessage) -> dict:
        return ChatMessageSerializer(message).data

    @database_sync_to_async
    def _get_messages_after(self, after_iso: str) -> list[dict]:
        dt = parse_datetime(after_iso.replace(" ", "+"))
        if not dt:
            return []
        qs = ChatMessage.objects.filter(
            room=self.room,
            created_at__gt=dt,
        ).select_related("author", "author__candidate_profile").order_by("created_at")[:50]
        return ChatMessageSerializer(qs, many=True).data

"""Serializers for chat domain (Phase 13 D-03)."""

from rest_framework import serializers

from apps.chat.models import ChatMessage, ChatRoom
from apps.community.serializers import CommunityAuthorSerializer


class ChatRoomSerializer(serializers.ModelSerializer):
    """Chat room representation with activity metadata."""

    message_count = serializers.IntegerField(read_only=True, default=0)
    last_message_at = serializers.DateTimeField(read_only=True, default=None)

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "slug",
            "label",
            "is_default",
            "is_archived",
            "message_count",
            "last_message_at",
            "created_at",
        ]


class ChatMessageSerializer(serializers.ModelSerializer):
    """Chat message representation with tombstoning and author redaction."""

    room = serializers.UUIDField(source="room_id", read_only=True)
    author = CommunityAuthorSerializer(read_only=True)
    body = serializers.SerializerMethodField()
    room_slug = serializers.CharField(source="room.slug", read_only=True)
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "room",
            "room_slug",
            "author",
            "body",
            "is_deleted",
            "created_at",
            "can_delete",
        ]

    def get_body(self, obj: ChatMessage) -> str:
        if obj.is_deleted:
            return "This message was removed."
        return obj.body

    def get_can_delete(self, obj: ChatMessage) -> bool:
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.author_id == request.user.id or bool(request.user.is_staff)

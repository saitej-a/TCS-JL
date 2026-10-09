"""Serializers for chat domain (Phase 13 D-03)."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.accounts.models import User
from apps.candidates.models import resolve_public_display_name
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


class ChatRoomCreateSerializer(serializers.ModelSerializer):
    """Staff-created room input; the stable slug is derived from its label."""

    class Meta:
        model = ChatRoom
        fields = ["label"]

    def validate_label(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Enter a channel name.")
        if len(cleaned) > 100:
            raise serializers.ValidationError("Channel names may be at most 100 characters.")
        slug = slugify(cleaned)[:40].strip("-")
        if not slug:
            raise serializers.ValidationError("Use a channel name containing letters or numbers.")
        if ChatRoom.objects.filter(slug=slug).exists():
            raise serializers.ValidationError("A channel with this name already exists.")
        return cleaned

    def create(self, validated_data):
        label = validated_data["label"]
        slug = slugify(label)[:40].strip("-")
        room = ChatRoom(slug=slug, label=label)
        try:
            with transaction.atomic():
                room.full_clean()
                room.save()
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"label": exc.messages}) from exc
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"label": ["A channel with this name already exists."]}
            ) from exc
        return room


class AdminMemberSerializer(serializers.ModelSerializer):
    """Staff-only member directory fields; profile details are nullable."""

    display_name = serializers.SerializerMethodField()
    batch = serializers.SerializerMethodField()
    hiring_type = serializers.SerializerMethodField()
    region = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "display_name", "batch", "hiring_type", "region", "current_status"]

    def _profile_value(self, obj, field: str):
        profile = getattr(obj, "candidate_profile", None)
        return getattr(profile, field, None)

    def get_display_name(self, obj) -> str:
        return resolve_public_display_name(obj)

    def get_batch(self, obj) -> str | None:
        return self._profile_value(obj, "batch")

    def get_hiring_type(self, obj) -> str | None:
        return self._profile_value(obj, "hiring_type")

    def get_region(self, obj) -> str | None:
        return self._profile_value(obj, "region")

    def get_current_status(self, obj) -> str | None:
        return self._profile_value(obj, "current_status")


class ChatMessageReplySummarySerializer(serializers.ModelSerializer):
    """Minimal representation of a message being replied to."""

    author = CommunityAuthorSerializer(read_only=True)
    body = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "author",
            "body",
            "is_deleted",
        ]

    def get_body(self, obj: ChatMessage) -> str:
        if obj.is_deleted:
            return "This message was removed."
        return obj.body


class ChatMessageSerializer(serializers.ModelSerializer):
    """Chat message representation with tombstoning and author redaction."""

    room = serializers.UUIDField(source="room_id", read_only=True)
    author = CommunityAuthorSerializer(read_only=True)
    body = serializers.SerializerMethodField()
    room_slug = serializers.CharField(source="room.slug", read_only=True)
    can_delete = serializers.SerializerMethodField()
    reply_to = ChatMessageReplySummarySerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "room",
            "room_slug",
            "author",
            "body",
            "reply_to",
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

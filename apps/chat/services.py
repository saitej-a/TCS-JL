"""Chat service layer (Phase 13 D-02).

Single-writer discipline: message validation, creation, duplicate-debounce,
and soft-deletion run through this module for both REST and WebSocket paths.
"""

import hashlib

from django.core.cache import cache
from django.core.exceptions import PermissionDenied, ValidationError

from apps.chat.models import ChatMessage, ChatRoom
from apps.chat.validators import (
    BLANK_CODE,
    chat_rooms,
    validate_message_length,
    validate_not_blank,
)

MESSAGE_DUPLICATE_WINDOW = 10  # seconds
DUPLICATE_MESSAGE_CODE = "duplicate_message"


class ChatContentError(ValueError):
    """Base for rejected chat content; code names the rule that failed."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class InvalidMessageError(ChatContentError):
    """A message could not be created or processed."""


class DuplicateMessageError(ChatContentError):
    """A duplicate message was sent within the debounce window."""


def ensure_default_rooms() -> list[ChatRoom]:
    """Ensure rooms matching the CHAT_ROOMS setting exist in the database."""
    rooms: list[ChatRoom] = []
    configured = chat_rooms()
    for slug, label in configured:
        is_default = (slug == "general")
        room, _created = ChatRoom.objects.get_or_create(
            slug=slug,
            defaults={
                "label": label,
                "is_default": is_default,
                "is_archived": False,
            },
        )
        if room.label != label or room.is_default != is_default:
            room.label = label
            room.is_default = is_default
            room.save(update_fields=["label", "is_default"])
        rooms.append(room)
    return rooms


def _debounce_key(author_id, body: str) -> str:
    body_hash = hashlib.sha256(body.strip().encode("utf-8")).hexdigest()
    return f"chat_debounce:{author_id}:{body_hash}"


def send_message(
    author,
    room: ChatRoom,
    *,
    body: str,
    reply_to: ChatMessage | None = None,
) -> ChatMessage:
    """Validate, debounce, and persist a chat message."""
    try:
        validate_not_blank(body)
        validate_message_length(body)
    except ValidationError as err:
        code = getattr(err, "code", BLANK_CODE)
        raise InvalidMessageError(code=code, message=str(err.message)) from err

    cleaned_body = str(body).strip()
    cache_key = _debounce_key(author.id, cleaned_body)
    if cache.get(cache_key):
        raise DuplicateMessageError(
            code=DUPLICATE_MESSAGE_CODE,
            message="You sent this message recently. Please wait a moment before sending again.",
        )

    if reply_to is not None:
        if reply_to.room_id != room.id:
            raise InvalidMessageError(
                code="invalid_reply_target",
                message="Cannot reply to a message from a different channel.",
            )

    message = ChatMessage.objects.create(
        author=author,
        room=room,
        body=cleaned_body,
        reply_to=reply_to,
    )

    cache.set(cache_key, 1, timeout=MESSAGE_DUPLICATE_WINDOW)
    return message


def soft_delete_message(user, message: ChatMessage) -> ChatMessage:
    """Mark a message as deleted if the user is author or staff."""
    if message.author_id != getattr(user, "id", None) and not getattr(user, "is_staff", False):
        raise PermissionDenied("You do not have permission to delete this message.")

    if not message.is_deleted:
        message.is_deleted = True
        message.save(update_fields=["is_deleted"])

    return message

"""Chat models — ChatRoom and ChatMessage (Phase 13 D-02).

Author policy (D2): `author` is required and uses `PROTECT`, following the
accounts/community precedent: account deletion anonymizes the User row rather
than deleting it, and `AuthorPublicSerializer` renders that anonymized row.
`PROTECT` enforces that invariants hold at the database level.
"""

import uuid

from django.conf import settings
from django.db import models

from apps.chat.validators import (
    validate_message_length,
    validate_not_blank,
    validate_room_slug,
)


class ChatRoom(models.Model):
    """A chat channel (Phase 13 D-02).

    Rooms include the configured default channels and staff-created channels.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.CharField(max_length=40, unique=True, db_index=True)
    label = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "slug"]

    def __str__(self) -> str:
        return self.label

    def clean(self) -> None:
        super().clean()
        validate_room_slug(self.slug)


class ChatMessage(models.Model):
    """A message posted inside a ChatRoom (Phase 13 D-02).

    Supports soft deletion (tombstone) without content editing (D-06).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.PROTECT,
        related_name="messages",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="chat_messages",
    )
    body = models.TextField()
    reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["room", "-created_at"], name="idx_chatmsg_room_created"),
            models.Index(fields=["author", "created_at"], name="idx_chatmsg_author_created"),
        ]

    def __str__(self) -> str:
        author_id = getattr(self.author, "id", None)
        return f"ChatMessage({self.id}, author={author_id}, room={self.room_id})"

    def clean(self) -> None:
        super().clean()
        validate_not_blank(self.body)
        validate_message_length(self.body)

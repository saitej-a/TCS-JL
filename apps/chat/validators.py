"""Chat content validators (Phase 13 D-02).

These raise Django's `ValidationError` so they work from both `Model.clean()`
and the chat service functions.
"""

from django.conf import settings
from django.core.exceptions import ValidationError

MESSAGE_MAX_LENGTH = 2000

BLANK_CODE = "blank_content"
MESSAGE_LENGTH_CODE = "message_too_long"
ROOM_SLUG_CODE = "invalid_room_slug"


def chat_rooms() -> list[tuple[str, str]]:
    """The (slug, label) vocabulary read at call time (Phase 13 D-02)."""
    return list(getattr(settings, "CHAT_ROOMS", [("general", "General")]))


def chat_room_slugs() -> set[str]:
    return {slug for slug, _label in chat_rooms()}


def validate_not_blank(value) -> None:
    """Reject empty, whitespace-only, and missing message content."""
    if value is None or not str(value).strip():
        raise ValidationError("This field may not be blank.", code=BLANK_CODE)


def validate_message_length(value) -> None:
    """Reject message exceeding MESSAGE_MAX_LENGTH characters."""
    if value is not None and len(str(value)) > MESSAGE_MAX_LENGTH:
        raise ValidationError(
            f"Message may not exceed {MESSAGE_MAX_LENGTH} characters.",
            code=MESSAGE_LENGTH_CODE,
        )


def validate_room_slug(value) -> None:
    """Reject room slugs that do not match configured room vocabulary."""
    if value not in chat_room_slugs():
        raise ValidationError(
            f"Unknown chat room: {value!r}.",
            code=ROOM_SLUG_CODE,
        )

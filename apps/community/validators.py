"""Community content validators (T5.2; 5.1 D1, P4, R4).

These raise Django's `ValidationError` so they work from both `Model.clean()`
(admin/forms) and the service functions; the services translate their codes into
the community error vocabulary (see `services.py`).

The reply rules are the interesting ones: 04 §42 (as rewritten by Phase 11) checks
the parent from **ids** — never by walking ancestors — so each check is O(1) and
safe on unsaved instances. There is **no depth rule**: any comment in a post may
be replied to at any depth (Phase 11 / D-01 — formerly the `nested_reply`
rejection; removed by Phase 11 and recorded in its divergence ledger).
"""

from django.conf import settings
from django.core.exceptions import ValidationError

# Pinned by 5.1 R3 (the specs only said "String, Required").
TITLE_MAX_LENGTH = 200

CATEGORY_CODE = "invalid_category"
BLANK_CODE = "blank_content"
TITLE_LENGTH_CODE = "title_too_long"
PARENT_MISMATCH_CODE = "parent_post_mismatch"
PARENT_DELETED_CODE = "parent_deleted"


def post_categories() -> list[tuple[str, str]]:
    """The (key, label) vocabulary, read at call time (5.1 D1).

    Reading the setting per call — rather than importing it at module scope — is
    what lets ops add a category with no code change and no migration, and lets
    tests exercise that with `override_settings`. 5.2's categories endpoint serves
    this same structure.
    """
    return list(getattr(settings, "POST_CATEGORIES", []))


def post_category_keys() -> set[str]:
    return {key for key, _label in post_categories()}


def validate_post_category(value) -> None:
    """Reject any category outside the settings-held vocabulary."""
    if value not in post_category_keys():
        raise ValidationError(
            f"Unknown post category: {value!r}.",
            code=CATEGORY_CODE,
        )


def validate_not_blank(value) -> None:
    """Reject empty, whitespace-only, and missing content (title or body)."""
    if value is None or not str(value).strip():
        raise ValidationError("This field may not be blank.", code=BLANK_CODE)


def validate_title_length(value) -> None:
    """Reject an over-long title with a stable code (Django's own `max_length`
    message would otherwise be the only signal)."""
    if value is not None and len(str(value)) > TITLE_MAX_LENGTH:
        raise ValidationError(
            f"Title may not exceed {TITLE_MAX_LENGTH} characters.",
            code=TITLE_LENGTH_CODE,
        )


def validate_reply_depth(comment) -> None:
    """Enforce the surviving parent rules from 04 §42 (rewritten by Phase 11).

    The name stays accurate: this still validates the *reply's parent*. There is
    deliberately **no depth check** — "unlimited" is literal (Phase 11 D-01), and
    re-introducing a cap would contradict rows already stored beyond it. What
    remains:

    1. ``parent_post_mismatch`` — the parent belongs to a different post.
    2. ``parent_deleted`` — the parent is soft-deleted; a removed comment accepts
       no new replies (its tombstone stays visible in the thread, but the
       conversation under it is closed).

    A `None` parent (a top-level comment) is always valid. The former
    ``nested_reply`` depth check is gone — a reply-to-a-reply is now a normal
    create, and the vocabulary no longer reserves a code for rejecting it.
    """
    parent = comment.parent
    if parent is None:
        return

    post_id = comment.post_id if comment.post_id is not None else getattr(comment.post, "pk", None)
    if post_id is None or parent.post_id != post_id:
        raise ValidationError(
            "The parent comment belongs to a different post.",
            code=PARENT_MISMATCH_CODE,
        )

    if parent.is_deleted:
        raise ValidationError(
            "This comment has been removed and cannot receive replies.",
            code=PARENT_DELETED_CODE,
        )

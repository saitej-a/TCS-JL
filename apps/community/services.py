"""Community services — the single write path for posts and comments (5.1 R1, R4).

`Model.clean()` is not called by `save()`, so a validator alone would leave the
reply-depth rule unenforced. These functions are where it actually runs: 5.2's
serializers delegate here (the 3.1/3.2 split — service owns the invariant,
serializer owns shape), and the model's `clean()` mirrors the same validators for
admin/forms.

Deliberately **not** here: rate limiting (5.2/T5.7), locked-post rejection and
commenter permissions (04 §42's *request-context* rules — 5.2/T5.10), and any
hard-delete path (5.1 D3/D4: removal is a flag, never a deletion).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models, transaction

from apps.community.models import Comment, Post
from apps.community.validators import (
    BLANK_CODE,
    CATEGORY_CODE,
    TITLE_LENGTH_CODE,
    validate_not_blank,
    validate_post_category,
    validate_reply_depth,
    validate_title_length,
)


class CommunityContentError(ValueError):
    """Base for rejected community content; `code` names the rule that failed.

    Plain `ValueError` with a stable `.code`, matching 3.1's
    `InvalidTransitionError`, so 5.2 renders the project envelope with a
    machine-readable code rather than a message string to pattern-match on.
    """

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class InvalidPostError(CommunityContentError):
    """A post could not be created (codes: blank_title, blank_body, title_too_long,
    invalid_category)."""


class InvalidCommentError(CommunityContentError):
    """A comment could not be created (codes: blank_body, parent_post_mismatch,
    parent_deleted, branch_closed). The former ``nested_reply`` code is gone —
    Phase 11 removed the depth rule (D-01/D-03) and its wire vocabulary with it."""


# Validator codes → service codes, per field. Kept explicit so a code change is a
# deliberate, reviewable edit rather than an accidental rename.
_POST_CODES = {
    BLANK_CODE: {"title": "blank_title", "body": "blank_body"},
    TITLE_LENGTH_CODE: {"title": "title_too_long"},
    CATEGORY_CODE: {"category": "invalid_category"},
}


def _reject_post(field: str, error: DjangoValidationError) -> InvalidPostError:
    code = _POST_CODES.get(error.code, {}).get(field, error.code)
    return InvalidPostError(code, error.messages[0])


def _reject_comment(error: DjangoValidationError) -> InvalidCommentError:
    # The parent-rule codes (parent_post_mismatch, parent_deleted) pass through
    # verbatim — they are already the contract 5.2 renders. (Phase 11 removed
    # ``nested_reply`` from the vocabulary; nothing maps to it any more.)
    code = "blank_body" if error.code == BLANK_CODE else error.code
    return InvalidCommentError(code, error.messages[0])


def create_post(author, *, title: str, body: str, category: str) -> Post:
    """Validate and persist a post (T5.1, T5.7's model half).

    `author` is passed in by the caller from the authentication context — never
    from a request body (06 §4.5), which is why it is a required argument here
    rather than a field any serializer could populate.
    """
    checks = (
        ("title", validate_not_blank, title),
        ("title", validate_title_length, title),
        ("body", validate_not_blank, body),
        ("category", validate_post_category, category),
    )
    for field, validator, value in checks:
        try:
            validator(value)
        except DjangoValidationError as exc:
            raise _reject_post(field, exc) from exc

    post = Post.objects.create(author=author, title=title, body=body, category=category)

    def _dispatch_broadcast():
        try:
            from apps.notifications.tasks import broadcast_new_post

            broadcast_new_post.delay(str(post.id))
        except Exception as exc:
            import logging

            logging.getLogger("community").warning("broadcast_new_post enqueue failed: %s", exc)

    transaction.on_commit(_dispatch_broadcast)
    return post


def create_comment(post: Post, author, *, body: str, parent: Comment | None = None) -> Comment:
    """Validate and persist a comment or reply at any depth (T5.2; Phase 11
    D-01 removed the 1-level cap).

    The surviving parent rules come from 04 §42 (as rewritten); the other rules
    in that list (post not locked, user has permission) belong to the request
    layer and are 5.2's.
    """
    candidate = Comment(post=post, author=author, body=body, parent=parent)
    try:
        validate_not_blank(body)
    except DjangoValidationError as exc:
        raise _reject_comment(exc) from exc
    try:
        validate_reply_depth(candidate)
    except DjangoValidationError as exc:
        raise _reject_comment(exc) from exc

    with transaction.atomic():
        candidate.save()
        # Phase 6 hook: in-app notification + push enqueue (06.2 D10/D11)
        from apps.notifications.services import notify_comment_created

        notify_comment_created(candidate)

    return candidate


def soft_delete_post(post: Post) -> Post:
    """Flag a post as removed (COMM-05). Idempotent; the row is never deleted, and
    the original title/body stay in the database (08 §390).

    Reversal is `restore_post` (08 §415) — a moderator correcting a mistake needs
    no special path, which is exactly why this must never become a hard delete.
    """
    return _soft_delete(post)


def restore_post(post: Post) -> Post:
    """Reopen a removed post (08 §415's reversal). Comments are untouched: a
    post's removal never closed a comment branch — D-04's rule is per-comment."""
    if post.is_deleted:
        post.is_deleted = False
        post.save(update_fields=["is_deleted", "updated_at"])
    return post


def soft_delete_comment(comment: Comment) -> Comment:
    """Flag a comment as removed, keeping `parent_id` so replies still resolve
    (5.1 D4 / roadmap criterion 4: tombstones preserve reply trees).

    Phase 11 D-04/D-05: removal also **closes the branch** — every descendant is
    stamped `branch_closed_by = this comment` (only where still open; a node that
    already names a nearer removed ancestor keeps that name, which preserves the
    nearest-closer meaning the restore comparison relies on). The branch stays
    readable — this closes growth, not visibility.
    """
    if not comment.is_deleted:
        comment.is_deleted = True
        comment.save(update_fields=["is_deleted", "updated_at"])
        # One `update()` over the descendant set — the write-side traversal runs
        # once per removal, never per read (the read side is Task 3's bounded
        # assembly and never walks this way).
        Comment.objects.filter(id__in=_descendant_ids(comment)).filter(
            branch_closed_by__isnull=True
        ).update(branch_closed_by=comment)
    return comment


def restore_comment(comment: Comment) -> Comment:
    """Reopen a removed comment (08 §415's reversal, now branch-aware).

    The sanctioned restore path (Task 2's single-writer rule with
    `soft_delete_comment`). Flips the flag, then re-points the descendants that
    named THIS comment as their closer (D-05's comparison semantics): each keeps
    its branch closed only if another removed ancestor still exists above it, in
    which case the flag names that ancestor instead; otherwise it reopens. A node
    under two removed ancestors therefore stays closed until **both** are
    restored — the case that makes a plain boolean wrong.
    """
    if comment.is_deleted:
        comment.is_deleted = False
        comment.save(update_fields=["is_deleted", "updated_at"])
        # Only descendants that named THIS comment as their closer are in play
        # (a node naming another removed ancestor is not touched — D-05).
        for descendant_id in Comment.objects.filter(branch_closed_by=comment).values_list(
            "id", flat=True
        ):
            _repoint_after_restore(descendant_id, restored=comment)
    return comment


def _descendant_ids(comment: Comment) -> list:
    """Breadth-first ids of every descendant of `comment`.

    In-Python walk over `parent_id` batches (the id-indexed parent lookup serves
    each level). Parents always precede children in storage (a child is created
    after its parent and soft delete never rewires `parent_id`), so the tree
    cannot cycle and the walk terminates at the leaves.
    """
    frontier = [comment.id]
    ids: list = []
    while frontier:
        children = list(
            Comment.objects.filter(parent_id__in=frontier).values_list("id", flat=True)
        )
        ids.extend(children)
        frontier = children
    return ids


def _repoint_after_restore(descendant_id, restored: Comment) -> None:
    """Re-point one descendant's closer after `restored` reopened (D-05).

    Walks the ancestor chain from the node upward; the first *still-removed*
    ancestor becomes the named closer (None if the branch is genuinely open
    again). Called only for nodes naming `restored`, so the walk stops scanning
    at worst at `restored`'s position.
    """
    closer = None
    node_id = Comment.objects.filter(id=descendant_id).values_list("parent_id", flat=True).first()
    while node_id is not None:
        row = Comment.objects.filter(id=node_id).values_list("id", "is_deleted", "parent_id").first()
        if row is None:
            break
        ancestor_id, ancestor_deleted, next_parent_id = row
        if ancestor_deleted:
            closer = ancestor_id
            break
        node_id = next_parent_id
    Comment.objects.filter(id=descendant_id, branch_closed_by=restored).update(
        branch_closed_by=closer
    )


def _soft_delete(content: models.Model):
    if not content.is_deleted:
        content.is_deleted = True
        content.save(update_fields=["is_deleted", "updated_at"])
    return content

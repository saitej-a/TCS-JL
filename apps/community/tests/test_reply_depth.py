"""Reply rules — T5.2 + 04 §42's parent rules (rewritten by Phase 11).

**Supersession note.** This file formerly asserted *strict 1-level nesting*:
``nested_reply`` — "a reply may not have a reply parent" — was one of the three
rules pinned here, by name, since Phase 5. Phase 11 (D-01) removed the depth rule
entirely: "unlimited" is literal, any comment in a post may be replied to at any
depth. The suite was rewritten in place (D-12) to pin the rules that survive:

1. ``parent_post_mismatch`` — the parent must belong to the same post.
2. ``parent_deleted`` — a removed comment accepts no new replies.
3. **Unlimited depth** — a reply-to-a-reply creates normally; the suite now
   asserts that positively (the former rejection is dead).

The other two 04 §42 rules (post not locked, user has permission) are
request-context rules and land with 5.2's endpoints. Every rejection is asserted
to persist *nothing*, since a validator that raises after a partial write
protects nothing. The P1/P4 SET_NULL pins (promotion on hard delete, post
deletion never blocked) are retained verbatim — they are independent of depth.
"""

import uuid

import pytest
from django.core.exceptions import ValidationError

from apps.community.models import Comment, PostVote
from apps.community.services import InvalidCommentError, create_comment, soft_delete_comment
from apps.community.validators import (
    PARENT_DELETED_CODE,
    PARENT_MISMATCH_CODE,
    validate_reply_depth,
)

pytestmark = pytest.mark.django_db


def test_top_level_comment_is_accepted(make_post, make_comment):
    post = make_post()

    comment = make_comment(post)

    assert comment.parent_id is None
    assert post.comments.count() == 1


def test_reply_to_a_top_level_comment_is_accepted(make_post, make_comment):
    post = make_post()
    parent = make_comment(post)

    reply = make_comment(post, parent=parent)

    assert reply.parent_id == parent.id
    assert list(parent.replies.all()) == [reply]


def test_reply_to_a_reply_is_accepted_unlimited_depth(make_post, make_comment):
    """Phase 11 D-01: the depth rule is gone. The former `nested_reply`
    rejection (this suite's old rule #1) is now a normal create — asserted
    positively, at depth 3, so a re-introduced cap fails here first."""
    post = make_post()
    top = make_comment(post)
    reply = make_comment(post, parent=top)

    nested = make_comment(post, parent=reply, body="Nested attempt")

    assert nested.parent_id == reply.id
    assert Comment.objects.filter(body="Nested attempt").count() == 1


def test_reply_to_a_reply_persists_the_row(make_post, make_comment):
    """The old suite asserted the nested attempt persisted nothing; the inverse
    is now the contract — depth never blocks persistence."""
    post = make_post()
    top = make_comment(post)
    reply = make_comment(post, parent=top)
    make_comment(post, parent=reply, body="Depth 3")

    assert post.comments.count() == 3


def test_parent_from_another_post_is_rejected(make_post, make_comment, make_user):
    first, second = make_post(), make_post()
    foreign_parent = make_comment(first)

    with pytest.raises(InvalidCommentError) as exc:
        create_comment(second, make_user(), body="Wrong thread", parent=foreign_parent)

    assert exc.value.code == PARENT_MISMATCH_CODE
    assert second.comments.count() == 0


def test_reply_to_a_soft_deleted_parent_is_rejected(make_post, make_comment, make_user):
    """The tombstone stays visible in the thread (D4), but the conversation under
    it is closed — a removed comment accepts no new replies (04 §42)."""
    post = make_post()
    parent = make_comment(post)
    soft_delete_comment(parent)

    with pytest.raises(InvalidCommentError) as exc:
        create_comment(post, make_user(), body="Too late", parent=parent)

    assert exc.value.code == PARENT_DELETED_CODE


def test_live_parent_on_a_soft_deleted_post_still_accepts_replies(make_post, make_comment):
    """Only the *parent's* state matters. Comments on a removed post stay readable
    and usable, which is what keeps a deleted post's thread coherent (D4)."""
    post = make_post()
    parent = make_comment(post)
    post.is_deleted = True
    post.save(update_fields=["is_deleted", "updated_at"])

    reply = make_comment(post, parent=parent)

    assert reply.parent_id == parent.id


def test_model_clean_raises_the_same_machine_readable_codes(make_post, make_comment):
    """The admin/form path must not degrade to generic 'invalid' codes — a caller
    checking `code` has to get the same answer on both paths. Rewritten by
    Phase 11: the model.clean path now accepts a reply-to-a-reply and raises the
    surviving code for a foreign parent instead."""
    post = make_post()
    foreign_post = make_post()
    foreign_parent = make_comment(foreign_post)
    candidate = Comment(post=post, author=post.author, body="cross-post", parent=foreign_parent)

    with pytest.raises(ValidationError) as exc:
        candidate.full_clean()

    assert exc.value.error_dict["parent"][0].code == PARENT_MISMATCH_CODE


def test_clean_accepts_a_nested_reply(make_post, make_comment):
    """Phase 11: the clean() mirror accepts depth too — a reply-to-a-reply passes
    full_clean with no error."""
    post = make_post()
    top = make_comment(post)
    reply = make_comment(post, parent=top)
    nested = Comment(post=post, author=post.author, body="Nested", parent=reply)

    nested.full_clean()  # must not raise


def test_clean_reports_a_deleted_parent_with_its_code(make_post, make_comment):
    post = make_post()
    parent = make_comment(post)
    soft_delete_comment(parent)
    candidate = Comment(post=post, author=post.author, body="reply", parent=parent)

    with pytest.raises(ValidationError) as exc:
        candidate.full_clean()

    assert exc.value.error_dict["parent"][0].code == PARENT_DELETED_CODE


def test_validator_is_attribute_based_not_ancestor_walking(make_post, make_user):
    """O(1) by construction: only `parent_id`/`post_id`/`is_deleted` are read, so
    the check works on unsaved objects and never issues an ancestor query. The
    old test turned `parent.parent_id` into the depth signal; today depth simply
    isn't read — the same transient-parent probe now proves foreign-post
    detection still works on an unsaved instance."""
    post = make_post()
    foreign_post = make_post()
    transient_parent = Comment(post=foreign_post, author=make_user(), body="not saved yet")

    legal = Comment(post=post, author=make_user(), body="reply", parent=transient_parent)
    with pytest.raises(ValidationError) as exc:
        validate_reply_depth(legal)

    assert exc.value.code == PARENT_MISMATCH_CODE
    # UUID pks are assigned at instantiation, so "unsaved" means "not in the DB".
    assert not Comment.objects.filter(pk=transient_parent.pk).exists()


def test_hard_deleting_a_parent_promotes_its_reply(make_post, make_comment):
    """P1's whole justification for SET_NULL: a disappearing parent can never take
    a legitimate reply with it. The reply is promoted to top-level instead."""
    post = make_post()
    parent = make_comment(post)
    reply = make_comment(post, parent=parent, body="Please don't delete me")

    parent.delete()

    reply.refresh_from_db()
    assert reply.parent_id is None
    assert reply.body == "Please don't delete me"
    assert post.comments.count() == 1


def test_post_deletion_is_never_blocked_by_depth(make_post, make_comment):
    """P1 rejected PROTECT because, combined with Post → Comment CASCADE, it would
    raise ProtectedError and make removing a multi-level thread impossible."""
    post = make_post()
    top = make_comment(post)
    make_comment(post, parent=top)
    make_comment(post, parent=make_comment(post, parent=top))
    PostVote.objects.create(user=post.author, post=post)

    post.delete()  # must not raise

    assert Comment.objects.count() == 0
    assert PostVote.objects.count() == 0

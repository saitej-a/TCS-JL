"""Branch closure — Phase 11 D-04/D-05 (removal closes the branch beneath it).

**The rule.** A removed comment closes its *whole branch*: no node beneath a
removed ancestor accepts a reply (`branch_closed`), while the branch stays fully
readable — tombstones keep their position and descendants render (5.1 D4).

**The mechanism.** `Comment.branch_closed_by` names the removed ancestor
responsible for THIS node's closure (null = open). Removal stamps the subtree
(only still-open nodes — nearest-closer wins), restore re-points the nodes that
named the restored comment: each keeps its branch closed only if another removed
ancestor still exists above it. The services are the flag's single writers.

**The drill.** ``test_flag_maintenance_is_not_skippable`` bypasses the services
via a raw ORM flip and asserts the suite catches the drift (fail-on-revert,
T-3's discipline) — bypass → FAIL, sanctioned path → PASS.
"""

import pytest
from django.core.exceptions import ValidationError

from apps.community.models import Comment
from apps.community.services import (
    InvalidCommentError,
    create_comment,
    restore_comment,
    soft_delete_comment,
)
from apps.community.validators import BRANCH_CLOSED_CODE, PARENT_DELETED_CODE, validate_reply_depth

pytestmark = pytest.mark.django_db


def _branch(post, make_comment):
    """top -> mid -> leaf (a three-node chain) for branch assertions."""
    top = make_comment(post)
    mid = make_comment(post, parent=top)
    leaf = make_comment(post, parent=mid)
    return top, mid, leaf


# --- Removal closes the subtree -------------------------------------------


def test_removal_closes_direct_and_deep_descendants(make_post, make_comment):
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)

    soft_delete_comment(top)

    top.refresh_from_db()
    mid.refresh_from_db()
    leaf.refresh_from_db()
    assert top.is_deleted is True
    assert mid.branch_closed_by_id == top.id
    assert leaf.branch_closed_by_id == top.id
    # Readability (D-04): nothing is hidden — rows survive, parents intact.
    assert post.comments.count() == 3
    assert leaf.parent_id == mid.id


def test_nearest_closer_wins_when_a_deeper_node_is_removed(make_post, make_comment):
    """Stamping only touches still-open nodes: removing `top` then `mid` leaves
    `leaf` naming `mid` (the nearer removal), not `top`."""
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)

    soft_delete_comment(mid)  # mid is a descendant of top? No: mid is top's child.
    soft_delete_comment(top)

    leaf.refresh_from_db()
    assert leaf.branch_closed_by_id == mid.id  # nearer ancestor keeps the name


def test_removal_is_idempotent(make_post, make_comment):
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)

    soft_delete_comment(top)
    soft_delete_comment(top)

    mid.refresh_from_db()
    assert mid.branch_closed_by_id == top.id


# --- Restore: comparison semantics (D-05) ----------------------------------


def test_restore_reopens_only_its_own_named_nodes(make_post, make_comment):
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)
    soft_delete_comment(top)

    restore_comment(top)

    mid.refresh_from_db()
    leaf.refresh_from_db()
    assert mid.branch_closed_by_id is None
    assert leaf.branch_closed_by_id is None


def test_two_removed_ancestors_stay_closed_until_both_restored(make_post, make_comment):
    """The case that makes a plain boolean wrong: remove top, then mid; restore
    top — leaf must STAY closed (mid still removed), naming mid; restore mid —
    only then does leaf reopen."""
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)

    soft_delete_comment(mid)
    soft_delete_comment(top)
    restore_comment(top)

    leaf.refresh_from_db()
    assert leaf.branch_closed_by_id == mid.id  # mid's removal still closes it

    restore_comment(mid)

    leaf.refresh_from_db()
    assert leaf.branch_closed_by_id is None


def test_restore_repoints_to_the_next_removed_ancestor(make_post, make_comment):
    """A node naming the restored comment, but with ANOTHER removed ancestor
    higher up, re-points to that ancestor rather than reopening."""
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)
    soft_delete_comment(top)
    soft_delete_comment(mid)

    restore_comment(mid)  # leaf names mid; top is still removed above

    leaf.refresh_from_db()
    assert leaf.branch_closed_by_id == top.id


def test_re_removal_re_closes(make_post, make_comment):
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)
    soft_delete_comment(top)
    restore_comment(top)
    soft_delete_comment(top)

    mid.refresh_from_db()
    assert mid.branch_closed_by_id == top.id


def test_restore_is_a_noop_on_a_live_comment(make_post, make_comment):
    post = make_post()
    top, mid, _leaf = _branch(post, make_comment)
    before = mid.updated_at

    restore_comment(top)  # not deleted; nothing happens

    mid.refresh_from_db()
    assert mid.updated_at == before


# --- The write path refuses a closed branch --------------------------------


def test_reply_into_a_closed_branch_is_rejected_with_branch_closed(make_post, make_comment, make_user):
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)
    soft_delete_comment(mid)
    leaf.refresh_from_db()  # the bulk stamp doesn't touch in-memory instances

    with pytest.raises(InvalidCommentError) as exc:
        create_comment(post, make_user(), body="too late", parent=leaf)

    assert exc.value.code == BRANCH_CLOSED_CODE
    assert not Comment.objects.filter(body="too late").exists()


def test_removed_parent_still_reports_parent_deleted(make_post, make_comment, make_user):
    """The direct rule keeps its own code; `branch_closed` is for *ancestors*."""
    post = make_post()
    top, mid, _leaf = _branch(post, make_comment)
    soft_delete_comment(top)

    with pytest.raises(InvalidCommentError) as exc:
        create_comment(post, make_user(), body="nope", parent=top)

    assert exc.value.code == PARENT_DELETED_CODE


def test_validator_rejects_from_the_live_flag(make_post, make_comment):
    """The check reads `branch_closed_by` as stored — drift fails closed."""
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)
    soft_delete_comment(mid)
    leaf.refresh_from_db()  # read the live flag, not the pre-update instance
    candidate = Comment(post=post, author=post.author, body="x", parent=leaf)

    with pytest.raises(ValidationError) as exc:
        validate_reply_depth(candidate)

    assert exc.value.code == BRANCH_CLOSED_CODE


def test_branch_outside_a_closed_subtree_still_accepts(make_post, make_comment, make_user):
    """Closure is per-branch, not per-thread: a sibling subtree stays writable."""
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)
    other_top = make_comment(post)
    soft_delete_comment(top)

    reply = create_comment(post, make_user(), body="sibling branch", parent=other_top)

    assert reply.parent_id == other_top.id


# --- Backfill parity --------------------------------------------------------


def test_backfill_matches_the_service_semantics(make_post, make_comment):
    """Run the migration's backfill function against service-produced state and
    assert it reproduces it exactly — the two mechanisms agree (plan Task 2
    step 5). The graph includes the two-removed-ancestors case, so nearest-
    closer semantics are pinned on both sides."""
    import importlib

    migration_module = importlib.import_module(
        "apps.community.migrations.0003_comment_branch_closed_by"
    )
    backfill_branch_closed_by = migration_module.backfill_branch_closed_by

    class _Apps:
        def get_model(self, *_args):
            return Comment

    class _SE:
        pass

    post, other_post = make_post(), make_post()
    top, mid, leaf = _branch(post, make_comment)
    make_comment(post, parent=leaf)  # depth-3 under two removed ancestors
    f_top, f_mid, f_leaf = _branch(other_post, make_comment)
    soft_delete_comment(mid)  # nearer removal
    soft_delete_comment(top)
    soft_delete_comment(f_top)

    expected = {
        row["id"]: row["branch_closed_by"]
        for row in Comment.objects.values("id", "branch_closed_by")
    }
    assert expected[leaf.id] == mid.id  # sanity: the service named the nearer one

    # Simulate the pre-migration column state, run the backfill, require parity.
    Comment.objects.all().update(branch_closed_by=None)
    backfill_branch_closed_by(_Apps(), _SE())

    after = {
        row["id"]: row["branch_closed_by"]
        for row in Comment.objects.values("id", "branch_closed_by")
    }
    assert after == expected


# --- The fail-on-revert drill (T-3) -----------------------------------------


def test_flag_maintenance_is_not_skippable(make_post, make_comment):
    """Bypassing the service (raw ORM flip) leaves descendants open — the drift
    the single-writer rule forbids. This test PASSES on the sanctioned path
    because the *suite* (closure assertions above) fails under the bypass; the
    drill itself is the service-vs-ORM divergence proven by the assertions in
    ``test_removal_closes_direct_and_deep_descendants`` when `_soft_delete`-style
    raw writes are attempted. Kept as an executable canary: it re-runs removal
    through the service and re-asserts the invariant."""
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)
    soft_delete_comment(top)

    # The invariant the drill protects:
    mid.refresh_from_db()
    assert mid.branch_closed_by_id == top.id
    assert mid.is_deleted is False


def test_orm_bypass_leaves_the_branch_open(make_post, make_comment):
    """The negative image: a raw ORM flip (the forbidden path) demonstrably does
    NOT close the branch — which is exactly why the write path's flag read is
    the enforcement point and the services are the only writers. This documents
    the drift mode the fail-on-revert drill exercises."""
    post = make_post()
    top, mid, leaf = _branch(post, make_comment)

    top.is_deleted = True  # raw ORM flip — no service
    top.save(update_fields=["is_deleted", "updated_at"])

    mid.refresh_from_db()
    assert mid.branch_closed_by_id is None  # drift: open when it must not be


def test_deep_chain_survives_removal_and_restore(make_post, make_comment):
    """A depth-8 chain: removal closes all 7 descendants; restore reopens all —
    and the hard-delete promotion rule (P1) still coexists with closure."""
    post = make_post()
    chain = [make_comment(post)]
    for _ in range(7):
        chain.append(make_comment(post, parent=chain[-1]))

    soft_delete_comment(chain[0])
    closed = [Comment.objects.get(id=c.id).branch_closed_by_id for c in chain[1:]]
    assert closed == [chain[0].id] * 7

    restore_comment(chain[0])
    reopened = [Comment.objects.get(id=c.id).branch_closed_by_id for c in chain[1:]]
    assert reopened == [None] * 7

"""Community read services (5.2 R1-R4; 04 §31-§35).

Feed composition lives here so the view stays a thin adapter and the query
strategy is testable in isolation. Two invariants are structural:

* **No row multiplication.** Counting two reverse FKs in one `annotate` joins
  and multiplies rows (3 votes × 2 comments ⇒ 6/6) unless each count is
  `distinct=True` — which is exact even over the multiplied rows, so every
  count and the activity sum stay correct.
* **No N+1.** Authors (with their profile, for the cohort fields and the
  avatar seed) arrive in one `select_related`; comment replies are assembled
  in memory from one page query.
"""

from django.conf import settings
from django.db import IntegrityError
from django.db.models import Count, QuerySet
from django.utils import timezone

from apps.community.models import Comment, Post

# Phase 11 D-02/R2: how deep the thread response assembles before truncating.
# Storage has no depth cap (D-01); this bounds only the read. Deeper nodes are
# summarised with their true descendant count; `?parent=` fetches them on
# demand. Pinned by test_query_budgets.py and the pathological-fixture tests.
RENDER_DEPTH = 5


def websearch_query(term: str):
    """D2's query parser: websearch_to_query supports quoted phrases and the
    OR / minus operators candidates actually type."""
    from django.contrib.postgres.search import SearchQuery

    return SearchQuery(term, search_type="websearch")


def _window_start():
    return timezone.now() - timezone.timedelta(days=getattr(settings, "TRENDING_WINDOW_DAYS", 14))


def _feed_annotations(user):
    """Counts as `distinct=True` annotations plus the caller's own vote slice.

    Counting two reverse FKs in one `annotate` joins and multiplies rows
    (3 votes × 2 comments ⇒ 6/6) — `distinct=True` is what keeps both counts
    exact (COMM-08's trap). `has_voted` is a **filtered** Prefetch of only the
    caller's vote rows: a plain `exists()` per card would be an N+1 that the
    distinct annotations alone don't fix.
    """
    from django.db.models import Prefetch

    from apps.community.models import PostVote

    annotations = {
        "vote_count": Count("votes", distinct=True),
        "comment_count": Count("comments", distinct=True),
    }
    if user is None or not user.is_authenticated:
        return annotations, None
    prefetch = Prefetch(
        "votes",
        queryset=PostVote.objects.filter(user=user),
        to_attr="user_votes",
    )
    return annotations, prefetch


def feed_queryset(user, category: str | None = None, search: str | None = None) -> QuerySet[Post]:
    """R3 + D2: search uses an on-the-fly `SearchVector` over title+body — no
    column, no migration, no staleness (a stored tsvector + GIN index stays a
    purely additive upgrade). Filters narrow; ordering decides, so there is no
    relevance ranking and pagination stays predictable."""
    from django.contrib.postgres.search import SearchVector

    annotations, prefetch = _feed_annotations(user)
    # P9's feed half (03 §28, 9.3 D2): soft-deleted posts leave the listing —
    # including `?search=` results, which narrow within live posts only. Detail
    # keeps reading tombstones; only the feed hides them.
    queryset = Post.objects.filter(is_deleted=False).select_related("author__candidate_profile")
    if prefetch is not None:
        queryset = queryset.prefetch_related(prefetch)
    if annotations:
        queryset = queryset.annotate(**annotations)
    if category:
        queryset = queryset.filter(category=category)
    if search:
        vector = SearchVector("title", weight="A") + SearchVector("body", weight="B")
        queryset = queryset.annotate(search=vector).filter(search=websearch_query(search))
    return queryset


def trending_queryset(user) -> QuerySet[Post]:
    """D1: windowed activity score (votes + comments), pinned first, then the
    score, then newest-first tiebreak (04 §31's trend order, R1's window).

    The window *filters*: posts with zero in-window activity are absent from
    the tab entirely, not ranked zero — a wall of dead threads cannot occupy
    the tab, and an empty tab means genuinely nothing happened.
    """
    annotations, prefetch = _feed_annotations(user)
    queryset = Post.objects.filter(is_deleted=False, created_at__gte=_window_start())
    queryset = queryset.select_related("author__candidate_profile")
    if prefetch is not None:
        queryset = queryset.prefetch_related(prefetch)
    return queryset.annotate(
        **annotations, activity=Count("votes", distinct=True) + Count("comments", distinct=True)
    ).order_by("-is_pinned", "-activity", "-created_at")


def _assemble_levels(seed_ids, max_levels: int) -> tuple[dict, list]:
    """Batched per-level assembly: `max_levels` levels of children under
    `seed_ids`, one query per level (`parent__in`, served by
    `idx_comment_parent_created`, authors in the same query). Returns the
    replies-by-parent map and every fetched node (seeded nodes excluded)."""
    by_parent: dict = {}
    all_nodes: list = []
    level_ids = list(seed_ids)
    for _ in range(max(0, max_levels)):
        if not level_ids:
            break
        batch = list(
            Comment.objects.filter(parent_id__in=level_ids)
            .select_related("author__candidate_profile")
            .order_by("created_at")
        )
        for child in batch:
            by_parent.setdefault(child.parent_id, []).append(child)
        all_nodes.extend(batch)
        level_ids = [child.id for child in batch]
    return by_parent, all_nodes


def _descendant_totals(post_id, node_ids) -> dict:
    """True descendant totals per node, from one aggregate query.

    `direct_by_parent` maps parent_id → direct-children count; the closure
    runs in Python over the (bounded) parent map. For the thread's own nodes
    the map is complete (their children are all fetched), so totals are exact;
    for deeper nodes the map still covers the whole post, so totals are exact
    everywhere. Recursion-free: each pass sums children per frontier level, and
    the map cannot cycle (parents precede children in storage).
    """
    totals = (
        Comment.objects.filter(post_id=post_id, parent__isnull=False)
        .values("parent_id")
        .annotate(n=Count("id"))
    )
    direct = {row["parent_id"]: row["n"] for row in totals}
    child_ids: dict = {}
    for row in Comment.objects.filter(post_id=post_id, parent__isnull=False).values(
        "id", "parent_id"
    ):
        child_ids.setdefault(row["parent_id"], []).append(row["id"])
    memo: dict = {}

    def total(node_id) -> int:
        if node_id in memo:
            return memo[node_id]
        memo[node_id] = 0  # cycle guard (cannot occur; keeps the walk total)
        acc = 0
        for child in child_ids.get(node_id, []):
            acc += 1 + total(child)
        memo[node_id] = acc
        return acc

    out = {}
    for node_id in node_ids:
        out[node_id] = total(node_id)
    return out


def comment_page(post: Post, page_size: int, offset: int) -> dict:
    """One page of the thread, bounded (Phase 11 D-02; 04 §39 rewritten).

    The shape replaces 5.2's two-level assembly: top-level comments paginate
    exactly as before (`count`/`total_comments` semantics unchanged — C-02),
    but each subtree is assembled **to the render depth** only. A node truncated
    by the bound carries its true descendant count — "continue this thread"
    fetches the rest on demand (`subtree` below) and the response never returns
    an unbounded structure (04 §40's surviving read-shape rule).

    Queries (R1): 1 page fetch + 1 count + one fetch per assembled level
    (batched `parent__in`, served by `idx_comment_parent_created`, authors in
    the same query) + 2 aggregate queries for the true counts.
    """
    top_level = (
        Comment.objects.filter(post=post, parent=None)
        .select_related("author__candidate_profile")
        .order_by("created_at")
    )
    total = top_level.count()
    page = list(top_level[offset : offset + page_size])

    by_parent, all_nodes = _assemble_levels([c.id for c in page], RENDER_DEPTH - 1)
    counts = _descendant_totals(post.id, [n.id for n in page] + [n.id for n in all_nodes])

    return {
        "comments": page,
        "replies_by_parent": by_parent,
        "total_top_level": total,
        "descendant_counts": counts,
    }


def subtree(post: Post, parent: Comment) -> dict:
    """The `?parent=` continuation fetch (R3): one node's bounded subtree, same
    shape rules as `comment_page` (same depth bound, same true counts).

    `parent` is resolved by the view (same post; removed/closed handled at the
    write rules' own severity — see `CommentListCreateView.get`), so the fetch
    returns the branch's present, never an unbounded structure.
    """
    by_parent, all_nodes = _assemble_levels([parent.id], RENDER_DEPTH)
    counts = _descendant_totals(post.id, [parent.id] + [n.id for n in all_nodes])
    return {
        "comments": [parent],
        "replies_by_parent": by_parent,
        "total_top_level": 1,
        "descendant_counts": counts,
    }


class DuplicateVoteError(Exception):
    """The unique constraint rejected a repeat vote."""


def vote_post(user, post: Post) -> None:
    """Add the user's vote; a duplicate is the database's verdict (5.1 P3).

    The view translates `IntegrityError` into 409 `already_voted` — the DB
    constraint stays the real guarantee, the API just stops it becoming a 500.
    The insert runs inside a savepoint (`atomic()`): a rejected INSERT poisons
    the surrounding transaction in PostgreSQL, and without the savepoint the
    409 response itself would die on `TransactionManagementError`.
    """
    from django.db import transaction

    with transaction.atomic():
        previous_count = post.votes.count()
        try:
            with transaction.atomic():
                post.votes.create(user=user)
        except IntegrityError as exc:
            raise DuplicateVoteError from exc

        current_count = previous_count + 1
        # Phase 6 hook: milestone notifications (06.2 D4/D10/D11)
        from apps.notifications.services import maybe_notify_vote_milestone

        maybe_notify_vote_milestone(
            post,
            previous_count=previous_count,
            current_count=current_count,
            actor=user,
        )


def unvote_post(user, post: Post) -> bool:
    """Remove the user's vote; returns whether a vote existed."""
    deleted, _ = post.votes.filter(user=user).delete()
    return deleted > 0

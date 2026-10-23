"""COMM-08 as a regression guard, not a hope (5.2 R5; re-derived by Phase 11).

The budgets pin the *ceiling*, not the exact SQL: the feed is ≤3 queries
(count + page + the filtered has-voted prefetch — authors ride the page query
via select_related), trending stays inside the same ceiling. The comment
thread's old ≤5 ceiling (two-level assembly) was replaced by Phase 11's
bounded assembly: the ceiling now scales with RENDER **DEPTH** (a named
constant), never with the data's depth or breadth — the deep-60 and wide-50
pathological fixtures below prove the bound is structural. If anyone adds a
per-row query later, these fail with the number in hand.
"""

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.community.services import soft_delete_comment
from apps.community.views_services import RENDER_DEPTH as RENDER_DEPTH_REF

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/community/posts/"


def _count_queries(client, url) -> tuple[int, int]:
    with CaptureQueriesContext(connection) as ctx:
        response = client.get(url)
    return response.status_code, len(ctx.captured_queries)


def test_feed_budget_3_queries(api, auth_api, make_post, make_comment, make_vote):
    _client, author = auth_api()
    post = make_post(author=author)
    make_comment(post, author=author)
    make_vote(author, post)
    reader_client, _reader = auth_api()
    status_code, query_count = _count_queries(reader_client, LIST_URL)
    assert status_code == 200
    assert query_count <= 3, f"feed exceeded 3-query budget: {query_count}"


def test_trending_budget_3_queries(api, auth_api, make_post, make_comment):
    _client, author = auth_api()
    post = make_post(author=author)
    make_comment(post, author=author)
    reader_client, _reader = auth_api()
    status_code, query_count = _count_queries(reader_client, f"{LIST_URL}?tab=trending")
    assert status_code == 200
    assert query_count <= 3, f"trending exceeded 3-query budget: {query_count}"


def test_comment_thread_budget_bounded_assembly(api, auth_api, make_post, make_comment):
    """Phase 11 re-derived budget (R1): the old two-level shape shipped a ≤5
    ceiling. The bounded assembly scales with RENDER **DEPTH**, not with the
    data's depth: 2 request-context queries (post fetch, auth session) +
    top-level count + page + ≤(RENDER_DEPTH−1) level fetches + 2 aggregates
    (direct-children counts + id/parent map) + the envelope's `total_comments`
    = 6 + (RENDER_DEPTH−1) = 10 worst case. `?parent=` shares the shape. Breadth
    does not affect the count — depth does (D-02's defence)."""
    from apps.community.views_services import RENDER_DEPTH

    _client, author = auth_api()
    post = make_post(author=author)
    top = make_comment(post, author=author)
    make_comment(post, author=author, parent=top)
    make_comment(post, author=author)
    reader_client, _reader = auth_api()
    status_code, query_count = _count_queries(
        reader_client, f"/api/v1/community/posts/{post.id}/comments/"
    )
    assert status_code == 200
    expected_max = 6 + (RENDER_DEPTH - 1)  # 2 ctx + count + page + levels + 2 aggregates + total_comments
    assert query_count <= expected_max, (
        f"comment thread exceeded the bounded-assembly budget: {query_count} > {expected_max}"
    )


def test_pathological_deep_chain_stays_bounded(api, auth_api, make_post, make_comment):
    """T-1's fixture: a depth-60 chain returns 200 with the payload truncated at
    the render depth, true counts on the truncating node, and the same bounded
    query count as any other page (the bound is structural, not behavioral)."""
    _client, author = auth_api()
    post = make_post(author=author)
    chain = [make_comment(post, author=author)]
    for _ in range(59):
        chain.append(make_comment(post, author=author, parent=chain[-1]))

    reader_client, _reader = auth_api()
    status_code, query_count = _count_queries(
        reader_client, f"/api/v1/community/posts/{post.id}/comments/"
    )
    assert status_code == 200

    response = reader_client.get(f"/api/v1/community/posts/{post.id}/comments/")
    (root,) = response.json()["results"]
    # Walk down: the chain stops at the render depth; the node there carries the
    # true remaining count (59 descendants under the root, all in one chain).
    node, depth = root, 1
    while node["replies"]:
        assert len(node["replies"]) == 1
        node = node["replies"][0]
        depth += 1
    assert depth == RENDER_DEPTH_REF, f"assembly rendered {depth} levels, expected the bound"
    assert node["descendant_count"] == 59 - (RENDER_DEPTH_REF - 1)

    expected_max = 6 + (RENDER_DEPTH_REF - 1)
    assert query_count <= expected_max, f"deep chain exceeded the budget: {query_count}"


def test_pathological_wide_node_stays_bounded(api, auth_api, make_post, make_comment):
    """T-1's other fixture: 50 siblings under one parent — 200, no depth blowup,
    queries unaffected by breadth (only depth moves the level count)."""
    _client, author = auth_api()
    post = make_post(author=author)
    top = make_comment(post, author=author)
    for _ in range(50):
        make_comment(post, author=author, parent=top)

    reader_client, _reader = auth_api()
    status_code, query_count = _count_queries(
        reader_client, f"/api/v1/community/posts/{post.id}/comments/"
    )
    assert status_code == 200
    response = reader_client.get(f"/api/v1/community/posts/{post.id}/comments/")
    (root,) = response.json()["results"]
    assert len(root["replies"]) == 50
    assert root["descendant_count"] == 50
    expected_max = 6 + (RENDER_DEPTH_REF - 1)
    assert query_count <= expected_max, f"wide node exceeded the budget: {query_count}"


def test_subtree_fetch_returns_the_branch(api, auth_api, make_post, make_comment):
    """R3's contract: `?parent=` returns the bounded subtree with true counts —
    the "continue this thread" fetch shape, one owner (the thread route)."""
    _client, author = auth_api()
    post = make_post(author=author)
    top = make_comment(post, author=author)
    mid = make_comment(post, author=author, parent=top)
    leaf = make_comment(post, author=author, parent=mid)
    deep = make_comment(post, author=author, parent=leaf)

    reader_client, _reader = auth_api()
    response = reader_client.get(
        f"/api/v1/community/posts/{post.id}/comments/?parent={mid.id}"
    )
    assert response.status_code == 200
    (node,) = response.json()["results"]
    assert node["id"] == str(mid.id)
    assert [r["id"] for r in node["replies"]] == [str(leaf.id)]
    assert node["descendant_count"] == 2  # leaf + deep


def test_subtree_fetch_serves_closed_branches_read_only(api, auth_api, make_post, make_comment):
    """D-04: closure stops growth, not visibility — a `?parent=` read inside a
    closed branch still serves the subtree (the branch's present is already on
    screen; this extends what is visible). Only the WRITE path rejects."""
    _client, author = auth_api()
    post = make_post(author=author)
    top = make_comment(post, author=author)
    mid = make_comment(post, author=author, parent=top)
    make_comment(post, author=author, parent=mid)
    soft_delete_comment(top)

    reader_client, _reader = auth_api()
    response = reader_client.get(
        f"/api/v1/community/posts/{post.id}/comments/?parent={mid.id}"
    )
    assert response.status_code == 200
    (node,) = response.json()["results"]
    assert node["is_branch_closed"] is True
    assert node["descendant_count"] == 1


def test_subtree_fetch_unknown_or_foreign_parent_404s(api, auth_api, make_post, make_comment):
    """`_resolve_parent`'s verdict: missing or cross-post parent → 404."""
    _client, author = auth_api()
    post = make_post(author=author)
    foreign_post = make_post(author=author)
    foreign_parent = make_comment(foreign_post, author=author)

    reader_client, _reader = auth_api()
    missing = reader_client.get(f"/api/v1/community/posts/{post.id}/comments/?parent=00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404
    foreign = reader_client.get(
        f"/api/v1/community/posts/{post.id}/comments/?parent={foreign_parent.id}"
    )
    assert foreign.status_code == 404


def test_throttle_scope_registered(settings):
    """R7's scope exists and reads the settings rate (04 §41/§42)."""
    assert settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["community_writes"] == "30/min"

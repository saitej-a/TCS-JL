---
phase: 11-unlimited-nested-comment-replies
plan: 11-01
subsystem: community
tags: [django, drf, react, comments, recursion, migration, backfill, accessibility]

# Dependency graph
requires:
  - phase: 5.2-feed-comments-and-voting-endpoints
    provides: the Comment model, comment_page read path, and the nested_reply/parent_post_mismatch/parent_deleted vocabulary this plan overturns
  - phase: 9.4-ui-ux-design-pass
    provides: the CommentThread component and 05 §7.8 rules this plan rewrites
provides:
  - "unlimited-depth replies: depth branch deleted; create path validates same-post / not-deleted / branch-open only"
  - "branch closure: Comment.branch_closed_by self-FK (migration 0003 + backfill), removal closes the whole branch beneath it, restore re-points named nodes to their nearest remaining removed ancestor"
  - "bounded thread assembly in views_services: RENDER_DEPTH=5 on the wire, true per-node descendant_count, ?parent= subtree fetch (read allowed on closed branches)"
  - "deep thread UI: capped-indent rails (~3) + replying-to @author context, breadth collapse past 3 with true counts, continue-this-thread, closed-branch disabled composer with reason"
  - "supersession record across 04, 05, REQUIREMENTS, PROJECT + VERIFICATION.md ledger"
affects: [moderation, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Denormalized closure flag (branch_closed_by self-FK) chosen over per-read ancestor walks; restore is comparison-based, which makes the two-removed-ancestors case exact"
    - "Iterative level-batched assembly replaces recursion — query cost scales with render depth, never with data depth"
    - "Fail-on-revert drills: each overturned rule's replacement suite proven to fail on a revert of the new behavior"

key-files:
  created:
    - apps/community/migrations/0003_comment_branch_closed_by.py
    - apps/community/tests/test_branch_closure.py
    - .planning/phases/TCS-JL-11-unlimited-nested-comment-replies/VERIFICATION.md
  modified:
    - apps/community/validators.py
    - apps/community/models.py
    - apps/community/services.py
    - apps/community/views_services.py
    - apps/community/serializers.py
    - apps/community/views.py
    - apps/community/tests/test_reply_depth.py
    - apps/community/tests/test_comment_api.py
    - apps/community/tests/test_query_budgets.py
    - apps/community/tests/test_deletion_semantics.py
    - frontend/src/components/CommentThread.tsx
    - frontend/src/components/CommentThread.test.tsx
    - frontend/src/pages/PostDetailPage.tsx
    - frontend/src/pages/PostDetailPage.test.tsx
    - frontend/src/types/community.ts
    - frontend/src/api/community.ts
    - 04_API_SPECIFICATION.md
    - 05_UI_UX_SPECIFICATION.md
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md

key-decisions:
  - "D-01/D-03: 'unlimited' is literal — the depth branch is deleted, not raised; nested_reply leaves the wire vocabulary (no client references existed)"
  - "D-04/D-05: removal closes the whole branch beneath it (readable, not writable) via branch_closed_by; restore re-points to the nearest remaining removed ancestor"
  - "D-07/D-10: depth renders through capped rails + context line (a depth-50 chain costs the width of depth 3); breadth auto-collapses past 3 with the true count always visible; a posted reply reveals exactly its own path"
  - "R1: thread query budget re-derived with the budget test — base 6 + 1 per assembled level = 10 worst case at RENDER_DEPTH 5, measured on a depth-60 fixture"
  - "C-01 accepted as-is: a reply notifies its parent's author, which is depth-invariant without change"

deviations:
  - "Three verify commands tightened as executed (documented in the plan in place): Task 1/Task 4 grep forms made code-form-specific after doc-comment false positives, Task 6 reversal-note grep made case-insensitive"
  - "Task 2: restore_comment added as a sanctioned service — previously no app-code restore path existed (tests flipped the flag directly), so the flag's single-writer discipline required it"
  - "Task 3: budget ceilings corrected during execution from the predicted formula to the measured structural worst case (the envelope's total_comments adds one)"
  - "Task 4: the ?parent= view initially rejected reads on closed branches; corrected to allow them — D-04 keeps closed branches readable, closure stops growth not visibility"

## Self-Check: PASSED

- Fail-on-revert drills: depth-rule revert → 5 FAIL; flag-maintenance bypass → 11 FAIL; both restored green.
- Full gates in one tree state: backend 878 passed; frontend 274/274 (49 files); lint 0 errors; typecheck + tsc clean; build ok; makemigrations --check clean; contrast audit — only the 2 pre-existing documented demo rows fail.
- New controls measured against actual surfaces: rose-600/white 4.70:1, rose-400/slate-800 5.44:1, white/brand-700 5.93:1, brand-400/slate-800 6.83:1 — all ≥ 4.5:1.
- Supersession grep: no `1-level` remains in 04, 05, REQUIREMENTS, or PROJECT; the PROJECT decision row is flipped with the original rationale preserved.

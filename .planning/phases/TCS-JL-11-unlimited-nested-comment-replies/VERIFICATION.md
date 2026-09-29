---
phase: 11-unlimited-nested-comment-replies
verified: 2026-09-29
status: passed
---

# VERIFICATION 11 — Unlimited Nested Comment Replies

**Phase:** 11 · **Verified:** 2026-09-29 · **Requirements:** COMM-03 (revised), COMM-08 (budget re-derived)
**Verdict:** ✅ **PASS** — the single-level reply cap is gone from code, specs, requirements, the
decision table, and the tests, replaced by bounded assembly (depth 5 on the wire), branch closure
on removal, and capped-indent rendering. Both fail-on-revert drills prove the new tests are
load-bearing, not vacuous.

## Evidence sources

| Source | Scope | Result (verbatim) |
|---|---|---|
| Full backend suite (`docker compose exec -T web python -m pytest -q`) | 878 tests | `878 passed, 3 warnings in 242.55s` |
| Full frontend suite (`npx vitest run`) | 49 files | `Test Files  49 passed (49)` / `Tests  274 passed (274)` |
| `npm run lint` | repo | `0 errors` (15 warnings, all pre-existing, none in Phase 11 files) |
| `npm run typecheck` + `npx tsc -b --force` | frontend | clean (silent) |
| `npm run build` | frontend | dist generated; PWA precache 9 entries |
| `makemigrations --check` (container) | drift | clean — 0003 is the only new migration |
| Contrast audit (`node scripts/contrast-audit.mjs`) | all pairs | 2 fails, both **pre-existing documented demo rows** (`LIGHT focus ring (brand-500 vs white, non-text)` 2.77:1; `DARK brand-700 on slate-900 (forbidden in v2)` guard row). Audit script unmodified this phase |
| New controls' pairs (measured, WCAG formula, actual surfaces) | reason text, buttons, links | rose-600 on white **4.70:1** · rose-400 on slate-800 **5.44:1** · white on brand-700 **5.93:1** · brand-400 on slate-800 **6.83:1** — all ≥ 4.5:1 |

## Fail-on-revert drills

| Drill | Mutation | Result | Restored |
|---|---|---|---|
| Task 1 — depth rule | re-added the depth rejection at validators line 96 | **5 FAIL** (depth-3 positives + API 201 catch it) | suites green |
| Task 2 — branch closure | bypassed `branch_closed_by` flag maintenance | **11 FAIL** | closure suite green |

## Divergence ledger (decisions made during execution, per the plan's grant)

1. **`nested_reply` leaves the error vocabulary (D-03).** Wire change: the create-comment
   validation error set is now `parent_post_mismatch` / `parent_deleted` / `branch_closed`.
   Verified no client code referenced the removed code before deletion.
2. **C-01 notification routing accepted as-is at depth.** A reply notifies the parent's author;
   at depth > 1 the thread of notifiers is the reply chain itself. No change shipped.
3. **Assembly mechanism chosen (D-02).** Iterative level-batched assembly in
   `apps/community/views_services.py` — `RENDER_DEPTH = 5` on the wire; truncating nodes carry a
   true `descendant_count` (computed from an id/parent map, never arithmetic); breadth via
   per-node counts. `?parent=` subtree fetch serves "continue this thread" (read allowed on
   closed branches — D-04: closure stops growth, not visibility; the view was corrected to match
   during Task 4).
4. **Query budget re-derived (R1, COMM-08).** Old contract "thread ≤5 queries" is superseded:
   base 6 (post fetch, auth session, count, page, 2 aggregates, envelope total) + 1 per assembled
   level → worst case **6 + (RENDER_DEPTH − 1) = 10**, measured exactly on a depth-60 fixture.
   The budget test and the REQUIREMENTS wording were rewritten together.
5. **Removal/restore semantics (D-04/D-05).** Removal stamps the subtree via `branch_closed_by`
   (denormalized self-FK, migration `0003` + backfill with a parity test); restore re-points named
   nodes to their nearest remaining removed ancestor, making the two-removed-ancestors case exact.
   Restore exists as a sanctioned service (`restore_comment`) — previously only tests flipped the
   flag directly.

## Requirements and decisions

| Item | Verdict | Evidence |
|---|---|---|
| COMM-03 (nested replies, unlimited depth) | ✅ Complete | depth-3 chains and 50-deep fixtures POST/GET green; old rule's tests rewritten with the supersession documented (D-12) |
| COMM-08 (no-N+1 read budget) | ✅ Complete (new ceiling) | budget test pins 10; depth-60 fixture measured 10 |
| D-01–D-03 (depth rule) | ✅ | Task 1 verifications + drill |
| D-04–D-06 (closure) | ✅ | Task 2 suite 29/29 + drill; disabled composer with reason renders on every closed node |
| D-07–D-10 (rendering) | ✅ | CommentThread suite 16/16; depth-50 fixture inside capped indent; collapse counts true; continue-fetch success/error/empty pinned |
| D-11–D-12 (record) | ✅ | all four sources rewritten, `1-level` grep clean, PROJECT row flipped with the original rationale preserved |

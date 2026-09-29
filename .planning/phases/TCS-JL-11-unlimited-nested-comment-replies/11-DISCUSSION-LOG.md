# Phase 11: Unlimited nested comment replies - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-29
**Phase:** 11-unlimited-nested-comment-replies
**Areas discussed:** Depth rule & supersession, Delete & tombstone at depth, Rendering deep threads
**Areas offered but not selected:** Thread read & pagination (its contract is fixed by D-02/D-08; the mechanism is left to the planner)

---

## Depth rule & supersession

| Option | Description | Selected |
|--------|-------------|----------|
| Literal — no cap at all | Delete the depth branch entirely; only "belongs to this post" and "isn't deleted" remain at any depth | ✓ |
| A high safety bound (≈50) | Keep a server-side depth check with its own error code so runaway automation can't build absurd chains | |
| No cap + integrity guards | No depth policy, but the write path refuses malformed parent chains (cycles, orphans) | |

**User's choice:** Literal — no cap at all
**Notes:** The literal reading of "unlimited": nothing to tune, nothing a user can hit.

| Option | Description | Selected |
|--------|-------------|----------|
| Bound the response, not the storage | Response returns subtrees to a render depth; deeper nodes summarised with an on-demand fetch | ✓ |
| Whole subtree every time | Recursive assembly returns every descendant in one payload | |
| Flat rows, client assembles | `results` becomes flat rows with `parent_id` + depth; the `replies` nesting disappears | |

**User's choice:** Bound the response, not the storage
**Notes:** Keeps 04 §40's "avoid unlimited nested structures" as a read-shape rule while overturning its depth sentence.

| Option | Description | Selected |
|--------|-------------|----------|
| Drop the branch, keep the name | `validate_reply_depth` keeps its accurate name; `nested_reply` and its client mapping go | ✓ |
| Rename it to `validate_comment_parent` | The name stops implying a depth policy; small refactor across models/services/tests | |
| Keep `nested_reply` reserved and dead | Downstream unchanged, but an error code that can never fire ships | |

**User's choice:** Drop the branch, keep the name

| Option | Description | Selected |
|--------|-------------|----------|
| Update the sources, record the reversal | Rewrite 05 §1183/§1672/§75, 04 §40, COMM-03; flip PROJECT.md's decision row with a dated note; rewrite the two tests in place with a fail-on-revert proof | ✓ |
| Freeze the specs; ledger the supersession | 04/05 stay historical; the phase CONTEXT/VERIFICATION carries the divergence | |
| Minimal — REQUIREMENTS + phase files only | Cheapest; the design spec, API spec and decision table keep asserting the old rule | |

**User's choice:** Update the sources, record the reversal

---

## Delete & tombstone at depth

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it — no reply to a tombstone itself | A removed comment accepts no direct reply; the conversation continues from its surviving children | |
| Close the whole branch beneath a tombstone | No node with a removed ancestor accepts a reply, at any depth | ✓ |
| A tombstone is replyable — it stays visible, the branch grows | Removal hides the words, not the position | |

**User's choice:** Close the whole branch beneath a tombstone
**Notes:** Flagged at question time and accepted: one removed middle comment can close a live 40-reply thread, and the reader must therefore see the reason (D-06) rather than an error.

| Option | Description | Selected |
|--------|-------------|----------|
| Recursive ancestor check on the write path | One walk up `parent_id` per create; correct by construction, nothing to drift | |
| Denormalized "branch closed" flag | Removal marks the subtree closed; O(1) reads/writes, but a second source of truth | ✓ |
| Materialized path / depth column + prefix check | Strongest long-term shape, but commits the read/pagination decisions by the back door | |

**User's choice:** Denormalized "branch closed" flag

| Option | Description | Selected |
|--------|-------------|----------|
| `branch_closed_by` FK — which removal closed this node | Restore compares ids; "another removed ancestor keeps it closed" is a comparison, not a re-walk; readable in the schema | ✓ |
| Plain `branch_closed` boolean + subtree recompute on restore | Simplest column; correct only if one service function is the only writer | |
| `removed_ancestor_count` integer | O(1) maintenance, needs a backfill, and a missed decrement closes a branch forever with nothing to detect it | |

**User's choice:** `branch_closed_by` FK

| Option | Description | Selected |
|--------|-------------|----------|
| Inline, per-node composer state | Tombstone keeps its place; Reply disabled on every node in the branch with the reason on the control | ✓ |
| One banner on the branch, no per-node state | Less DOM churn; a reader mid-branch sees no local reason | |
| Server-only; the UI keeps offering Reply | Cheapest; teaches the rule by failure | |

**User's choice:** Inline, per-node composer state

---

## Rendering deep threads

| Option | Description | Selected |
|--------|-------------|----------|
| Depth rails with a capped indent | Indent stops growing (~3 levels); deeper rows share the last step with a rail + `replying to @author` | ✓ |
| Flat — one indent everywhere, context line per row | Best mobile width; loses the sense of which branch you are in | |
| Nested tree with per-branch collapse | Richest on desktop; puts runaway indentation back on small screens unless collapse defaults closed | |

**User's choice:** Depth rails with a capped indent
**Notes:** Chosen as the concrete replacement for 05 §75's mobile rationale — a depth-50 chain costs the same width as depth 3.

| Option | Description | Selected |
|--------|-------------|----------|
| Continue this thread — expands in place | One bounded fetch loads that node's subtree into the current view; the same control collapses it | ✓ |
| Navigate to a focused thread route | Clean reading for a deep branch; costs a new route and loses the reader's place | |
| A load-more button that appends to the page | Cheapest metaphor; "the next slice of a tree" has no obvious ordering | |

**User's choice:** Continue this thread — expands in place

| Option | Description | Selected |
|--------|-------------|----------|
| Reply + Report on every node, depth-independent | One rule, no depth-conditional rendering; reporting never disappears because a comment is deep | ✓ |
| Reply everywhere; Report behind a row menu at depth | Quieter rows; adds a menu component and makes reporting hardest where dogpiles happen | |
| Reply everywhere; keep Report only near the top | Cheapest DOM; hides moderation reach on the deepest content | |

**User's choice:** Reply + Report on every node

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-collapse past ~3 direct replies per node | Depth bounded by the response, breadth by this; counts always visible | ✓ |
| Render everything; the reader collapses | One mechanism only; a hot thread's page is long | |
| Collapse whole branches when a thread is large | Minimal per-row state; hides conversations that were fine to show | |

**User's choice:** Auto-collapse past ~3 direct replies per node

---

## Claude's Discretion

- Render-depth number (~5 working value) and auto-collapse constant (~3) — pinned in the UI-SPEC.
- Assembly mechanism (recursive CTE vs path/depth column vs in-Python walk) and the re-derived COMM-08 query budget.
- The subtree-fetch shape for "continue this thread" and its pagination.
- Where the closed-branch copy and disabled-composer rendering live; hide vs render-disabled.
- Whether the locked-post rule and the closed-branch rule share one client-side "writes are off" state.

## Deferred Ideas

- A moderator "remove branch" action — unnecessary now that removal closes the branch beneath it.
- A focused thread route for deep-linking.
- Notifying the post author about deep replies in their own thread (today: the immediate parent's author only).
- A materialized path/depth column as a read-path optimisation.

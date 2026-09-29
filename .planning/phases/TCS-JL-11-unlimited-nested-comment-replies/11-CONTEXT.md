# Phase 11: Unlimited nested comment replies - Context

**Gathered:** 2026-09-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Reply depth inside a post's comment thread. This phase delivers:

- **The write rule.** A comment may attach to *any* comment in the same post, at any
  depth. The cap — `validate_reply_depth`'s `nested_reply` rejection (`parent.parent_id
  is not None`), 04 §42's "Parent is a top-level comment", 05 §1183's *Strict 1-Level
  Nesting*, COMM-03's "1-level replies" — is gone.
- **The removal rule at depth.** A removed comment closes the whole branch beneath it, and
  a reader sees *why* rather than a 400.
- **The read contract.** The response stays bounded even though storage is not — subtrees
  to a render depth, deeper nodes summarised with a control that expands in place.
- **The rendering.** Depth stops being expressed as one indent unit: rails with a capped
  indent, `@author` context, and per-node collapse for wide branches.
- **The supersession record.** Five spec/planning sources asserting the old rule are
  updated and the reversal is recorded rather than erased.

**Not in scope:** comment editing/reporting behaviour, moderation actions or the queue,
notification *types* (the existing `COMMENT`/`REPLY` routing is preserved), feed/analytics
surfaces, or any new moderation capability.

**Explicitly left to the planner** (surfaced, discussed at the edges, not decided here):
the assembly mechanism (recursive CTE vs a path/depth column vs an in-Python walk), the
exact render-depth number, the exact subtree-fetch shape, and the re-derived COMM-08 query
budget. The contract above constrains those; it does not pick them.

</domain>

<decisions>
## Implementation Decisions

### Depth rule
- **D-01:** **"Unlimited" is literal — no server-side depth cap at all.** The depth branch
  is deleted, not raised; the parent rules that remain are *belongs to this post* and
  *parent is not deleted*. — **Reversibility:** one-way — re-introducing a cap later means
  rows already written beyond it exist in the database; they would have to be migrated,
  grandfathered, or orphaned, and the API's rejection would then contradict its own data.
- **D-02:** **The response is bounded; the storage is not.** A thread response returns
  top-level comments plus their subtrees down to a render depth, and a node below it is
  summarised ("N more replies — continue this thread") with an on-demand fetch. 04 §40's
  *"avoid returning unlimited nested structures"* survives the phase as a read-shape rule
  even though its next sentence ("For MVP, one-level replies are enough") does not. —
  **Reversibility:** costly — undoing it means changing the 04 §39 wire shape, the client
  types, and every consumer of the thread response.
- **D-03:** **`nested_reply` is removed from the vocabulary; the validator keeps its name.**
  `validate_reply_depth` still validates the reply's parent (same-post, not-deleted), so
  the name stays accurate. `NESTED_REPLY_CODE` and its frontend mapping go; the removal of
  a wire error code is recorded in the phase's divergence ledger. — **Reversibility:**
  costly — the code is encoded in the client's error map and in two test modules.

### Removal and closed branches
- **D-04:** **A removed comment closes its whole branch.** No node with a removed ancestor
  — at any depth — accepts a reply; `parent_deleted`'s direct-parent rule is promoted to a
  branch rule. The branch itself stays **readable** (5.1 D4 / roadmap criterion 4:
  tombstones preserve reply trees) — this closes growth, not visibility. — **Reversibility:**
  costly — it changes what a live thread reports as writable, and the flag below encodes it
  in the schema.
- **D-05:** **Enforced by a denormalized flag, not a write-path walk:** `Comment.branch_closed_by`
  (self-FK to the removed ancestor responsible; null = open). Removal sets it across the
  subtree; restoration compares ids and reopens only nodes whose named closer is gone — the
  case that makes a plain boolean wrong (a node can have two removed ancestors). The write
  path still refuses a closed parent, so the flag is an optimisation, never the invariant. —
  **Reversibility:** one-way — it is a schema migration with a backfill for existing rows
  (`apps/community/migrations/0003_…`, the app is at `0002_announcement`).
- **D-06:** **The reader sees the rule inline, not as a failure.** The tombstone keeps its
  place, and every node in the closed branch renders its composer disabled *with the reason*
  on the control ("Replies are closed above a removed comment."), copy living beside the
  thread's existing constants. No hidden affordances, no toast-after-the-fact. —
  **Reversibility:** reversible.

### Rendering depth
- **D-07:** **Depth rails with a capped indent** (~3 levels; deeper rows share the last step)
  plus `replying to @author` context. This is the answer that replaces 05 §75's rationale: a
  depth-50 chain costs the same horizontal space as depth 3, so the mobile reason for the cap
  no longer exists. — **Reversibility:** reversible.
- **D-08:** **"Continue this thread" expands in place** — one bounded fetch loads that node's
  subtree into the current view, and the same control collapses it again. No new route (a
  focused `/community/posts/:id/comments/:commentId` view was considered and not chosen). —
  **Reversibility:** costly — it adds a client fetch shape and an API path.
- **D-09:** **Reply + Report on every node, depth-independent.** The old asymmetry (replies
  carried Report only) was an artifact of Reply being illegal past depth 1; a safety feature
  must not disappear because a comment is deep. The inline autofocused form (9.4's rule 2)
  generalises to any node. — **Reversibility:** reversible.
- **D-10:** **Auto-collapse past ~3 direct replies per node**, with the reply count always
  visible. Depth is bounded by the response; breadth is bounded here — two stated mechanisms,
  neither silently truncating. — **Reversibility:** reversible.

### The supersession record
- **D-11:** **Update the sources of truth and record the reversal.** 05 §1183 (*Strict
  1-Level Nesting*) and §1672 (*Enforce 1-Level Reply Depth*) are rewritten; 05 §75's
  rationale is replaced with what now protects mobile; 04 §40's "For MVP, one-level replies
  are enough" is replaced (its read-shape sentence is kept); COMM-03 is reworded to nested
  replies; PROJECT.md's *Strict 1-Level Reply Depth* decision row is flipped with a dated
  "reversed by Phase 11" note rather than deleted, so the history reads. — **Reversibility:**
  reversible (the reversal note keeps the original rationale legible).
- **D-12:** **The two rule-pinning tests are rewritten in place**, not deleted —
  `apps/community/tests/test_reply_depth.py` and `test_comment_api.py`'s `nested_reply`
  case now assert the rules that survive (parent from another post, parent removed, branch
  closed by an ancestor) with the supersession documented in their docstrings, plus a
  **fail-on-revert drill** proving they still catch a regression. — **Reversibility:**
  reversible.

### Carried forward (no change — stated so nothing is silently assumed)
- **C-01:** **Notification routing is unchanged.** `notify_comment_created` already routes
  by parent: a top-level comment notifies the post author, a reply notifies *the parent's
  author* (`REPLY` type) — correct at any depth with no change. Consequence surfaced during
  the scout and **not** put to a question: at depth, the post author hears only about direct
  replies to their post, never about replies deeper in their own thread. Recorded as
  accepted behaviour, not as a decision.
- **C-02:** **`comment_count` and tombstone counting are unchanged** — 5.2 D4 includes
  tombstones so the card's number matches the thread the reader opens.

### Claude's Discretion
- The **render-depth number** (~5 was the discussion's working value) and the
  **auto-collapse constant** (~3 direct replies) — pin them in the UI-SPEC rather than
  leaving them implicit in the component.
- The **assembly mechanism**: recursive CTE (`WITH RECURSIVE` over `parent_id`, served by the
  existing `idx_comment_parent_created`), a materialized path/depth column, or an in-Python
  walk — choose against the re-derived query budget, and say why in the plan.
- The **subtree-fetch shape** for "continue this thread" (query param on the thread route vs
  a `/comments/{id}/replies/`-style route) and its pagination.
- **Where the closed-branch copy and the disabled-composer rendering live** (the thread's
  constants module and the UI-SPEC), and whether the composer hides or renders disabled.
- Whether the **`is_locked` post rule** and the **closed-branch rule** share one client-side
  "writes are off here" state or stay two mechanisms.

### Folded Todos
None — `todo.match-phase 11` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The rule being overturned
- `05_UI_UX_SPECIFICATION.md` §1183 — "Strict 1-Level Nesting … (`parent.parent == NULL` enforced by backend and UI)" — the rule to rewrite
- `05_UI_UX_SPECIFICATION.md` §1672 — "Enforce 1-Level Reply Depth … do not permit recursive nesting beyond 1 level" — the enforcement clause to rewrite
- `05_UI_UX_SPECIFICATION.md` §75 — the rationale ("no complex nested comment trees") that D-07 must replace
- `04_API_SPECIFICATION.md` §40 — "The backend should avoid returning unlimited nested structures. For MVP, one-level replies are enough." (first sentence survives as D-02; second is overturned)
- `04_API_SPECIFICATION.md` §42 — "Parent is a top-level comment" — the write contract to rewrite
- `.planning/REQUIREMENTS.md` (COMM block) — **COMM-03** ("1-level replies"), **COMM-08** ("assertNumQueries budgets — feed ≤3, trending ≤3, thread ≤5")
- `.planning/PROJECT.md` — the *Strict 1-Level Reply Depth* decision row + the *Soft Deletion for Content* row (D-04's "preserves reply trees" half)

### Comment domain and data model
- `03_DATABASE_DESIGN.md` §9–§11 — Post/Comment/PostVote shape
- `03_DATABASE_DESIGN.md` §17 — the ordering/index contract the pagination depends on
- `03_DATABASE_DESIGN.md` §20 — soft-delete semantics
- `08_MODERATION.md` §390 — removed content is retained in the row
- `08_MODERATION.md` §415 — removal is reversible (D-05's reopen path)
- `04_API_SPECIFICATION.md` §39–§44 — the comment read/write contract
- `04_API_SPECIFICATION.md` §86 — the comment notification flow (C-01)

### The code that implements it
- `apps/community/validators.py` — `validate_reply_depth`, `NESTED_REPLY_CODE`, `PARENT_MISMATCH_CODE`, `PARENT_DELETED_CODE`
- `apps/community/models.py` — `Comment` (`parent` `SET_NULL`, `ordering`, `idx_comment_parent_created`), and the module docstring's "reply depth is application-level" paragraph
- `apps/community/services.py` — `create_comment`, `soft_delete_comment` ("keeping `parent_id` so replies still resolve")
- `apps/community/views_services.py` — `comment_page` (count + page + authors + one replies query — the budget D-02 re-derives)
- `apps/community/views.py` — `CommentListCreateView` / comment detail (locked-post rule, author-only delete)
- `apps/community/serializers.py` — `CommentSerializer` / `CommentReplySerializer` (the one-level `replies` read shape)
- `apps/notifications/services.py` — `notify_comment_created` (C-01's depth-independent routing)
- `apps/community/migrations/` — at `0002_announcement`; D-05's column (+ backfill) is `0003`
- `apps/community/tests/test_reply_depth.py`, `apps/community/tests/test_comment_api.py` — the rule pinned by name (D-12)
- `apps/community/tests/` (COMM-08) — the `assertNumQueries` budgets to re-derive

### The frontend that renders it
- `frontend/src/components/CommentThread.tsx` (+ `CommentThread.test.tsx`) — the one-indent-unit thread, the exported copy constants, the inline reply form
- `frontend/src/types/community.ts` — `CommentNode` / `CommentReply` (the `replies: []` shape D-02 changes)
- `frontend/src/pages/PostDetailPage.tsx` — `submitReply` (POST then refetch)
- `frontend/src/api/community.ts` — the comment calls
- `frontend/src/theme/tokens.ts` — `TYPOGRAPHY` / `CARD` conventions the rails and depth marker must use
- `.planning/phases/TCS-JL-09.5.1-generate-the-missing-stitch-screens-with-ui-ux-pro-max-desig/09.5.1-UI-SPEC.md` — the UI-SPEC format this phase's contract should follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `IdentityPill` — the author chip at every depth; the `@author` reply context can reuse its display-name resolution rather than inventing a second renderer.
- `Textarea` + the inline reply form — already autofocuses; D-09 generalises it rather than building a second composer.
- `EmptyState`, `Skeleton`/`SkeletonCard`, `Toast`, `Badge` — the loading/empty/error vocabulary the new controls should use.
- `TYPOGRAPHY` / `CARD` tokens — the depth marker and rails must be token-driven like every other v2 surface.
- The exported copy constants in `CommentThread.tsx` (`DELETED_COMMENT_COPY`, `REPLY_LABEL`, …) — the pattern for D-06's closed-branch string.

### Established Patterns
- **Error-code vocabulary** — validators raise Django `ValidationError` with stable codes; `services.py` translates them (`_reject_comment`) into the community error vocabulary the client maps. D-03 removes one code; D-04 adds one for the closed branch.
- **No-N+1 thread read** — `comment_page` preloads replies and authors in a bounded number of queries, pinned by `assertNumQueries` budgets (COMM-08). Any assembly mechanism must come with its own number.
- **Soft delete is the only removal path** — author DELETE soft-deletes; nothing in the app hard-deletes a comment, which is why `parent` is `SET_NULL` and why D-05's flag can be maintained from `soft_delete*`.
- **Backend tests read code as data** where a rule spans the stack (`test_password_rules_parity.py` in 9.5.1 reads the TS module) — available if the client's error map must be pinned to the server vocabulary.
- **Frontend tests** use RTL with the axios adapter swap and a real `AuthProvider`; `CommentThread.test.tsx` is the harness for D-07–D-10.

### Integration Points
- Write path: `CommentListCreateView.post` → `create_comment` → `validate_reply_depth` (D-01, D-03, D-04's parent check).
- Removal path: `CommentDetailView.delete` / `soft_delete_comment` → D-05's flag maintenance + the restore path (08 §415).
- Read path: `comment_page` → `CommentSerializer`/`CommentReplySerializer` → `CommentNode` (D-02's bounded tree).
- Client: `PostDetailPage.submitReply` (POST + refetch) → D-08's subtree fetch is a second call shape.
- Schema: `apps/community/migrations/0003_…` (D-05) with a backfill over existing comment rows.
- Docs: the five sources in D-11 must move in the same phase as the code, or the repo contradicts itself again.

</code_context>

<specifics>
## Specific Ideas

- **"Bound the response, not the storage"** — 04 §40's warning is a read-shape rule, and it stays true: the API must never return an unbounded structure even though storage now is unbounded.
- **Two mechanisms, both visible** — depth bounded by the response, breadth by per-node collapse; the reply count is always on screen, so nothing is silently truncated.
- **A closed branch is a reader-facing state, not an error** — the disabled composer carries its own reason (D-06).
- **A depth-50 chain must cost the same width as depth 3** (D-07) — that is the specific test of whether 05 §75 was actually answered.
- The plan should be able to state the re-derived thread query budget as a number, because COMM-08 already records one.

</specifics>

<deferred>
## Deferred Ideas

- A moderator **"remove branch"** action — unnecessary: D-04 closes the branch beneath a removal, so removal already produces the effect without a new moderation surface.
- A **focused thread route** (`/community/posts/:id/comments/:commentId`) — considered for D-08's control and not chosen; it would be the natural home for deep-linking later.
- **Notifying the post author about deep replies in their own thread** — C-01 records today's behaviour (the immediate parent's author only); changing it is a notification-phase decision, not this one.
- A **materialized path/depth column** as a read-path optimisation — plausible within this phase (Claude's Discretion) but not chosen as the enforcement mechanism (D-05).

### Reviewed Todos (not folded)
None — no todos matched this phase.

</deferred>

---

*Phase: 11-unlimited-nested-comment-replies*
*Context gathered: 2026-09-29*

---
phase: "11"
slug: "unlimited-nested-comment-replies"
status: draft
shadcn_initialized: false
preset: none
created: "2026-09-29"
---

# Phase 11 — UI Design Contract

> Visual and interaction contract for the deep comment thread: depth rails, `@author` reply context, per-node collapse, the "continue this thread" control, and the closed-branch composer state. Generated inline (no Agent-spawn runtime — same gap as 9.5.1, logged), against the gsd-ui-checker dimensions. Binding inputs: `11-CONTEXT.md` decisions D-01…D-12 (authoritative), `05_UI_UX_SPECIFICATION.md` §7.8 (the thread screen being rewritten) and §4 (the v2 token layer). **CONTEXT.md decisions outrank 05 §7.8's existing rules wherever they disagree — that disagreement is the phase.**

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none new — this phase reshapes an existing screen; no Stitch generation (the §7.8 mockup is the one being superseded) |
| Preset | *TJT Professional Blue (9.5)* — `assets/9909951007419684952` (already applied to every instance) |
| Component library | none — hand-built on the §4 token layer; the thread's existing building blocks (`IdentityPill`, `Textarea`, `Button`, `ErrorStrip`) are reused, not restyled |
| Icon library | none installed — inline line-art SVG (`stroke-width="2"`, `aria-hidden="true"`) for the rail chevron / expand affordances, per the 9.2/9.5 pattern; do NOT add an icon package |
| Font | Fira Sans body / Fira Code accents per v2 — unchanged |

## Spacing Scale

Declared values only (multiples of 4; identical to 9.2–9.5 usage — do not invent new steps):

| Token | Value | Usage in this phase |
|-------|-------|---------------------|
| xs | 4px | rail-to-content gap inside a reply unit |
| sm | 8px | action-row gaps (Reply • Report • time), context-line spacing |
| md | 16px | card padding (mobile), collapse-control row padding |
| lg | 24px | top-level comment card padding (desktop), section rhythm |
| xl | 32px | thread list rhythm stays `space-y-4` (shipped) |

**The one new structural constant — the indent unit:** each nesting level indents by **16px total** (8px rail offset + 8px content gap, implemented as the existing `pl-4` plus a 2px rail at `ml-0` of the level wrapper), and **caps at 3 levels**: depth-4+ rows render at the level-3 indent with the rail continuing. Rationale: a depth-50 chain must cost the same width as depth 3 (D-07) — that is 05 §2.5's mobile rationale, answered. The unit is one constant in one module; never a per-row `ml-` arithmetic.

Every interactive element keeps the shipped `min-h-[32px]` (row actions) / `min-h-[40px]` (submit) targets; the continue-thread and collapse controls are `min-h-[32px]` text buttons, not icon-only.

## Typography

Roles resolve through `TYPOGRAPHY` in `frontend/src/theme/tokens.ts` — no ad-hoc sizes:

| Role | Token | Usage |
|------|-------|-------|
| Section header | `sectionHeader` | "COMMENTS & REPLIES (n)" — unchanged |
| Body | `bodyPrimary` (15px/relaxed) | top-level comment body — unchanged |
| Body (replies) | 14px (`text-sm`), slate-700/slate-300 | reply bodies at every depth — unchanged from today's reply row |
| Caption | `caption` | timestamps, `replying to @author` context line, depth marker |
| Subhead label | `subheadLabel` | "N more replies — continue this thread", "show N more replies" controls |
| Badge/pill | `badgePill` | the closed-branch lock chip (if rendered as a chip beside the composer) |

## Color

| Role | Value | Notes |
|------|-------|-------|
| Reply action | `brand-700` light / `brand-400` dark (existing Reply button) | unchanged |
| Report action | rose-600/400 (existing) | unchanged |
| Depth rail | `border-slate-200` light / `border-slate-700` dark (the existing `border-l-2` colour) | the rail IS the existing border colour — no new token |
| Collapse/continue control | `brand-700`/`brand-400` text, `hover:bg-brand-50` / `hover:bg-brand-950/40` | same family as Reply |
| Closed-branch composer | disabled control (`disabled:opacity-50`) + rose-600/400 reason text | the reason is copy, not an error state — see Copywriting |
| Tombstone | existing `DeletedRow` dashed border, muted | unchanged, keeps its position at any depth |
| Neutrals | slate scale via existing tokens | no new hex anywhere |

Focus: `ring-brand-600` light / `brand-400`-family dark on every new control (continue-thread, collapse, disabled composer keeps no ring).

## Copywriting Contract

**Voice:** plain, factual, peer-community — same register as the existing thread copy. Numbers appear only where the DOM can count them.

**Required strings (new constants in `CommentThread.tsx`'s exported block, the module that owns thread copy):**

- Reply context: `replying to @<display_name>` — caption voice, above the reply body, for depth ≥ 2 rows. The name resolves through the same author payload `IdentityPill` already consumes — never a second renderer, never a real name.
- Continue control: `N more replies — continue this thread` (N = the node's true descendant count from the API, never a guess). Expanded state toggles to `Collapse thread` on the same control.
- Breadth collapse: `Show N more replies` / the same control collapses.
- Closed branch (D-06): the composer renders disabled with the reason on/adjacent to the control — `Replies are closed above a removed comment.` A `branch_closed` error is still mapped client-side for defence-in-depth, but the UI must make hitting it impossible in normal flow.
- Depth marker (optional affordance, planner's discretion): `depth n` caption or a tooltip on the rail — only if it earns its place; the rail itself already communicates level ≤ 3.

**Banned copy:** any mention of a depth limit or "level cap" (none exists — D-01); "coming soon" placeholders; moderator-attribution claims on tombstones (5.1 D3's neutrality rule — `DeletedRow`'s copy is unchanged); numeric limits on branch breadth stated as product rules (the collapse is a UI affordance, not a policy).

**Required facts:** the reply count in every control is the real count from the API; a tombstone's branch shows descendants read-only exactly as readable today; nothing states or implies that replies "will be reviewed".

## Per-Surface Contracts

### §7.8 Comment thread (`CommentThread.tsx` — reshaped)

- **Tree rendering.** `CommentNode.replies` becomes arbitrarily deep (D-01/D-02). The component renders recursively (a `CommentRow` that renders its own children), replacing the hardcoded top-level + `ReplyRow` two-level structure. `CommentReply`'s `replies: []` type guarantee is deleted with it.
- **Indent + rail (D-07).** Each level renders a 2px left rail (`border-l-2`, existing colour) with the 16px unit above; indent **caps at 3 levels** — depth-4+ rows share the level-3 indent while their rails continue. The rail is per-level (a nested wrapper), not one global line.
- **Reply context (D-07).** Depth ≥ 2 rows carry `replying to @author` (caption voice) between the IdentityPill and the body. Depth-1 rows (direct replies to a top-level comment) omit it — the parent is visually adjacent.
- **Row actions (D-09).** Reply + Report on **every** node, any depth, when the thread is unlocked and the user can comment. The inline reply form (autofocus, insert-beneath-parent, POST `parent_id`) works from any node — 9.4's rule 2 generalised. Locked thread / anonymous visitor hide both, exactly as today.
- **Depth bound (D-02).** The API returns subtrees to the render depth; a node truncated by the bound renders `N more replies — continue this thread`. Clicking fetches that node's subtree and expands it **in place**; the same control becomes `Collapse thread` when expanded. The control is a text button in the subhead-label voice, `aria-expanded` stateful.
- **Breadth collapse (D-10).** A node with more than ~3 direct replies renders the first 3 + `Show N more replies`; count always visible; toggle collapses back. Default state: collapsed-past-3 — on initial render AND after a reply insert (the new reply's branch auto-expands its own path so the user's own comment is never hidden).
- **Tombstone at depth (D-04/D-06).** `DeletedRow` unchanged, at any depth. Descendants of a tombstone render read-only-open (visible, readable) but their composers are disabled with the D-06 reason. The disabled state is per-node and derived from the API's closed-branch signal — never computed client-side from `is_deleted` ancestry (the server owns that rule).
- **Optimistic insert.** A new reply appears under its parent with the existing submitting→inserted flow; the page refetch (today's `loadComments()`) stays the reconciliation, and the auto-expand rule above applies on refetch.
- **Rejected renderings (recorded):** flat-rows-with-context-only (loses branch identity); uncapped indent (re-creates 05 §2.5's mobile failure); a separate focused-thread route (deferred idea, not chosen); depth hidden entirely behind collapse-by-default (hides conversations that were fine to show).

### §7.8 Post detail page (`PostDetailPage.tsx` — wiring only)

- `submitReply` already POSTs `parent_id` + refetches — unchanged contract. The subtree fetch for "continue this thread" is a second call shape owned by the api module (`frontend/src/api/community.ts`); the page passes a fetcher down or the thread owns it — planner's choice, one owner, no duplicate endpoints.
- The composer error strip (`comment-error`), locked banner, and anonymous prompt are unchanged.

## UI Considerations

Applicable state considerations resolved: 9 covered, 2 backstop, 1 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | continue-this-thread fetch in flight | ✅ covered | The control shows a spinner/disabled state while fetching; the rest of the thread stays interactive |
| error | continue-this-thread fetch fails | ✅ covered | Inline retry on the same control (`Could not load replies. Retry.`) — never a toast-only failure |
| empty | a deep node with 0 replies | ✅ covered | No control renders (there is nothing to continue); the Reply affordance is the empty state |
| loading | thread initial load | ✅ covered | Existing skeleton behaviour on the page — unchanged |
| error | reply submit fails (any depth) | ✅ covered | Existing draft-preserving flow; the form stays open at its node |
| partial | branch closed + locked thread simultaneously | ✅ covered | Lock wins (thread-wide banner, everything read-only); closed-branch state applies only on open threads |
| partial | user replies into a branch that closed mid-session | ✅ covered | The POST 400s with the mapped code; the refetch re-renders the branch closed (defence-in-depth, rare by design) |
| empty | new comment on an empty thread | ✅ covered | Existing empty hint + composer — unchanged |
| partial | depth-4+ rows | ✅ covered | Capped indent + continuing rail (D-07); no horizontal scroll at 320px |
| backstop | `aria-expanded` on continue/collapse controls | ⚠ backstop | Verifier asserts the attribute tracks state; screen-reader label = the visible copy |
| backstop | keyboard reachability of every new control | ⚠ backstop | Continue-thread, collapse, Reply, Report all tabbable in DOM order; focus moves to the inserted reply after expand |
| unresolved | exact render-depth number & breadth constant | ❌ unresolved | Planner pins both as named constants (working values: render depth 5, breadth 3) — recorded as a planner decision, not a silent drop |

---

*Phase: 11 — Unlimited nested comment replies*
*Contract created: 2026-09-29*

# Phase 12: Replace current screens with the Stitch designs - Context

**Gathered:** 2026-09-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Structural reconciliation of the app's existing screens against the 47-composition Stitch
library at `frontend/stitch designs/` — layout, hierarchy, and component arrangement, not the
token skin (9.5 already applied v2). Every composition maps to real UI (full parity): the
everyday screens are rebuilt to their compositions, and compositions showing UI the build
lacks (create-post modal, milestone add/edit modal, empty/filtered feed, PWA
install/push/offline states, error/empty route states) are implemented, not skipped.

Constraints inherited from the ROADMAP entry: compositions' mock fiction does not ship (the
9.5 divergence ledger governs); everything stays under the v2 token system and passes the
contrast/accessibility gates (05 §4.1.1, `frontend/scripts/contrast-audit.mjs`).

Out of scope: new capabilities beyond what the compositions depict; backend changes (API
work happens only where a composition pattern needs an existing endpoint wired differently);
changing Phase 11's comment-thread behaviour (the post-detail compositions restyle the
thread's presentation, not its reply/closure logic).

</domain>

<decisions>
## Implementation Decisions

### Reference & custody
- **D-01:** HTML-for-structure + v2 repaint — the on-disk `code.html` files govern structure;
  they are **stale v1** (Inter, `bg-indigo-600`, default radii — they predate 9.5's
  `apply_design_system` re-theme of the Stitch server instances to sky `#0369A1` / Fira Sans /
  ROUND_EIGHT). The rebuild repaints v2 tokens on top of the composition's structure. A
  mechanical anti-regression sweep guards each rebuilt screen: grep the rebuilt markup for
  v1 artifacts (`indigo`, `Inter`, v1 radii values) — zero hits required. — **Reversibility:**
  reversible — repaint is a styling pass; the sweep is mechanical.
- **D-02:** Commit all of `frontend/stitch designs/` (47 folders: `screen.png` + `code.html`
  each, plus the two `DESIGN.md` token-system folders) to git. The folder becomes the durable
  in-tree reference; the Stitch server project (`projects/3852118218307261541`, v2 design
  system `assets/9909951007419684952`) remains the origin but is no longer the store of
  record. — **Reversibility: reversible** — untracking later is cheap; the point is not
  losing the reference.

### States & new surfaces
- **D-03:** Full parity — all 47 compositions are consumed. Where a composition shows a
  pattern the build lacks, the pattern is built: create-post and milestone add/edit become
  **modals** (compositions show modals; the current create-post is a page), the
  empty/filtered feed state, the three PWA states (install primer, push primer, offline), and
  the error/empty route states are implemented to composition.
- **D-04:** Landing + privacy are rebuilt **now**, with 9.5.1's awaiting-copy states and
  honesty rules surviving the rebuild — the legal content modules are data-driven, so the
  copy can land before or after Phase 12 without a collision. The 9.5.1 halt (user's legal
  copy) stays open independently; Phase 12 does not wait on it and does not fake the copy.

### Icons & components
- **D-05:** `lucide-react` becomes the repo's first icon dependency, replacing the
  compositions' Material Symbols glyphs. Imports follow a light convention (per-screen named
  imports); no Material Symbols font enters the repo. — **Reversibility: costly** — an icon
  library spreads across every rebuilt screen the moment it lands; swapping vendors later
  touches all of them.
- **D-06:** Per-screen first — each screen is rebuilt with local markup matching its
  composition exactly; shared components are extracted only when a pattern repeats ≥3 times
  in practice. No up-front component-library build-out.

### Claude's Discretion
- **Variant mapping** (resolved by Claude, recorded here): one responsive build consumes both
  desktop and mobile compositions — mobile shots inform breakpoints and density, never
  separate routes. Where a surface has two compositions (dashboard_1/2, timeline_1/2,
  post-detail ×2), composition _1 is primary and _2 is treated as an alternate section
  arrangement to draw from, not a separate route. The `desktop_app_shell_dark_mode`
  composition informs the existing dark theme's shell treatment. The AppShell is reconciled
  to the `app_shell` composition as part of the work (nav labels, grouping, Administration
  section placement).
- Test strategy for the rebuilt screens follows the repo's existing hermetic pattern
  (scriptAdapter at the network boundary) without a separate discussion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The reference library (consumed per-screen)
- `frontend/stitch designs/` — the 47 compositions: `code.html` (structure — stale v1, per
  D-01), `screen.png` (current v2 appearance), two `DESIGN.md` token-system folders
  (`tcs_joining_tracker_05_4_token_system`, `tjt_professional_blue_9.5`)

### Divergence governance (what must NOT ship from the mocks)
- `.planning/phases/TCS-JL-09.5-ui-ux-design-pass-ui-ux-pro-max-stitch-screens/VERIFICATION.md` §3 —
  the mock-vs-API divergence ledger (privacy toggles, sessions list, announcement
  audience/schedule/reach, members group, survey warning, grace period…) — governing record
  for every rebuilt screen
- `.planning/phases/TCS-JL-09.5.1-generate-the-missing-stitch-screens-with-ui-ux-pro-max-desig/09.5.1-CONTEXT.md` §3.3 —
  do-not-copy ledger for the screens 9.5.1 generated (passwordless/SHA-256/DPO/WebAuthn
  fiction, "three visibility modes" claim)
- `.planning/phases/TCS-JL-09.5-ui-ux-design-pass-ui-ux-pro-max-stitch-screens/09.5-CONTEXT.md` —
  v2 selection rationale and the annotation-artifact trap (DESIGN NOTE captions in mocks are
  reference-only)

### Product spec & tokens
- `05_UI_UX_SPECIFICATION.md` §4 — v2 tokens (sky scale, Fira Sans/Fira Code, radii, the
  §4.1.1 contrast role rules the audit script enforces)
- `05_UI_UX_SPECIFICATION.md` §5.2/§5.3/§5.4 — shell/responsive contracts the rebuild must
  keep (sidebar 240px + rail at ≥1280, tablet collapse, five mobile tabs)
- `05_UI_UX_SPECIFICATION.md` §7.* — per-surface rules (7.4 dashboard honesty, 7.8 comment
  rules incl. Phase 11's deep-thread rendering, 7.13 copy truthfulness)
- `frontend/src/theme/tokens.ts` + `frontend/src/theme/badges.ts` — the token layer to repaint
  with; `frontend/scripts/contrast-audit.mjs` — the gate

### Backend truth (data contracts behind the rebuilt screens)
- `04_API_SPECIFICATION.md` — endpoint truth per surface (dashboard §28, timeline, community
  §39–§42 incl. Phase 11's bounded assembly, admin, settings)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/layouts/AppShell.tsx` + `navItems.ts` — the 240px sidebar + rail shell the
  compositions assume; already carries the staff-only Administration group (9.5 Task 8)
- `frontend/src/components/` — Card, EmptyState, Skeleton/SkeletonCard, Badge, Toast,
  ErrorBoundary — restyled where compositions demand, reused everywhere else
- `frontend/src/test/axiosTestHelper.ts` (scriptAdapter) — the hermetic test harness every
  rebuilt screen's suite already uses
- `frontend/src/pages/LegalLayout.tsx` + the three content modules — the data-driven legal
  shape D-04 must preserve through the landing/privacy rebuild

### Established Patterns
- Honest-data contracts enforced at compile time where possible (`DashboardAnalytics` union,
  divergence notes in code comments) — rebuilt screens keep this discipline
- v2 tokens via `TYPOGRAPHY` / Tailwind theme; brand classes `bg-brand-700` etc. — the repaint
  vocabulary (never the compositions' raw `indigo-*`)
- No icon library today (nav/buttons label-only) — D-05 introduces `lucide-react`

### Integration Points
- Router (`frontend/src/pages/index.tsx`) gains/keeps routes for states built to composition
  (error/empty route states, PWA states already have partial surfaces: PushPrimer, offline)
- Phase 11's `CommentThread` — the post-detail compositions restyle around it; reply/closure
  logic is not re-litigated here
- `frontend/src/pwa/` — the PWA-state compositions meet existing install/push plumbing

</code_context>

<specifics>
## Specific Ideas

- The user's framing: "use the `frontend/stitch designs/` — replace the current designs with
  the stitch designs." The on-disk library is the authority for what each screen looks like;
  D-01 resolves its stale-HTML conflict mechanically.
- Committing the folder (D-02) was chosen explicitly over the 9.2-style "catalogue IDs, server
  holds the assets" approach used in earlier phases.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-replace-current-screens-with-the-stitch-designs*
*Context gathered: 2026-09-29*

# Phase 12: Replace current screens with the Stitch designs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-29
**Phase:** 12-replace-current-screens-with-the-stitch-designs
**Areas discussed:** Reference & custody; States & new surfaces; Icons & components
(Area "Variant mapping" not selected — resolved by Claude under discretion; test strategy not
selected — follows the repo's existing hermetic pattern.)

---

## Area selection

| Option | Selected |
|--------|----------|
| Reference & custody | ✓ |
| Variant mapping | (resolved by Claude) |
| States & new surfaces | ✓ |
| Icons & components | ✓ |

---

## Reference & custody

### Q1 — The stale-v1 code.html vs v2-themed screen.png conflict: which artifact governs?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-download v2 first | Plan Task 1 re-fetches all 47 screens' HTML from Stitch MCP (v2 post-re-theme); overwrites stale local exports. Needs MCP access at execute time. | |
| PNGs are canonical | Implement from v2 screenshots visually; ignore/delete stale HTML. No Stitch dependency, but structure read by eye. | |
| HTML for structure, repaint | Use stale v1 HTML for structure, repaint v2 tokens on top. Fastest start; risks v1 artifacts leaking. | ✓ |

**User's choice:** HTML for structure, repaint
**Notes:** Claude recorded the acknowledged risk as a mechanical guard: each rebuilt screen
passes a sweep for v1 artifacts (`indigo`, `Inter`, v1 radii) with zero hits required.

### Q2 — Should `frontend/stitch designs/` be committed to git, and at what granularity?

| Option | Description | Selected |
|--------|-------------|----------|
| Commit all | Phase judged against these artifacts; Stitch server can change/vanish; folder one accidental delete from gone. ~20–30MB one-time. | ✓ |
| Commit HTML only | Structure consumed per Q1; PNGs stay local-only. Halves repo cost; visual reference not durable. | |
| Keep untracked | Repo light; CONTEXT catalogues by name like 9.2's Stitch IDs. References point outside the tree. | |

**User's choice:** Commit all

---

## States & new surfaces

### Q3 — How far does "replace" reach — which composition patterns become real UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Full parity | Every composition maps to real UI: modals where compositions show modals (create-post, milestone add/edit), empty/filtered feed, PWA install/push/offline, error/empty route states. All 47 consumed. | ✓ |
| Screens + restyled states | Main screens rebuilt; existing pages stay pages; PWA/error/empty restyled not rebuilt. Some compositions reference-only. | |
| Main screens only | Everyday pages only; state/modal compositions deferred. Several compositions unused. | |

**User's choice:** Full parity

### Q4 — Landing + privacy overlap halted 09.5.1's surfaces. How does Phase 12 treat them?

| Option | Description | Selected |
|--------|-------------|----------|
| Rebuild, keep honesty | Rebuilt now; 9.5.1's awaiting-copy states and honesty rules survive (legal modules are data-driven); the 9.5.1 halt stays open independently. | ✓ |
| Defer to after 9.5.1 | Everything except landing + legal; two surfaces unreconciled until the copy gate clears. | |
| Close 9.5.1 first | User provides legal copy now; 9.5.1 completes; Phase 12 starts clean. Blocks on user copy. | |

**User's choice:** Rebuild, keep honesty

---

## Icons & components

### Q5 — Icon strategy for the compositions' Material Symbols glyphs?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline SVG, self-owned | Small self-owned icon set (e.g. lucide path data inlined); no runtime font, no dependency. | |
| lucide-react dependency | Established React icon library; closest maintained match to glyph style; one small dependency. | ✓ |
| Material Symbols font | The compositions' exact font via Google Fonts; pixel-identical; adds a font pipeline the repo lacks. | |

**User's choice:** lucide-react dependency

### Q6 — How is shared structure handled across 20+ rebuilt screens?

| Option | Description | Selected |
|--------|-------------|----------|
| Extract as you go | Component audit first; repeated patterns become shared components; screens consume them. | |
| Per-screen first | Local markup per composition; extract only when a pattern repeats ≥3 times in practice. Faster start, cleanup later. | ✓ |
| Restyle existing only | Keep existing shared components; restyle to composition; add only when nothing fits. Most conservative. | |

**User's choice:** Per-screen first

---

## Claude's Discretion

- **Variant mapping:** one responsive build consumes desktop + mobile compositions (mobile
  informs breakpoints/density, never separate routes); composition _1 primary where surfaces
  have two variants, _2 as alternate arrangement source; dark-mode shell composition informs
  the existing dark theme; AppShell reconciled to the `app_shell` composition.
- **Test strategy:** repo's existing hermetic pattern (scriptAdapter at the network boundary).

## Deferred Ideas

None — discussion stayed within phase scope.

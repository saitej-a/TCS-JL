# Phase 12 — UI Specification: Stitch-Designs Screen Reconciliation

**Source of truth:** `frontend/stitch designs/` (45 screen compositions + 2 DESIGN.md token
folders). This spec turns the library into build rules; the compositions stay the per-screen
authority for layout, hierarchy, and component arrangement.

## Screen contract (every rebuilt screen)

1. **Structure from `code.html`, appearance from v2.** The composition's `code.html` governs
   section order, hierarchy, and arrangement (it is stale v1 — D-01). All colors, fonts,
   radii, and spacing repaint through the repo's v2 token vocabulary (`brand-*` sky scale,
   `TYPOGRAPHY`, `SURFACES`; never raw `indigo-*`, never the Inter font-family, never the
   composition's CDN Tailwind config).
2. **Anti-regression sweep (D-01).** After each screen rebuild: `grep -nE "indigo|Inter|material-symbols" <touched files>` → zero hits, and the file imports no Material Symbols font.
3. **Honest data contracts hold.** Every divergence in
   `.planning/phases/TCS-JL-09.5-ui-ux-design-pass-ui-ux-pro-max-stitch-screens/VERIFICATION.md` §3
   and `09.5.1-CONTEXT.md` §3.3 stays non-shipped: one live privacy toggle, no sessions list,
   no announcement audience/schedule/reach figures, no members nav group, no survey warning,
   immediate (not 7-day) deletion copy, passwordless/SHA-256/DPO/WebAuthn fiction never
   appears. Where a composition shows fiction, adopt its layout and keep the honest copy/state.
4. **Test suites updated in the same task.** A rebuilt screen's page/component suite pins the
   new DOM in the same task that rebuilds it — never a screen whose suite still pins the old
   structure at task end.

## Shell & responsive rules (unchanged contracts, reconciled visuals)

- Desktop ≥1280: 240px sidebar (`AppShell`) + center + right rail (05 §5.2). The
  `app_shell` composition reconciles nav grouping, labels, icons, and active states into this
  structure — it does not replace it. The staff-only Administration group survives.
- Tablet 640–1279: sidebar persists, rail collapses (05 §5.3). Mobile <640: the five-tab bar
  (05 §5.4); `mobile_*` compositions inform density, spacing, and stacked layouts — **never
  separate routes** (D-discretion: variant mapping).
- `desktop_app_shell_dark_mode` informs the dark theme's shell treatment through the existing
  dark-mode class strategy (no new theming mechanism).

## Modal contract

Create-post and milestone add/edit render through the existing `frontend/src/components/Modal.tsx`
(§6.6: focus trap, Escape/backdrop dismiss, bottom-sheet <640px, scroll lock). The
compositions' modal layouts become the modals' content; Modal's accessibility mechanics are
not re-implemented. The create-post page route stays for deep links or is redirected to the
community feed with the modal open — planner's choice, recorded.

## Icon contract

- `lucide-react` is the only icon source (D-05). Named imports per screen; no central icon
  barrel unless >3 screens share a custom composite.
- The compositions' `data-icon="..."` names map to lucide equivalents at build time; a
  mapping table lives in the reconciliation record (below) so review can audit coverage.

## Variants (recorded mapping)

- Composition `_1` is primary where a surface has two variants; `_2` is an alternate
  arrangement source, not a route.
- Dark-mode and mobile shells inform the existing responsive build; no new routes, no new
  theming mechanism.

## Per-screen reconciliation record

Each screen task appends a row to
`.planning/phases/TCS-JL-12-replace-current-screens-with-the-stitch-designs/RECONCILIATION.md`:
composition folder → files rebuilt → divergences kept (ledger citations) → icon mappings
used → suite updated (yes/no). Task 10 verifies 45/45 coverage before the phase can verify.

## Contrast & gates

All rebuilt surfaces stay under the v2 role rules (05 §4.1.1); `frontend/scripts/contrast-audit.mjs`
gains rows for any new real foreground/background pair introduced (expected: none — v2
vocabulary already covers the compositions' patterns). No real pair may regress.

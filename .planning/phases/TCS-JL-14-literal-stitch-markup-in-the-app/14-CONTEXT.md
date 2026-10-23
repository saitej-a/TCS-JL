# Phase 14 — Context: Literal Stitch markup in the app

**Gathered:** 2026-09-30 · **Scope confirmed with the user:** the 45 composition documents in
`frontend/stitch designs/` become the app's **markup** — classes and element structure copied
verbatim into the existing React pages — while the app keeps working: auth, the real API, the
PWA, and the test suite.

This file stores the decisions the plan and the executor build on. The discussion log (below)
holds the alternatives that lost.

---

## D-01 — Literal markup replaces phase 12's repaint rule (a deliberate supersession)

Phase 12's governing rule was "structure from the composition's `code.html`, appearance repainted
through v2 vocabulary only" — its plan's **G-1/G-2** and its **D-01**, enforced by a tree-wide gate:
`! grep -rnE "indigo|material-symbols" frontend/src && ! grep -rnw "Inter" frontend/src`.

This phase **overturns that rule in the narrow, recorded scope of the ported screens**: the
composition's classes and hierarchy are the markup. `RECONCILIATION.md` rows are not deleted —
they change meaning: each row's "dropped fiction" becomes this phase's **awaiting-state list**
(D-02), and each row's "repainted to v2" becomes "carried verbatim".

The supersession must be written where the old rule lives, not only here: the 12 plan's G-1/G-2
text, `12-VERIFICATION.md`'s verdict framing, `05_UI_UX_SPECIFICATION.md`'s token-role rules for
the affected surfaces, and the PROJECT.md key-decision row that established token v2 as the only
vocabulary. Recorded, never silent — the same pattern Phase 11 used when it overturned the
one-level nesting rule.

**What stays literal per composition:** the screen's own content region — every class, every
nesting level, every glyph, every data block, every state. **What is not duplicated:** the
compositions that include app chrome (sidebar, topbar, tab bar) — those elements belong to the
shell composition (`tcs_joining_tracker_app_shell` and its dark/mobile variants), which the app
shell already carries; the port takes the shell's markup from *that* composition. Two
compositions do not fight over one region.

## D-02 — Mock-only content: keep the block, show an awaiting state

Where a composition renders content the backend never produces (the derived list of fabricated
fields is in `09.5 VERIFICATION.md §3` and `09.5.1-CONTEXT.md §3.3`), the block is **kept, in the
mock's exact frame**, and its unavailable value renders as an awaiting state rather than fiction:

- the value slot renders an em dash with `data-awaiting="<field>"` on the element;
- every awaiting slot is enumerated in that screen's `RECONCILIATION.md` row;
- **no fabricated value may appear** anywhere in the port (the same honesty rule that governs
  9.5.1's legal pages, applied to every data block).

This is the middle path the user chose: not the fiction (which would present invented numbers as
fact), not deletion (which would lose the mock's layout), and it is machine-checkable — the
fidelity audit (D-08) can assert that every `data-awaiting` slot is declared and that the
composition's literal value text is absent.

## D-03 — Two skins coexist, scoped per screen

The library disagrees with itself and **both halves are literal**:

| Family | Files | Type | Palette | Radius |
|---|---|---|---|---|
| v1 | 33 | Inter (`font-headline/display/body/label`) | Tailwind built-in `indigo-*`/`slate-*` | standard (`rounded-lg` = 0.5rem …) |
| v2 | 12 | Fira Sans / Fira Code (`font-sans`/`font-mono`) | `brand-*` (byte-identical to the app's sky scale) | `rounded-card` 0.75rem, `rounded-elem` 0.5rem |

The mechanism is already proven in this build: Tailwind v4 compiles utilities to CSS variables
(`.bg-brand-700{background-color:var(--color-brand-700)}`), so a class on the page root can
redefine `--font-headline` or the brand scale for that screen only. No second build, no theme
fork.

**Consequences to handle:** `--font-headline`, `--font-display`, `--font-body`, `--font-label`,
`--radius-card` and `--radius-elem` do not exist in the app's `@theme` today and must be added;
`--color-brand-*` already matches family B exactly. The two families must not bleed into each
other — a scope class is per screen root, and the port must not leave a v1 screen inheriting a v2
scope or vice versa.

## D-04 — Fonts and icons: the literal families, self-hosted

Literal markup names Inter, Fira Sans, Fira Code and Material Symbols Outlined. Today the app
loads **no webfont at all** — `--font-sans` names Fira Sans but nothing serves it, so the app
currently renders in system fallback. This phase vendors the real faces:

- Inter (the v1 family's four roles) and Fira Sans + Fira Code (the v2 family), latin subsets;
- **Material Symbols Outlined**, subset to the 127 glyph names the library actually uses (the
  mapping table in `RECONCILIATION.md` is the name list) — the font replaces lucide in ported
  markup, because lucide's glyph geometry is not the mock's;
- served from the repo, not from Google's CDN: the app promises privacy and offline, and a
  CDN font is neither (and the PWA must render correctly with the network off);
- the bundle/precache delta is measured and recorded, not assumed.

**Vendoring mechanism (checked, because the toolchain constrains it):** this machine has `curl`
but **no `fontTools`/`pyftsubset`**, so the subsets are produced by Google's own API at vendoring
time — fetch the stylesheet with `&text=<the exact characters/ligature names needed>`, download
the woff2 files it points at, commit them under `frontend/public/fonts/`, and hand-write the
`@font-face` rules so no runtime request leaves the origin. If the icon-font API's subsetting
turns out to drop a ligature target glyph (verifiable: render all 127 names and compare against
the font's cmap), the fallback is the full Material Symbols woff2 vendored as-is with the size
recorded — never a Google-hosted link (G-7).

`lucide-react` stays installed until the last screen is ported, then its dependency is removed in
the closing task. **Loading the real Fira faces also fixes a pre-existing defect** — the app's
declared sans stack has never been served.

## D-05 — The behaviour layer is React, not inline script

21 of the documents carry inline JS (10 `addEventListener`, 11 `onclick`, 10 `onsubmit`, one
`data-purpose="radio-selection-handler"`): tab switches, radio cards, accordions, dropdowns, copy
buttons, modal triggers. Inline `<script>`/`onclick` is inert in JSX, so each becomes React state
and a React handler — the *markup* is verbatim, the *behaviour* is the app's.

Modal content keeps rendering inside `frontend/src/components/Modal.tsx` (focus trap, Escape,
bottom-sheet under 640px); the composition's modal body markup is what gets ported into it.

## D-06 — The two gates this inverts are re-derived, not deleted

1. **The v1 sweep** (12's anti-regression gate) fails by design from the tracer onward. It is
   replaced on ported surfaces by the fidelity audit (D-08); the sweep is retired with its
   supersession recorded (D-01), and it stays meaningful only for files not yet ported.
2. **The contrast audit** must be re-run against the literal palettes. Each failing pair is either
   **fixed** (a recorded deviation from literal, as 9.4/12 did with the 500 label) or **accepted
   and listed** in the record. The audit may not be silently weakened, and no pair may fail
   without appearing in the record.

## D-07 — Tracer first: one screen, end to end

The first task proves the whole pipeline on a single route before 34 follow: theme variables, the
two font families, the Material Symbols subset, the per-screen skin scope, the markup port, the
behaviour translation, the awaiting-state policy, the suite's move to the new DOM, and the
fidelity audit — on the notification center (single route, icon-heavy, has a rail, and was
phase 12's tracer, so the comparison is exact).

Its verdict is a gate on the rest: if the tracer cannot satisfy the audit and the gates without
faking, the policy changes before 34 screens inherit it.

## D-08 — "Verbatim" is machine-checked

A script (`frontend/scripts/stitch-fidelity.mjs`) extracts, per composition, the class tokens and
the structural markers of its screen region, and asserts their presence in the corresponding
ported source — the classes it finds, the glyph names it renders, the headings and section order
it preserves, and the absence of every fabricated value string. Without that, "verbatim" degrades
silently into "inspired by" within two tasks, which is exactly what this phase exists to prevent.

---

## Discussion log (alternatives that lost)

- **Repaint to v2 (phase 12's rule)** — the shipped state; rejected by the user for this phase in
  favour of literal markup.
- **Ship the mock's invented content as-is** — maximum fidelity, but the app would present
  fabricated figures, names and security claims as fact. Rejected: the product's whole pitch is
  honesty, and every one of those fields is already enumerated in the divergence ledgers.
- **Drop blocks the API cannot fill** — phase 12's rule for the same data. Rejected in favour of
  keeping the mock's frame with an awaiting state (D-02).
- **Serve the 45 exports as static pages (or as the whole frontend)** — the quickest route to
  pixel-exact, and it was the alternative considered first. Rejected: those documents compile
  Tailwind from `cdn.tailwindcss.com` at runtime, carry no data layer at all (`fetch` appears
  zero times), and cannot authenticate — shipping them means discarding auth, the API, the PWA,
  offline and push, and freezing every screen on mock data.
- **Rebuild the frontend as Django templates carrying the literal markup** — exact markup with
  server rendering and real data, but a new frontend (session auth, HTML views, forms) that also
  throws away the built PWA stack. Rejected as a larger rewrite than the user wants.
- **CDN font links, as the documents themselves use** — simplest and most literally identical to
  the exports' `<head>`. Rejected for privacy + offline (D-04), recorded here because it stays the
  fallback if subsetting the icon font proves impractical.
- **One canonical skin for the whole app** — would end the two-tone split, but makes half the
  library non-literal. Rejected: the user asked for the designs as authored.

## Open, carried into the plan

- **The mobile and dark compositions are their own layout documents, not reflows.** 45 documents
  are ~35 distinct routes plus variants; the port treats each variant as a real layout to match,
  which means explicit per-variant markup rather than one responsive arrangement.
- **The 9.5.1 legal copy gate stays open** — the landing/privacy/terms awaiting-copy contract
  survives this phase untouched (nothing may fill it with the compositions' legal fiction).
- **Phase 13 (chat) is another thread's work in the same tree.** This phase touches shared files
  (AppShell, navItems); the port must not clobber in-flight work there.

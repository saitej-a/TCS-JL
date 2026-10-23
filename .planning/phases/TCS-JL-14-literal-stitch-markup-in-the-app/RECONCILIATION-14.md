# Phase 14 — Reconciliation Record (literal markup)

One row per composition, and the rows are **read by a script**: `frontend/scripts/stitch-fidelity.mjs`
parses this table and checks, per screen, that the ported source still carries the composition's
class tokens, glyphs and headings, that every `data-awaiting` slot in the source is declared here
(and vice versa), and that none of the fabrication strings listed here appears in the source. A row
that lies fails the build; a column that gets renamed fails loudly instead of silently stopping the
check.

**Column meanings**

| Column | What it holds |
|---|---|
| Composition | the folder name under `frontend/stitch designs/` |
| Ported sources | the files rebuilt from it (paths relative to `frontend/`) |
| Awaiting slots | every `data-awaiting="…"` value in those sources — a slot whose concept the product does not have (D-02) |
| Not carried | class tokens (or literal copy) deliberately **not** ported, each with its reason in the prose section below |
| Fabrication kept out | strings from the mockup that must not appear in the source — the honesty check |
| Suite | the test file that pins the ported behaviour |

Phase 12's `RECONCILIATION.md` is the companion document, not a predecessor to be rewritten: its
per-screen rows name the fiction each composition carried and the divergences phase 12 held. Here
those divergences change role — what phase 12 recorded as *dropped* is either a real value (where a
field exists), an awaiting slot (where the concept does not), or a declared drop.

## Per-screen register

Cells that list several tokens separate them with `;` (never a comma — a declared
fabrication can contain one).

| Composition | Ported sources | Awaiting slots | Not carried | Fabrication kept out | Suite |
|---|---|---|---|---|---|
| tcs_joining_tracker_notification_center | `src/pages/NotificationsPage.tsx`; `src/components/NotificationRow.tsx`; `src/theme/notificationRows.ts` | `profile.status`; `profile.status_since`; `profile.days_pending`; `profile.role_track`; `profile.location_preference`; `profile.bgv_status`; `profile.offer_date`; `preferences.email_digest`; `pulse.total_candidates`; `pulse.joining_letters_reported`; `pulse.confirmed`; `pulse.joined_reported`; `filters.by_type` | `pl-60`; `hover:underline`; `translate-x-4` | `Live Sync Active`; `Sai T.`; `1,248`; `32 days pending`; `15 May 2026`; `Hyderabad / BLR`; `March 2025`; `Trending in Hyderabad Digital 2025 stream`; `Daily Summary at 8:00 PM`; `JL Wave dispatches (Hyderabad)`; `v2.4.2`; `Network Up`; `Has anyone from 2025 Digital received JL?`; `Yes, Chennai batch 1 was released`; `Anonymous Candidate` | `src/pages/NotificationsPage.test.tsx` |

## Notes per screen

### `tcs_joining_tracker_notification_center` — the tracer (Task 1)

The composition is a whole document: a fixed 240px sidebar, a sticky top bar with search/bell/post,
the content canvas and a `pl-60` footer. Per D-01 the **shell's own composition** governs the
chrome (`tcs_joining_tracker_app_shell`, Task 2), so this row covers the `<main>` region — the
breadcrumb row, the page header, the tab bar, the list card and the 320px rail — and the shell's
column offsets are not duplicated here.

**Real values (D-02's first half).** The unread pill and both tab counts come from the server's
envelope; each row's headline (`title`), sentence (`message`) and time are the payload's; the status
card's stage and pill carry the candidate's real `current_status`; the pulse card's three published
counters come from `/analytics/overview/`, and a **suppressed** payload prints the server's own
message in the card's note line instead of numbers (never a zero, never a fabricated figure) — the
4.2 D2 contract, honoured in literal markup.

**Awaiting slots (D-02's second half).** The document draws rows the candidate model does not carry
— `Role Track`, `Location Pref`, `BGV Verification`, `Offer Date` — plus a status-since line (the
dashboard payload publishes `timeline.latest_event`, which is not the stage's start date, so the line
is honest only as an awaiting slot). The preferences card's `Email Digest` row is the mockup's own
invention: the API tracks the six push flags and in-app delivery is not user-controllable
(6.2 D13/D14), so the row keeps its frame, its toggle is disabled, and both its value cells are
awaiting slots. The pulse card's `Confirmed` counter has no counterpart in the overview payload
(`waiting_for_joining_letter`, `joining_letters_reported`, `joined_reported` and `total_candidates`
do; "confirmed" does not). Each renders an em dash with `data-awaiting`, and each is listed above.

**Kept but inert.** The document's type filter group (`Filter by: All / Replies / Upvotes /
Announcements`) survives in its exact markup, disabled: the API filters by read state, not by type.
Keeping the control visible and honest beats deleting the design's element — and the group carries
`data-awaiting="filters.by_type"` so the gap is machine-visible.

**Declared drops (`Not carried`) and why.** The column above holds exactly the three class
*tokens* the region uses and the source does not: `pl-60` (the shell owns the chrome offsets,
D-01 — the region must not re-offset itself), `translate-x-4` (the mockup's toggle in its *on*
position; the port renders the disabled off-state, `bg-slate-300` + `translate-x-0`) and
`hover:underline` (the mockup's inline *post-title* link in row 1 — our headline is server text and
the row itself already navigates, so the link's whole class list is gone). Every other class the
document writes is carried: the check reports the region's 220 tokens against the source, not
against a summary of it.

Two further drops are **copy**, not classes, so the machine check does not read them — recorded
here by hand instead:

| Copy / affordance | Why it is not in the source |
|---|---|
| the mockup's inline author span (`Sai T.`) in row 1 | the notification payload carries no author, and inventing one is the ledger's oldest divergence |
| `Reply`, row 1's second action | no per-notification reply affordance exists; the primary action already lands on the discussion, and the composition's primary-action class list *is* carried (shared with `VIEW_POST`) |

**Recorded deviations from the document** (each is a deliberate divergence, not drift):

1. **The status pill reports connectivity, not a sync.** The composition's `Live Sync Active` badge
   claims a realtime sync this product does not have (notifications are fetched, not pushed into the
   page). Its frame is verbatim; its text now states the real state — `Online` / `Offline` — from the
   same connectivity source the offline strip uses (`pwa/registerSW`).
2. **Dark pairs where the document omitted them.** The compositions carry `dark:` classes on their
   elements but not on `<body>`; the port adds `dark:bg-slate-950 dark:text-slate-200` to the screen
   root so the region does not glare white in dark mode. Additive classes only — no document class
   was removed.
3. **Test hooks are additive.** `data-testid` and `aria-*` attributes were added to the document's
   own elements (the row's `role="button"`/`tabIndex`/`onKeyDown` make the clickable card
   keyboard-reachable); no class or element changed to make the screen testable.
4. **The row click is React, not the mockup's `cursor-pointer`.** §7.10's read-then-navigate ordering
   is unchanged from phase 12, including the rollback on a failed mark-read.
5. **The reminder's action goes to `/timeline`.** The composition's button reads `Update My Status`;
   the honest destination is the timeline, while the row click keeps §7.10's target
   (`notificationTarget`).
6. **The type filter group is disabled** (see above) and **pagination is the app's** — the document
   draws five fixed rows; the API paginates, so the list keeps a pager below the caught-up card.
7. **Loading, error and empty states keep the app's treatments.** The library ships one state per
   document; `error_and_empty_route_states` is Task 8's composition to port.

**Types the library does not draw.** `MODERATION` and `SYSTEM` have no row in any composition. Both
take the advisory treatment (row 3's violet `campaign` row) rather than a newly invented colour —
recorded in `src/theme/notificationRows.ts`.

## Contrast — the literal v1 pairs (Task 1)

`scripts/contrast-audit.mjs` now carries the v1 family's pairs (Tailwind's default palette, which is
what the compositions load) alongside the v2 brand rows, and **reads this table**: a literal pair
below its WCAG threshold passes only if its audit label appears below. An unlisted literal failure
exits non-zero, so "no new failure may be left unlisted" is a gate rather than a promise.

The tracer's verdict: **literal wins, deviations only where the concept is absent.** Three of the
composition's own pairs sit under threshold and stand as the composition wrote them. Fixing them
would mean repainting the markup, which is the thing this phase exists to stop doing — D-06's
conflict, resolved in favour of literalness and logged here.

| Pair (audit label) | Measured | Threshold | Why it stands |
|---|---|---|---|
| `LIGHT  v1 timestamp (slate-400 on white)` | 2.56:1 | 4.5:1 | the mockup's timestamps are the faintest text on the row; `text-slate-400` appears in 45 of the 47 composition folders, so a change here forks the whole family, not this screen. Supportive information ("time ago"), never the only carrier of meaning |
| `LIGHT  v1 category label, amber (amber-600 on white)` | 3.19:1 | 4.5:1 | the milestone row's category word; the row also carries its icon chip and headline, so the label is redundant, not the sole signal |
| `LIGHT  v1 meta glyph (amber-500 on white, non-text)` | 2.15:1 | 3.0:1 | the milestone meta line's `trending_up` glyph, decorative beside the sentence it illustrates (`aria-hidden`) |

These are acceptance decisions with named costs, not oversights: 25 of the 28 literal rows the
tracer introduces PASS, and the 3 above are the composition's own colours. The two v2 failures
(`brand-500` focus ring, and the forbidden `brand-700`-on-`slate-900`) are the pre-existing rows
Phase 12 documented; this task neither introduced nor fixed them.

## Task 1 gates (verbatim)

```
$ node scripts/stitch-fidelity.mjs --screen tcs_joining_tracker_notification_center \
      --source src/pages/NotificationsPage.tsx --source src/components/NotificationRow.tsx
FIDELITY-OK — 1 composition(s) verified against their sources (220 class tokens checked)

tcs_joining_tracker_notification_center  [region <main>]  220 classes · 13 glyphs · 5 headings · 13 awaiting · 3 declared drops · 413 source tokens

# the check is not a rubber stamp: with one class removed from the ported source
$ sed -i 's|bg-indigo-50/20|bg-indigo-50|' src/components/NotificationRow.tsx
$ node scripts/stitch-fidelity.mjs --screen tcs_joining_tracker_notification_center; echo "exit=$?"
tcs_joining_tracker_notification_center
  classes not carried and not declared dropped: bg-indigo-50/20
exit=1
$ cp /tmp/nr.bak src/components/NotificationRow.tsx   # restored

$ npx vitest run src/pages/NotificationsPage.test.tsx
Test Files  1 passed (1)
     Tests  8 passed (8)

$ npm run lint
✖ 14 problems (0 errors, 14 warnings)          # the 14 are the repo's pre-existing react-refresh notes
$ npx tsc --noEmit && npx tsc -b --force       # both exit 0, no output

$ npx vitest run
Test Files  50 passed (50)
     Tests  284 passed (284)

$ npm run build
✓ built in 6.55s
PWA v1.3.0
mode      generateSW
precache  23 entries (1342.50 KiB)             # was 9 before: the vendored faces ride along, so icons and type work offline

$ node scripts/contrast-audit.mjs
exit=1  (before this table existed: 3 literal pairs unlisted)
exit=0  (with the three rows above listed)

$ node scripts/font-check (ad hoc, Task 1)
@font-face rules: 14 · distinct urls: 14 · families: Inter(6) Fira Sans(5) Fira Code(2) Material Symbols Outlined(2)
FONT-URLS-OK — every src resolves
```

**The vendored icon subset was measured, not assumed.** Google's `&icon_names=` route can silently
drop a ligature target, so the check rendered all 127 names from the 45 compositions in the
vendored face and measured them: every name measured exactly 24px — one glyph — while the control
`mrufo` (the same letters, not a ligature) measured 120px. Uniform-width result over 127/127 names
with a discriminating control means no fallback is needed; the whole family is intact.

## Fonts and icons vendored (Task 1)

`scripts/vendor-fonts.mjs` fetches and vendors, from Google's API, into `public/fonts/`
(603.4 KiB total, 14 faces) with the `@font-face` rules generated into `src/styles/fonts.css`:

| Face | Files | Notes |
|---|---|---|
| Inter | 400/500/600/700/800/900, latn | the v1 family's four type roles |
| Fira Sans | 400/500/600/700 + 400 italic, latin | the v2 family's `sans` (+ italic for blockquotes) |
| Fira Code | 400/500, latin | the v2 family's `mono` |
| Material Symbols Outlined | 1 face, 130.0 KiB | **exactly the 127 ligatures the 45 compositions reference** (`&icon_names=…`), no others |

Subsets are latin only: the content is English and that slice already carries the em dash and curly
quotes the copy leans on, while `latin-ext` would add roughly half again for accented letters the
app never renders. Weights were narrowed to what the library actually asks for (`font-light`/`thin`
appear nowhere; `font-extrabold`/`black` appear only in the v1 family).

Nothing is fetched at runtime: no `cdn.tailwindcss.com`, no `fonts.googleapis.com`, no icon font link.
This also fixed a pre-existing defect — `--font-sans` named Fira Sans while nothing served it, so the
app had been rendering in system fallback since 9.5.

One deliberate difference from the plan's wording: the stylesheets load through the bundled
`@import` in `src/index.css`, not a `<link>` in `index.html`. Vite then hashes them into the same
build graph as every other style and the service worker precaches them (23 entries now against 9);
a hand-written `<link>` would sit outside the precache manifest and would be the one asset missing
offline.

Reproduce the vendoring with `node scripts/vendor-fonts.mjs` (build-time only — it writes
`public/fonts/` and `src/styles/fonts.css`; the app never calls out).

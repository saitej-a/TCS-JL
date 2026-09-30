---
phase: 12-replace-current-screens-with-the-stitch-designs
plan: 12-01
subsystem: ui
tags: [react, tailwind, vitest, lucide-react, design-reconciliation, pwa, accessibility, modal]

# Dependency graph
requires:
  - phase: 9.5-ui-ux-design-pass
    provides: the v2 token vocabulary (brand-* sky scale, TYPOGRAPHY/SURFACES) and the divergence ledger (VERIFICATION.md §3) that governs which mock fiction must not ship
  - phase: 9.5.1-generate-the-missing-stitch-screens
    provides: LegalLayout + the three legal content modules and their awaiting-copy contract (D-04/G-7), plus the §3.3 do-not-copy list
  - phase: 11-unlimited-nested-comment-replies
    provides: the branch-closure thread UI that PostDetailPage's rebuild had to keep intact
provides:
  - "45/45 composition coverage: every screen composition in `frontend/stitch designs/` maps to rebuilt markup, recorded in RECONCILIATION.md (per-screen rows + a 96-name glyph table)"
  - "lucide-react as the repo's only icon source — nav, tab bar, notification rows, auth cards, settings hub, admin chips, PWA panels, error states"
  - "create-post as a Modal.tsx dialog on the feed (D-03); `/community/create` is a redirect shim that opens it — no orphan page"
  - "the app shell reconciled to the app_shell composition (typed nav glyphs, tab-bar icons, dark/mobile variants in one responsive build)"
  - "landing rebuilt to the marketing composition with 9.5.1's awaiting-copy states intact, and the visitor shell restyled around it"
  - "the anti-regression sweep as a machine check: zero v1 utility/font/glyph artifacts anywhere in `frontend/src`"
affects: [13-message-in-a-single-common-channel, verify-work, admin-surfaces]

# Actuals (#2632)
actuals:
  tokens: 90300  # chars/4 over the realized diff: `git diff ce26e4f~1..HEAD -- frontend .planning/phases | wc -c` = 361,183 → ~90,300 (includes diff context/headers, so a slight over-estimate)
  tasks: 14
  commits: 17

# Tech tracking
tech-stack:
  added:
    - "lucide-react ^1.48.0 (the repo's first and only icon library; tree-shaken named imports)"
  patterns:
    - "Composition-as-structure, tokens-as-skin: adopt the mockup's arrangement and hierarchy, repaint every colour/type/radius through v2 tokens (D-01) — never the composition's own CDN Tailwind config"
    - "The ledger gates the copy: each rebuilt row cites the 9.5/9.5.1 divergence entries it checked, so a finished screen carries its honesty evidence with it"
    - "Fixed-pattern sweeps are written to be falsifiable in the direction that matters (`Inter[^v]` instead of `Inter`), and prose that tripped them is rephrased rather than the guard softened"
    - "Modal content as a component rendering inside Modal.tsx — the dialog mechanics (focus trap, Escape, <640px sheet) are never re-implemented per screen"

key-files:
  created:
    - frontend/src/components/CreatePostModal.tsx
    - frontend/src/components/ErrorPanels.tsx
    - frontend/src/pages/authGlyphs.tsx
    - .planning/phases/TCS-JL-12-replace-current-screens-with-the-stitch-designs/RECONCILIATION.md
  modified:
    - frontend/src/pages/AnalyticsPage.tsx
    - frontend/src/pages/DashboardPage.tsx
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/pages/RegisterPage.tsx
    - frontend/src/pages/ForgotPasswordPage.tsx
    - frontend/src/pages/ResetPasswordPage.tsx
    - frontend/src/pages/VerifyEmailActionPage.tsx
    - frontend/src/pages/VerifyEmailPendingPage.tsx
    - frontend/src/pages/LandingPage.tsx
    - frontend/src/pages/PostDetailPage.tsx
    - frontend/src/pages/CommunityFeedPage.tsx
    - frontend/src/pages/NotificationsPage.tsx
    - frontend/src/pages/OnboardingPage.tsx
    - frontend/src/pages/CreatePostPage.tsx (now a redirect shim)
    - frontend/src/pages/SettingsPage.tsx, SettingsProfilePage.tsx, SettingsPrivacyPage.tsx, SettingsDevicesPage.tsx, SettingsSecurityPage.tsx, SettingsDangerPage.tsx
    - frontend/src/pages/AdminReportsPage.tsx, AdminAnnouncementsPage.tsx
    - frontend/src/pages/LegalLayout.tsx
    - frontend/src/layouts/AppShell.tsx, MobileTabBar.tsx, SettingsLayout.tsx, navItems.ts
    - frontend/src/components/NotificationRow.tsx, TimelineEventModal.tsx, Input.tsx, EmptyState.tsx
    - frontend/src/pwa/InstallPrompt.tsx, PushPrimer.tsx, OfflineBanner.tsx, registerSW.ts
    - frontend/scripts/contrast-audit.mjs
    - frontend/package.json, frontend/package-lock.json

key-decisions:
  - "D-02 custody: the 45-composition library is committed to git before any screen consumes it, so the reference and the build travel together"
  - "D-01 per-screen repaint: the stale v1 exports (login/register/forgot, admin, analytics) keep their structure and get v2 skin; the already-v2 exports (reset/verify) are adopted as-is — decided per screen, not in bulk"
  - "D-03: create-post became a feed modal and the old page URL redirects with the modal opened; milestone add/edit stayed inside Modal.tsx rather than a new surface"
  - "Admin moderation queue adopted the composition's table (severity bars, content chips, urgency pills) and deliberately dropped its `Reported by` column — the API ships no reporter identity (04 §63), so the divergence is recorded instead of faked"
  - "Analytics adopted the composition's chart/KPI anatomy only where the real payload feeds it; blocks the API cannot fill are dropped and listed, not stubbed with mock numbers"
  - "D-06 per-screen-first won: no shared component was extracted below the ≥3-repetition threshold; the three genuinely shared surfaces (SettingsLayout, Input labels, authGlyphs) are the only extractions and each has its RECONCILIATION row"

patterns-established:
  - "Sweep-as-a-gate: the v1 anti-regression check is a grep that must exit non-zero, run tree-wide at the end of the phase and embedded in the plan's verify blocks"
  - "Honest-adoption rows: a composition that names data the backend never shipped gets its layout adopted and its fiction dropped — recorded per row with the ledger cite, never silently reproduced"

requirements-completed: []  # plan frontmatter `requirements_addressed: []` — phase has no REQ-IDs mapped in ROADMAP

coverage:
  - id: D1
    description: "45/45 Stitch compositions reconciled — every folder with a code.html has a RECONCILIATION.md row naming the files rebuilt from it"
    verification:
      - kind: other
        ref: 'cd "C:/Users/Sai Teja Ankam/Desktop/TCS JL" && for d in "frontend/stitch designs"/*/; do [ -f "$d/code.html" ] || continue; n=$(basename "$d"); grep -q "$n" .planning/phases/TCS-JL-12-replace-current-screens-with-the-stitch-designs/RECONCILIATION.md || { echo "MISSING: $n"; exit 1; }; done  →  COVERAGE-45-OK (counted 45)'
        status: pass
    human_judgment: false
  - id: D2
    description: "Tree-wide v1 sweep clean: no indigo utility, no material-symbols class, no Inter font reference anywhere in frontend/src (comments included)"
    verification:
      - kind: other
        ref: 'cd "C:/Users/Sai Teja Ankam/Desktop/TCS JL" && ! grep -rnE "indigo|material-symbols" frontend/src && ! grep -rnw "Inter" frontend/src  →  SWEEP-OK'
        status: pass
    human_judgment: false
  - id: D3
    description: "lucide-react is the only icon source; no icon font is loaded and no other icon package is installed"
    verification:
      - kind: other
        ref: 'frontend/package.json carries lucide-react ^1.48.0 and no other icon package; frontend/index.html loads no webfont; the 96 distinct composition glyphs are mapped in RECONCILIATION.md''s icon table'
        status: pass
    human_judgment: false
  - id: D4
    description: "Create-post is a Modal.tsx dialog opened from the community feed; the old /community/create URL redirects into the feed with the dialog open"
    verification:
      - kind: unit
        ref: "frontend/src/pages/CreatePostPage.test.tsx (dialog semantics, required/length pre-validation, server field-error mapping, payload shape, redirect shim)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Milestone add/edit still render inside Modal.tsx with dialog semantics after the restyle"
    verification:
      - kind: unit
        ref: "frontend/src/components/TimelineEventModal.test.tsx + frontend/src/pages/TimelinePage.test.tsx"
        status: pass
    human_judgment: false
  - id: D6
    description: "All frontend gates green after the whole-tree rebuild: lint 0 errors, tsc clean, full vitest run green, production build succeeds"
    verification:
      - kind: other
        ref: "npx tsc --noEmit + npx vitest run → 50 files / 284 tests passed; npm run build → dist/sw.js + precache 9 entries (725.21 KiB); npm run lint → 0 errors"
        status: pass
    human_judgment: false
  - id: D7
    description: "Contrast audit gains no new failing real pair; the tinted chip/pill pairs the rebuild introduced are audited and the one sub-threshold label was darkened"
    verification:
      - kind: other
        ref: "node frontend/scripts/contrast-audit.mjs → every real pair PASS; the only failures are the two documented demo rows; the 500 code label moved to rose-700 after rose-600-on-rose-50 measured 4.28:1"
        status: pass
    human_judgment: false
  - id: D8
    description: "D-04/G-7: landing and privacy were rebuilt with 9.5.1's awaiting-copy contract intact — nothing fakes the legal copy and the copy gate stays open"
    verification:
      - kind: unit
        ref: "frontend/src/pages/LegalPages.test.tsx + frontend/src/pages/legal/copy.test.ts (awaiting-copy states render, content modules stay data-shaped)"
        status: pass
    human_judgment: false
  - id: D9
    description: "G-3: every rebuilt screen's RECONCILIATION row cites the divergence-ledger entries it checked, so mock fiction demonstrably did not ship"
    verification:
      - kind: other
        ref: ".planning/phases/TCS-JL-12-replace-current-screens-with-the-stitch-designs/RECONCILIATION.md — per-screen rows carry the 09.5 §3 / 09.5.1 §3.3 ledger cites and the dropped-fiction notes (no sessions list, audience selector, reach figures, members group, grace copy, passwordless/SHA-256/DPO machinery)"
        status: pass
    human_judgment: false
  - id: D10
    description: "G-6: no shared component was extracted below the ≥3-repetition threshold, and the extractions that did happen are recorded"
    verification:
      - kind: other
        ref: "RECONCILIATION.md records the three shared surfaces (SettingsLayout, Input label treatment, authGlyphs); no other shared component was introduced — the rest is per-screen markup"
        status: pass
    human_judgment: false
  - id: D11
    description: "Bundle delta is recorded and explained rather than assumed: +15.0% raw JS / +10.8% gzip vs the pre-phase tree, from lucide adoption plus the rebuilt markup"
    verification:
      - kind: other
        ref: "RECONCILIATION.md §Bundle delta — baseline built from `ce26e4f^` via `git archive`, same node_modules; 504,333 B → 579,873 B JS raw, 147,930 B → 157,014 B CSS raw"
        status: pass
    human_judgment: false

# Metrics
duration: 10h 3min
completed: 2026-09-30
status: complete
---

# Phase 12: Replace current screens with the Stitch designs Summary

**Every one of the 45 Stitch screen compositions is now the shape of the shipped app — rebuilt surface by surface under v2 tokens, with lucide-react as the only icon source and a 45-row reconciliation record that names each composition's files, cited divergences and glyph mappings.**

## Performance

- **Duration:** 10h 3min wall-clock (spanning reconnect-driven restarts; each task re-verified before its commit)
- **Started:** 2026-09-29T17:14Z (first tracer commit `ce26e4f`)
- **Completed:** 2026-09-30T03:17Z (final sweep commit `fd7c622`)
- **Tasks:** 14 of 14
- **Files modified:** 55 (3,953 insertions / 1,335 deletions)

## Accomplishments

- **45/45 coverage, mechanically checked.** The audit walks every folder under
  `frontend/stitch designs/` that has a `code.html` and asserts RECONCILIATION.md names it —
  it prints `COVERAGE-45-OK (counted 45)`. The record's per-screen table carries, per row, the
  composition, the files it produced, the divergence entries checked, the glyph mappings used,
  and whether the suite moved with it.
- **The v1 skin is gone and cannot come back quietly.** `indigo`, `material-symbols` and the
  earlier display font return zero hits across `frontend/src` — comments included — so the
  phase's own anti-regression claim is a command, not a promise.
- **An icon vocabulary, not an icon font.** 96 distinct composition glyphs are mapped to lucide
  components (the table flags the composition-only ones — share/export/forecast chrome the app
  does not ship — so nothing is silently unmapped), and the removed Google-Fonts stylesheet
  requests are a network saving the bundle figure does not show.
- **Two structural changes beyond repainting.** Create-post became a `Modal.tsx` dialog on the
  feed with `/community/create` redirecting into it (D-03), and the shell's navigation gained
  typed glyphs alongside the mobile tab bar — one responsive build, no new routes for the
  desktop/mobile/dark variants.
- **Mock fiction stayed dropped, per screen.** The admin moderation queue adopted the
  composition's table but not its `Reported by` column (04 §63 ships no reporter identity);
  analytics adopted the chart/KPI anatomy only where the real payload feeds it. Each such
  divergence is a row, not a footnote.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): notifications + lucide + custody + RECONCILIATION** - `ce26e4f` (feat)
2. **Task 2: shell — nav glyphs, tab bar, dark/mobile** - `d60c081` (refactor)
3. **Task 3: the six auth screens** - `4259146` (feat)
4. **Task 4: onboarding wizard** - `709a9b9` (feat)
5. **Task 5: dashboard** - `b1efa06` (feat)
6. **Task 6: timeline modal** - `6e08979` (refactor)
7. **Task 7: create-post modal + feed** - `5555f21` (feat)
8. **Task 8: post detail** - `f06153f` (refactor)
9. **Task 9: settings suite (hub + five pages)** - `e702328` (feat)
10. **Task 10: admin moderation queue + announcements** - `5d46fc9` (refactor)
11. **Task 11: analytics** - `39a9a36` (refactor)
12. **Task 12: visitor + system states (landing, legal, PWA, errors)** - `78a729e` (refactor)
13. **Task 13: full gate battery** - `41b57f6` (test)
14. **Task 14: 45/45 audit, sweep, icon table, bundle delta** - `383f227` + `fd7c622` (docs)
15. **Plan verify-block repair** - `fb7688d` (test: the `Inter[^v]` sweep pattern)

## Files Created/Modified

- `frontend/src/components/CreatePostModal.tsx` - the §7.7 form as a Modal content component
  (new); `CreatePostPage.tsx` demoted to a redirect shim
- `frontend/src/components/ErrorPanels.tsx` - shared 404/error/offline route-state panels (new)
- `frontend/src/pages/authGlyphs.tsx` - the auth screens' glyph set (new)
- `frontend/src/components/NotificationRow.tsx`, `TimelineEventModal.tsx`, `Input.tsx`,
  `EmptyState.tsx` - row/modal/field/empty anatomy rebuilt from their compositions
- `frontend/src/pages/*` - dashboard, timeline, feed, post detail, notifications, onboarding,
  six auth screens, six settings screens, two admin screens, analytics, landing, legal
- `frontend/src/layouts/{AppShell,MobileTabBar,SettingsLayout,navItems}.tsx|ts` - shell and
  settings chrome
- `frontend/src/pwa/{InstallPrompt,PushPrimer,OfflineBanner,registerSW}` - the PWA state panels
  brought onto the composition vocabulary
- `frontend/scripts/contrast-audit.mjs` - audits the tinted chip/pill pairs the rebuild added
- `frontend/package.json` / `package-lock.json` - `lucide-react` ^1.48.0
- `.planning/phases/…-12-…/RECONCILIATION.md` - the phase's evidence artifact

## Decisions Made

- Structure from the composition, skin from v2 tokens — decided **per screen**, because the
  library is mixed: login/register/forgot and the admin/analytics exports are stale v1, while
  reset/verify-action/verify-pending are already v2 and were adopted as-is.
- The library is committed as the reference (D-02) rather than consumed untracked, so a
  future rebuild cannot drift from a moving target.
- Create-post moved into the feed as a dialog instead of being restyled as its own page
  (D-03); the old URL still works and opens the dialog.
- Where a composition named data the backend does not ship, the layout was adopted and the
  block dropped with a recorded row (the admin `Reported by` column, analytics' member/forecast
  widgets) — never reproduced as mock.
- The plan's sweep pattern was repaired in-flight (`Inter` → `Inter[^v]`) because the bare word
  matched the domain's own "Interview" vocabulary, and the four surviving comments that named
  the v1 utilities were rephrased by role (`the v1 accent palette`, `the earlier display font`)
  so the guard passes exactly as written rather than being relaxed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's verify pattern false-positived on domain vocabulary**
- **Found during:** Task 4 (onboarding)
- **Issue:** `! grep -rn "Inter" frontend/src` matches `INTERVIEWED` — the timeline event type —
  so the sweep reported failure for correct code.
- **Fix:** pattern tightened to `Inter[^v]` across the plan's verify blocks (`fb7688d`), keeping
  the property that matters (a real display-font reference still fails it).
- **Verification:** the repaired pattern passes tree-wide while the actual v1 artifacts are gone.
- **Committed in:** `fb7688d`

**2. [Rule 1 - Bug] Four surviving comments named the v1 utility tokens**
- **Found during:** Task 14 (sweep)
- **Issue:** the sweep is a fixed grep; comments explaining the swap contained the very strings
  it looks for, so the check stayed red for prose.
- **Fix:** the comments now name the palette/font by role (`the v1 accent palette`, `the earlier
  display font`, `a glyph font`) and the RECONCILIATION row records 0 documentation mentions.
- **Verification:** `SWEEP-OK` tree-wide with tsc + 284 tests still green.
- **Committed in:** `fd7c622`

**3. [Rule 2 - Missing critical] `CreatePostPage` never reset `submitting` on success**
- **Found during:** Task 7 (create-post modal)
- **Issue:** the form's submit flag stayed true after a successful create, leaving every control
  disabled for the rest of the session.
- **Fix:** the modal resets the flag in its success path; the suite pins that the dialog closes
  and a second open is usable.
- **Verification:** `frontend/src/pages/CreatePostPage.test.tsx` green.
- **Committed in:** `5555f21`

**4. [Rule 3 - Blocking] The test harness matched axios routes by URL only**
- **Found during:** Task 7
- **Issue:** the feed's `GET /community/posts/` shadowed the modal's `POST` on the same URL
  (first match wins), so the POST was answered with a 200 list and the modal "succeeded".
- **Fix:** the suite restructured — write-path contracts exercise the modal directly with
  strict-order scripting; feed-level tests assert the dialog opens.
- **Verification:** the rejection/validation/payload tests now fail when the write path is
  reverted (they are not vacuous).
- **Committed in:** `5555f21`

**5. [Rule 1 - Bug] A rebuilt page briefly lost a block comment's terminator**
- **Found during:** Task 8 (post detail)
- **Issue:** a header-comment replacement swallowed `*/`, producing a parse error on the next
  import block.
- **Fix:** the terminator restored; tsc re-run clean.
- **Committed in:** `f06153f`

**6. [Rule 2 - Missing critical] A rebuilt privacy card lost its closing tags**
- **Found during:** Task 9 (settings)
- **Issue:** the card-head edit dropped closing tags, leaving unbalanced JSX.
- **Fix:** restored before the suite run; all five settings suites green.
- **Committed in:** `e702328`

**7. [Rule 1 - Bug] The 500 code label failed contrast at 4.28:1**
- **Found during:** Task 13 (gates)
- **Issue:** rose-600 on rose-50 measures under the text threshold.
- **Fix:** the label moved to rose-700; the audit script gained the tinted chip/pill pairs the
  rebuild introduced.
- **Committed in:** `41b57f6`

---

**Total deviations:** 7 auto-fixed (4 bugs, 2 missing-critical, 1 blocking)
**Impact on plan:** All seven were correctness or tooling defects inside the planned work; no
scope was added. The two sweep repairs tightened the plan's own guard rather than weakening it.

## Issues Encountered

- **The library is a mixed-vintage export.** Roughly a third of the compositions are stale v1
  (indigo/Inter/Material Symbols) and the rest already v2, so D-01's repaint rule had to be
  applied per screen instead of in bulk — recorded row by row.
- **`routeAdapter` cannot distinguish two verbs on one URL.** Task 7's suite had to be
  restructured around that limitation; the write path is now tested directly.
- **Real db-backed suites are not part of this phase.** Phase 12 is frontend-only; the backend
  gates were last re-derived in 9.4/9.5 verification and are not re-run here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready:** the frontend tree is uniform under v2 tokens with a single icon source, so any new
  screen (Phase 13's chat surfaces among them) starts from one vocabulary and one library.
  RECONCILIATION.md is the map from design library to source and should be extended, not
  re-derived, by later UI work.
- **Open, carried deliberately:**
  - **09.5.1 stays halted at the copy gate** — `/about`, `/privacy`, `/terms` render the honest
    awaiting-copy state; the user's copy is the only outstanding input. Phase 12 kept that
    contract intact rather than filling it with the compositions' legal fiction.
  - **Verification is not yet canonical** — this SUMMARY plus the gate battery is execution
    evidence; `verify-work` (or a VERIFICATION.md pass) is what marks the phase complete.
  - The desktop/mobile/dark variants were mapped onto the one responsive build; no variant was
    given its own route, which is recorded in the plan's prohibitions as resolved.

---
*Phase: 12-replace-current-screens-with-the-stitch-designs*
*Completed: 2026-09-30*

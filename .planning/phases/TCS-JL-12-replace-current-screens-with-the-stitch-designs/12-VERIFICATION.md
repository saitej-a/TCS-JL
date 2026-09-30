---
phase: 12-replace-current-screens-with-the-stitch-designs
verified: 2026-09-30
status: passed
---

# VERIFICATION 12 — Replace current screens with the Stitch designs

**Phase:** 12 · **Verified:** 2026-09-30 · **Plan:** `12-01-PLAN.md` (14 tasks, single plan, executed inline)
**Requirements:** none mapped (`phase_req_ids` null; coverage is expressed by the plan's `must_haves` and the 45/45 reconciliation audit)
**Done-when (ROADMAP 12):** the everyday screens' *structure* matches the Stitch compositions, with mock fiction dropped rather than shipped and everything under v2 tokens.
**Verdict:** ✅ **PASS** — every must-have is re-derived green here (not trusted from execution), and the one gap this pass found — the icon table was missing 31 glyph names carried in modifier-class spans — was closed in place with the coverage re-run now exact (127/127).

---

## 1. Evidence sources (re-derived, not trusted from execution)

| Source | Command | Result (verbatim) |
|---|---|---|
| Frontend suite | `npx vitest run` | `Test Files 50 passed (50)` / `Tests 284 passed (284)` |
| Lint | `npm run lint` | `✖ 15 problems (0 errors, 15 warnings)` — all pre-existing fast-refresh warnings |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | clean (exit 0, no output) |
| Production build | `npm run build` | `precache 9 entries (725.21 KiB)`; `dist/sw.js` + `dist/workbox-*.js` emitted |
| Coverage audit | `for d in "frontend/stitch designs"/*/; do [ -f "$d/code.html" ] \|\| continue; …` | `COVERAGE-45-OK (counted 45)` — no `MISSING:` line |
| v1 sweep | `! grep -rnE "indigo\|material-symbols" frontend/src && ! grep -rnw "Inter" frontend/src` | `SWEEP-OK` (the first command exits 1 — no hits — which is the pass condition) |
| Icon parity | composition glyph extraction vs the RECONCILIATION table | `table names=127  composition names=127  UNMAPPED: (none)` |
| Contrast audit | `node scripts/contrast-audit.mjs` | `2 pair(s) below threshold` — both **documented**: `LIGHT focus ring (brand-500 vs white, non-text)` 2.77:1 (demo row) and `DARK brand-700 on slate-900` 3.01:1 (the forbidden-in-v2 guard row). Every real pair the rebuild introduced PASSes, e.g. `icon chip (brand-600 on brand-900/50 over slate-800, non-text)` 3.50:1 and `k-anonymity chip text (brand-100 on brand-800)` 6.59:1 |
| Modal mechanics | `npx vitest run src/components/Modal.test.tsx src/pages/CreatePostPage.test.tsx src/components/TimelineEventModal.test.tsx` | `3 passed / 16 tests` |
| Icon-source exclusivity | `frontend/package.json` | `lucide-react ^1.48.0`; no other icon package; `index.html` loads no icon webfont |
| Bundle delta | `RECONCILIATION.md §Bundle delta` (baseline from `ce26e4f^` via `git archive`, same `node_modules`) | JS 504,333 → 579,873 B (+15.0% raw / +10.8% gzip); CSS 147,930 → 157,014 B (+6.1%) — recorded, not assumed |

## 2. must_haves verdicts

| # | Truth | Verdict | Evidence |
|---|---|---|---|
| 1 | 45/45 compositions rowed, each naming its rebuilt files | ✅ | `COVERAGE-45-OK (counted 45)`; per-screen table in RECONCILIATION.md |
| 2 | Tree-wide v1 sweep returns zero hits | ✅ | `SWEEP-OK` — includes the four comments rephrased by role so the fixed grep passes as written (`fd7c622`) |
| 3 | `lucide-react` is the only icon source | ✅ | package.json (one icon dep), `index.html` (no webfont), 32 components imported across 12 import sites |
| 4 | Create-post is a `Modal.tsx` dialog; the old URL redirects into it | ✅ | `CreatePostPage.test.tsx` (dialog render, required/length pre-validation, DRF field-error mapping, payload, redirect shim); mechanics pinned in `Modal.test.tsx` (`role=dialog` + `aria-modal`, Escape closes, Tab trap) |
| 5 | Milestone add/edit run inside `Modal.tsx` | ✅ | `TimelineEventModal.test.tsx` + `TimelinePage.test.tsx`; `Modal.test.tsx` holds the dialog semantics, content suites hold the content |
| 6 | All frontend gates green | ✅ | lint 0 errors · typecheck clean · 284/284 tests · build green (table above) |
| 7 | Contrast audit gains no new failing real pair | ✅ | 2 fails, both pre-existing documented rows; the rebuild's new pairs are audited and the one sub-threshold label was darkened (rose-600→rose-700, `41b57f6`) |
| 8 | Rebuilt rows cite the divergence-ledger entries checked | ✅ | Per-screen rows carry the 09.5 §3 / 09.5.1 §3.3 cites and the dropped-fiction notes (no sessions list, audience selector, reach figures, members group, grace copy, passwordless/SHA-256/DPO machinery) |
| 9 | D-04/G-7: landing + privacy rebuilt with the awaiting-copy contract intact | ✅ | `LegalPages.test.tsx` ("omits the TOC under two sections (awaiting-copy state renders cleanly)") + `legal/copy.test.ts`; the legal copy gate stays open rather than being filled with the compositions' legal fiction |
| 10 | D-06: no shared component extracted below the ≥3 threshold | ✅ | The record names the only extractions (SettingsLayout chrome, Input's uppercase label, authGlyphs); everything else is per-screen markup |
| 11 | Prohibition: no Material Symbols font / CDN script / `indigo-*` class in `frontend/src` | ✅ | sweep clean; `index.html` loads no webfont; no CDN `<script>` outside the untracked library |
| 12 | Prohibition: no mock fiction from the 9.5/9.5.1 ledgers ships | ✅ (with one recorded omission) | Admin reports drop the composition's `Reported by` column (04 §63 ships no reporter identity); analytics drops the member/forecast widgets; landing/privacy/PWA copy re-pointed at real behaviour. The one *unavoidable* composition detail — `material-symbols` glyphs surviving inside the untracked `frontend/stitch designs/` reference files — is outside `frontend/src` by design |
| 13 | Prohibition: no new routes for mobile/dark variants | ✅ | `frontend/src/routes/router.tsx` unchanged this phase apart from the `/community/create` redirect; variants are responsive, not routed |

## 3. Gap found by this verification pass — and closed

**F-12-1 (MEDIUM, icon coverage):** T14 step 3's extraction (`grep -rhoE 'data-icon="[a-z_]+"'`)
reports 93 glyph names, and the icon table mapped all of them — but the compositions also carry
glyphs as span bodies with modifier classes (`<span class="material-symbols-outlined
text-[14px]">warning</span>`, `… text-amber-600 text-xl mt-0.5`), which neither that grep nor a
bare-class scan sees. The union of both mechanisms is **127 distinct names**; the table held 96,
so **31 names were unmapped** (`arrow_outward`, `chat`, `delete`, `route`, `warning`, `wifi_off`,
`home`, `hourglass_empty`, `install_mobile`, `markdown`, `unfold_more`, …).

- **Fix:** the record's icon table gained an explicitly-labelled extension section with all 31
  rows, each mapped to its lucide component with the same `adopted` / `composition-only` status
  vocabulary, plus the composition folder where it appears. The section prose now states the
  127-name union and how both mechanisms are reached.
- **Re-proof:** `table names=127  composition names=127  UNMAPPED: (none)` — exact set equality,
  no extras either.
- **Why it matters:** the phase's headline claim is "no glyph goes unmapped"; with the old
  extraction the claim was true of the wrong set. The honest version is now the measured one.

## 4. Not re-derived in this pass (recorded, not silent)

1. **No live visual side-by-side of the 45 compositions against the rendered build.** The
   coverage evidence is structural (table ↔ file ↔ suite), plus the plan's per-task markup work.
   A pixel-level pass (screenshots per screen at desktop/mobile/dark) has not been performed —
   the same limit 9.3 recorded, still open, and it is what a UAT pass would close.
2. **No backend regression run.** Phase 12 touched no backend file (`git diff --stat ce26e4f~1..HEAD`
   is frontend + `.planning` only); the backend figure from 9.4/9.5 verification (849 passed, 878
   after Phase 11) stands as recorded, not re-measured here.
3. **The offline/PWA panels were verified by suite, not by driving a browser offline.** The
   copy-accuracy change (`OfflineBanner.tsx`) is pinned in `pwa.test.tsx`; the live offline drill
   belongs to 9.4's record.

## 5. Carried forward

- **09.5.1 remains halted at the copy gate** — `/about`, `/privacy`, `/terms` render the honest
  awaiting-copy state. Phase 12 preserved that contract (D-04/G-7); the user's copy is the only
  outstanding input for 9.5.1.
- **Bundle growth is recorded, not hidden:** +15.0% raw JS against the pre-phase tree includes the
  lucide adoption and the whole-tree markup rebuild; the removed Google-Fonts stylesheet requests
  are a network saving the build figure does not show.
- **The design library is tracked** (`frontend/stitch designs/`, committed in the tracer), so the
  next UI phase reconciles against a fixed reference instead of a moving one.

---
*Phase: 12-replace-current-screens-with-the-stitch-designs · Verified: 2026-09-30*

---
status: blocked
phase: 16-replace-the-current-screens-with-the-frontend-stitch-designs
source:
  - 16-01-SUMMARY.md
  - 16-02-SUMMARY.md
  - 16-03-SUMMARY.md
  - 16-04-SUMMARY.md
  - 16-05-SUMMARY.md
  - 16-06-SUMMARY.md
  - 16-07-SUMMARY.md
  - 16-AUDIT.md
started: "2026-10-05T00:00:00.000Z"
updated: "2026-10-06T00:00:00.000Z"
---

## Current Test

number: 2
name: Whole-design fidelity (the phase's own claim)
expected: |
  Every composition under `frontend/stitch designs/` is carried by the screen built from it, so
  `node frontend/scripts/stitch-fidelity.mjs --all` prints FIDELITY-OK.
awaiting: scope decision — see Gaps

## Tests

### 1. Cold Start Smoke Test

expected: Frontend compiles and loads without runtime errors.
result: pass
evidence: `npm --prefix frontend run typecheck` (now `tsc -b`) exit 0, `npm --prefix frontend run build` exit 0
(PWA service worker generated, 23 precache entries, 1418.28 KiB).

Correction (the port's own finding): `npm run typecheck` used to be `tsc --noEmit`, and this project's
root `tsconfig.json` is solution-style (`"files": []` plus project references) — so that command checked
*nothing* and always exited 0. The real gate was `tsc -b`, which only ran inside `npm run build`. The
script is now `tsc -b`, and it immediately surfaced two real type errors in the timeline port (`Badge`
imported and unused, and a prop the roadmap did not declare) that the no-op check had been hiding.

### 2. Whole-design fidelity

expected: |
  All 45 compositions carry their markup; the mechanical sweep passes.
result: fail (in progress: 27 of 45 now pass)
evidence: |
  `node frontend/scripts/stitch-audit.mjs` → `45 compositions · strict-pass 27 · carried 7 ·
  absent 452/62/84`. 18 of 45 compositions still do not match, and 452 class tokens, 62 glyph names
  and 84 heading texts from the compositions appear nowhere in `frontend/src`. Per composition:
  `16-AUDIT.md`.

  The audit's first run read `strict-pass 2 · carried 1` (`740/90/94` absent). Ported since:
  the auth cluster — `forgot_password_screen`, `registration_screen`,
  `reset_password_reset_password_token`, `verification_pending_verify_email_pending`,
  `email_verification_actions_verify_email_token` — the shell cluster — `app_shell`,
  `desktop_app_shell_dark_mode`, `mobile_app_shell` — `candidate_dashboard_1`,
  `personal_recruitment_timeline_1`, and `community_discussions_feed` (whose `PostCard`, `CategoryTabs`,
  `UpvotePill` and `IdentityPill` now carry the feed composition's markup). Each carries its composition's markup; the shell rows declare the
  compositions' embedded placeholder page bodies dropped (`chrome`), and the dashboard and timeline rows
  declare the mockups' printed fiction (counts, percentages, forecasts, regional telemetry,
  external-channel cards) dropped while keeping the compositions' rows, pills, chips and bars fed by real
  payload fields.

  The six settings compositions now pass too — `desktop_settings_screen`, `profile_settings_form`,
  `security_settings_settings_security`, `privacy_settings`, `devices_notifications_settings` and
  `danger_zone_settings_settings_danger` — each carrying its composition's markup with the mockup's
  fiction declared in `Fabrication kept out` and the controls the API cannot back declared dropped
  (the security password form, the quiet-hours block, the export and deactivate cards, the privacy
  page's fixed switches). Two shared layers were needed for them and are recorded in the prose
  section: the settings compositions' inline `tailwind.config` token names are now real `@theme`
  entries (`bg-brand`, `text-slate-primary`, `rounded-control`, `hover:shadow-hover`, …), and the
  switch rules their `<style>` blocks define but never resolve (`switch-checkbox`/`switch-bg`/
  `switch-dot`, `switch-toggle`, `rounded-custom`, `focus-brand`) live in `styles/stitch-scopes.css`.

  Eight further compositions pass as `variant`: they are **alternative designs for screens another row
  already carries** (`personal_recruitment_timeline_2` against `_1`; `candidate_dashboard_2`,
  `candidate_dashboard_mobile` and `mobile_dashboard` against `candidate_dashboard_1`; and the four
  community-feed designs — `community_discussions`, its empty-filtered state, and the two mobile feeds —
  against `community_discussions_feed`). A screen renders
  one design, so the rejected design's whole distinct token set is declared dropped in its row and the
  choice is recorded in the prose section. That is a product decision the record now states instead of
  leaving silent.

### 3. Backend and functionality unchanged

expected: The API layer, auth, routing, chat and state stay intact; the suite and build stay green.
result: pass
evidence: |
  `npm --prefix frontend run test:run` → 53 test files passed, 303 tests passed, 0 failed, 0 skipped.
  Typecheck exit 0 and build exit 0 (PWA 23 precache entries).  No request, route guard or store changed: the auth, shell and settings work touched `frontend/src/pages/*`,
  the two shared field/button controls, `frontend/src/layouts/*`, `frontend/src/styles/stitch-scopes.css`,
  `frontend/src/index.css` (theme tokens only) and tests. `frontend/src/api/profile.ts` gained one export —
  `HIRING_TYPE_LABELS`, the display labels the profile form and the privacy preview share — and no function
  in it changed. No file under `frontend/src/routes`, `frontend/src/context` or `frontend/src/pwa` was
  modified, and no file under the Django `apps/` was touched at all (`git status` reports zero). Three test suites were updated to the
  ported copy (`ResetPasswordPage.test.tsx`, `VerifyEmailPendingPage.test.tsx`, and
  `SettingsPrivacyPage.test.tsx`, whose control is now the composition's radio-card group rather than a
  switch — same contract: the control and the preview read one state) and one was added
  (`VerifyEmailActionPage.test.tsx`), all asserting the same behaviours.

### 4. Screen walkthroughs (Auth, Shell, Dashboard, Community, Settings, Analytics/Legal/PWA)

expected: As originally recorded — each screen renders its Stitch-derived layout with live data.
result: recorded pass, not re-verified
evidence: |
  Recorded by Waves 1–6 with the notes below. Not re-run in the audit session, and the fidelity result
  above means "renders the layout" should not be read as "is the composition's markup".

### 5. Fidelity tooling

expected: The checker can be trusted to report the whole design, not one screen.
result: pass (after fixes)
evidence: |
  `--all` no longer aborts on the first stale row; glyphs rendered as JSX text children are recognised;
  headings compare case-insensitively; `--coverage` reports what is absent from the whole frontend.
  Before these fixes the sweep died on one stale row (`src/pages/NotFoundPage.tsx`, which does not exist),
  so it had never run across all compositions: Wave 7's `FIDELITY-OK` came from a single-screen run against
  the one row reconciled to pass, and nothing ever contradicted it.

## Summary

total: 5
passed: 3
failed: 1
blocked: 1

## Gaps

- **18 of 45 compositions are not verbatim.** `tcs_joining_tracker_login_screen_variant_a_split_trust_badge`
  carries its composition completely; `tcs_joining_tracker_notification_center` passes with 3 declared drops;
  the six auth screens, three shell screens, the dashboard/timeline/community rows and all six settings
  screens now pass too. The other 18 render the composition's layout with the project's own token classes
  and drop the mockup content. Worst gaps: `pwa_states_install_push_primer_offline_2` (its whole demo
  shell), `pwa_states_install_push_primer_offline_1`, `marketing_landing_page`, the onboarding wizard's
  three steps, `error_and_empty_route_states`, the admin pages, the two post-detail designs and the two
  milestone modals. Full list in `16-AUDIT.md`.
- **The ledger's `Not carried` / `Fabrication kept out` columns are incomplete** for those 35 rows: the
  divergence was recorded nowhere. Two entries were outright wrong (a nonexistent source path, and a
  "fabrication" that is real test-pinned copy) and are corrected.
- **Remaining work (18 compositions, 27 done).** Suggested order, worst-value-first absent: the PWA state
  designs (`pwa_states_install_push_primer_offline_1/_2/_3`), the onboarding wizard's three steps, the
  marketing landing page and the legal route, the admin pages (announcements, moderation queue), the
  community post-detail designs and the create-post page/modal, the two milestone modals, the analytics
  trends page and the error/empty route panels. Each page needs its mockup sample content mapped to real
  data or declared in `Not carried`, and each row's `Status` flipped only when the sweep agrees.

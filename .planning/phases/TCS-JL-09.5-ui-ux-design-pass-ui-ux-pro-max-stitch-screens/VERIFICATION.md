# VERIFICATION — Phase 9.5: UI/UX Design Pass (v2 tokens, settings, admin, Stitch)

**Phase:** 9.5 · **Verified:** 2026-09-29 · **Plan:** `09.5-01-PLAN.md` (12 tasks, single plan, executed inline sequentially)
**Requirements:** UI-01 (surfaces half), UI-06 (token v2), UI-07 (error/empty states), 05 §4 v2 reconciliation, CONTEXT §5.2 honesty rules
**Done-when (ROADMAP 9.5):** every 05 §3 surface is a real screen consuming v2 tokens; the design
system and the repo tell one story.
**Verdict:** ✅ **PASS — all twelve tasks executed, all gates re-derived green, and the
v1/half-v2 split in the design library was repaired (with the user's explicit go-ahead).**

The phase's defining rule — *build to the real API, not the mock* — was enforced on every screen:
eight times the plan's mock described controls the backend does not have, and in every case the
shipped UI renders the real contract with the divergence recorded in code and in §3 below. The
contrast audit, the role-shift sweep, and the Stitch re-theme are re-derived here, not trusted from
execution.

---

## 1. Gates re-derived (not trusted from execution)

| Gate | Command | Result |
|---|---|---|
| Backend suite | `.venv/Scripts/python.exe -m pytest -q` (Postgres/Redis on loopback) | **849 passed** — matches the 9.4 record exactly (the one serializer change, `is_staff`, is covered by the updated `test_me.py` shape assertions) |
| Frontend lint | `npm run lint` | **0 errors** (15 pre-existing warnings) |
| Frontend typecheck | `npm run typecheck` and `npx tsc -b --force` | both clean (the build's stricter `tsc -b` is part of the per-task gates) |
| Frontend suite | `npx vitest run` | **231 passed / 43 files** (182 at phase start; +49 from the nine new suites) |
| Frontend build | `npm run build` | clean; PWA assets emitted (`sw.js`, `sw-push.js`, manifest) |
| Contrast audit | `node scripts/contrast-audit.mjs` | **10/10 real pairs PASS**; the 2 FAIL rows are the audit's *deliberate* forbidden-pairing demos (brand-500 ring on white 2.77:1 and brand-700-on-dark 3.01:1 — both prohibited by 05 §4.1.1 v2 role rules, and the audit exists to prove the rules catch them) |
| Hex audit | repo-wide grep | zero raw v1 hexes and zero `indigo-*` utilities in `frontend/`; raw hexes exist only inside the token definitions themselves |

## 2. What the pass verified, task by task

- **T1 (18db11c) — Token v2.** Indigo→sky swap completed across tokens, `index.html` theme-color,
  manifest, icon generator (icons regenerated), and the three `indigo-*` utility findings. The
  measured contrast math forced the **role shifts** the plan implied: light-mode brand *text* moved
  600→700 (600 is 4.10:1 — fails AA), primary buttons rest at **brand-700** / hover 800 / active 900
  (5.93:1 at rest), focus rings moved 500→**600** in light mode (brand-500 is 2.77:1 — below the
  3:1 non-text bar; 600 is 4.10:1). Dark mode keeps the bright 400-family accents (8.33:1). 05 §4
  now carries the mapping table + supersession note so the spec, the tokens, and the code agree.
- **T2 (12e9a9e) — Settings hub.** Status lines are real: profile category/joining date from
  `GET /profile/`, device count from `GET /devices/`, push state from the browser's actual
  `Notification.permission`. Unknowable values render explicit "unknown" states, never guesses.
- **T3 (2f4fc85) — Profile.** PATCH contract verified against the serializer (partial writes,
  DRF field-error map, HiringType vocabulary); sticky bar, dirty-guard (`useBlocker` over a data
  router), unsaved indicator.
- **T4 (6cb17a0) — Privacy.** Exactly one real control exists server-side (`public_identity_mode`);
  the other rows are explained always-on/always-off states derived from the real exposure surface,
  with a live preview from the same state.
- **T5 (13be9d1) — Devices.** Real permission banner (denied-never-re-prompted from 9.4 honored),
  preference toggles through `PATCH /notifications/preferences/`, device revoke; the master-toggle
  fiction replaced by per-alert honesty.
- **T6 (1368438) — Security.** Password change rides the real auth endpoints; no sessions list
  exists server-side, so none is faked — the page says what is and is not tracked.
- **T7 (c787d63) — Danger zone.** `DELETE /account/` verified (wrong password → generic 403;
  deletion is **immediate anonymization** — the mock's 7-day grace period does not exist); copy
  says immediate/permanent, confirmation is type-the-word + re-auth.
- **T8 (c25ec39) — Admin shell + reports.** A *real* route guard now exists: `UserPrivateSerializer`
  gained a self-only `is_staff` (04 §113 sanctions staff surfaces; the shape-pinning tests were
  updated with the recorded rationale), `RequireStaff` gates `/admin/*`, the nav group carries a
  live pending count. The queue is PII-hard: the serializer ships no reporter/subject identity
  (04 §63), the DOM is swept by test for unmasked email/phone shapes, and a pure CSV builder is
  unit-tested (RFC 4180 quoting).
- **T9 (14f3236) — Announcements.** Draft-first flow mirrors the backend exactly: POST always
  creates a draft; publish is the deliberate PATCH `{is_published: true}` behind a confirm dialog
  (one broadcast, idempotent); `expires_at` is presented as the only real scheduling; push note
  states the Task 5 delivery-honesty rule.
- **T10 (97b4f6d) — 404/boundary/retry.** Unknown in-app URLs render the 404 panel **with the shell
  intact** (catch-all lives inside RequireAuth; static segments outrank the splat — asserted in
  tests), visitors get the chromeless variant; the boundary's 500 panel shows a **copyable
  reference id that is the same one logged** (asserted); `SectionRetry` gives a failed section
  inline recovery (wired into the hub's account summary) without losing Task 2's explicit-unknown
  contract.
- **T11 (this pass) — v2 reconciliation.** Hex/utility sweep: clean (see §1). The Stitch decision
  and its execution are recorded in §4.
- **T12** — this record, the SUMMARY, and the STATE/REQUIREMENTS updates.

## 3. Mock-vs-API divergences (every one shipped honestly, in code comments and UI copy)

| The mock showed | The API has | What shipped |
|---|---|---|
| Three privacy toggles | `public_identity_mode` only | One live toggle; explained static rows for the rest |
| "Survey response warning" on profile | No such rule | Honest copy; no invented warning |
| Master push toggle + rich device states | Per-alert preferences + device revoke | Per-alert toggles, real permission states |
| Sessions list in security | Password change only | Sessions omitted, stated as not tracked |
| 7-day grace before account deletion | Immediate anonymization | Copy says immediate/permanent |
| Members list in admin nav | No members endpoint | Group omitted (recorded) |
| Audience selector, schedule, reach figures for announcements | Drafts, pin, `expires_at`, idempotent publish | Draft-first flow; expiry as the only scheduling; "reach figures are not tracked by the API" |
| Staff draft list for announcements | None (public feed only) | Session-local drafts, labelled as such |

## 4. Stitch `apply_design_system` — the decision and the execution

The plan required an explicit decision because the operation is destructive. State found:

- Project `projects/3852118218307261541` ("TCS Joining Tracker — 9.2 UI Designs") still carried the
  **v1 theme** (`#4F46E5` indigo, Inter, the old §4 brief) as its project-level design theme — the
  exact half-v1/half-v2 split the plan warned about.
- The v2 design system `assets/9909951007419684952` ("TJT Professional Blue (9.5)") already existed
  with `#0369A1` primary, Fira Sans/Fira Code, hover/pressed/ring rules identical to the role rules
  the repo now implements.

**Decision: run it — on all 40 screen instances including the 2 hidden ones** (the user chose
"all 40" when asked). Executed this pass; Stitch session `2569706817692007299`; the returned
screen set (42 entries incl. the 2 design-system thumbnails) confirms every screen now carries
`overridePrimaryColor: #0369A1`, sky secondary/tertiary overrides, `#0F172A` neutral,
ROUND_EIGHT. The design library and the repo now tell one story. Instance list converted = the 40
`sourceScreen` instances returned by `get_project` at apply time (2 hidden instances included:
`b5e6580e…`, `cffe3468…`); the 2 `DESIGN_SYSTEM_INSTANCE` thumbnails were untouched placeholders.

## 5. Not re-derived in this pass (recorded, not glossed)

- **Visual inspection of the re-themed Stitch screens.** The apply response confirms the theme
  attachment per screen; a pixel-level review of each of the 40 re-rendered screens was not
  performed. The project's update timestamp advanced and the theme echoed per screen, but if any
  screen shows a layout artifact from the re-theme, re-running `apply_design_system` on that
  instance is idempotent.
- **The v1 design system (`assets/9887579562818178405`) and the project-level theme string** were
  left in place deliberately: instances were re-pointed to v2; deleting the historical asset is a
  curation choice outside this phase's mandate.
- **Live browser walkthrough of the new screens** against the running stack (the 9.4 pass's §3-style
  drills). Every new surface is covered by hermetic tests at the network boundary (routeAdapter),
  and the backend contract was re-read from source per task, but no live screenshot pass was run.

## 6. Tracking

- **STATE.md** — 9.5 marked executed + verified; residuals from §5 carried.
- **REQUIREMENTS.md** — UI-01…UI-08 all **Complete** (all 05 §3 surfaces are real screens).
- **Divergences** live in three places on purpose: code comments (per screen), UI copy (the honest
  states), and §3 of this record (the phase-level ledger).

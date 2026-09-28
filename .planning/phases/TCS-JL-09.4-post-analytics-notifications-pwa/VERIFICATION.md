# VERIFICATION — Phase 9.4: Post, Analytics, Notifications & PWA

**Phase:** 9.4 · **Verified:** 2026-09-28 · **Plan:** `09.4-01-PLAN.md` (9 tasks, wave 1)
**Requirements:** UI-04 (analytics disclaimer), UI-05 (PWA/SW), NOTIF-01, NOTIF-02
**Done-when (ROADMAP 9.4):** "Service worker displays background pushes and deep-links on click."
**Verdict:** ✅ **PASS — the four defects this pass found are fixed and re-derived green.** One
observation stays environment-blocked (the done-when's OS-display leg), and it is named rather than
buried.

All four surfaces ship, both suites and the build re-derive green in **both** push configurations,
and every wire-level claim in the plan's `must_haves` reproduces against the running stack. The pass
found four defects — one HIGH, which silently deactivated native devices — and all four were repaired
in-pass with tests that pin them and a live re-proof each (§4). The only unobserved item is the
done-when's *display* leg (a real browser showing an OS notification and following its deep link):
this machine's OS-level notification block makes it unobservable, not unimplemented — the delivery
contract behind it is proven server-side, in the worker, and by the payload's own tests.

---

## 1. Gates re-derived (not trusted from execution)

| Gate | Command | Result |
|---|---|---|
| Backend suite | `docker compose exec -T web python -m pytest -q` | **849 passed**, 3 pre-existing FCM deprecation warnings |
| Backend suite, **VAPID configured** | same, `VAPID_PUBLIC_KEY/PRIVATE_KEY` set | **849 passed** — this was 6 failed / 172 passed before F-94-3 was fixed, i.e. the gate that only held on machines without push keys now holds on both |
| Frontend lint | `npm run lint` | **0 errors**, 13 warnings (all pre-existing fast-refresh) — after the in-pass fix below |
| Frontend typecheck | `npm run typecheck` | clean |
| Frontend suite | `npx vitest run` | **182 passed / 33 files** (179 + 3 new PWA tests) |
| Frontend build | `npm run build` | clean; emits `dist/sw.js`, `dist/sw-push.js`, `dist/manifest.webmanifest`, `dist/index.html` |

Suite arithmetic: 842 (execution's figure) + 6 routing tests + 1 explicit `auto`-precedence test = 849.

## 2. Wire drills (curl against the live stack, independent of the test suite)

- **D1 · `GET /api/v1/analytics/status-distribution/`** — anonymous **200**, `data_source:
  COMMUNITY_REPORTED` + the non-affiliation disclaimer, `total_in_cohort: 65`, per-row
  `status_group`/`label`/`candidate_count`/`share` (`WAITING_FOR_JL` 9 / 13.8 %). Filters combine
  (`?batch=2025&hiring_type=DIGITAL` → `total_in_cohort: 48`). A below-floor slice
  (`?region=NowhereLand`) returns the §53 suppression payload — `suppressed: true`, message, **no
  counts**. An unknown value (`?batch=1999`) → **400 `invalid_filter`, `param: "batch"`, naming the
  whitelist**. This is D1's truth, reproduced field-by-field.
- **D2 · `GET /api/v1/devices/vapid-key/`** — anonymous **200**, `configured: true`, and the response
  contains **only** the public half: grepping the body for the 209-char private key from the drill's
  override file does not match. The signing secret cannot leak through this endpoint.
- **§7.10 · notifications** — login → `GET /api/v1/notifications/` → `count: 3`, `unread_count: 3`,
  the three seeded rows with `is_read: false`, `read_at: null`.
- **NOTIF-02 · device registration** — `POST /api/v1/devices/` with a subscription JSON and
  `device_type: "WEB"` → **201**, `device_type: "WEB"`, `browser: "Wire Drill"`, `is_active: true`,
  and **no `fcm_token` in the response** (write-only token preserved).
- **§7.8 · post detail + reply** — `GET /api/v1/community/posts/{id}/` → 200 with the anonymized
  author payload (`display_name: "Anonymous Candidate"`, no email); `POST .../comments/` → **201**
  with a nested author object; the post's `comment_count` moved 0 → 1. *The created comment row and
  its cascaded notification were deleted after reading (`deleted: (2, {'notifications.Notification':
  1, 'community.Comment': 1})`) — the drill left no rows behind.*
- **Encoding aside, recorded because it looked like a defect and is not:** the first reply attempt
  returned `400 JSON parse error - 'utf-8' codec can't decode byte 0x97` — my shell had sent an
  em-dash as cp1252. The API correctly refuses invalid UTF-8; nothing was created.

## 3. Browser drills (real Chromium, dev server :5173; production bundle on :4173)

- **Bell badge** — signed in, `GET /notifications/` unread 3 → the shell's bell renders **3** and the
  rail reports "3 unread notifications". Matches the API, no second source of truth.
- **§7.9 analytics render (live).** `/analytics` renders H1 `COMMUNITY RECRUITMENT BENCHMARKS &
  ANALYTICS`, the content module's header line `Community-Reported Data • Voluntary Candidate
  Submissions • Not Official TCS Data` with its notice paragraph, and the §5.6 footer — the UI-04
  disclaimer without a second hardcoded copy; three filter selects (All batches / All streams / All
  regions); four KPI cards reading **65 / 27 / 31 / 12**, byte-matching the `overview` payload from
  §2; the DIGITAL stream share bar (64); and the six-segment distribution whose legend counts sum to
  65 (9 / 10 / 9 / 12 / 18 / 7) with their shares. Screenshot recorded. No fabricated numbers, and
  the suppressed-data copy is the insufficient-data line, not a zero.
- **Offline banner (§10.1)** — `offline` event → the amber strip renders at the page top with
  `role="status"` and the exact copy `⚠️ Offline Mode. Showing cached data. Actions will sync when
  online.`; `online` clears it. Screenshot recorded. It keys off `navigator.onLine` only, never the
  SW — which is why it stays hidden when a local origin dies while the link is up (by design).
- **Push primer (§10.1)** — signed in at `/notifications` → the modal renders with
  `Enable push notifications?` + `Enable Alerts` / `Maybe later`, exactly the UI-SPEC copy; it is
  gated to `/notifications` and does not appear elsewhere. No native permission dialog appears
  before it — the primer-before-prompt rule holds.
- **Offline shell, production build.** Over `vite preview` the worker registers as **`/sw.js`**,
  controls the page, and fills `workbox-precache-v2-http://localhost:4173/` with 7 entries including
  `/index.html` and `/sw-push.js`. With the preview server **killed** (origin returns 000), a
  deep-link navigation to `/community/posts/45a4b526-…` still loaded the document and mounted the app
  shell (nav: Dashboard / Timeline / Community / Analytics; 357 chars rendered). `navigateFallback` +
  precache work end-to-end offline.
- **Offline *content*, after F-94-4's fix.** The worker now also fills a `public-reads` cache — 6
  entries: `/api/v1/announcements/`, `/api/v1/analytics/{overview,batches,regions,hiring-types,status-distribution}/`
  — and with the preview server **killed**, reloading `/analytics` renders the **whole screen from
  cache**: title, UI-04 disclaimer, KPI cards 65 / 27 / 31 / 12, stream share 64 and the legend,
  with **no skeletons**. Before the fix the same page rendered skeleton bars indefinitely
  (screenshot recorded). `*/api/` entries that are account-scoped: **zero**.
- **Push display leg still unobservable, and the environment is the reason:** the origin's permission
  is `denied` in the persistent profile **and in a brand-new incognito profile**, with the OS dialog
  unraisable. The done-when's "SW displays a background push, click deep-links" therefore rests on
  the server-side WEB-device contract, the worker's imported handlers, and the 16 jsdom tests. This is
  the one row in §6's matrix that is not ✅, and it is an environment limit, not a code gap.

## 4. Defects found — and their repairs

### F-94-1 (HIGH) — ✅ FIXED: `auto` + VAPID sent native FCM tokens to the Web Push backend and deactivated those devices

Plan Task 3's own wording is "resolves webpush **for WEB-type dispatch** … keep FCM as the explicit
setting for Android/iOS paths", and `WebPushBackend`'s docstring asserted that "the two token
vocabularies never share a backend". **Nothing implemented or enforced that.** `get_push_backend()`
took no device type, and `send_push_notification` passed **every** active device's `fcm_token` to the
one resolved backend:

```
devices = list(Device.objects.filter(user=recipient, is_active=True))
tokens  = [d.fcm_token for d in devices]
backend = get_push_backend()          # chosen without reference to device_type
result  = backend.send_multicast(tokens=tokens, ...)
if result.invalid_tokens:             # step 6/7: permanent failures are deactivated
    Device.objects.filter(fcm_token__in=result.invalid_tokens).update(is_active=False, ...)
```

Reproduced with a throwaway test (deleted after reading; two devices, `PUSH_BACKEND=auto` + VAPID via
settings override, one `MODERATION` notification):

```
OBSERVED backend resolved: WebPushBackend
OBSERVED native device is_active after one push: False
LOG WARNING notifications:backends.py:274 WEBPUSH_MALFORMED_SUBSCRIPTION: token is not a subscription object
LOG INFO    notifications:tasks.py:172 PUSH_NOTIFICATION_SENT: sent=0 failed=1 invalid=1
OBSERVED after one push -> ANDROID is_active=False, WEB is_active=True
```

An opaque FCM token is not JSON, so `WebPushBackend` classified it as a malformed subscription —
**permanent**, not retryable — and the stale-token sweep deactivated the row. Once VAPID keys are
configured (exactly what makes Web Push work at all), **every user holding an Android/iOS device row
silently lost push on it at the first notification**, permanently, until the app re-registered.

**Repair.** `PushBackend` now declares the token vocabularies it speaks —
`device_types: frozenset[str]` with `handles_device_type()`, empty meaning "any type".
`WebPushBackend.device_types = {WEB}`, `FirebasePushBackend.device_types = {ANDROID, IOS, OTHER}`,
and the recording double stays permissive so dev/CI still records every device. `send_push_notification`
resolves the backend **before** the debounce window and dispatches only to
`[d for d in devices if backend.handles_device_type(d.device_type)]`; a recipient with nothing
compatible is a logged skip (`PUSH_SKIPPED_NO_COMPATIBLE_DEVICES`), never a deactivation.
`test_push_device_routing.py` pins all of it, including the exact regression (native row still
`is_active=True` after a push, and the web backend's send call carrying only the web token).

**Accepted consequence, recorded not hidden:** because 9.4's seam resolves *one* backend per
deployment, `auto` + VAPID now serves browsers and skips native devices (which is what D2's "FCM
stays the explicit setting for Android/iOS paths" says, but it does mean an operator fielding both
clients must choose or run both). Serving both vocabularies in one deployment needs per-type
fan-out — a new capability, listed in STATE.md's Pending Todos.

### F-94-2 (MEDIUM) — ✅ FIXED: the primer wedged on an already-denied origin, so the denial was never persisted

`pushClient.ts` only short-circuited when permission was **`granted`**: with an already-`denied`
origin it still called `requestPermission()`, which Chromium can leave pending forever (no dialog can
be raised). Live repro before the fix: permission `denied` → press **Enable Alerts** →
`GET /devices/vapid-key/` **200** → no further request, ever; the button stayed `disabled`, the modal
could not close, no toast, `tjt.push_denied` never written — so §10.1's never-re-prompt rule never
engaged and the primer re-offered every session.

Worse, the jsdom test *asserted* the bad call (`expect(requestPermission).toHaveBeenCalledTimes(1)`)
because its stub resolved instantly — a mock that answers where the browser does not is exactly why
the green suite missed the wedged UI.

**Repair.** A single `askNotificationPermission()` helper is now the app's only caller of
`requestPermission()`: an existing `granted`/`denied` state *is* the answer (returned without asking),
a rejected ask returns `null` → the flow reports `"failed"` and persists **nothing** (we never learned
the user's decision), and every path still returns an outcome, so the modal cannot hang.

**Verified live after the fix** (incognito profile, permission `denied`): press **Enable Alerts** →
the modal **closes immediately**, `tjt.push_denied = "1"`, and the info toast
`Push alerts stay off. You can enable them in your browser settings.` shows for ~2 s. Reloading with
only the *persisted* flag (session flag cleared) leaves the primer **closed** — the rule now holds
across sessions, not just within one.

### F-94-3 (MEDIUM) — ✅ FIXED: six backend tests were not hermetic with respect to VAPID

With `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` in the environment, the suite went **6 failed / 172
passed**: the two `test_get_push_backend_auto_*` tests never cleared VAPID despite their names, and
four tests that capture sends through the recording double were guarded by
`if isinstance(backend, RecordingPushBackend)` — so under VAPID their assertions **silently stopped
running**, and `test_thread_debounce_exempts_vote_milestones` went red because the WEB row was
deactivated mid-test by F-94-1. Since the phase ships VAPID keys for its own proofs
(`docker-compose.override.yml`, untracked, gitignored) and any real deployment must set them, the
recorded "842 passed" only held on a machine *without* push configured.

**Repair.** The root `conftest.py` gains two opt-in fixtures — `no_vapid_config` (clears both
channels `_setting_or_env` reads: the settings attribute and the environment variable) and
`recording_push_backend` (pins `PUSH_BACKEND=recording` and hands back a cleared double). The eight
conditional guards in `test_push_celery_task.py` are gone, replaced by that pinned double, so the
captures are asserted unconditionally; `apps/notifications/tests/conftest.py`'s autouse isolation now
clears the double unconditionally too. A new
`test_get_push_backend_auto_prefers_webpush_when_vapid_is_configured` pins the D2 precedence itself
instead of leaving it to the ambient environment.

### F-94-4 (LOW) — ✅ FIXED: the offline copy promised cached data the app did not have

`OFFLINE_COPY` is verbatim from `09.4-UI-SPEC.md`'s copy table ("⚠️ Offline Mode. Showing cached
data. Actions will sync when online."), so rewording it would diverge from the spec. The honest fix
was to make the first claim true where it safely can be.

**Repair.** The worker's `runtimeCaching` gains the **viewer-independent public reads** under a stated
rule — only payloads that are identical for every visitor may be cached — covering
`/api/v1/{announcements,analytics,public}/`. Account-scoped reads stay uncached deliberately: the feed
carries `has_voted`, and notifications/dashboard/timeline carry account content, so a cache entry
(outliving a logout inside the profile) could answer for a second account while offline. Proven above:
with the origin dead, `/analytics` renders from `public-reads` with real numbers and no skeletons.

**Still not true, and recorded as a gap rather than papered over:** the second sentence ("Actions will
sync when online") implies an offline write queue, which does not exist — mutations made offline fail
and surface their error, they do not queue. That is a feature, not a copy tweak, and it stays in
STATE.md's Deferred Items.

### O-94-1 (fixed in-pass) — lint was red on a gitignored dev-mode artifact the phase's own change creates

Task 8 enabled `devOptions` for the service worker, which makes Vite emit `frontend/dev-dist/`
(`workbox-290dd570.js`). ESLint's flat config ignored only `dist`/`coverage`, so `npm run lint` — a
recorded gate — failed with **10 errors**, all inside that generated, gitignored file. Fixed by adding
`dev-dist` to the ignores in `frontend/eslint.config.js`; lint is now 0 errors with 13 pre-existing
warnings. Generated artifacts should be ignored, not linted.

### O-94-2 (NEW, open — privacy question, deliberately not decided here)

The `/api/v1/timeline/` runtime cache entry that 9.4 shipped holds **account-scoped** data, and a
Cache Storage entry outlives a logout. On a shared browser that means: user A signs out, user B signs
in, B goes offline, and a first-touch `/timeline` read can be answered from A's cached response.
Narrow (two accounts, one browser profile, offline) but it is real, and F-94-4's new entry is
deliberately the opposite kind of payload. Left exactly as shipped — the fix is a cache purge on
logout or dropping the entry, and that is a product call. Annotated in `vite.config.ts` beside the
entry so it cannot be copied into a new cache rule by accident.

## 5. Acceptance matrix

| `must_haves` truth / criterion | Evidence | Verdict |
|---|---|---|
| D1 · status-distribution combines filters, suppresses below floor, drops rows not zeroes, 400s unknown values naming the parameter | §2 D1 (four wire drills) + `test_status_distribution` | ✅ |
| D2 · a primer-made subscription reaches a WEB `Device` row; the WEB-device contract delivers via `WebPushBackend` | §2 NOTIF-02 (201, WEB, token withheld); WEB device row fed to the backend in execution's proofs; routing per F-94-1's repair | ✅ |
| D2 guard · payload carries only template text + `click_action`; missing VAPID falls back to recording | `test_webpush_backend` / `test_push_deep_link` green; §1 (the VAPID-free configuration is one of the two the gate now passes in) | ✅ |
| D3 · exactly §7.8 + §7.9 + §7.10 + PWA ship; deferred affordances recorded | `09.4-CONTEXT.md` scope fence; no settings/moderation UI in the diff | ✅ |
| D4 · the PWA screen is catalogued with the other four IDs | `09.4-CONTEXT.md` design table | ✅ |
| §7.8 · 1-level comments, autofocused inline reply, tombstone string, locked-post banner | §2 §7.8 drill + execution's live proof (a) | ✅ |
| §7.9 · KPIs/stream/distribution from live payloads, suppression copy never fabricated numbers, disclaimer from the single content module | §2 analytics drills; §3 live render (65/27/31/12); `AnalyticsPage.test.tsx` | ✅ |
| §7.10 · row click marks read then deep-links to the anchor; Mark All zeroes the count; empty state; bell badge = `unread_count` | §3 bell = 3 (API 3); execution's live proof (c) | ✅ |
| §10.1 · offline banner shows when offline | §3 (renders, exact spec copy, clears) | ✅ |
| §10.1 · install banner only after a trigger, persisted | `InstallPrompt` unit tests (not driven live in this pass — recorded in §6) | ⚠️ tests only |
| §10.1 · primer always precedes the native prompt | §3 (no dialog before the modal; `askNotificationPermission` is the only caller) | ✅ |
| §10.1 · a denial is never re-prompted | §3 live repro **before** the fix, live proof **after**: flag persisted, modal closed, primer absent on reload | ✅ |
| UI-04 · analytics header carries the disclaimer | §2 (every analytics payload) + §3 (the screen's own header line, notice and footer render live, from the single content module) | ✅ |
| UI-05 · SW registered for background push, deep links, offline indicator | §3 — registration, precache, offline shell **and** offline content all proven; push *display* unobservable here | ✅ with the §6 caveat |
| NOTIF-01 · in-app notifications with read tracking | §2 (3 rows, unread 3) + execution's read/mark-all live proof | ✅ |
| NOTIF-02 · multiple browser/mobile devices, write-only tokens | §2 (201, `fcm_token` never echoed) | ✅ |
| **Roadmap done-when** · SW displays background pushes and deep-links on click | handlers imported + payload contract + deep-link routing (execution's live proof and 16 jsdom tests) + F-94-1's routing repair; the OS display itself is blocked by this machine's notification policy | ⚠️ unobservable here |
| Native devices are not harmed by Web Push being enabled (the F-94-1 regression) | `test_push_device_routing.py` (6 tests) + the throwaway repro now asserting survival | ✅ |

## 6. Not re-derived in this pass (recorded, not glossed)

- **The Stitch side-by-side.** Execution recorded comparisons against `c42fd641…` (§7.10),
  `ac5b1598…` (§7.8) and the mockup divergences 1–6 in `09.4-PROOFS.md`; this pass did not re-open
  the mockups. The standing directive's visual pass for 9.4 therefore rests on execution's record,
  and 9.3's unreadable-`htmlCode` limitation still applies to any deeper spacing comparison.
- **The install-banner triggers live** (milestone / two distinct community days): unchanged, pinned
  by `pwa.test.ts` only.
- **The granted-permission push path**: blocked by the environment, not by the code. On a machine that
  can raise the dialog, the recipe is: prime on `/notifications` → allow → `POST /devices/` with a
  subscription JSON → trigger a notification → confirm the OS notification → click → the SPA opens
  `/community/posts/<id>`.

## 7. Tracking

- **STATE.md** — 9.4 is **verified, all four defects fixed**, with the residuals (per-type backend
  fan-out, offline write queue, timeline-cache privacy question, install triggers live) carried in
  Pending Todos/Deferred Items.
- **REQUIREMENTS.md** — UI-04 **Complete** (both halves verified); NOTIF-01/NOTIF-02 **Complete**;
  UI-05 **Complete** with the OS-display caveat named.
- **`09.4-VALIDATION.md`** — its manual-only rows now have results: "denied → never re-prompts" ✅
  (fixed and re-proved live), "offline reload + built bundle" ✅ (§3, server-killed deep link *and*
  cached analytics), "granted → notification appears" ⛔ blocked in this environment.
- **Source changes in this pass** (backend): `apps/notifications/backends.py`,
  `apps/notifications/tasks.py`, `apps/notifications/tests/test_push_device_routing.py` (new),
  `apps/notifications/tests/conftest.py`, `apps/notifications/tests/test_push_backends.py`,
  `apps/notifications/tests/test_push_celery_task.py`,
  `apps/community/tests/test_announcement_broadcast.py`, and the root `conftest.py`.
  **(frontend)**: `frontend/src/pwa/pushClient.ts`, `frontend/src/pwa/pwa.test.tsx`,
  `frontend/vite.config.ts`, `frontend/eslint.config.js`.

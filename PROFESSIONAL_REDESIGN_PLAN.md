# Master Plan: Eliminating "AI Slop" & Transforming TCS Joining Tracker into a Human-Crafted Product

> **Status:** Complete (`Phase 1` through `Phase 8` Complete ✅ — All 26 Routes, 3 Shells, and 6 Overlays Redesigned & Verified)
> **Drawn Directions:**
> - **Public & Persuade Surface (`/`):** `product-performs` (seed `1472701302`, `.taste-skill/direction.json`) — *"Software is most convincing when it is doing its job in front of you."*
> - **Authenticated & Public Workspace (`--app`):** `Accent ladder / Open plane` (seed `1948030239`, `.taste-skill/app/direction.json`) — *"One brand hue at full strength only on small marks, and its pale tints doing all the area work. Colour goes on data, not chrome."*

---

## 1. Root-Cause Diagnosis: Why the App Previously Read as "Made by AI"

Auditing `frontend/src/` against our craft skills (**`design-taste-frontend`**, **`impeccable`**, **`emil-design-eng`**, **`mobile-native`**, and **`ui-ux-pro-max`**) revealed the exact structural causes:

1. **Verbatim Stitch Markup Port (`Phase 14` & `Phase 16`):** The app copied raw HTML/Tailwind exports from Google Stitch (`frontend/stitch designs/`) and kept two conflicting theme worlds bolted together in `src/styles/stitch-scopes.css`:
   - **`.skin-v1` (32 screens):** Used `Inter` + Tailwind `indigo-600` / `violet-600` accents.
   - **`.skin-v2` (13 screens):** Used `Fira Sans` / `Fira Code` + `sky-700` (`--color-brand-*`) accents.
   - *Effect:* Navigating from `/` (`.skin-v2` Sky/Fira) to `/login` (`.skin-v1` Indigo/Inter) to `/settings` (`.skin-v2`) felt like jumping between two disconnected AI templates.
2. **Classic AI Generator "Tells" Across Screens:**
   - **Ambient Blur Orbs & Dot Grids:** `bg-[radial-gradient(#cbd5e1_1px,transparent_1px)]`, `bg-indigo-200/20 rounded-full blur-3xl` on Login, Register, and Landing.
   - **Eyebrow Pill Badges:** Pulsing green dots inside `rounded-full border border-brand-200 bg-brand-50` pills above centered headlines.
   - **Icon-in-Tinted-Square Cards:** Every KPI card and Settings link had a `w-10 h-10 rounded-control bg-brand-tint` icon box—the #1 statistical signature of AI-generated dashboards (`design-taste-frontend` study: appears on 28% of low-scoring AI pages vs. 1% of human award winners).
   - **ALL-CAPS Tracked Section Headers with Colons:** e.g., `"OVERVIEW KPI CARDS:"`, `"BREAKDOWN BY HIRING STREAM:"`, `"MY STATUS SUMMARY"` in `text-[11px] uppercase tracking-wider`.
   - **Mixed Icon Systems:** Vendored `<span className="material-symbols-outlined">` font ligatures sat side-by-symbol with `lucide-react` SVGs on the same screen.
   - **Awaiting-Data Skeletons (`data-awaiting`):** Empty mock frames kept verbatim from Stitch where the backend did not supply fictional mock metrics.

---

## 2. Skills & MCP Servers Orchestration Strategy

| Skill / MCP Tool | Role in This Transformation |
| :--- | :--- |
| **`design-taste-frontend`** (`tasteskill v2`) | **Primary Art Direction & Gatekeeper.** Uses `scripts/draw.mjs` (`product-performs` for the Persuade Landing Page) and `scripts/draw.mjs --app` (`Accent ladder` for Operate App Screens), plus automated real-browser audits via `scripts/lint.mjs` and `scripts/inspect.mjs` at `1440px`, `768px`, and `390px`. |
| **`frontend-design`** (`anthropics/claude-plugins-official`) | **Anti-Template Studio Direction & Copy Discipline.** Enforces subject-grounded visual choices, bans single-word accented headlines, tracked-out ALL-CAPS eyebrows, SaaS card kits, and `→` button suffixes, and enforces plain active-voice copywriting. |
| **`vercel-react-best-practices` + `vercel-composition-patterns` + `web-design-guidelines`** (`vercel-labs/agent-skills`) | **React Architecture & Bundle Performance.** Eliminates async waterfalls (`Promise.all`), avoids barrel-import bloat, enforces derived state during render, hoists static JSX, and optimizes route code-splitting (`React.lazy` / `manualChunks`). |
| **`gsap-core` + `gsap-react` + `gsap-scrolltrigger` + `gsap-timeline` + `gsap-performance`** (`greensock/gsap-skills`) | **Choreographed Timeline & ScrollTrigger Motion.** Uses `useGSAP()` with scoped refs and `gsap.matchMedia()` (`prefers-reduced-motion: reduce` safe) for the Landing Page shutter reveal (`product-performs`), interactive cohort benchmark transitions, and milestone timeline progressions. |
| **`impeccable`** | **Surface Mode & Craft Floor Enforcement.** Enforces `Persuade` mode (`/`), `Operate` mode (app/admin/settings), and `Read` mode (legal pages) via `PRODUCT.md`, `DESIGN.md`, and `reference/craft-floor.md`. |
| **`emil-design-eng` + `animate`** | **Motion & Micro-Interaction Engineering.** Replaces `transition-all` with GPU-composited `transform`/`opacity`, custom cubic-bezier curves (`cubic-bezier(0.23, 1, 0.32, 1)`), `:active` press scaling (`scale(0.98)`), origin-aware popovers, and smooth toast/drawer physics. |
| **`mobile-native`** | **Touch & PWA Polish.** Fixes `100dvh` keyboard viewport bugs in `/messages`, sticky `:hover` states on mobile (`@media (hover: hover)`), safe-area insets, and tap highlights. |
| **`Figma MCP`** (`team::1267329103077286982`) | **Canonical Design System & Component Library.** Establish a single source of truth in Figma (`mini BUMBUM's team`), replacing the fragmented Stitch HTML dumps. |
| **`Stitch MCP`** (`project: 3852118218307261541`) | **Design System Synchronization.** Synced `DESIGN.md` (`assets/3931745552704480828`) so Stitch project `3852118218307261541` stays aligned with the unified codebase. |

---

## 3. Phase-by-Phase Execution Plan (All 26 Routes, 3 Shells, 6 Overlays)

### Phase 1: Unify Foundation, Tokens, Typography & Browser Surfaces (Kill Dual Skins)
**Goal:** Eradicate `.skin-v1` vs `.skin-v2` schizophrenia and establish one unmistakable product identity across `src/index.css`, `src/styles/stitch-scopes.css`, `src/theme/tokens.ts`, `src/components/`, and `DESIGN.md` / `PRODUCT.md`.
1. **Unified Palette ("Forest Emerald & Warm Stone" — No Violet/Indigo):**
   - Warm stone ground (`#FAF9F6` light / `#0C0A09` dark) and charcoal stone ink (`#1C1917` light / `#FAF9F6` dark) for calm, financial-grade ledger clarity.
   - Full Forest Emerald brand hue (`#047857` / `--color-brand-700` light, `#34D399` / `--color-brand-400` dark) on small precision marks, active data series, and primary actions; pale botanical tints (`50–200`) on active nav pills, badges, and progress tracks.
   - Remap legacy `indigo-*`, `violet-*`, `purple-*`, and `fuchsia-*` utilities at the CSS theme level so zero purple/violet AI-slop hues appear anywhere in the application while preserving existing component test assertions.
2. **Unified Typography & Tabular Numerals:**
   - Unify `.skin-v1` and `.skin-v2` onto a single crisp typographic hierarchy (`Inter` for precision UI/body + `Fira Sans` for editorial display/headlines + `Fira Code` with `font-variant-numeric: tabular-nums` for dates, wait-day deltas, and cohort counts).
3. **Emil Kowalski Motion & Impeccable Browser Surfaces:**
   - Custom easing tokens (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`).
   - Global `::selection`, `caret-color`, themed scrollbars, `:focus-visible` rings, `@media (hover: hover) and (pointer: fine)` guards, and `@media (prefers-reduced-motion: reduce)` fallbacks.
   - Upgrade core primitives (`Button`, `Input`, `Textarea`, `Modal`, `PageHeader`, `Toast`, `UpvotePill`, `ErrorPanels`) with flat architectural borders (no resting card drop-shadows), Lucide SVG icons, and crisp `:active` press feedback.

---

### Phase 2: Global Shells & Navigation Chrome (3 Layouts)
- **`src/layouts/AppShell.tsx` + `src/layouts/MobileTabBar.tsx`:** Open-plane 240px sidebar, neutral active indicator pill, flat top bar with `/` search focus, collapsible right context rail, compact announcement strip, and Lucide SVG icons.
- **`src/routes/PublicShell.tsx`:** Seamless read-only workspace frame for anonymous visitors on `/community` and `/analytics`.
- **`src/layouts/VisitorShell.tsx` + `VisitorHeader.tsx` + `VisitorFooter.tsx`:** Plain architectural header and typographic close with the mandatory non-affiliation disclaimer (`05 §5.6`).

---

### Phase 3: Public & Persuade Surfaces (4 Screens)
- **`/` (`LandingPage.tsx`):** Built on the drawn `product-performs` direction. Left: 2-line headline + direct action. Right: **Live Interactive Cohort Wait-Time Fragment (`data-ui`)** powered by `GET /api/v1/public/stats/`. No eyebrow pill badges, no gradient text, no 3-icon feature cards.
- **`/about` (`AboutPage.tsx`), `/privacy` (`PrivacyPage.tsx`), `/terms` (`TermsPage.tsx`) + `LegalLayout.tsx`:** Editorial `Read` mode with 65ch measure, sticky index rail, and zero placeholder banners.

---

### Phase 4: Authentication, Verification & Onboarding Flow (7 Screens)
- **`/login` (`LoginPage.tsx`), `/register` (`RegisterPage.tsx`):** Delete radial dot-grids and `blur-3xl` orbs. Architectural 2-column frame showing a live anonymized candidate timeline specimen on the left and the credential form on the right.
- **`/forgot-password` (`ForgotPasswordPage.tsx`), `/reset-password/:token` (`ResetPasswordPage.tsx`):** Clean single-column recovery cards.
- **`/verify-email-pending` (`VerifyEmailPendingPage.tsx`), `/verify-email/:token` (`VerifyEmailActionPage.tsx`):** Deterministic verification state machine.
- **`/onboarding` (`OnboardingPage.tsx`):** 3-step cohort & privacy wizard with live `IdentityPill` preview.

---

### Phase 5: Core Candidate Workspace Screens (4 Screens)
- **`/dashboard` (`DashboardPage.tsx` + `MilestoneStepper.tsx` + `RailStatusSummary.tsx`):** Typographic KPIs (`tabular-nums`, no icon circles), precision 6-stage horizontal milestone track with day-deltas, and cohort comparison ledger.
- **`/timeline` (`TimelinePage.tsx` + `TimelineRoadmap.tsx`):** Vertical engineering-log recruitment ledger with verified badges, date diffs, and inline milestone actions.
- **`/analytics` (`AnalyticsPage.tsx`):** Report-card & legend-table layout (`app-screens.md §5`), sentence-case headers (no uppercase colons), single-hue distribution bars, and dignified `<5` k-anonymity suppression notices.
- **`/messages` (`MessagesPage.tsx` + `RoomRail.tsx` + `MessageBubble.tsx` + `TypingIndicator.tsx`):** `100dvh` mobile-safe flex layout, consecutive-author message grouping, and spring reply quotes.

---

### Phase 6: Community Forum & Notifications (4 Screens)
- **`/community` (`CommunityFeedPage.tsx` + `PostCard.tsx` + `CategoryTabs.tsx`):** Flat 1px-bordered discussion ledger rows, underline sort tabs, and responsive category filter pills.
- **`/community/posts/:id` (`PostDetailPage.tsx` + `CommentThread.tsx`):** Unlimited nested comment tree with hover-highlighted 1px vertical thread guides and inline reply composer.
- **`/community/create` (`CreatePostPage.tsx`):** Clean post composer route.
- **`/notifications` (`NotificationsPage.tsx` + `NotificationRow.tsx`):** Clean inbox grouped by Unread/Earlier with 2px left unread indicator and zero `data-awaiting` mock artifacts.

---

### Phase 7: Settings Suite (6 Screens) & Staff Administration (3 Screens)
- **`/settings` (`SettingsPage.tsx` + `SettingsLayout.tsx`):** Persistent left sub-navigation rail + right content pane replacing the 2×2 icon-card grid.
- **`/settings/profile`, `/settings/privacy`, `/settings/security`, `/settings/devices`, `/settings/danger`:** High-precision single-column forms (`max-w-xl`), live `IdentityPill` preview, device revocation table, and GDPR anonymization panel.
- **`/admin/moderation/reports`, `/admin/announcements`, `/admin/members`:** Dense operations tables with right-aligned severity weights, 1-click resolution actions, and live announcement preview.

---

### Phase 8: Modals, Overlays, Error Boundaries & PWA States (6 Surfaces)
- **`TimelineEventModal.tsx` & `CreatePostModal.tsx`:** `scale(0.96)` → `scale(1)` entrance with `--ease-out` timing.
- **`InstallPrompt.tsx`, `PushPrimer.tsx`, `OfflineBanner.tsx`:** Non-intrusive PWA and Web Push privacy surfaces.
- **`ErrorBoundary.tsx`, `ErrorPanels.tsx`, `NotFoundPage`:** Clean typographic recovery states.

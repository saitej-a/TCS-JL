---
phase: "16"
slug: "replace-the-current-screens-with-the-frontend-stitch-designs"
status: draft
shadcn_initialized: false
preset: none
created: "2026-10-04"
---

# Phase 16 — UI Design Contract: Verbatim Stitch Compositions

> Visual, structural, and interaction design contract for replacing the frontend screens with the Stitch design compositions from `frontend/stitch designs/`. Authored by this phase (D-16-01 / D-16-02) to satisfy `ui.plan-gate` and establish strict fidelity guidelines.

---

## 1. Design System & Theme Architecture

| Property | Value |
|----------|-------|
| **Source Library** | `frontend/stitch designs/` (45 HTML compositions + 1 Design System Token doc) |
| **Styling Engine** | Tailwind CSS v4 with scoped CSS variables in `frontend/src/styles/stitch-scopes.css` |
| **Typography** | Vendored Inter (`.skin-v1`) and Fira Sans / Fira Code (`.skin-v2`) in `frontend/src/styles/fonts.css` |
| **Iconography** | Vendored Material Symbols Outlined (127 unique glyphs in `material-symbols-outlined-*.woff2`) |
| **Component Architecture** | React 18 functional components with strict TypeScript (~5.6.3) |

---

## 2. Per-Screen Skin Scope Contract

The Stitch library consists of two visual families. Each screen root must declare its exact scope class:

```tsx
// skin-v1 (33 compositions: Inter font, Tailwind standard indigo/slate/emerald accents)
<div className="skin-v1 min-h-screen bg-slate-50 text-slate-900"> ... </div>

// skin-v2 (12 compositions: Fira Sans/Code font, brand/sky palette, rounded-card/rounded-elem)
<div className="skin-v2 min-h-screen bg-background text-foreground"> ... </div>
```

| Skin | Font Families | Primary Accent | Surfaces & Borders | Radii |
|------|---------------|----------------|--------------------|-------|
| `skin-v1` | Inter (`--font-sans`, `--font-headline`) | `indigo-600` / `indigo-700` | `bg-white`, `border-slate-200`, `bg-slate-50` | standard (`rounded-md`, `rounded-lg`, `rounded-xl`) |
| `skin-v2` | Fira Sans (`--font-sans`), Fira Code (`--font-mono`) | `brand-600` (`sky-600`) | `bg-surface`, `border-border`, `bg-background` | `rounded-card` (0.75rem), `rounded-elem` (0.5rem) |

---

## 3. Honest Awaiting State & Mock Data Contract (D-03)

Where a composition displays mock cards, tables, or fields not supported by the Django REST Framework backend:
1. **Preserve the Frame:** The card, container, header, icon, and structural grid are retained verbatim from `code.html`.
2. **Read-Only Awaiting Value:** The mock value is replaced with an em dash `—` wrapped in an element with an explicit `data-awaiting="<field_name>"` attribute.
3. **Never Fabricate:** No hardcoded mock metrics (e.g. fake salary breakdown, imaginary regional joining statistics, or simulated active user numbers) may be rendered as factual text.
4. **Disabled Actions:** Buttons or toggles that trigger actions not supported by the backend (e.g. filtering by notification type or switching fictional identity modes) remain visible in their exact design position, styled as disabled/inert with `data-awaiting` tags.

---

## 4. Shell & Responsive Layout Contract

- **Desktop (≥1280px):**
  - Left navigation rail (240px fixed width, matching `tcs_joining_tracker_app_shell`).
  - Sticky top bar with search, notification bell with unread badge, and quick action.
  - Primary content container.
  - Optional right contextual rail (320px, e.g. community trends, active filters, status cards) rendered via `RailPortal`.
- **Tablet (640px – 1279px):**
  - Collapsible navigation rail; right rail hidden or stacked into the main scroll view.
- **Mobile (<640px):**
  - Sticky top bar with brand mark and action icons.
  - Bottom navigation bar with 5 primary touch targets (`Dashboard`, `Timeline`, `Community`, `Chat`, `Settings`) matching `tcs_joining_tracker_mobile_app_shell`.
  - Content single-column full-width with safe-area padding.
- **Dark Mode:**
  - Full parity via Tailwind's `dark:` class variant and CSS custom property remapping matching `tcs_joining_tracker_desktop_app_shell_dark_mode`.

---

## 5. Modal & Dialog Contract

- All modals (e.g. `create_community_discussion_post_modal`, `add_edit_milestone_modal_1/2`, `confirmation_dialogs`) must use React state and portal mechanics.
- Backdrop with blur and click-outside dismissal.
- Escape key listener and focus-trap behavior.
- Mobile bottom-sheet transition on screens <640px.

---

## 6. Icon Typography Contract

All icons must use vendored Material Symbols Outlined ligatures:
```html
<span className="material-symbols-outlined text-slate-500 text-[20px]">
  notifications
</span>
```
No external CDN links or unvendored icon dependencies.

---

## 7. Preservation of Functionality & Plumbing (D-02)

1. **Authentication & Token Lifecycle:** Login, registration, token refresh, and logout handlers in `AuthContext.tsx` and `api/client.ts` must remain fully connected to all form submits.
2. **Route Guards:** `RequireAuth`, `PublicOnly`, and `RequireStaff` route protection must remain active in `App.tsx`.
3. **Chat & Presence:** WebSocket connection (`useChatRoom.ts`) and the typing wave indicator (`TypingIndicator.tsx`) must remain integrated in the messages / community view.
4. **PWA & Offline:** Service worker registration, install prompts, and offline cache banners (`PwaLayer.tsx`, `registerSW.ts`) must remain functional.
5. **Testing Contract:** All component test selectors (`data-testid`, accessible role names, form labels) must be preserved or systematically updated in test suites to prevent regressions.

# Design System & Anti-Slop House Style: TCS Joining Tracker

> **Visual Authority:** Unified across Public (`Persuade` / `Read`) and Workspace (`Operate`) surfaces.
> **Committed Palette:** **Forest Emerald & Warm Stone** — Warm stone ground (`#FAF9F6`) + deep forest emerald (`#047857` light / `#34D399` dark) + charcoal stone ink (`#1C1917`). Calm, editorial, financial-grade clarity.
> **Drawn Directions:**
> - **Landing Page (`/`):** `product-performs` (seed `1472701302`) — *"Software is most convincing when it is doing its job in front of you."*
> - **Workspace & App Screens (`--app`):** `Accent ladder / Open plane` (seed `1948030239`) — *"One brand hue at full strength only on small marks, and its pale tints doing all the area work. Colour goes on data, not chrome."*

---

## 1. Anti-Slop House Rules (Mandatory Across All 26 Routes)

1. **One Unified Token World:** The historical `.skin-v1` (Indigo/Inter) and `.skin-v2` (Sky/Fira) split is retired. Every screen shares one cohesive **Forest Emerald & Warm Stone** color, typography, border, and motion system.
2. **No Violet or Indigo (`#4F46E5`, `#6366F1`, `#8B5CF6`):** Banned across chrome, buttons, rings, and backgrounds. Legacy `indigo-*`, `violet-*`, `purple-*`, and `fuchsia-*` classes are aliased directly to the canonical `--color-brand-*` (Forest Emerald) ladder.
3. **Color Goes on Data, Not Chrome:**
   - Navigation bars, sidebars, headers, and card containers remain warm stone/paper (`#FAF9F6` / `#FFFFFF` in light mode; `#0C0A09` / `#1C1917` in dark mode).
   - Full brand hue (`#047857` light, `#34D399` dark) is reserved for the primary action button, active data series, and small precision marks; its pale botanical tints (`50–200` light, `950/60` dark) carry active pills, badges, and progress tracks.
4. **Flat Surfaces Separated by 1px Hairlines:**
   - Resting cards, panels, and tables carry **no drop shadows** (`shadow-none`) and **no glowing blur orbs** (`blur-2xl`, `blur-3xl`).
   - Surfaces are separated by `1px solid` warm stone hairlines (`#E7E5E0` light, `#292524` dark) or a single background tone step.
   - Shadows are reserved strictly for elevated overlays that genuinely float above the canvas (modals, dropdown menus, toasts).
5. **KPIs Are Typography, Not Icon Tiles:**
   - Never place an icon inside a tinted circle or rounded square (`w-10 h-10 bg-brand-tint`) on a KPI card or settings hub tile.
   - Metrics lead with `tabular-nums` figures (`24px–32px`), clear units (`days`, `candidates`, `%`), and honest baseline labels.
6. **Sentence-Case Section Headings (No Eyebrows, No Colons):**
   - Never use `ALL CAPS:` section headers with trailing colons (`"OVERVIEW KPI CARDS:"`). Use crisp sentence case (`15px–18px`, `font-semibold`, `tracking-tight`).
   - Never stack pill eyebrow badges above centered headlines.
7. **Single Vector Icon System:**
   - Standardize on `lucide-react` vector icons (`1.75px` stroke width). Do not introduce new `material-symbols-outlined` ligatures.

---

## 2. Typography & Numeric Discipline

- **UI & Body (`--font-sans`, `--font-body`, `--font-label`):** `"Inter"`, `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` — chosen for high legibility at `13px–15px` in dense tables, timelines, and chat streams.
- **Display & Editorial (`--font-display`, `--font-headline`):** `"Fira Sans"`, `"Inter"`, `sans-serif` — tight tracking (`-0.02em` to `-0.03em`) for page titles and landing statements.
- **Monospace & Tabular Figures (`--font-mono`, `.font-mono-numbers`, `.tabular-nums`):** `"Fira Code"`, `ui-monospace, monospace` with `font-variant-numeric: tabular-nums` enforced on all dates, wait-day counts, percentages, and pagination counters.

| Role | Size / Weight | Line Height / Tracking | Usage |
| :--- | :--- | :--- | :--- |
| **Display Hero (`h1` on `/`)** | `clamp(2.5rem, 4.8vw, 4.25rem)` / `600` | `1.04` / `-0.03em` | Landing page primary statement (max 2 lines) |
| **Page Title (`h1` in App)** | `1.5rem` (`24px`) / `600` | `1.25` / `-0.02em` | Workspace screen titles (`Dashboard`, `Timeline`, `Benchmarks`) |
| **Section Header (`h2`)** | `1.0625rem` (`17px`) / `600` | `1.35` / `-0.015em` | Panel and table section titles (sentence case, no colons) |
| **Card / Thread Title (`h3`)** | `0.9375rem` (`15px`) / `600` | `1.4` / `-0.01em` | Community post titles, milestone titles |
| **Body Primary** | `0.9375rem` (`15px`) / `400` | `1.6` / `0` | Post bodies, comments, legal copy (`60ch–70ch` max measure) |
| **Body Compact / UI** | `0.875rem` (`14px`) / `400–500` | `1.45` / `0` | Navigation rows, form inputs, table cells, chat messages |
| **Caption / Meta** | `0.75rem` (`12px`) / `500` | `1.35` / `0` | Timestamps, cohort tags, helper text |

---

## 3. Color Tokens (`@theme` in `src/index.css`)

### Brand Ladder (Forest Emerald)
- `--color-brand-50`: `#ECFDF5`
- `--color-brand-100`: `#D1FAE5`
- `--color-brand-200`: `#A7F3D0`
- `--color-brand-300`: `#6EE7B7`
- `--color-brand-400`: `#34D399` *(Primary accent in Dark Mode)*
- `--color-brand-500`: `#10B981`
- `--color-brand-600`: `#059669` *(Primary data series & focus ring)*
- `--color-brand-700`: `#047857` *(Primary action fill in Light Mode — 5.5:1 contrast with white)*
- `--color-brand-800`: `#065F46` *(Primary action hover)*
- `--color-brand-900`: `#064E3B` *(Primary action active)*
- `--color-brand-950`: `#022C22` *(Dark mode tint surface & BrandMark ground)*

### Warm Stone Neutral Scale & Surfaces
| Token | Light Mode (Warm Stone) | Dark Mode (Warm Carbon) | Role |
| :--- | :--- | :--- | :--- |
| `--color-background` | `#FAF9F6` (`stone-50`) | `#0C0A09` (`stone-950`) | App & page ground |
| `--color-surface` | `#FFFFFF` (`white`) | `#1C1917` (`stone-900`) | Primary panel & card surface |
| `--color-surface-elevated` | `#F5F4F0` (`stone-100`) | `#292524` (`stone-800`) | Hover/active row & secondary well |
| `--color-primary` | `#1C1917` (`stone-900`) | `#FAF9F6` (`stone-50`) | Full ink for headings & primary text |
| `--color-secondary` | `#57534E` (`stone-600`) | `#A8A29E` (`stone-400`) | Supporting copy & labels |
| `--color-muted` | `#78716C` (`stone-500`) | `#78716C` (`stone-500`) | Metadata, placeholders, disabled |
| `--color-default` | `#E7E5E0` (`stone-200`) | `#292524` (`stone-800`) | 1px structural hairlines & dividers |
| `--color-input` | `#D6D3CD` (`stone-300`) | `#44403C` (`stone-700`) | Form control idle border |

---

## 4. Motion & Interaction Engineering (`emil-design-eng`)

- **Custom Easing Curves:**
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` — default for entering elements, dropdowns, modals, and press feedback.
  - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` — on-screen morphing and tab indicators.
  - `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` — mobile bottom sheets and drawers.
- **Duration Ceiling:** All UI transitions stay between `120ms` and `240ms` (never >300ms).
- **Tactile Press Feedback:** Interactive buttons and upvote pills scale to `scale(0.98)` on `:active` over `140ms var(--ease-out)`.
- **Never Animate from `scale(0)`:** Modals, popovers, and toasts enter from `scale(0.96)` + `opacity: 0`.
- **Touch & Reduced Motion Safety:** Hover transforms are gated behind `@media (hover: hover) and (pointer: fine)`; movement animations collapse to instant opacity transitions under `@media (prefers-reduced-motion: reduce)`.

# TCS Joining Tracker - Design System v2 (Phase 9.5)

A trustworthy, calm, privacy-first recruitment-tracker PWA for teaching candidates. Same architecture as v1 (05_UI_UX_SPECIFICATION.md 4), refreshed brand + type direction.

## What changed from v1
- Brand scale: indigo -> sky/professional blue. brand-600 #0284C7, brand-700 #0369A1, brand-500 #0EA5E9, brand-400 #38BDF8, brand-300 #7DD3FC, brand-200 #BAE6FD, brand-100 #E0F2FE, brand-50 #F0F9FF, brand-800 #075985, brand-900 #0C4A6E, brand-950 #082F49.
- Typography: Inter -> Fira Sans for UI text; Fira Code for data, numerals, IDs, tokens and code.
- Unchanged on purpose: slate neutral surfaces (why: dark mode is first-class and slate pairs with sky), semantic accents emerald/amber/sky-step/rose, radii (8/12/16), elevation (shadow-sm cards, shadow-xl modals).

## Colours
- Brand primary action: #0369A1 on white text (contrast 6.5:1). Hover #0284C7 is NOT darker - use brand-800 #075985 for hover, brand-900 #0C4A6E for pressed.
- Neutrals: light bg #F8FAFC / surface #FFFFFF / border #E2E8F0; dark bg #0F172A / surface #1E293B / border #334155.
- Semantics: emerald #059669 success + JOINED, amber #D97706 waiting/survey, sky #0284C7 JL received, rose #E11D48 danger. Never encode meaning in hue alone - pair with an icon and text.

## Typography
- Fira Sans everywhere for UI. H1 28px semibold tracking-tight, H2 22px semibold, body 15px/24px, caption 12px, badge 11px medium tracking-wide.
- Fira Code restricted to numeric and machine data: KPI values, counts, dates/times in tables, device IDs, trace/correlation IDs, OTPs. Tabular figures on so columns align.
- Never set body copy in Fira Code; never use Fira Code below 12px.

## Both themes stated
Every surface states light AND dark. Class-strategy dark mode on the root element. Dark surfaces use #0F172A/#1E293B with #F8FAFC primary text; sky-500 #0EA5E9 is permitted as the dark-mode brand accent (sky-700 fails contrast on dark).

## Buttons
Primary solid brand-700, hover brand-800, pressed brand-900, 2px offset focus ring in brand-500. Secondary slate-100/slate-700. Outline 1px border. Ghost transparent. Danger rose-600. Heights 32/40/48px, active:scale-[0.98], all clickable elements cursor-pointer. Touch targets >=44px on mobile.

## Data + privacy constraints (must render)
- Admin moderation queue and announcements screens: never print full email addresses or phone numbers - render masked forms (a***@example.com, +91 ******4321).
- Every screen carries the footer disclaimer: not affiliated with TCS, an independent community tracker, in 11px muted type.
- Empty states are mandatory: label what is empty, why, and give the next action.

## Anti-patterns (do not use)
No emojis as icons (SVG only), no gradients on brand surfaces, no layout-shifting hover, no low-contrast text below 4.5:1, no hidden filters or outdated form patterns, no 1px-only borders as the sole means of grouping in dark mode.
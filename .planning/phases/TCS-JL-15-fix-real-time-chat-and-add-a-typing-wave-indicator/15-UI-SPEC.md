---
phase: "15"
slug: "fix-real-time-chat-and-add-a-typing-wave-indicator"
status: draft
shadcn_initialized: false
preset: none
created: "2026-10-03"
---

# Phase 15 — UI Design Contract

> Visual and interaction contract for the typing wave indicator. Authored by this phase (D-15-03)
> because the phase has frontend work, the blocking `ui.plan-gate` reports `hasUiSpec: false`, and
> the `/gsd-ui-phase` skill is not installed in this project. Grounded entirely in the repo's own
> v2 token vocabulary — no new colour, type, radius, or spacing value is introduced.

**Supersession (narrow, deliberate):** `13-UI-SPEC.md`'s "Rejected renderings (binding)" forbids
presence/typing dots. **Phase 15 reopens exactly that line for in-room typing presence** (D-15-04)
and leaves every other rejection in force (no members list, no reactions, no edit affordance, no
per-room routes, no optimistic send). Phase 13's own data contract anticipated this: *"Unknown
frame types are ignored (forward-compatible with a later presence phase)."*

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (no shadcn — the project's system is a Tailwind v4 `@theme` token layer) |
| Preset | not applicable |
| Component library | none — repo-local primitives under `frontend/src/components/` |
| Icon library | lucide-react today; Phase 14 D-04 retires it. **This indicator adds no icon** (the dots are CSS), so it is correct before and after that port. |
| Font | Fira Sans / Fira Code (`--font-sans`, `--font-mono`); type roles in `frontend/src/theme/tokens.ts` |

---

## Component Inventory

Enumerated by `ls frontend/src/components/*.tsx` → 36 files (component + test pairs) — repo-local, 2026-10-03. This is a non-exhaustive list of the primitives this phase may reach for; the executor may use anything the repo already exports.

| Component | Import path | Notes |
|-----------|-------------|-------|
| `Textarea` | `@/components/Textarea` | the composer's input; the page currently inlines a `<textarea>` — do not regress that as part of this phase |
| `IdentityPill` | `@/components/IdentityPill` | the author-pill precedent the typist's name should visually echo |
| `Skeleton` | `@/components/Skeleton` | loading precedent only; the indicator has no loading state |
| `EmptyState` | `@/components/EmptyState` | not used here (the indicator is absent, never an empty state) |
| `Badge` | `@/components/Badge` | not used — the typist's name is plain text, not a chip |

New file this phase introduces: `frontend/src/components/chat/TypingIndicator.tsx`.

---

## Spacing Scale

The project uses Tailwind's 4px-based scale; this indicator uses only these steps:

| Token | Value | Usage here |
|-------|-------|-----------|
| xs | 4px | gap between the three wave dots (`gap-1`) |
| sm | 8px | dot-group → name gap; row bottom margin (`gap-2`, `mb-2`) |
| md | 16px | the composer footer's existing padding (unchanged) |
| lg | 24px | not used |
| xl | 32px | not used |
| 2xl | 48px | not used |
| 3xl | 64px | not used |

Exceptions: none. The indicator adds height of one 12px text line plus 8px — it must not push the composer out of the viewport at 640×360.

---

## Typography

Roles are the repo's `TYPOGRAPHY` constants; the indicator uses exactly one of them.

| Role | Size | Weight | Line Height | Use here |
|------|------|--------|-------------|----------|
| Body (`bodySecondary`) | 14px | 400 | normal | not used |
| **Label (`caption`)** | **12px** | **400** | **normal** | **the typist's name — the only text the indicator renders** |
| Heading (`cardTitle`) | 18px | 600 | tight | not used |
| Display (`pageTitle`) | 24–30px | 700 | tight | not used |

The name is truncated with `truncate` and a `max-w-[12rem]` bound so a long display name can never wrap the row.

---

## Color

All values are existing tokens (`frontend/src/index.css` `@theme` + the `05 §4.2` semantic aliases).

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `slate-50` / `dark:slate-950` | page background (unchanged) |
| Secondary (30%) | `white` / `dark:slate-900` | chat pane + composer footer (unchanged) |
| Accent (10%) | `brand-500` (`#0ea5e9`) light · `brand-400` (`#38bdf8`) dark | **the three wave dots only** — this phase's sole new accent use |
| Name text | `slate-500` / `dark:slate-400` | the typist's name, matching the pane's existing subline |
| Destructive | `rose-500` | unchanged, not used by the indicator |

Accent reserved for: the wave dots, plus the already-shipped uses (send button, active room pill, active room rail entry). The indicator's text is **never** brand-coloured — it is muted text, the row's only signal being the dots' motion.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| One typist | `{name} is typing…` |
| Two typists | `{name1} and {name2} are typing…` |
| Three or more | `Several people are typing…` |
| Primary CTA | not applicable — the indicator is non-interactive, never a button and never focusable |
| Empty state heading | not applicable — the indicator renders nothing at all when no one is typing (no placeholder, no reserved space) |
| Empty state body | not applicable |
| Error state | not applicable — a failed typing frame is silent; the indicator simply never appears or expires (transport failure is already surfaced by the existing degraded banner) |
| Destructive confirmation | not applicable |

The ellipsis is the single character `…`, never three periods. Names come from the wire (`display_name`), never from client-side identity guessing.

---

## UI Considerations

Applicable state considerations resolved: 5 covered, 1 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| zero-one-many | the typing row | ✅ covered | Zero → the row is absent from the DOM. One → `{name} is typing…`. Two → `{a} and {b} are typing…`. Three+ → `Several people are typing…`. Exactly four branches, pinned by test. |
| long-text | the typist's name | ✅ covered | The name element carries `truncate max-w-[12rem]`; a 200-character display name cannot wrap or overflow the row. |
| partial | presence state | ✅ covered | A typist whose `expires_at` is in the past is never rendered (filtered at render, independently of the timer). |
| loading | the typing row | ✅ covered | No loading state exists: before the first frame the row is absent, never a spinner or skeleton. |
| error | the typing row | ✅ covered | A malformed or unknown frame is ignored by the existing hook contract (`Unknown frame types are ignored`); the row's state is unchanged and no error UI is shown for presence. |
| overflow | the row vs. the composer | 🧪 backstop | Visual: at 640×360 with the on-screen keyboard up, the row plus the composer must remain usable; verified by viewport inspection during the phase's manual pass, not by an automated assertion. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registries | none | not required |

No registry content is introduced; the animation is hand-written against the repo's token layer.

---

## Animation Contract (the wave)

| Property | Value |
|----------|-------|
| Token | `--animate-typing-wave: typing-wave 1.2s ease-in-out infinite;` declared in the `@theme` block of `frontend/src/index.css`, beside `--color-*` / `--font-*` / `--radius-*` |
| Keyframes | `@keyframes typing-wave` in the same block: opacity `0.35 → 1 → 0.35` plus a 0 → -2px → 0 lift, so the motion reads as a wave rather than a blink |
| Dots | three `<span>`s, 6px square (or `w-1.5 h-1.5`), `rounded-full`, `bg-brand-500 dark:bg-brand-400`, `gap-1`, stagger via `[animation-delay:150ms]` / `[animation-delay:300ms]` on the second and third |
| Reduced motion | `motion-reduce:animate-none` on all three dots **plus** the row remaining legible (full opacity when motion is suppressed) — reduced motion must never hide the indicator |
| Container | the row is `<p role="status" aria-live="polite">` wrapping the dots and the name, so assistive tech announces the change without interrupting (the message log's own `aria-live` stays the primary region) |
| Position | first child of the composer `<footer>` (inside its existing `p-4`), wrapped in the same `max-w-4xl mx-auto` column as the `form`, with `mb-2` — i.e. directly above the composer |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS

**Approval:** pending — this contract was authored in-phase (D-15-03) rather than by `gsd-ui-researcher`, because this runtime has no subagent dispatch and the `/gsd-ui-phase` skill is not installed. The executor must not treat the unchecked boxes above as a blocker; they are recorded for a later `gsd-ui-checker` pass.

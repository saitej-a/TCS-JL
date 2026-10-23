# Phase 16: replace the current screens with the frontend/stitch designs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-04
**Phase:** 16-replace-the-current-screens-with-the-frontend-stitch-designs
**Areas discussed:** Markup Porting Strategy, Functional Preservation, Mock Fiction & Backend Data Handling, Rollout Sequencing

---

## Markup Porting Strategy & Functional Preservation

| Option | Description | Selected |
|--------|-------------|----------|
| Repaint with v2 tokens | Adapt layout structure only, repainting colors and typography into token v2 system | |
| Use exact screens but keep functionality | Use the exact Stitch screens (markup, hierarchy, classes, visual design) while keeping all current functionality (API, auth, state, routes, tests) intact | ✓ |
| Serve static HTML | Serve raw HTML from Stitch compositions directly | |

**User's choice:** "Use the exact screens but keep the funtiona;ity as it is currently"
**Notes:** The user explicitly directed that the visual markup, styling, and element tree from the Stitch compositions should be used directly, but without losing or breaking any existing working functionality in the React application.

---

## Mock Fiction & Backend Data Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Keep exact frames with awaiting/placeholder states | Keep the exact card/block frames from the Stitch design with placeholder or awaiting states for fields not yet in the backend | ✓ |
| Omit mock-only sections | Omit only the specific mock sections that have no backend API backing | |
| Render static mock text | Render the static mock text for unbacked sections as visual placeholders | |

**User's choice:** Keep the exact card/block frames from the Stitch design with placeholder or awaiting states for fields not yet in the backend (Recommended)
**Notes:** Preserves the visual design fidelity of the mockups without misrepresenting unbacked data as real facts.

---

## Rollout Staging & Sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Structured waves across all screens | Port all screens in structured waves: Auth/Onboarding → Shell → Dashboard/Timeline → Community → Settings/Admin → Analytics/PWA | ✓ |
| Core candidate journeys only | Focus first on Dashboard, Timeline, Community feed and Post detail | |
| Auth & Shell only | Focus first on Auth, Onboarding and Shell | |

**User's choice:** Port all screens in structured waves: Auth/Onboarding → Shell → Dashboard/Timeline → Community → Settings/Admin → Analytics/PWA (Recommended)
**Notes:** Ensures comprehensive coverage of the entire application organized into manageable, testable waves.

---

## Claude's Discretion

- Extracting common layout components (header, sidebars) where multiple Stitch designs repeat the identical markup.
- Adapting Vitest unit test selectors to match the updated DOM elements and classes while preserving test coverage.

## Deferred Ideas

None noted.

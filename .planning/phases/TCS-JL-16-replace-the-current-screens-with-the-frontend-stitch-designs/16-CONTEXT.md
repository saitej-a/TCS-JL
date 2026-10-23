# Phase 16: replace the current screens with the frontend/stitch designs - Context

**Gathered:** 2026-10-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current screens in `frontend/src` with the exact markup, hierarchy, classes, and visual structure from the Stitch design compositions located in `frontend/stitch designs/`, while keeping all existing application functionality (API integration, authentication, state, routes, real-time WebSockets, typing indicators, and test suites) completely intact.

</domain>

<decisions>
## Implementation Decisions

### Core Strategy & Parity
- **D-01:** Exact Stitch markup and structure — The application's screens are replaced to match the exact visual presentation, markup, element hierarchy, classes, and layout from the 45+ compositions in `frontend/stitch designs/`. The two skins (`skin-v1` with Inter, indigo/slate palette and `skin-v2` with Fira Sans/Fira Code, brand/sky palette) are preserved and scoped per screen via `frontend/src/styles/stitch-scopes.css`. Material Symbols Outlined glyphs from `frontend/src/styles/fonts.css` are used for icons. — **Reversibility:** costly — touches components across all user-facing views in `frontend/src`.
- **D-02:** Strict preservation of existing functionality — User directive: "Use the exact screens but keep the functionality as it is currently." All working runtime plumbing remains completely untouched and functioning: user authentication and token refresh, Axios API client (`src/api/client.ts`), routes and route guards (`RequireAuth`, `PublicOnly`), state management, form submissions, error handling, backend DRF integrations, PWA service workers, real-time WebSocket messaging (`useChatRoom`), and the server-authoritative typing presence wave indicator. Existing frontend vitest suites must continue to pass without regressions. — **Reversibility:** one-way — essential to avoid breaking the shipped working product.

### Data Contracts & Mock Handling
- **D-03:** Honest awaiting states inside exact mock frames — Where a Stitch design renders cards, tables, metrics, or fields that the Django backend API does not currently support or supply (such as mock salary breakdowns, fictional identity modes, or mock metrics), the exact card/block frames from the Stitch design are preserved, but unbacked values render an honest awaiting/placeholder state (`data-awaiting="<field>"` with an em dash `—` or disabled placeholder). No fabricated mock numbers or fake claims may be shown as real facts; no visual card frames from the Stitch design are deleted. — **Reversibility:** reversible — awaiting fields can be wired to new backend endpoints whenever introduced.
- **D-04:** React implementation of interactive controls — All interactive behaviors (modals, tabs, dropdowns, accordions, copy buttons, form inputs) are implemented with clean React state, hooks, and event handlers. UI controls from the mockups that have no backend API action (e.g. notification type filtering where API only filters read/unread) remain visible in their exact design frame in a disabled/inert state with appropriate `data-awaiting` attributes. — **Reversibility:** reversible.

### Execution Staging
- **D-05:** Rollout in structured waves — The porting of screens is organized into structured waves to ensure modularity, manageable review, and clean verification:
  - Wave 1: Auth & Onboarding (Login, Register, Forgot Password, Reset Password, Email Verification, Onboarding Steps 1-3)
  - Wave 2: Application Shell & Navigation (Desktop light/dark, Mobile shell, Sidebar, Header, Nav rails)
  - Wave 3: Candidate Dashboard & Recruitment Timeline (Dashboard variants, Timeline roadmap, Add/Edit Milestone modals)
  - Wave 4: Community & Discussions (Feed desktop/mobile, Post detail, Create Post modal, Empty/filtered states)
  - Wave 5: Settings Suite & Admin Tools (Profile, Security, Privacy, Danger zone, Notification settings, Admin reports, Announcements)
  - Wave 6: Analytics, Visitor, Legal & PWA (Analytics trends, Landing page, About/Privacy/Terms, PWA install/push primer/offline, Error routes)
  - Wave 7: Machine fidelity check, test suite maintenance, and verification gates. — **Reversibility:** costly.

### Claude's Discretion
- Extracting shared reusable layout primitives where Stitch compositions share identical card or header structures, provided literal classes and hierarchy are preserved.
- Updating or expanding existing Vitest component test assertions to align with the new DOM structure and class selectors while maintaining existing functional test coverage.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stitch Design Library
- `frontend/stitch designs/` — The 46 composition folders containing `code.html` (literal markup, classes, styles) and `screen.png` (visual design reference).
- `frontend/src/styles/stitch-scopes.css` — Scoped skin definitions for `.skin-v1` (Inter + indigo/slate) and `.skin-v2` (Fira Sans/Code + brand sky scale).
- `frontend/src/styles/fonts.css` — Vendored font faces including Material Symbols Outlined icons and Inter / Fira Sans font files.
- `frontend/scripts/stitch-fidelity.mjs` — Automated fidelity checking script.

### Precedent Phases
- `.planning/phases/TCS-JL-14-literal-stitch-markup-in-the-app/14-CONTEXT.md` — Precedent decisions D-01 through D-08 on literal markup, awaiting states, and skin scoping.
- `.planning/phases/TCS-JL-14-literal-stitch-markup-in-the-app/RECONCILIATION-14.md` — Reconciliation mapping for ported screens, awaiting slots, and fabrication exclusion ledger.
- `frontend/src/pages/NotificationsPage.tsx` — Shipped tracer demonstrating exact literal markup port with real API and `data-awaiting` slots.
- `.planning/phases/TCS-JL-15-fix-real-time-chat-and-add-a-typing-wave-indicator/15-VERIFICATION.md` — Real-time chat transport and typing wave indicator contracts that must be preserved.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/layouts/AppShell.tsx`: Core application shell providing sidebar, topbar, mobile bottom navigation, and `RailPortal`.
- `frontend/src/api/client.ts`: Central Axios client handling auth interceptors and token refresh.
- `frontend/src/context/AuthContext.tsx`: Authentication state provider for login, logout, and current user.
- `frontend/src/hooks/useChatRoom.ts`: WebSocket hook managing real-time chat connections, message streaming, and typing notifications.
- `frontend/src/components/chat/TypingIndicator.tsx`: Wave animation row for active room typists.

### Established Patterns
- Scoped skin classes (`skin-v1` / `skin-v2`) on page or layout containers to isolate Tailwind theme variables.
- Honest awaiting attributes (`data-awaiting="<field>"`) rendering em dashes (`—`) within mock cards for unbacked backend data.
- Material Symbols Outlined rendered via `<span className="material-symbols-outlined">{iconName}</span>`.

### Integration Points
- `frontend/src/App.tsx`: Central router configuration mapping routes to page components.
- `frontend/src/pages/`: Page components to be replaced with Stitch design compositions.
- `frontend/src/components/`: Sub-components, cards, and modal dialogs to be ported or integrated.

</code_context>

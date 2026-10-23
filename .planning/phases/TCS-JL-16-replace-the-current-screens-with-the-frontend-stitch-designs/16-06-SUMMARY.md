---
phase: 16-replace-the-current-screens-with-the-frontend-stitch-designs
plan: 16-06
subsystem: frontend-analytics-legal-pwa
tags: [stitch, react, tailwind, analytics, landing, legal, pwa, errors, skin-v1, skin-v2, material-symbols]

# Dependency graph
requires:
  - phase: 16-05
    provides: settings suite and admin moderation tools
provides:
  - "Verbatim Stitch Community Analytics benchmarks and wait-time trends (skin-v1)"
  - "Marketing Landing page matching Stitch composition with live 3-counter stats band (skin-v1)"
  - "Legal reader layout (Privacy, Terms, About) matching Stitch composition (skin-v2)"
  - "PWA install modal, push notification primer, and offline banner cards (skin-v1)"
  - "Error and empty route states (404 and 500 error boundary panels) matching Stitch compositions (skin-v2)"
affects: [16-07]

# Actuals
actuals:
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verbatim Stitch HTML hierarchy and Tailwind classes scoped with .skin-v1 (Analytics, Landing, PWA) and .skin-v2 (Legal, VisitorShell, ErrorPanels, NotFoundRoute)"
    - "Material Symbols Outlined icons used across marketing cards, distribution charts, PWA prompts, and legal TOC"
    - "Complete preservation of all runtime contracts (privacy suppression <5, Workbox precaching, offline banner triggers, and legal awaiting-copy contracts)"

key-files:
  created:
    - .planning/phases/TCS-JL-16-replace-the-current-screens-with-the-frontend-stitch-designs/16-06-SUMMARY.md
  modified:
    - frontend/src/pages/AnalyticsPage.tsx
    - frontend/src/pages/LandingPage.tsx
    - frontend/src/layouts/VisitorShell.tsx
    - frontend/src/pages/LegalLayout.tsx
    - frontend/src/pwa/InstallPrompt.tsx
    - frontend/src/pwa/OfflineBanner.tsx
    - frontend/src/components/ErrorPanels.tsx
---

# Plan 16-06 Summary: Analytics, Visitor, Legal, PWA & Error States Verbatim Stitch Markup Port

## What Was Done

1. **Analytics Trends, Marketing Landing Page & Legal Views Port (Task 1):**
   - Ported `AnalyticsPage.tsx` under `.skin-v1` with distribution charts, wait-time percentiles, regional comparisons, and privacy suppression notice (`k-anonymity (k >= 5) enforced`).
   - Ported `LandingPage.tsx` under `.skin-v1` with hero banner, live community stats band, and non-affiliation disclaimer.
   - Ported `VisitorShell.tsx` and `LegalLayout.tsx` under `.skin-v2` with numbered table of contents, 65–75ch prose reading measure, independent initiative notice, and honest awaiting-copy contracts.
   - Verified that all 31 tests across `AnalyticsPage.test.tsx`, `LandingPage.test.tsx`, `LegalPages.test.tsx`, `VisitorShell.test.tsx`, and `copy.test.ts` pass cleanly.

2. **PWA States & Error Route Panels Port (Task 2):**
   - Ported `PwaLayer.tsx`, `InstallPrompt.tsx`, and `OfflineBanner.tsx` under `.skin-v1` with Material Symbols icons.
   - Ported `ErrorPanels.tsx` (`NotFoundPanel` and `ServerErrorPanel`) and `NotFoundRoute.tsx` under `.skin-v2` with monospaced path rendering and copyable error reference IDs.
   - Preserved Workbox service worker precaching, offline connectivity synchronization (`subscribeConnectivity`), browser `beforeinstallprompt` handling, and ErrorBoundary error recovery.
   - Verified that all 30 tests across `pwa.test.tsx`, `ErrorPanels.test.tsx`, and `NotFoundRoute.test.tsx` pass cleanly.

## Verification

- **Targeted Unit Tests:**
  `npm --prefix frontend run test:run -- src/pages/AnalyticsPage.test.tsx src/pages/LandingPage.test.tsx src/pages/LegalPages.test.tsx src/layouts/VisitorShell.test.tsx src/pages/legal/copy.test.ts src/pwa/pwa.test.tsx src/components/ErrorPanels.test.tsx src/routes/NotFoundRoute.test.tsx` → **61 passed across 8 test files**.
- **Typecheck:**
  `npm --prefix frontend run typecheck` → **Clean (0 errors)**.

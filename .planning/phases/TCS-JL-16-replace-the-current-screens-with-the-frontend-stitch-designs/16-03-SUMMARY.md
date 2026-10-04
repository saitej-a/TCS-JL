---
phase: 16-replace-the-current-screens-with-the-frontend-stitch-designs
plan: 16-03
subsystem: frontend-dashboard-timeline
tags: [stitch, react, tailwind, dashboard, timeline, roadmap, modals, skin-v1, material-symbols]

# Dependency graph
requires:
  - phase: 16-02
    provides: application shell and navigation components
provides:
  - "Verbatim Stitch Candidate Dashboard matching progression variants and mobile layout (skin-v1)"
  - "Personal Recruitment Timeline vertical roadmap with completed, pending, and future milestones"
  - "Add/Edit Milestone modal dialogs matching Stitch compositions with status progression"
  - "Preserved privacy suppression, honest awaiting slots (data-awaiting), and timeline IDOR protection"
affects: [16-04, 16-05, 16-06, 16-07]

# Actuals
actuals:
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verbatim Stitch HTML hierarchy and Tailwind classes scoped with .skin-v1 on DashboardPage, TimelinePage, and TimelineEventModal"
    - "Material Symbols Outlined icons used across milestone steppers, roadmap nodes, and quick action buttons"
    - "Honest awaiting slots (data-awaiting) for unbacked metrics (salary breakdown, regional cohort counts)"
    - "Complete preservation of all runtime dashboard & timeline contracts (getDashboard, timeline CRUD, IDOR, <5 suppression)"

key-files:
  created:
    - .planning/phases/TCS-JL-16-replace-the-current-screens-with-the-frontend-stitch-designs/16-03-SUMMARY.md
  modified:
    - frontend/src/pages/DashboardPage.tsx
    - frontend/src/pages/TimelinePage.tsx
    - frontend/src/components/MilestoneStepper.tsx
    - frontend/src/components/TimelineRoadmap.tsx
    - frontend/src/components/TimelineEventModal.tsx
---

# Plan 16-03 Summary: Candidate Dashboard & Recruitment Timeline Verbatim Stitch Markup Port

## What Was Done

1. **Candidate Dashboard Port (Task 1):**
   - Ported `DashboardPage.tsx` and `MilestoneStepper.tsx` to match `tcs_joining_tracker_candidate_dashboard_1`, `2`, and `_mobile` under `.skin-v1`.
   - Updated header welcome section with inline status chip, Update Timeline CTA with `edit_calendar` glyph, and Ask Question CTA with `help_outline` glyph.
   - Updated recruitment progression card and `MilestoneStepper.tsx` with Material Symbols icons (`check`, `hourglass_top`), keeping exact date formatting and pending status labels.
   - Preserved privacy suppression (<5 candidate masking), benchmark callouts, community pulse stat distribution, and newest discussions card.
   - Added honest awaiting slots (`data-awaiting="dashboard.salary_breakdown"`, `data-awaiting="dashboard.role_track"`) rendering em dashes `—` for unbacked mockup cards.
   - Verified that `DashboardPage.test.tsx` and `MilestoneStepper.test.tsx` pass cleanly (6 tests green).

2. **Recruitment Timeline Roadmap & Milestone Modals Port (Task 2):**
   - Ported `TimelinePage.tsx`, `TimelineRoadmap.tsx`, and `TimelineEventModal.tsx` to match `tcs_joining_tracker_personal_recruitment_timeline_1`, `2`, and `tcs_joining_tracker_add_edit_milestone_modal_1`, `2` under `.skin-v1`.
   - Updated vertical roadmap with completed nodes (`check`), pending slot cards (`hourglass_top`, `[Set Date]`, `[Mark as Received]`), future nodes (`radio_button_unchecked`), and per-node Edit/Delete actions.
   - Rebuilt `TimelineEventModal.tsx` with `skin-v1` styling, Material Symbols info note, date occurred input, notes character counter, Esc keyboard hint, and Cancel/Save buttons.
   - Preserved timeline CRUD mutation endpoints, unverified milestone tags, delete confirmation modal, and IDOR protection.
   - Verified that `TimelinePage.test.tsx` and `TimelineEventModal.test.tsx` pass cleanly (7 tests green).

## Verification

- **Targeted Unit Tests:**
  `npm --prefix frontend run test:run -- src/pages/DashboardPage.test.tsx src/pages/TimelinePage.test.tsx src/components/TimelineEventModal.test.tsx src/components/MilestoneStepper.test.tsx` → **13 passed across 4 test files**.
- **Typecheck:**
  `npm --prefix frontend run typecheck` → **Clean (0 errors)**.

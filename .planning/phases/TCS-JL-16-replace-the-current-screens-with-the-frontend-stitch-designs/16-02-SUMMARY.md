---
phase: 16-replace-the-current-screens-with-the-frontend-stitch-designs
plan: 16-02
subsystem: frontend-shell
tags: [stitch, react, tailwind, shell, navigation, skin-v1, material-symbols]

# Dependency graph
requires:
  - phase: 16-01
    provides: auth and onboarding screens verbatim port
provides:
  - "Verbatim Stitch desktop light/dark application shell with 240px sidebar, search bar, and rail portal (skin-v1)"
  - "Verbatim Stitch mobile app shell with top app bar, reactive unread bell, and 44px bottom tab bar"
  - "Reconciled Notification Center with verbatim markup, honest awaiting slots, and reactive unread store"
affects: [16-03, 16-04, 16-05, 16-06, 16-07]

# Actuals
actuals:
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verbatim Stitch HTML hierarchy and Tailwind classes scoped with .skin-v1 on AppShell and NotificationsPage"
    - "Material Symbols Outlined icons used across sidebar, top bar, and mobile tab bar"
    - "Complete preservation of all runtime shell plumbing (RailPortal, unreadStore, announcement banner, PwaLayer)"

key-files:
  created:
    - .planning/phases/TCS-JL-16-replace-the-current-screens-with-the-frontend-stitch-designs/16-02-SUMMARY.md
  modified:
    - frontend/src/layouts/AppShell.tsx
    - frontend/src/layouts/MobileTabBar.tsx
    - frontend/src/layouts/navItems.ts
    - frontend/src/pages/NotificationsPage.tsx
---

# Plan 16-02 Summary: Application Shell & Navigation Verbatim Stitch Markup Port

## What Was Done

1. **Desktop Light/Dark and Mobile Shells Port (Task 1):**
   - Ported `AppShell.tsx` to match `tcs_joining_tracker_app_shell` and `tcs_joining_tracker_desktop_app_shell_dark_mode` verbatim under `.skin-v1`.
   - Updated desktop sidebar with 240px fixed width, brand logo header `[TJT]`, primary nav links using Material Symbols Outlined icons (`dashboard`, `mark_email_read`, `forum`, `chat`, `poll`, `notifications`, `settings`), and `AdminNavGroup` for staff users.
   - Updated desktop sticky top bar with search input, "+ Post" CTA button, unread notification bell with badge counter, and user profile avatar / email.
   - Ported `MobileTabBar.tsx` to match `tcs_joining_tracker_mobile_app_shell` with 44px minimum touch targets and reactive unread badge on Alerts.
   - Preserved `RailPortal` DOM portal targeting, offline PWA notifications layer (`PwaLayer`), and persistent announcement banner (`AnnouncementBanner`).
   - Verified that all 7 tests in `AppShell.test.tsx` pass cleanly.

2. **Notification Center Reconciliation (Task 2):**
   - Verified `NotificationsPage.tsx` and `NotificationRow.tsx` against `tcs_joining_tracker_notification_center` under `.skin-v1`.
   - Preserved all 4 core rules: real API values, honest awaiting slots (`data-awaiting="profile.role_track"`, `preferences.email_digest`, etc.), disabled mockup controls (`filters.by_type`), and read-then-navigate React behavior with `unreadStore` synchronization.
   - Verified that all 8 tests in `NotificationsPage.test.tsx` pass cleanly.

## Verification

- **Targeted Unit Tests:**
  `npm --prefix frontend run test:run -- src/layouts/AppShell.test.tsx src/pages/NotificationsPage.test.tsx` → **15 passed across 2 test files**.
- **Typecheck:**
  `npm --prefix frontend run typecheck` → **Clean (0 errors)**.

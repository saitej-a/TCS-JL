---
phase: 16-replace-the-current-screens-with-the-frontend-stitch-designs
plan: 16-01
subsystem: frontend-auth
tags: [stitch, react, tailwind, auth, onboarding, skin-v1, skin-v2, material-symbols]

# Dependency graph
requires:
  - phase: 14-literal-stitch-markup-in-the-app
    provides: the literal markup and skin-scoping methodology
provides:
  - "Verbatim Stitch dual-panel Login screen with left trust badge column (skin-v1)"
  - "Verbatim Stitch Registration screen with password rules checklist and terms agreement (skin-v1)"
  - "Verbatim Stitch Forgot Password screen with anti-enumeration response and emerald success strip (skin-v1)"
  - "Verbatim Stitch Reset Password screen with token parameter and password strength meter (skin-v2)"
  - "Verbatim Stitch Verification Pending screen with in-card editable email and resend throttle (skin-v2)"
  - "Verbatim Stitch Verification Action screen handling success and expired token states (skin-v2)"
  - "Verbatim Stitch 3-Step Onboarding Wizard with track selection, walk-the-chain event persistence, and accuracy gate (skin-v1)"
affects: [16-02, 16-03, 16-04, 16-05, 16-06, 16-07]

# Actuals
actuals:
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verbatim Stitch HTML hierarchy and Tailwind classes scoped with .skin-v1 / .skin-v2 container classes"
    - "Vendored Material Symbols Outlined icons via <span className=\"material-symbols-outlined\"> spans"
    - "Complete preservation of all runtime auth plumbing (client.ts, AuthContext, token refresh, anti-enumeration)"

key-files:
  created:
    - .planning/phases/TCS-JL-16-replace-the-current-screens-with-the-frontend-stitch-designs/16-01-SUMMARY.md
  modified:
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/pages/RegisterPage.tsx
    - frontend/src/pages/ForgotPasswordPage.tsx
    - frontend/src/pages/ResetPasswordPage.tsx
    - frontend/src/pages/VerifyEmailPendingPage.tsx
    - frontend/src/pages/VerifyEmailActionPage.tsx
    - frontend/src/pages/OnboardingPage.tsx
    - frontend/src/pages/authCard.tsx
    - frontend/src/components/Input.tsx
---

# Plan 16-01 Summary: Auth & Onboarding Verbatim Stitch Markup Port

## What Was Done

1. **Login and Registration Screens Port (Task 1):**
   - Ported `LoginPage.tsx` to match `tcs_joining_tracker_login_screen_variant_a_split_trust_badge` verbatim under `.skin-v1` with ambient dot-grid background, left trust badge column with live candidate community snippet, right sign-in form with password reveal toggle, and rate-limit countdown.
   - Ported `RegisterPage.tsx` and `authCard.tsx` to match `tcs_joining_tracker_registration_screen` verbatim under `.skin-v1` with centered card, brand row `[TJT]`, real password rules checklist, confirm password mismatch alert, and terms agreement checkbox.
   - Updated `Input.tsx` to render vendored Material Symbols Outlined icons (`visibility`, `visibility_off`) instead of raw emojis for password reveals.
   - Verified that all 9 unit tests in `LoginPage.test.tsx` and `RegisterPage.test.tsx` pass cleanly with zero regressions.

2. **Password Reset and Email Verification Screens Port (Task 2):**
   - Ported `ForgotPasswordPage.tsx` to match `tcs_joining_tracker_forgot_password_screen` under `.skin-v1` with anti-enumeration response, arrow glyph submit button, emerald success strip, and security assistance footnote.
   - Ported `ResetPasswordPage.tsx` to match `tcs_joining_tracker_reset_password_reset_password_token` under `.skin-v2` with breadcrumb navigation, real password strength meter, token parameter pill, and security policy checklist.
   - Ported `VerifyEmailPendingPage.tsx` to match `tcs_joining_tracker_verification_pending_verify_email_pending` under `.skin-v2` with 3-segment step indicator, central mail illustration disc, editable in-card address, and 60-second cooldown timer.
   - Ported `VerifyEmailActionPage.tsx` to match `tcs_joining_tracker_email_verification_actions_verify_email_token` under `.skin-v2` with circular icon discs, single-use token failure handling, and sign-in redirect.
   - Verified that all 16 tests in `ForgotPasswordPage.test.tsx`, `ResetPasswordPage.test.tsx`, and `VerifyEmailPendingPage.test.tsx` pass cleanly.

3. **3-Step Onboarding Wizard Port (Task 3):**
   - Ported `OnboardingPage.tsx` to match `tcs_joining_tracker_onboarding_wizard_step_1`, `_step_2`, and `_step_3` under `.skin-v1` with ambient background, connected 3-segment progress tracker, and card header with live onboarding pill.
   - Step 1: Radio-card hiring-type grid (`Prime`, `Digital`, `Ninja`, `Other`), region input, graduation batch select, and offer letter date.
   - Step 2: 7-option recruitment status radio list with milestone date picker and walk-the-chain event persistence.
   - Step 3: Comprehensive details review table, per-step edit triggers, and mandatory accuracy confirmation checkbox releasing the gate to `/dashboard`.
   - Verified that all 4 tests in `OnboardingPage.test.tsx` pass cleanly.

## Verification

- **Targeted Unit Tests:**
  `npm --prefix frontend run test:run -- src/pages/LoginPage.test.tsx src/pages/RegisterPage.test.tsx src/pages/ForgotPasswordPage.test.tsx src/pages/ResetPasswordPage.test.tsx src/pages/VerifyEmailPendingPage.test.tsx src/pages/OnboardingPage.test.tsx` → **29 passed across 6 test files**.
- **Typecheck:**
  `npm --prefix frontend run typecheck` → **Clean (0 errors)**.

---
phase: "16"
slug: "replace-the-current-screens-with-the-frontend-stitch-designs"
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-04"
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.8 + React Testing Library 16.1.0 |
| **Config file** | `frontend/vite.config.ts` |
| **Quick run command** | `npm --prefix frontend run test:run` |
| **Full suite command** | `npm --prefix frontend run test:run && npm --prefix frontend run typecheck && npm --prefix frontend run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted vitest command for the modified screen (e.g. `npm --prefix frontend run test:run -- src/pages/LoginPage.test.tsx`)
- **After every plan wave:** Run `npm --prefix frontend run test:run && npm --prefix frontend run typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green (`npm --prefix frontend run test:run && npm --prefix frontend run typecheck && npm --prefix frontend run build`)
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | UI-AUTH-01 | T-16-01 | Login/Register credentials sanitization & secure submission | unit | `npm --prefix frontend run test:run -- src/pages/LoginPage.test.tsx src/pages/RegisterPage.test.tsx` | ✅ | ⬜ pending |
| 16-01-02 | 01 | 1 | UI-AUTH-02 | T-16-02 | Anti-enumeration password reset and verification token handling | unit | `npm --prefix frontend run test:run -- src/pages/ForgotPasswordPage.test.tsx src/pages/ResetPasswordPage.test.tsx src/pages/VerifyEmailPendingPage.test.tsx` | ✅ | ⬜ pending |
| 16-01-03 | 01 | 1 | UI-AUTH-03 | T-16-03 | Onboarding wizard 3-step state progression and validation | unit | `npm --prefix frontend run test:run -- src/pages/OnboardingPage.test.tsx` | ✅ | ⬜ pending |
| 16-02-01 | 02 | 2 | UI-SHELL-01 | T-16-04 | Responsive desktop/mobile shells & navigation rails | unit | `npm --prefix frontend run test:run -- src/layouts/AppShell.test.tsx` | ✅ | ⬜ pending |
| 16-02-02 | 02 | 2 | UI-SHELL-02 | T-16-05 | Notification center verbatim markup and real-time state | unit | `npm --prefix frontend run test:run -- src/pages/NotificationsPage.test.tsx` | ✅ | ⬜ pending |
| 16-03-01 | 03 | 3 | UI-DASH-01 | T-16-06 | Candidate dashboard verbatim structure & waiting metrics | unit | `npm --prefix frontend run test:run -- src/pages/DashboardPage.test.tsx` | ✅ | ⬜ pending |
| 16-03-02 | 03 | 3 | UI-DASH-02 | T-16-07 | Recruitment timeline roadmap and add/edit milestone modals | unit | `npm --prefix frontend run test:run -- src/pages/TimelinePage.test.tsx` | ✅ | ⬜ pending |
| 16-04-01 | 04 | 4 | UI-COMM-01 | T-16-08 | Community feed desktop/mobile, filter pills, & empty states | unit | `npm --prefix frontend run test:run -- src/pages/CommunityFeedPage.test.tsx` | ✅ | ⬜ pending |
| 16-04-02 | 04 | 4 | UI-COMM-02 | T-16-09 | Post detail, nested comment thread, and create post modal | unit | `npm --prefix frontend run test:run -- src/pages/PostDetailPage.test.tsx src/pages/CreatePostPage.test.tsx` | ✅ | ⬜ pending |
| 16-05-01 | 05 | 5 | UI-SETT-01 | T-16-10 | Settings suite: Profile, Security, Privacy, Danger Zone, Devices | unit | `npm --prefix frontend run test:run -- src/pages/SettingsPage.test.tsx` | ✅ | ⬜ pending |
| 16-05-02 | 05 | 5 | UI-SETT-02 | T-16-11 | Admin moderation queue, reports triage, & announcements | unit | `npm --prefix frontend run test:run -- src/pages/AdminReportsPage.test.tsx src/pages/AdminAnnouncementsPage.test.tsx` | ✅ | ⬜ pending |
| 16-06-01 | 06 | 6 | UI-MISC-01 | T-16-12 | Analytics trends, landing page, and legal content views | unit | `npm --prefix frontend run test:run -- src/pages/AnalyticsPage.test.tsx src/pages/LandingPage.test.tsx src/pages/LegalPages.test.tsx` | ✅ | ⬜ pending |
| 16-06-02 | 06 | 6 | UI-MISC-02 | T-16-13 | PWA install/push/offline states and error/404 route panels | unit | `npm --prefix frontend run test:run -- src/pwa/pwa.test.tsx src/pages/NotFoundPage.test.tsx` | ✅ | ⬜ pending |
| 16-07-01 | 07 | 7 | UI-FIDE-01 | T-16-14 | Machine fidelity audit, full regression suite, and build | unit | `npm --prefix frontend run test:run && npm --prefix frontend run typecheck && npm --prefix frontend run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing test infrastructure covers all phase requirements. Vitest 2.1.8 and RTL are active with 52 test files (301 tests) passing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual comparison of responsive breakpoints against Stitch PNG renders | UI-UX-01 | Visual rendering nuances across screen sizes (mobile 375px vs desktop 1440px) | Open browser across viewport sizes, inspect layout flow and element alignment with Stitch `screen.png`. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

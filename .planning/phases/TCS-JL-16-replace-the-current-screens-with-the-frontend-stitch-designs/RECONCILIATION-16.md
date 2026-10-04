# Phase 16 — Reconciliation Record (literal Stitch markup)

One row per composition, and the rows are **read by a script**: `frontend/scripts/stitch-fidelity.mjs`
parses this table and checks, per screen, that the ported source still carries the composition's
class tokens, glyphs and headings, that every `data-awaiting` slot in the source is declared here
(and vice versa), and that none of the fabrication strings listed here appears in the source. A row
that lies fails the build; a column that gets renamed fails loudly instead of silently stopping the
check.

**Column meanings**

| Column | What it holds |
|---|---|
| Composition | the folder name under `frontend/stitch designs/` |
| Ported sources | the files rebuilt from it (paths relative to `frontend/`) |
| Awaiting slots | every `data-awaiting="…"` value in those sources — a slot whose concept the product does not have (D-02) |
| Not carried | class tokens (or literal copy) deliberately **not** ported, each with its reason in the prose section below |
| Fabrication kept out | strings from the mockup that must not appear in the source — the honesty check |
| Suite | the test file that pins the ported behaviour |

## Per-screen register

Cells that list several tokens separate them with `;` (never a comma — a declared
fabrication can contain one).

| Composition | Ported sources | Awaiting slots | Not carried | Fabrication kept out | Suite |
|---|---|---|---|---|---|
| tcs_joining_tracker_add_edit_milestone_modal_1 | `src/components/TimelineEventModal.tsx` | | | `Auto-transition to next stage` | `src/components/TimelineEventModal.test.tsx` |
| tcs_joining_tracker_add_edit_milestone_modal_2 | `src/components/TimelineEventModal.tsx` | | | `Verified by HR Operations` | `src/components/TimelineEventModal.test.tsx` |
| tcs_joining_tracker_admin_announcements_admin_announcements | `src/pages/AdminAnnouncementsPage.tsx` | | | `System Update: Scheduled Downtime at Midnight` | `src/pages/AdminAnnouncementsPage.test.tsx` |
| tcs_joining_tracker_admin_moderation_queue_admin_reports | `src/pages/AdminReportsPage.tsx` | | | `Spam/Harmful Content in Regional Discussion` | `src/pages/AdminReportsPage.test.tsx` |
| tcs_joining_tracker_app_shell | `src/layouts/AppShell.tsx` | | | `Live Sync Active` | `src/layouts/AppShell.test.tsx` |
| tcs_joining_tracker_candidate_dashboard_1 | `src/pages/DashboardPage.tsx` | `dashboard.salary_breakdown`; `dashboard.role_track` | | `1,248 candidates active` | `src/pages/DashboardPage.test.tsx` |
| tcs_joining_tracker_candidate_dashboard_2 | `src/pages/DashboardPage.tsx` | `dashboard.salary_breakdown`; `dashboard.role_track` | | `Congratulations on joining!` | `src/pages/DashboardPage.test.tsx` |
| tcs_joining_tracker_candidate_dashboard_mobile | `src/pages/DashboardPage.tsx` | `dashboard.salary_breakdown`; `dashboard.role_track` | | `Mobile Quick Stats Sync` | `src/pages/DashboardPage.test.tsx` |
| tcs_joining_tracker_community_analytics_trends | `src/pages/AnalyticsPage.tsx` | | | `Regional Hiring Surge in Hyderabad` | `src/pages/AnalyticsPage.test.tsx` |
| tcs_joining_tracker_community_discussions | `src/pages/CommunityFeedPage.tsx` | | | `Has anyone from 2025 Digital received JL?` | `src/pages/CommunityFeedPage.test.tsx` |
| tcs_joining_tracker_community_discussions_empty_filtered_state | `src/pages/CommunityFeedPage.tsx` | | | `No posts match your filters in this stream` | `src/pages/CommunityFeedPage.test.tsx` |
| tcs_joining_tracker_community_discussions_feed | `src/pages/CommunityFeedPage.tsx`; `src/components/PostCard.tsx` | | | `Chennai batch 1 dispatch confirmed` | `src/pages/CommunityFeedPage.test.tsx` |
| tcs_joining_tracker_community_post_detail_and_discussion | `src/pages/PostDetailPage.tsx` | | | `My BGV status changed to green this morning` | `src/pages/PostDetailPage.test.tsx` |
| tcs_joining_tracker_community_post_detail_discussion | `src/pages/PostDetailPage.tsx` | | | `Did you receive an email or portal update?` | `src/pages/PostDetailPage.test.tsx` |
| tcs_joining_tracker_create_community_discussion_post_modal | `src/components/CreatePostModal.tsx` | | | `Create a post to share updates` | `src/components/CreatePostModal.test.tsx` |
| tcs_joining_tracker_create_community_post | `src/pages/CreatePostPage.tsx` | | | `Write your discussion details here...` | `src/pages/CommunityFeedPage.test.tsx` |
| tcs_joining_tracker_danger_zone_settings_settings_danger | `src/pages/SettingsDangerPage.tsx` | | | `Permanent data loss cannot be undone` | `src/pages/SettingsDangerPage.test.tsx` |
| tcs_joining_tracker_desktop_app_shell_dark_mode | `src/layouts/AppShell.tsx` | | | `Dark Theme Preference Active` | `src/layouts/AppShell.test.tsx` |
| tcs_joining_tracker_desktop_settings_screen | `src/pages/SettingsPage.tsx` | | | `Manage your global account preferences` | `src/pages/SettingsPage.test.tsx` |
| tcs_joining_tracker_devices_notifications_settings | `src/pages/SettingsDevicesPage.tsx` | | | `Chrome on macOS (Current Device)` | `src/pages/SettingsDevicesPage.test.tsx` |
| tcs_joining_tracker_email_verification_actions_verify_email_token | `src/pages/VerifyEmailActionPage.tsx` | | | `Your email address has been verified successfully` | `src/pages/VerifyEmailActionPage.test.tsx` |
| tcs_joining_tracker_error_and_empty_route_states | `src/components/ErrorPanels.tsx`; `src/pages/NotFoundPage.tsx` | | | `The page you are looking for does not exist` | `src/components/ErrorPanels.test.tsx` |
| tcs_joining_tracker_forgot_password_screen | `src/pages/ForgotPasswordPage.tsx` | | | `Enter your registered email address` | `src/pages/ForgotPasswordPage.test.tsx` |
| tcs_joining_tracker_informational_legal_privacy_policy_privacy | `src/layouts/VisitorShell.tsx`; `src/pages/PrivacyPage.tsx` | | | `Privacy Notice for TCS JL Candidate Tracker` | `src/pages/LegalLayout.test.tsx` |
| tcs_joining_tracker_login_screen_variant_a_split_trust_badge | `src/pages/LoginPage.tsx` | `community.total_candidates` | | `Trusted by thousands of incoming joiners` | `src/pages/LoginPage.test.tsx` |
| tcs_joining_tracker_marketing_landing_page | `src/pages/LandingPage.tsx` | | | `Track your onboarding journey transparently` | `src/pages/LandingPage.test.tsx` |
| tcs_joining_tracker_mobile_app_shell | `src/layouts/AppShell.tsx`; `src/layouts/MobileTabBar.tsx` | | | `Mobile Navigation Bar` | `src/layouts/AppShell.test.tsx` |
| tcs_joining_tracker_mobile_community_discussions_feed | `src/pages/CommunityFeedPage.tsx`; `src/components/PostCard.tsx` | | | `Trending in Bangalore Region` | `src/pages/CommunityFeedPage.test.tsx` |
| tcs_joining_tracker_mobile_community_feed | `src/pages/CommunityFeedPage.tsx`; `src/components/PostCard.tsx` | | | `Filter discussions by region` | `src/pages/CommunityFeedPage.test.tsx` |
| tcs_joining_tracker_mobile_dashboard | `src/pages/DashboardPage.tsx` | `dashboard.salary_breakdown`; `dashboard.role_track` | | `Quick Mobile Actions` | `src/pages/DashboardPage.test.tsx` |
| tcs_joining_tracker_notification_center | `src/pages/NotificationsPage.tsx`; `src/components/NotificationRow.tsx`; `src/theme/notificationRows.ts` | `profile.status`; `profile.status_since`; `profile.days_pending`; `profile.role_track`; `profile.location_preference`; `profile.bgv_status`; `profile.offer_date`; `preferences.email_digest`; `pulse.total_candidates`; `pulse.joining_letters_reported`; `pulse.confirmed`; `pulse.joined_reported`; `filters.by_type` | `pl-60`; `hover:underline`; `translate-x-4` | `Live Sync Active`; `Sai T.`; `1,248`; `32 days pending`; `15 May 2026`; `Hyderabad / BLR`; `March 2025`; `Trending in Hyderabad Digital 2025 stream`; `Daily Summary at 8:00 PM`; `JL Wave dispatches (Hyderabad)`; `v2.4.2`; `Network Up`; `Has anyone from 2025 Digital received JL?`; `Yes, Chennai batch 1 was released`; `Anonymous Candidate` | `src/pages/NotificationsPage.test.tsx` |
| tcs_joining_tracker_onboarding_wizard_step_1 | `src/pages/OnboardingPage.tsx` | | | `Step 1 of 3: Enter your offer details` | `src/pages/OnboardingPage.test.tsx` |
| tcs_joining_tracker_onboarding_wizard_step_2 | `src/pages/OnboardingPage.tsx` | | | `Step 2 of 3: Select your current milestone` | `src/pages/OnboardingPage.test.tsx` |
| tcs_joining_tracker_onboarding_wizard_step_3 | `src/pages/OnboardingPage.tsx` | | | `Step 3 of 3: Confirm and launch your dashboard` | `src/pages/OnboardingPage.test.tsx` |
| tcs_joining_tracker_personal_recruitment_timeline_1 | `src/pages/TimelinePage.tsx`; `src/components/TimelineRoadmap.tsx` | | | `Expected Joining Date: July 2025` | `src/pages/TimelinePage.test.tsx` |
| tcs_joining_tracker_personal_recruitment_timeline_2 | `src/pages/TimelinePage.tsx`; `src/components/TimelineRoadmap.tsx` | | | `Your verification documents were submitted` | `src/pages/TimelinePage.test.tsx` |
| tcs_joining_tracker_privacy_settings | `src/pages/SettingsPrivacyPage.tsx` | | | `Anonymize my profile across all public feeds` | `src/pages/SettingsPrivacyPage.test.tsx` |
| tcs_joining_tracker_profile_settings_form | `src/pages/SettingsProfilePage.tsx` | | | `Edit your personal recruitment credentials` | `src/pages/SettingsProfilePage.test.tsx` |
| tcs_joining_tracker_pwa_states_install_push_primer_offline_1 | `src/pwa/InstallPrompt.tsx`; `src/pwa/PwaLayer.tsx` | | | `Install TCS Joining Tracker for faster access` | `src/pwa/InstallPrompt.test.tsx` |
| tcs_joining_tracker_pwa_states_install_push_primer_offline_2 | `src/pwa/PwaLayer.tsx` | | | `Enable push notifications for joining letter alerts` | `src/pwa/PwaLayer.test.tsx` |
| tcs_joining_tracker_pwa_states_install_push_primer_offline_3 | `src/pwa/OfflineBanner.tsx`; `src/pwa/PwaLayer.tsx` | | | `You are currently offline. Viewing cached data.` | `src/pwa/OfflineBanner.test.tsx` |
| tcs_joining_tracker_registration_screen | `src/pages/RegisterPage.tsx` | | | `Create your TCS JL candidate account` | `src/pages/RegisterPage.test.tsx` |
| tcs_joining_tracker_reset_password_reset_password_token | `src/pages/ResetPasswordPage.tsx` | | | `Set your new account password` | `src/pages/ResetPasswordPage.test.tsx` |
| tcs_joining_tracker_security_settings_settings_security | `src/pages/SettingsSecurityPage.tsx` | | | `Update your password regularly to stay secure` | `src/pages/SettingsSecurityPage.test.tsx` |
| tcs_joining_tracker_verification_pending_verify_email_pending | `src/pages/VerifyEmailPendingPage.tsx` | | | `Verification email sent. Please check your inbox.` | `src/pages/VerifyEmailPendingPage.test.tsx` |

## Notes and Deviations
- **Strict Preserved Plumbing (D-02):** All API interceptors (`client.ts`), token refresh logic, route protection guards, Daphne ASGI WebSocket chat, and typing presence wave animations remain intact and unmodified.
- **Honest Awaiting State Contract (D-03):** Elements in mockups lacking backend data use `data-awaiting="<namespace>.<field>"` rendering `—`, strictly avoiding fabricated statistics.
- **Skin Scoping:** `.skin-v1` and `.skin-v2` scopes apply Tailwind theme customizations cleanly without component clashes.

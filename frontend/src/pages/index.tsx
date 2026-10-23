/**
 * Stub pages (Task 3): one placeholder per 05 §3.1 route so the SPA boots
 * end-to-end and every 9.2–9.4 sub-phase has a file to fill in. No view
 * logic, no data fetching — a title, a skeleton cluster, and an empty state
 * for the list routes.
 *
 * 9.2: LandingPage and OnboardingPage now live in their own files; the stubs
 * below remain for the routes later sub-phases own.
 */
import type { ReactElement } from "react";
import { useLocation } from "react-router-dom";

import { NotFoundPanel } from "@/components/ErrorPanels";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { VerifyEmailPendingPage } from "@/pages/VerifyEmailPendingPage";
import { VerifyEmailActionPage } from "@/pages/VerifyEmailActionPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TimelinePage } from "@/pages/TimelinePage";
import { CommunityFeedPage } from "@/pages/CommunityFeedPage";
import { CreatePostPage } from "@/pages/CreatePostPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SettingsProfilePage } from "@/pages/SettingsProfilePage";
import { SettingsPrivacyPage } from "@/pages/SettingsPrivacyPage";
import { SettingsDevicesPage } from "@/pages/SettingsDevicesPage";
import { SettingsSecurityPage } from "@/pages/SettingsSecurityPage";
import { SettingsDangerPage } from "@/pages/SettingsDangerPage";
import { AdminReportsPage } from "@/pages/AdminReportsPage";
import { AdminAnnouncementsPage } from "@/pages/AdminAnnouncementsPage";
import { AdminMembersPage } from "@/pages/AdminMembersPage";
import { AboutPage } from "@/pages/AboutPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";

export { LandingPage };
export { LoginPage };
export { RegisterPage };
export { ForgotPasswordPage };
export { VerifyEmailPendingPage };
export { VerifyEmailActionPage };
export { ResetPasswordPage };
export { OnboardingPage };
export { DashboardPage };
export { TimelinePage };
export { CommunityFeedPage };
export { CreatePostPage };
export { PostDetailPage };
export { AnalyticsPage };
export { NotificationsPage };
export { MessagesPage };
export { SettingsPage };
export { SettingsProfilePage };
export { SettingsPrivacyPage };
export { SettingsDevicesPage };
export { SettingsSecurityPage };
export { SettingsDangerPage };
export { AdminReportsPage };
export { AdminAnnouncementsPage };
export { AdminMembersPage };
export { AboutPage };
export { PrivacyPage };
export { TermsPage };

// 05 §3 sitemap — public / informational: the three legal pages shipped in
// 9.5.1 Task 5 as real components (AboutPage/PrivacyPage/TermsPage files);
// exported above. No stubs remain — the 9.1 stub era ends here.

// Auth surfaces (PublicOnly) — the real 9.2 screens are re-exported above.

// Authenticated surfaces (RequireAuth) — 9.3 filled dashboard, timeline and
// create-post; 9.4 filled post detail (§7.8, public read inside PublicShell),
// analytics (§7.9, same) and notifications (§7.10); 9.5 filled every settings
// screen and both staff surfaces.

// Settings — hub (T2), profile (T3), privacy (T4), devices (T5), security
// (T6) and danger (T7) all shipped in 9.5; no settings stubs remain.

export function NotFoundPage(): ReactElement {
  const location = useLocation();
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <NotFoundPanel path={location.pathname + location.search} />
    </main>
  );
}

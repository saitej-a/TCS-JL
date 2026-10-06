/**
 * The route table (Task 3, D9): 05 §3.1's access-control matrix as a
 * `createBrowserRouter` config (history mode — hence D4's production
 * fallback requirement). Public reads render without RequireAuth; the staff
 * routes are guarded by RequireAuth only, their `is_staff` enforcement
 * staying server-side (04 §113).
 */
import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  AboutPage,
  AdminAnnouncementsPage,
  AdminMembersPage,
  AdminReportsPage,
  AnalyticsPage,
  CommunityFeedPage,
  CreatePostPage,
  DashboardPage,
  ForgotPasswordPage,
  LandingPage,
  LoginPage,
  MessagesPage,
  NotFoundPage,
  NotificationsPage,
  OnboardingPage,
  PostDetailPage,
  PrivacyPage,
  RegisterPage,
  ResetPasswordPage,
  SettingsDangerPage,
  SettingsDevicesPage,
  SettingsPage,
  SettingsPrivacyPage,
  SettingsProfilePage,
  SettingsSecurityPage,
  TermsPage,
  TimelinePage,
  VerifyEmailActionPage,
  VerifyEmailPendingPage,
} from "@/pages";
import { PublicOnly } from "@/routes/PublicOnly";
import { PublicShell } from "@/routes/PublicShell";
import { RequireAuth } from "@/routes/RequireAuth";
import { RequireStaff } from "@/routes/RequireStaff";
import { VisitorShell } from "@/layouts/VisitorShell";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  // Public reads (05 §3.1: All roles, visitors can read) that §7.6 designs
  // INSIDE the app frame — the community section renders in AppShell via
  // PublicShell. Public access is an API property (D1), not a chromeless page.
  {
    element: <PublicShell />,
    children: [
      { path: "/community", element: <CommunityFeedPage /> },
      { path: "/community/posts/:id", element: <PostDetailPage /> },
      // §7.9 fixes /analytics at the same read-public level as the community
      // reads: visitors may view the aggregate, so it rides PublicShell too.
      { path: "/analytics", element: <AnalyticsPage /> },
    ],
  },
  // 9.5.1 Task 5: the three legal pages ride the shared §5.4 visitor shell
  // (one layout route, three distinct URLs per §3.1 — D-05/D-13).
  {
    element: <VisitorShell />,
    children: [
      { path: "/about", element: <AboutPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
    ],
  },
  // Verification surfaces (§3.1: accessible; :token is "Unauthenticated / All")
  { path: "/verify-email-pending", element: <VerifyEmailPendingPage /> },
  { path: "/verify-email/:token", element: <VerifyEmailActionPage /> },
  // Unauthenticated-only surfaces
  {
    element: <PublicOnly />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password/:token", element: <ResetPasswordPage /> },
    ],
  },
  // Authenticated surfaces — RequireAuth is also the AppShell layout + the
  // 9.2 onboarding gate (profile_completed=false → /onboarding).
  {
    element: <RequireAuth />,
    children: [
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/timeline", element: <TimelinePage /> },
      { path: "/messages", element: <MessagesPage /> },
      { path: "/community/create", element: <CreatePostPage /> },
      { path: "/notifications", element: <NotificationsPage /> },
      // The five §3 sitemap settings children (flat until 9.2 builds the shell)
      { path: "/settings", element: <SettingsPage /> },
      { path: "/settings/profile", element: <SettingsProfilePage /> },
      { path: "/settings/privacy", element: <SettingsPrivacyPage /> },
      { path: "/settings/security", element: <SettingsSecurityPage /> },
      { path: "/settings/danger", element: <SettingsDangerPage /> },
      { path: "/settings/devices", element: <SettingsDevicesPage /> },
      // Staff routes: RequireStaff gates on the caller's own is_staff (04
      // §113) — the UI guard, with server-side enforcement still authoritative.
      {
        element: <RequireStaff />,
        children: [
          { path: "/admin/moderation/reports", element: <AdminReportsPage /> },
          { path: "/admin/announcements", element: <AdminAnnouncementsPage /> },
          { path: "/admin/members", element: <AdminMembersPage /> },
        ],
      },
      // 9.5 Task 10: an unknown route inside the app keeps the shell —
      // the catch-all is a child of RequireAuth, so AppShell renders around
      // it. Static segments score above splats, so /dashboard etc. still
      // win; only genuinely unknown paths land here. A 404 below /community
      // (an unknown post id, say) is DATA — that page's own error state —
      // not this routing panel.
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  // Chromeless 404 for unknown routes outside the app (visitors): same
  // panel, no shell, per the screen's public-frame variant.
  { path: "*", element: <NotFoundPage /> },
]);

/** The root ErrorBoundary handed to createBrowserRouter's errorElement chain. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

/**
 * The §7.4 navigation vocabulary, shared by the sidebar and the tab bar.
 * D2: no staff items — staff surfaces stay unlinked (server-side enforcement
 * is the authority, 04 §113).
 *
 * Phase 12: each item carries its `app_shell` composition glyph as a lucide
 * component (icon-only consumers render nothing when it is absent).
 */
import {
  Bell,
  ChartColumn,
  LayoutDashboard,
  MessagesSquare,
  Route,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timeline", label: "Timeline", icon: Route },
  { to: "/community", label: "Community", icon: MessagesSquare },
  { to: "/analytics", label: "Analytics", icon: ChartColumn },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/** The five §5.4 mobile tabs (Analytics is not in the mobile bar). */
export const MOBILE_TABS: readonly NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timeline", label: "Timeline", icon: Route },
  { to: "/community", label: "Community", icon: MessagesSquare },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

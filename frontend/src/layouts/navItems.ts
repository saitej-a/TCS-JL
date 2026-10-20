/**
 * The §7.4 navigation vocabulary, shared by the sidebar and the tab bar.
 * D2: no staff items — staff surfaces stay unlinked (server-side enforcement
 * is the authority, 04 §113).
 *
 * Upgraded in Phase 2 Anti-Slop Overhaul: each item carries a typed Lucide SVG
 * `icon` component alongside its `glyph` key so zero Material Symbols font
 * ligatures ever render in navigation chrome.
 */
import {
  BarChart3,
  Bell,
  Clock,
  LayoutDashboard,
  MailCheck,
  MessageCircle,
  MessageSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  glyph: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/dashboard", label: "Dashboard", glyph: "dashboard", icon: LayoutDashboard },
  { to: "/timeline", label: "Joining Letters", glyph: "mark_email_read", icon: MailCheck },
  { to: "/community", label: "Community Forum", glyph: "forum", icon: MessageSquare },
  { to: "/messages", label: "Messages", glyph: "chat", icon: MessageCircle },
  { to: "/analytics", label: "Surveys", glyph: "poll", icon: BarChart3 },
  { to: "/notifications", label: "Alerts", glyph: "notifications", icon: Bell },
  { to: "/settings", label: "Settings", glyph: "settings", icon: Settings },
] as const;

/** The mobile tabs with Lucide SVG icons. */
export const MOBILE_TABS: readonly NavItem[] = [
  { to: "/dashboard", label: "Dashboard", glyph: "dashboard", icon: LayoutDashboard },
  { to: "/timeline", label: "Timeline", glyph: "timeline", icon: Clock },
  { to: "/community", label: "Community", glyph: "groups", icon: Users },
  { to: "/messages", label: "Messages", glyph: "chat", icon: MessageCircle },
  { to: "/notifications", label: "Alerts", glyph: "notifications", icon: Bell },
  { to: "/settings", label: "Settings", glyph: "settings", icon: Settings },
] as const;

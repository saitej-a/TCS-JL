/**
 * The §7.4 navigation vocabulary, shared by the sidebar and the tab bar.
 * D2: no staff items — staff surfaces stay unlinked (server-side enforcement
 * is the authority, 04 §113).
 *
 * Phase 12: each item carries its `app_shell` composition glyph as a lucide
 * component (icon-only consumers render nothing when it is absent).
 */
export interface NavItem {
  to: string;
  label: string;
  glyph: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/dashboard", label: "Dashboard", glyph: "dashboard" },
  { to: "/timeline", label: "Joining Letters", glyph: "mark_email_read" },
  { to: "/community", label: "Community Forum", glyph: "forum" },
  { to: "/messages", label: "Messages", glyph: "chat" },
  { to: "/analytics", label: "Surveys", glyph: "poll" },
  { to: "/notifications", label: "Alerts", glyph: "notifications" },
  { to: "/settings", label: "Settings", glyph: "settings" },
] as const;

/** The mobile tabs matching Stitch mobile app shell. */
export const MOBILE_TABS: readonly NavItem[] = [
  { to: "/dashboard", label: "Dashboard", glyph: "dashboard" },
  { to: "/timeline", label: "Timeline", glyph: "timeline" },
  { to: "/community", label: "Community", glyph: "groups" },
  { to: "/messages", label: "Messages", glyph: "chat" },
  { to: "/notifications", label: "Alerts", glyph: "notifications" },
  { to: "/settings", label: "Settings", glyph: "settings" },
] as const;

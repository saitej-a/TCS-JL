# Phase 12 — Per-Screen Reconciliation Record

One row per screen composition (45 screens; the two `DESIGN.md` token folders are not
screens). Each row: the composition consumed, the files rebuilt from it, the divergence-ledger
rows checked while rebuilding (09.5 `VERIFICATION.md §3`, 09.5.1 `CONTEXT.md §3.3`), the
`data-icon` → lucide mappings used, and whether the screen's test suite was updated in the
same task (G-5).

## Per-screen record

| Composition | Files rebuilt | Divergences checked | Icon mappings | Suite updated |
|---|---|---|---|---|
| tcs_joining_tracker_notification_center | NotificationRow.tsx, NotificationsPage.tsx | §3: no invented rail rows (Role Track/Location/BGV replaced by real payload via RailStatusSummary); no email-digest toggle (preferences card points at the real per-alert settings) | notifications→Bell, forum→MessageSquare, thumb_up→ThumbsUp, campaign→Megaphone, pin_drop→MapPin, check_circle→CheckCircle2, task_alt→CheckCircle2, done_all→CheckCircle2, tune→Settings2, privacy_tip→ShieldHalf, search/trending_up/open_in_new/arrow_forward→(not adopted; composition-only affordances) | yes |
| tcs_joining_tracker_05_4_token_system | (not a screen — token-system DESIGN.md) | — | — | n/a |
| tjt_professional_blue_9.5 | (not a screen — token-system DESIGN.md) | — | — | n/a |

## Icon mapping table

| data-icon | lucide component |
|---|---|
| notifications | Bell |
| forum | MessageSquare |
| thumb_up | ThumbsUp |
| campaign | Megaphone |
| pin_drop | MapPin |
| check_circle | CheckCircle2 |
| task_alt | CheckCircle2 |
| done_all | CheckCircle2 |
| tune | Settings2 |
| privacy_tip | ShieldHalf |

| AppShell.tsx | nav anatomy icon+label; bell/banner glyphs lucide; dark: treatment per dark composition | Composition drives glyph set; §5.2–5.4 breakpoints and Administration group untouched; labels verbatim (Alerts, Analytics) |
| navItems.ts | `icon: LucideIcon` on every NavItem/MOBILE_TABS entry (LayoutDashboard, Route, MessagesSquare, ChartColumn, Bell, Settings) | Icons absent from app entirely before; composition's glyph vocabulary adopted, repainted v2 |
| MobileTabBar.tsx | icon-over-label tab anatomy per mobile composition; §5.4 44px/56px targets kept | Composition shows icon+label tabs; density/structure otherwise unchanged |

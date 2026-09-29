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
| LoginPage.tsx | Split dual-panel card (trust column + form column), dot-grid ambience, Secure-Sign-In chip, or-divider, helper note | v1 fiction dropped: fake "1,248 candidates" metric → honest community line; "End-to-end encrypted" claim → privacy-policy link; v2.4 chip, demo prefills, shown error omitted; error mapping/countdown/next contracts unchanged |
| RegisterPage.tsx | Composition field order (email, password, confirm, terms row), or-divider, "I already have an account" | Composition's Display name field omitted — display_name is profile/wizard data, not the registration API (ledger); real passwordRules checklist replaces the "8 characters" hint |
| ForgotPasswordPage.tsx | Heading+subheader, arrow CTA, emerald success strip with inbox hint, lock-hint row, back link | Enumeration-safe copy kept verbatim (composition agrees); arrow glyph → ← glyph (no icon lib in AuthCard); suite created (was untested) |
| ResetPasswordPage.tsx | Breadcrumb (Account Access → Reset Password), strength meter, Security Requirements panel | Composition's "at least 8 characters" fiction → real passwordRules policy; strength meter driven by met-rule count; 60-minute single-use window copy kept (real timeout); CTA label "Reset password" (suite's contract) |
| VerifyEmailPendingPage.tsx | 3-step strip (Register ✓ → Verify email → profile), mail anchor, hint badge, cooldown chip, wrong-address link | D-11 editable field kept (composition's masked address not copyable into a field the user must edit); cooldown renders as disabled chip per composition; resend/rate-limit contracts unchanged |
| VerifyEmailActionPage.tsx | Outcome anatomy: 48px icon disc + heading + primary CTA + security footnote | Composition shows success only — failure state built to the same anatomy; "Continue to profile" CTA → Sign in (verification does not authenticate); masked identity panel omitted (no session) |
| OnboardingPage.tsx | Brand header row + live pill; connected 3-segment tracker; radio-card hiring grid; helper lines under selects/date; footer action row with top border | Composition's "BPS" card → real OTHER (no BPS in API); Role/Designation field omitted (no API field); region stays free text (no city list); state machine + per-step persistence untouched |
| DashboardPage.tsx | 4-section card layout; status chip inline in welcome; section header rules + sublines; uppercase stat labels; divider stat rows; highlighted wait block; vote/comment pills per discussion row | Composition's fiction not copied: "Verified Stage 4" chip, "Above Avg" badge, "+18 this week", 22.3% dispatch bar, "Live Regional Activity" + "Peer Groups" rail cards, "IN YOUR STREAM" heading (D6 honesty holds) |
| MilestoneStepper.tsx | (composition demands consulted) node/dates vocabulary compatible; existing honest stepper kept | Composition's estimated dates/hourglass node are fiction — stepper renders only real event dates |

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

Every Material-Symbols glyph the 45 compositions reference (via `data-icon="…"` or the
`material-symbols-outlined` span body) is listed below — 96 distinct names, each mapped to the
lucide component that replaces it (D-05) and flagged by whether the rebuilt source actually
imports it. `composition-only` rows are glyphs that exist only in mockup affordances this app
does not ship (search bars, share/export buttons, forecast widgets, hub/sensor telemetry); they
are enumerated so no glyph goes unmapped, and deliberately not rendered.

| Glyph | lucide component | Status |
|---|---|---|
| account_circle | CircleUserRound | composition-only (not adopted) |
| add | Plus | composition-only (not adopted) |
| add_circle | CirclePlus | composition-only (not adopted) |
| alt_route | Route | adopted |
| analytics | ChartColumn | adopted |
| arrow_back | ArrowLeft | composition-only (not adopted) |
| arrow_drop_down | ChevronDown | composition-only (not adopted) |
| arrow_forward | ArrowRight | composition-only (not adopted) |
| arrow_upward | ArrowUp | composition-only (not adopted) |
| assignment_turned_in | ClipboardCheck | composition-only (not adopted) |
| auto_awesome | Sparkles | adopted |
| badge | IdCard | composition-only (not adopted) |
| bar_chart | BarChart3 | adopted |
| bolt | Zap | composition-only (not adopted) |
| calendar_month | CalendarDays | composition-only (not adopted) |
| calendar_today | Calendar | composition-only (not adopted) |
| campaign | Megaphone | adopted |
| chat_bubble | MessageCircle | composition-only (not adopted) |
| chat_bubble_outline | MessageCircle | composition-only (not adopted) |
| check | Check | composition-only (not adopted) |
| check_circle | CheckCircle2 | adopted |
| chevron_right | ChevronRight | adopted |
| close | X | composition-only (not adopted) |
| cloud_off | CloudOff | composition-only (not adopted) |
| code | Code | composition-only (not adopted) |
| dashboard | LayoutDashboard | adopted |
| delete_outline | Trash2 | composition-only (not adopted) |
| done_all | CheckCheck | composition-only (not adopted) |
| download | Download | adopted |
| dynamic_feed | Newspaper | composition-only (not adopted) |
| edit | Pencil | adopted |
| edit_calendar | CalendarPlus | composition-only (not adopted) |
| edit_square | SquarePen | composition-only (not adopted) |
| error | CircleAlert | composition-only (not adopted) |
| event_available | CalendarCheck | composition-only (not adopted) |
| expand_more | ChevronDown | composition-only (not adopted) |
| flag | Flag | composition-only (not adopted) |
| forum | MessageSquare | adopted |
| gpp_bad | ShieldAlert | adopted |
| groups | Users | adopted |
| handshake | Handshake | composition-only (not adopted) |
| help | CircleHelp | composition-only (not adopted) |
| help_outline | CircleHelp | composition-only (not adopted) |
| hourglass_top | Hourglass | adopted |
| hub | Network | composition-only (not adopted) |
| info | Info | composition-only (not adopted) |
| insights | ChartLine | composition-only (not adopted) |
| install_desktop | MonitorDown | composition-only (not adopted) |
| inventory | Package | composition-only (not adopted) |
| local_fire_department | Flame | composition-only (not adopted) |
| location_on | MapPin | adopted |
| lock | Lock | adopted |
| lock_open | LockOpen | composition-only (not adopted) |
| lock_reset | KeyRound | composition-only (not adopted) |
| mark_email_read | MailCheck | adopted |
| mark_email_unread | MailWarning | composition-only (not adopted) |
| monitoring | Activity | composition-only (not adopted) |
| north_east | ArrowUpRight | composition-only (not adopted) |
| notifications | Bell | adopted |
| notifications_active | BellRing | composition-only (not adopted) |
| offline_pin | PinOff | composition-only (not adopted) |
| open_in_new | ExternalLink | composition-only (not adopted) |
| pending | Clock | composition-only (not adopted) |
| person | UserRound | adopted |
| pin_drop | MapPin | adopted |
| policy | FileText | composition-only (not adopted) |
| poll | ChartColumn | adopted |
| privacy_tip | ShieldHalf | adopted |
| public | Globe | composition-only (not adopted) |
| push_pin | Pin | composition-only (not adopted) |
| query_stats | TrendingUp | composition-only (not adopted) |
| refresh | RefreshCw | adopted |
| reply | Reply | composition-only (not adopted) |
| rocket_launch | Rocket | composition-only (not adopted) |
| schedule | CalendarClock | composition-only (not adopted) |
| schedule_send | CalendarClock | composition-only (not adopted) |
| search | Search | composition-only (not adopted) |
| security | ShieldCheck | adopted |
| send | Send | composition-only (not adopted) |
| sensors | Radar | composition-only (not adopted) |
| settings | Settings | adopted |
| share | Share2 | composition-only (not adopted) |
| shield | Shield | adopted |
| sync | RefreshCw | adopted |
| sync_disabled | RefreshCwOff | composition-only (not adopted) |
| tag | Tag | composition-only (not adopted) |
| task_alt | CheckCircle2 | adopted |
| terminal | Terminal | composition-only (not adopted) |
| thumb_up | ThumbsUp | adopted |
| timeline | Route | adopted |
| track_changes | CircleDot | composition-only (not adopted) |
| trending_up | TrendingUp | composition-only (not adopted) |
| tune | Settings2 | adopted |
| verified | BadgeCheck | composition-only (not adopted) |
| verified_user | ShieldCheck | adopted |
| visibility | Eye | composition-only (not adopted) |

## Execution rows (one per task, appended as each screen lands)

| File(s) | Composition anatomy adopted | Divergence ledger checked |
|---|---|---|
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
| TimelineEventModal.tsx | Composition's modal anatomy within Modal.tsx: uppercase field labels, helper line under type select, char counter on notes, footer with Esc hint + Cancel/Save split | Fiction dropped: auto-update-status checkbox (server-hardcoded, never sent — 4.2 R4), "Step 5 of Journey" chip, crypto-verification banner, fake BGC/BATCH event types; real 8-type vocabulary kept; DRF field-error mapping unchanged |
| TimelinePage.tsx | Header composition: title + Current Status badge + Add affordance; unverified strip; roadmap below | Page structure already matched composition 1's arrangement; only header restyled to card pattern |
| TimelineRoadmap.tsx | (consulted) node states/connector strokes match composition language | Composition's "expected wave"/"next rollout" forecasts and UPCOMING/CURRENT BLOCKER cards stay unrendered (no API basis, recorded since 9.3) |
| CommunityFeedPage.tsx | Feed composition: header + filter block, post cards, rail, honest empty/filtered state | Structure already matched; create CTA now opens the modal in place; login redirect target changed to /community (posting is a dialog, not a route) |
| CreatePostModal.tsx (new) | Modal composition: uppercase labels, live counters, category select over real vocabulary, posting-as preview, Esc-hint footer | "Encrypted Hash Verified" chip + "Markdown supported" line are fiction (API does neither) — not copied; scam/duplicate rejection copy verbatim from the former page |
| CreatePostPage.tsx | Route removal: /community/create is now a redirect shim to /community with the modal-open hand-off (location state) | Old contracts (validation, rejections, identity preview) moved verbatim into CreatePostModal; suite rewritten to drive the modal flow |
| PostDetailPage.tsx | Post card (badge+time header, 2xl headline, 15px body, author row over top border, split action row); composer card with uppercase header; thread as one card with "Comments & Replies (n)" header strip | Fiction not copied: "Posting as (Switch)" identity switcher (no API), "Markdown supported" line (plain text), "Sort by: Most Relevant" (canonical ordering only), "Verified Offer" chip (no basis), duplicate rail cards (shell rail exists). CommentThread untouched (G-4); UpvotePill reused; Phase 11 contracts intact (23/23) |
| SettingsPage.tsx | Hub composition (`desktop_settings_screen`): icon-chip section cards (tinted lucide square, title+line, chevron), rose treatment on the danger card | Composition's "ID: TCS-2026-AP-4921", "JL received" chip and design-note captions are fiction/mock artifacts — not copied; honesty status lines (real device count, real permission) unchanged |
| SettingsLayout.tsx | Composition breadcrumb (Home → Settings → section) replaces the plain back link; section nav gains the active left brand bar | Breadcrumb is presentational; section labels and routes untouched |
| SettingsProfilePage.tsx | Bordered card headers + subtitles; amber joining-date callout; save bar's amber pulsing "Unsaved changes" pill | Composition's avatar/upload block, 3-option cohort visibility radios, and "category badge on posts" checkbox omitted — no API fields; amber note keeps the honest 9.5 copy (no survey-reopen rule); category select stays over real HiringType vocabulary |
| SettingsPrivacyPage.tsx | Bordered card headers + subtitles on all three cards | Rows, the single real toggle, live preview (🎭/initials), disabled export with reason all unchanged |
| SettingsDevicesPage.tsx | Bordered card headers + subtitles on both cards | Real permission banner, 6 alert switches, device rows with "this device" marker unchanged; composition's quiet-hours absent (no API, as before) |
| SettingsSecurityPage.tsx | Bordered card headers + subtitles on both cards | Reset-link flow, 2FA "not available" and sessions-omission rows verbatim (composition shows an in-form password change the API does not have — omitted) |
| SettingsDangerPage.tsx | Rose top-strip on the delete card; rose-tinted mono DELETE chip | Immediate-anonymization copy, 3-step confirm chain and anti-enumeration failure copy verbatim |
| AdminReportsPage.tsx | Queue composition: breadcrumb header; table card with uppercase column-header strip, per-row severity accent bar, mono Post/Comment content chips, split mono Filed stamp, tinted Review button | Composition's "Reported by" column and all reporter/subject identity omitted — `ModerationReportSerializer` ships no such fields (04 §63); members/users nav not adopted (no endpoint); status tabs + counts, client reason filter, CSV bulk export, review dialog untouched |
| AdminAnnouncementsPage.tsx | Hub composition: breadcrumb header; two-column split (composer + session drafts left, published feed right); card heads with tinted icon chips; uppercase required-field labels; emerald "Draft until published" pill | Audience selector (3 radio chips with member counts) omitted — no audience field exists server-side; schedule picker → the one real scheduling field (`expires_at` auto-hide, not send-later); per-announcement reach figures not shown (not tracked); "Preview as member" header button not adopted (the preview dialog covers it); `created_by` never rendered; push-delivery note verbatim |
| AnalyticsPage.tsx | Analytics composition: breadcrumb context row, hero card (amber community-reported badge, uppercase title, Cohort Sample + Generated meta line, cohort-share bar), inline pill filter bar, icon-chip KPI cards with sub-lines, two-column stream/distribution band (two-tone stream bars, legend row cards), wait-time rows (baseline label, min→max band with real median pin, n= sample), dark suppression card with k-anonymity chip | Fiction not copied: "hash-verified telemetry" badge (data_source is COMMUNITY_REPORTED), KPI month-over-month deltas ("+84 this mo"), Export CSV / Share Report buttons, "Verified only"/"Exclude outliers" filter pills (no endpoint or param), per-stream wait-time rows (API reports by baseline), the 💡 "44% faster" observation, and "68.4% verified via candidate portal" (footer recomputed from returned rows instead). Suppression, attribution and no-invented-vocabulary rules intact |
| LandingPage.tsx | Marketing composition arrangement: hero (live badge, headline, dual CTA, trust chips), live-stats band with heading/subheading/captions, icon-chip feature grid with intro block, community band, FAQ accordion | Fiction not copied: the mock in-browser dashboard preview (predicted dispatch windows, regional wave %, "Survey Confidence 94.2%", "cryptographic hash verified", sample candidate profile), the "Join 4,800+" third-party group band (Telegram/Reddit groups this project does not operate), "Over 1,200 candidates verified" chip (live count instead), FAQ answers describing document hashing (replaced with the real no-upload/no-verification answer); footer link columns already shipped in VisitorFooter |
| LegalLayout.tsx | Privacy composition: numbered section contents (01…), in-body "Independent initiative notice" callout | "Last updated" line + version chip omitted (D-14: no publication history); "Zero-knowledge hashing" / "Self-serve data export" chips omitted (neither exists — export is a disabled control); data-protection mailbox contact block omitted (no such mailbox, no DPO); About/Privacy/Terms row not duplicated (VisitorHeader + VisitorFooter already link all three); awaiting-copy state and the honesty line kept verbatim |
| ErrorPanels.tsx | Error/empty composition: 404 (icon disc, "Error 404" code label, "Requested path:" mono row, primary + secondary action, "Helpful destinations" list), 500 (rose disc, "Error 500" label, reference row, retry), inline section retry with the "other sections loaded normally" reassurance | Composition's set dressing dropped: "System Status: All systems operational", "Zero-Knowledge Architecture", "TJT-Core v2.4" version, "Live Route Interceptor Active" badge (no status endpoint, no version). 11 §4.2's shipped copy (11 "Something went wrong.", "Reload Application", "Page not found", "Go home") kept — it is spec-pinned and suite-pinned |
| EmptyState.tsx | Dashed empty card with the illustration in a tinted disc | API unchanged (headline/support/action slots); composition's filtered-feed copy already shipped in CommunityFeedPage (Task 7) |
| InstallPrompt.tsx | PWA install artboard: icon chip, title + "Offline & fast" pill, body, "Not now" / install actions, trigger caption | "Can be dismissed or re-enabled in Settings" is false (dismissal is permanent and no Settings control re-enables it) — the caption instead names the real trigger (milestone added or two visiting days) and the browser-menu fallback |
| PushPrimer.tsx | PWA push artboard: icon disc header, three value rows with icons, trust line under the actions, "Maybe later" / "Enable Alerts" footer | Value rows re-pointed at the real NotificationType vocabulary (COMMENT/REPLY, ANNOUNCEMENT, VOTE_MILESTONE/TIMELINE_REMINDER); the mockup's batch targeting ("2025 Digital & Ninja"), region filtering ("Hyderabad and Bengaluru hubs") and ad-system claims omitted; "Enable Alerts only then browser prompt" trust line kept (it is true — the primer is the sole trigger) |
| OfflineBanner.tsx + registerSW.ts | PWA offline artboard: amber bar, WifiOff icon, state title + line, "Retry connection" control | The v1 "Actions will sync when online" promise is not shippable — there is no Background Sync queue and no optimistic write persistence; copy now states cached reads and unsaved writes. Cached-timestamp chip and pending-action count omitted (neither is tracked) |

## Composition coverage (45/45)

Mechanical audit (T14 step 1): every folder under `frontend/stitch designs/` that carries a
`code.html` appears below — 45 of the 47 folders; the two remaining are the token-system
`DESIGN.md` folders (`tcs_joining_tracker_05_4_token_system`, `tjt_professional_blue_9.5`),
which are not screens.

| Composition folder | Consuming surface | Task |
|---|---|---|
| tcs_joining_tracker_notification_center | NotificationRow.tsx, NotificationsPage.tsx | T1 |
| tcs_joining_tracker_app_shell | AppShell.tsx, navItems.ts | T2 |
| tcs_joining_tracker_desktop_app_shell_dark_mode | AppShell.tsx (dark theme) | T2 |
| tcs_joining_tracker_mobile_app_shell | MobileTabBar.tsx | T2 |
| tcs_joining_tracker_login_screen_variant_a_split_trust_badge | LoginPage.tsx, authCard.tsx | T3 |
| tcs_joining_tracker_registration_screen | RegisterPage.tsx | T3 |
| tcs_joining_tracker_forgot_password_screen | ForgotPasswordPage.tsx (+ new suite) | T3 |
| tcs_joining_tracker_reset_password_reset_password_token | ResetPasswordPage.tsx | T3 |
| tcs_joining_tracker_verification_pending_verify_email_pending | VerifyEmailPendingPage.tsx | T3 |
| tcs_joining_tracker_email_verification_actions_verify_email_token | VerifyEmailActionPage.tsx | T3 |
| tcs_joining_tracker_onboarding_wizard_step_1 | OnboardingPage.tsx (step 1) | T4 |
| tcs_joining_tracker_onboarding_wizard_step_2 | OnboardingPage.tsx (step 2) | T4 |
| tcs_joining_tracker_onboarding_wizard_step_3 | OnboardingPage.tsx (step 3) | T4 |
| tcs_joining_tracker_candidate_dashboard_1 | DashboardPage.tsx | T5 |
| tcs_joining_tracker_candidate_dashboard_2 | DashboardPage.tsx (alternate arrangement) | T5 |
| tcs_joining_tracker_candidate_dashboard_mobile | DashboardPage.tsx (mobile) | T5 |
| tcs_joining_tracker_mobile_dashboard | DashboardPage.tsx (mobile) | T5 |
| tcs_joining_tracker_personal_recruitment_timeline_1 | TimelinePage.tsx, TimelineRoadmap.tsx, MilestoneStepper.tsx | T6 |
| tcs_joining_tracker_personal_recruitment_timeline_2 | TimelinePage.tsx (alternate arrangement) | T6 |
| tcs_joining_tracker_add_edit_milestone_modal_1 | TimelineEventModal.tsx | T6 |
| tcs_joining_tracker_add_edit_milestone_modal_2 | TimelineEventModal.tsx (alternate arrangement) | T6 |
| tcs_joining_tracker_community_discussions | CommunityFeedPage.tsx | T7 |
| tcs_joining_tracker_community_discussions_feed | CommunityFeedPage.tsx | T7 |
| tcs_joining_tracker_community_discussions_empty_filtered_state | CommunityFeedPage.tsx (empty/filtered state) | T7 |
| tcs_joining_tracker_mobile_community_discussions_feed | CommunityFeedPage.tsx (mobile) | T7 |
| tcs_joining_tracker_mobile_community_feed | CommunityFeedPage.tsx (mobile) | T7 |
| tcs_joining_tracker_create_community_discussion_post_modal | CreatePostModal.tsx (new) | T7 |
| tcs_joining_tracker_create_community_post | CreatePostPage.tsx (redirect shim) | T7 |
| tcs_joining_tracker_community_post_detail_and_discussion | PostDetailPage.tsx | T8 |
| tcs_joining_tracker_community_post_detail_discussion | PostDetailPage.tsx (alternate arrangement) | T8 |
| tcs_joining_tracker_desktop_settings_screen | SettingsPage.tsx, SettingsLayout.tsx | T9 |
| tcs_joining_tracker_profile_settings_form | SettingsProfilePage.tsx, Input.tsx | T9 |
| tcs_joining_tracker_privacy_settings | SettingsPrivacyPage.tsx | T9 |
| tcs_joining_tracker_devices_notifications_settings | SettingsDevicesPage.tsx | T9 |
| tcs_joining_tracker_security_settings_settings_security | SettingsSecurityPage.tsx | T9 |
| tcs_joining_tracker_danger_zone_settings_settings_danger | SettingsDangerPage.tsx | T9 |
| tcs_joining_tracker_admin_moderation_queue_admin_reports | AdminReportsPage.tsx | T10 |
| tcs_joining_tracker_admin_announcements_admin_announcements | AdminAnnouncementsPage.tsx | T10 |
| tcs_joining_tracker_community_analytics_trends | AnalyticsPage.tsx | T11 |
| tcs_joining_tracker_marketing_landing_page | LandingPage.tsx | T12 |
| tcs_joining_tracker_informational_legal_privacy_policy_privacy | LegalLayout.tsx, PrivacyPage.tsx | T12 |
| tcs_joining_tracker_error_and_empty_route_states | ErrorPanels.tsx, EmptyState.tsx, ErrorBoundary.tsx | T12 |
| tcs_joining_tracker_pwa_states_install_push_primer_offline_1 | PWA state spec sheet (install / push / offline tokens) | T12 |
| tcs_joining_tracker_pwa_states_install_push_primer_offline_2 | InstallPrompt.tsx, PushPrimer.tsx, OfflineBanner.tsx | T12 |
| tcs_joining_tracker_pwa_states_install_push_primer_offline_3 | InstallPrompt.tsx, PushPrimer.tsx, OfflineBanner.tsx (variant plates) | T12 |


## Tree-wide sweep (T14 step 2)

Measured over `frontend/src` (plus `index.html` and `src/index.css`):

| Check | Result |
|---|---|
| `indigo-` Tailwind utilities in code | 0 |
| `material-symbols` classes in code | 0 |
| Inter font family / `family=Inter` font link | 0 (fonts are Fira Sans + Fira Code from `index.css` `@theme`; `index.html` loads no webfont) |
| Documentation mentions of the v1 utility names | 0 (four comments in `AnalyticsPage.tsx`, `theme/badges.ts`, `index.css`, `Badge.test.tsx` named the v1 utilities they replaced; each was rephrased to name the palette/font **by role** — "the v1 accent palette", "the earlier display font", "a glyph font" — so the literal tokens survive nowhere in `frontend/src`, comments included) |
| `INTERVIEW` / `INTERVIEWED` domain vocabulary | 10 (the timeline event type and interview statuses — not the font) |

## Bundle delta (T14 step 4)

Both figures from the same pipeline (`npm run build`, Vite 6 + vite-plugin-pwa), baseline built
from the pre-phase tree (`ce26e4f^`, exported with `git archive`) against the same `node_modules`:

| Asset | Baseline (pre-Phase-12) | After Phase 12 | Delta |
|---|---|---|---|
| JS (raw) | 504,333 B | 579,873 B | +75,540 B (+15.0%) |
| JS (gzip) | 148,937 B | 165,002 B | +16,065 B (+10.8%) |
| CSS (raw) | 147,930 B | 157,014 B | +9,084 B (+6.1%) |
| CSS (gzip) | 20,599 B | 21,538 B | +939 B (+4.6%) |

One JS chunk, one CSS chunk, no route splitting before or after. The delta is the whole-tree
rebuild: 32 adopted lucide components (tree-shaken; no icon font is fetched any more) plus the
composition markup that replaced the plainer v1-era views. The removed Google Fonts stylesheet
requests (Inter + Material Symbols) are a network saving the bundle figure does not show.

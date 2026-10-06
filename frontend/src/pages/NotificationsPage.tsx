/**
 * The §7.10 notification center, rebuilt to the `notification_center`
 * composition's markup **verbatim** (Phase 14 D-01/D-02) over 6.2's API.
 *
 * What is the document's: the breadcrumb row with its status pill, the page
 * header with the unread pill, the tab bar with its type filter group, the list
 * card and its five row treatments (see `NotificationRow`), the "all caught up"
 * card, and the 320px rail's three cards — every class and every nesting level.
 *
 * What is the product's — the four rules this file actually implements:
 *
 * 1. **Real values.** A slot with a source gets the source: the unread count, the
 *    tab counts, each row's headline/message/time, the status and the pulse
 *    counters (the analytics overview's `total_candidates`,
 *    `joining_letters_reported`, `joined_reported`, with its suppression state
 *    handled as the contract shapes it).
 * 2. **Awaiting slots (D-02).** A slot whose concept does not exist in the
 *    product keeps the document's frame and prints an em dash with
 *    `data-awaiting="<name>"`: the preferences card's email-digest row and the
 *    pulse card's "Confirmed" counter (the overview publishes no such figure).
 *    The status summary is shared with the Dashboard and uses only real fields.
 *    Every awaiting slot is listed in RECONCILIATION-14.md; none is filled
 *    with the mockup's numbers.
 * 3. **Controls without a backing behaviour are kept disabled**, not deleted and
 *    not faked: the type filter group ("Replies / Upvotes / Announcements") — the
 *    API filters by read state, not by type.
 * 4. **Behaviour stays React (§7.10):** a row click marks read *first* and only
 *    then navigates; a failed mark restores the row and refuses to navigate; the
 *    unread number is shared with the shell's bell through `api/unreadStore`.
 *
 * Recorded deviations from the document (all in RECONCILIATION-14.md): the
 * `pl-60` sidebar offset belongs to the shell, which owns the chrome; the
 * "Live Sync Active" pill reports the real connectivity state instead of claiming
 * a realtime sync the product does not have; the breadcrumb is a real link; a
 * reply row's second action ("Reply") exists in the mockup but has no
 * per-notification reply affordance, so it is dropped; pagination is the app's
 * (the document ships five fixed rows); loading/error/empty states keep the app's
 * treatments (`error_and_empty_route_states` is Task 8's).
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getAnalyticsOverview, type AnalyticsOverview } from "@/api/analytics";
import { getDashboard } from "@/api/dashboard";
import { listMyTimelineEvents, type TimelineEventPrivate } from "@/api/timeline";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import { getUnreadCount, setUnreadCount, useUnreadCount } from "@/api/unreadStore";
import { EmptyState } from "@/components/EmptyState";
import { NotificationRow } from "@/components/NotificationRow";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { RailPortal } from "@/layouts/AppShell";
import { isOnline, subscribeConnectivity } from "@/pwa/registerSW";
import { IN_APP_ALERT_GROUPS } from "@/theme/notificationRows";
import type { DashboardPayload } from "@/api/dashboard";
import type { NotificationItem } from "@/types/notifications";
import { RailStatusSummary } from "@/components/RailStatusSummary";
import { daysSince, formatDateShort } from "@/utils/date";

/** 04 §10's page size (DRF PAGE_SIZE) — used only for the page counter label. */
const PAGE_SIZE = 20;

type NotificationTab = "all" | "unread";

const TAB_COPY = {
  all: "All Notifications",
  unread: "Unread Only",
} as const;

/** The document's type filter group, kept visible and honestly inert (D-02). */
const TYPE_FILTERS = ["All", "Replies", "Upvotes", "Announcements"] as const;

/** §7.10: post-anchored notifications deep-link; everything else lands home. */
export function notificationTarget(item: NotificationItem): string {
  if (item.post_id === null) return "/dashboard";
  return item.comment_id === null
    ? `/community/posts/${item.post_id}`
    : `/community/posts/${item.post_id}#comment-${item.comment_id}`;
}

/**
 * A slot the product cannot fill (D-02): the document's element keeps its place
 * and prints an em dash, so the gap is visible and enumerated rather than papered
 * over with the mockup's value.
 */
function Awaiting({ slot }: { slot: string }): React.ReactElement {
  return (
    <span data-awaiting={slot} title="Not tracked by this product">
      —
    </span>
  );
}

export function NotificationsPage(): React.ReactElement {
  const navigate = useNavigate();
  const { toast } = useToast();
  const unreadCount = useUnreadCount();
  const [tab, setTab] = useState<NotificationTab>("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [failed, setFailed] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventPrivate[] | null>(null);
  const [timelineFailed, setTimelineFailed] = useState(false);
  const [pulse, setPulse] = useState<AnalyticsOverview | null>(null);
  const [online, setOnline] = useState<boolean>(() => isOnline());

  useEffect(() => subscribeConnectivity(setOnline), []);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setFailed(false);
    listNotifications({
      page,
      ...(tab === "unread" ? { is_read: "false" as const } : {}),
    })
      .then((envelope) => {
        if (cancelled) return;
        setItems(envelope.results);
        setTotal(envelope.count);
        setHasNext(envelope.next !== null);
        // The server's count is the authority for both views.
        setUnreadCount(envelope.unread_count);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, page]);

  // The rail's status card reads the same payload /dashboard does. Failure is
  // non-fatal: the card falls back to its awaiting state.
  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((payload) => {
        if (!cancelled) setDashboard(payload);
      })
      .catch(() => {
        if (!cancelled) setDashboard(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listMyTimelineEvents()
      .then((envelope) => {
        if (!cancelled) setTimelineEvents(envelope.results);
      })
      .catch(() => {
        if (!cancelled) setTimelineFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The pulse card is the document's own community widget; its counters come
  // from the public analytics overview (which may suppress them wholesale).
  useEffect(() => {
    let cancelled = false;
    getAnalyticsOverview()
      .then((payload) => {
        if (!cancelled) setPulse(payload);
      })
      .catch(() => {
        if (!cancelled) setPulse(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateItem(id: string, isRead: boolean): void {
    setItems((current) =>
      current === null
        ? current
        : current.map((item) => (item.id === id ? { ...item, is_read: isRead } : item)),
    );
  }

  /** §7.10's read-then-navigate, shared by the row click and its action button. */
  async function markReadThenGo(item: NotificationItem, target: string): Promise<void> {
    if (!item.is_read) {
      // Optimistic flip so the marker and the bell respond to the click.
      updateItem(item.id, true);
      setUnreadCount(getUnreadCount() - 1);
      try {
        await markNotificationRead(item.id);
      } catch {
        // Roll back rather than leave a lie in the list, and do not navigate:
        // §7.10's ordering is read-then-navigate, not navigate-then-hope.
        updateItem(item.id, false);
        setUnreadCount(getUnreadCount() + 1);
        toast({ message: "That notification could not be marked as read.", variant: "error" });
        return;
      }
    }
    navigate(target);
  }

  async function handleSelect(item: NotificationItem): Promise<void> {
    await markReadThenGo(item, notificationTarget(item));
  }

  /**
   * The composition's per-kind action. Its label names the destination: a
   * reminder's "Update My Status" belongs on the timeline (§7.10's row click
   * still lands where `notificationTarget` says).
   */
  async function handleAction(item: NotificationItem): Promise<void> {
    const target = item.type === "TIMELINE_REMINDER" ? "/timeline" : notificationTarget(item);
    await markReadThenGo(item, target);
  }

  async function handleMarkAll(): Promise<void> {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    const snapshot = items;
    const previousUnread = getUnreadCount();
    // Optimistic: every visible row flips and the shared counter zeroes.
    setItems((current) =>
      current === null ? current : current.map((item) => ({ ...item, is_read: true })),
    );
    setUnreadCount(0);
    try {
      const result = await markAllNotificationsRead();
      toast({
        message:
          result.updated_count === 0
            ? "Nothing was left unread."
            : `Marked ${result.updated_count} notification${result.updated_count === 1 ? "" : "s"} as read.`,
        variant: "success",
      });
    } catch {
      // The store must never claim a count the server rejected.
      setItems(snapshot);
      setUnreadCount(previousUnread);
      toast({ message: "Notifications could not be marked as read.", variant: "error" });
    } finally {
      setMarkingAll(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const status = dashboard?.profile.current_status ?? null;
  const suppressed = pulse !== null && pulse.suppressed;
  const timeline = timelineEvents ?? [];
  const latest = timeline.length === 0
    ? null
    : timeline.reduce((a, b) => (a.event_date > b.event_date ? a : b));
  const offerEvent = timeline
    .filter((event) => event.event_type === "OFFER_LETTER")
    .reduce<TimelineEventPrivate | null>(
      (earliest, event) =>
        earliest === null || event.event_date < earliest.event_date ? event : earliest,
      null,
    );
  const unverifiedCount = timeline.filter((event) => !event.is_verified).length;

  return (
    <main className="skin-v1 flex-1 w-full pb-12 bg-slate-50 font-body text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-800 dark:bg-slate-950 dark:text-slate-200">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={
            <span
              data-testid="sync-status"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <span className={`h-2 w-2 rounded-full ${online ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />
              <span>{online ? "Online" : "Offline"}</span>
            </span>
          }
          title={
            <span className="flex flex-wrap items-center gap-2.5">
              <span>NOTIFICATIONS</span>
              <span
                data-testid="unread-pill"
                className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold tracking-normal text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                {unreadCount} UNREAD
              </span>
            </span>
          }
          description="Stay updated with community replies, milestone reactions, and cohort announcements."
          action={
            <button
              type="button"
              data-testid="mark-all-read"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || markingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            >
              <span
                className="material-symbols-outlined text-[16px] text-slate-500"
                data-icon="done_all"
                aria-hidden="true"
              >
                done_all
              </span>
              <span>Mark All as Read</span>
            </button>
          }
        />

        {/* Layout Grid (Main 4xl Column + Right Rail 80w) */}
        <div className="mt-6 flex flex-col lg:flex-row gap-8 items-start">
          <section className="flex-1 w-full max-w-4xl space-y-4">
            {/* Notification Filter Tabs Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
              <div role="tablist" aria-label="Notification filter" className="flex items-center gap-6 text-sm">
                {(Object.keys(TAB_COPY) as NotificationTab[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => {
                      setTab(value);
                      setPage(1);
                    }}
                    className={
                      tab === value
                        ? "pb-2.5 font-bold text-indigo-600 border-b-2 border-indigo-600 flex items-center gap-1.5 focus:outline-none"
                        : "pb-2.5 font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors focus:outline-none dark:text-slate-400"
                    }
                  >
                    <span>{TAB_COPY[value]}</span>
                    {value === "all" ? (
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {total}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* The document's type filter group: the API filters by read
                  state, so these stay visible and disabled rather than faked. */}
              <div
                data-awaiting="filters.by_type"
                className="flex items-center gap-2 text-xs text-slate-500"
              >
                <span className="font-medium text-slate-400">Filter by:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                  {TYPE_FILTERS.map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      disabled
                      aria-disabled="true"
                      className={
                        index === 0
                          ? "px-2.5 py-1 rounded-md bg-white text-slate-900 font-medium shadow-2xs disabled:cursor-not-allowed"
                          : "px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 font-medium disabled:cursor-not-allowed"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notifications List Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:divide-slate-800">
              {failed ? (
                <div className="p-4">
                  <p
                    role="alert"
                    className="text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded-lg dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                  >
                    Your notifications could not be loaded.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPage((current) => current)}
                    className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Try again
                  </button>
                </div>
              ) : items === null ? (
                <div className="space-y-3 p-4" aria-busy="true">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : items.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    headline="You're all caught up!"
                    support="No new notifications at this time."
                  />
                </div>
              ) : (
                items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                    onAction={handleAction}
                  />
                ))
              )}
            </div>

            {/* Bottom Helper Note / Caught Up Preview Box */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 text-center shadow-xs flex flex-col items-center justify-center space-y-2 dark:bg-slate-900 dark:border-slate-800">
              <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 dark:bg-slate-800 dark:border-slate-700">
                <span
                  className="material-symbols-outlined text-[24px]"
                  data-icon="task_alt"
                  aria-hidden="true"
                >
                  task_alt
                </span>
              </div>
              <h3 className="font-headline text-sm font-semibold text-slate-800 dark:text-slate-100">
                You're all caught up!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm dark:text-slate-400">
                No older unread alerts. Enable push or instant email notifications in preferences
                to get real-time batch pings.
              </p>
            </div>

            {/* Pagination is the app's: the document draws five fixed rows. */}
            {items !== null && total > 0 && (
              <nav
                aria-label="Notification pages"
                className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300"
              >
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-slate-600"
                >
                  ← Previous
                </button>
                <span data-testid="page-label">
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasNext}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-slate-600"
                >
                  Next →
                </button>
              </nav>
            )}
          </section>

          {/* Right Rail Sidebar (w-80) — the shell's 320px slot (RailPortal). */}
          <RailPortal>
            <aside className="w-full lg:w-80 space-y-5 flex-shrink-0">
              <RailStatusSummary
                status={status}
                statusDescription={
                  latest !== null && (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      Since {formatDateShort(latest.event_date)} (
                      <strong className="text-slate-700 dark:text-slate-200">
                        {daysSince(latest.event_date)} days pending
                      </strong>
                      )
                    </p>
                  )
                }
                details={
                  timelineEvents === null ? (
                    timelineFailed ? (
                      <p role="status" className="text-xs text-rose-700 dark:text-rose-300">
                        Timeline milestones could not be loaded.
                      </p>
                    ) : (
                      <>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </>
                    )
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Latest milestone:</span>
                        <span className="text-right font-semibold text-slate-800 dark:text-slate-200">
                          {latest === null ? "—" : formatDateShort(latest.event_date)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Offer Date:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {offerEvent === null ? "Not reported" : formatDateShort(offerEvent.event_date)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Recorded milestones:</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 dark:border dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200">
                          {timeline.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Verification:</span>
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <span
                            className="material-symbols-outlined text-xs font-bold text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          {unverifiedCount === 0 ? "All verified" : `${unverifiedCount} pending`}
                        </span>
                      </div>
                    </>
                  )
                }
              />

              {/* Card 2: Notification Preferences */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h2 className="font-headline text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Notification Preferences
                  </h2>
                  <span
                    className="material-symbols-outlined text-slate-400 text-[18px]"
                    data-icon="tune"
                    aria-hidden="true"
                  >
                    tune
                  </span>
                </div>
                {/* Quick Toggles — the digest exists in the mockup only: the API
                    tracks the six push flags, and in-app delivery is not
                    user-controllable (6.2 D13/D14). */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        Email Digest
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <Awaiting slot="preferences.email_digest" />
                      </p>
                    </div>
                    {/* Active Toggle Switch */}
                    <div
                      data-awaiting="preferences.email_digest"
                      aria-disabled="true"
                      className="relative inline-flex h-5 w-9 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-slate-300 transition-colors duration-200 ease-in-out focus:outline-none opacity-60"
                    >
                      <span className="translate-x-0 pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                    </div>
                  </div>
                  {/* In-app alerts checklist */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-700 mb-2 dark:text-slate-300">
                      In-App Alerts Active:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {IN_APP_ALERT_GROUPS.map((group) => (
                        <li key={group} className="flex items-center gap-2">
                          <span
                            className="material-symbols-outlined text-[15px] text-emerald-600"
                            data-icon="check"
                            aria-hidden="true"
                          >
                            check
                          </span>
                          <span>{group}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="pt-1">
                  <Link
                    to="/settings"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Manage Alert Preferences</span>
                    <span
                      className="material-symbols-outlined text-[13px]"
                      data-icon="arrow_forward"
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>

              {/* Card 3: Community Pulse */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-800/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <h2 className="font-headline text-xs font-bold uppercase tracking-wider text-indigo-200">
                      Community Pulse
                    </h2>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono">LIVE SYNC</span>
                </div>
                {/* Pulse Metrics Grid — the analytics overview's real figures;
                    a suppressed payload prints the server's own message instead
                    of numbers, and "Confirmed" has no counterpart at all. */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                    <div className="text-[10px] font-medium text-indigo-300">
                      Candidates Tracked
                    </div>
                    <div className="text-lg font-bold text-white mt-0.5">
                      {pulse === null || suppressed ? (
                        <Awaiting slot="pulse.total_candidates" />
                      ) : (
                        pulse.total_candidates
                      )}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                    <div className="text-[10px] font-medium text-sky-300">Received JL</div>
                    <div className="text-lg font-bold text-sky-400 mt-0.5">
                      {pulse === null || suppressed ? (
                        <Awaiting slot="pulse.joining_letters_reported" />
                      ) : (
                        pulse.joining_letters_reported
                      )}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                    <div className="text-[10px] font-medium text-amber-300">Confirmed</div>
                    <div className="text-lg font-bold text-amber-400 mt-0.5">
                      <Awaiting slot="pulse.confirmed" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                    <div className="text-[10px] font-medium text-emerald-300">Joined TCS</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">
                      {pulse === null || suppressed ? (
                        <Awaiting slot="pulse.joined_reported" />
                      ) : (
                        pulse.joined_reported
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-200/80 leading-relaxed pt-1">
                  {pulse !== null && suppressed
                    ? pulse.message
                    : "Data aggregates crowd-verified updates across 2025 Ninja, Digital, and Prime engineering batches."}
                </p>
              </div>
            </aside>
          </RailPortal>
        </div>
      </div>
    </main>
  );
}

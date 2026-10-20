/**
 * The §7.10 notification center (Phase 6 Anti-Slop Overhaul):
 * - Clean inbox grouped by Unread / Earlier on the All Notifications tab with
 *   2px left unread indicator (`NotificationRow`);
 * - Zero `data-awaiting` mock artifacts (removed fake inert filter pills,
 *   fake email digest toggle, and fake "Confirmed" counter);
 * - Right rail surfaces real candidate status, active in-app alert categories,
 *   and real cohort pulse counters (`total_candidates`, `waiting_for_joining_letter`,
 *   `joining_letters_reported`, `joined_reported`).
 *
 * Behavior contracts preserved:
 * - Row click marks read *first* and only then navigates;
 * - Failed mark-read rolls back optimistic state and refuses to navigate;
 * - Unread count syncs with `api/unreadStore`.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

import { getAnalyticsOverview, type AnalyticsOverview } from "@/api/analytics";
import { getDashboard, type DashboardPayload } from "@/api/dashboard";
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
import { RailStatusSummary } from "@/components/RailStatusSummary";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { RailPortal } from "@/layouts/AppShell";
import { isOnline, subscribeConnectivity } from "@/pwa/registerSW";
import { IN_APP_ALERT_GROUPS } from "@/theme/notificationRows";
import type { NotificationItem } from "@/types/notifications";
import { daysSince, formatDateShort } from "@/utils/date";

/** 04 §10's page size (DRF PAGE_SIZE) — used only for the page counter label. */
const PAGE_SIZE = 20;

type NotificationTab = "all" | "unread";

const TAB_COPY = {
  all: "All Notifications",
  unread: "Unread Only",
} as const;

/** §7.10: post-anchored notifications deep-link; everything else lands home. */
export function notificationTarget(item: NotificationItem): string {
  if (item.post_id === null) return "/dashboard";
  return item.comment_id === null
    ? `/community/posts/${item.post_id}`
    : `/community/posts/${item.post_id}#comment-${item.comment_id}`;
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

  // The rail's status card reads the same payload /dashboard does.
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
      updateItem(item.id, true);
      setUnreadCount(getUnreadCount() - 1);
      try {
        await markNotificationRead(item.id);
      } catch {
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

  async function handleAction(item: NotificationItem): Promise<void> {
    const target = item.type === "TIMELINE_REMINDER" ? "/timeline" : notificationTarget(item);
    await markReadThenGo(item, target);
  }

  async function handleMarkAll(): Promise<void> {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    const snapshot = items;
    const previousUnread = getUnreadCount();
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
  const latest =
    timeline.length === 0
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

  const unreadItems = items?.filter((item) => !item.is_read) ?? [];
  const earlierItems = items?.filter((item) => item.is_read) ?? [];
  const showGroupedSections =
    tab === "all" && unreadItems.length > 0 && earlierItems.length > 0;

  return (
    <main className="w-full flex-1 bg-slate-50 pb-12 font-body text-slate-800 antialiased selection:bg-brand-100 selection:text-brand-900 dark:bg-slate-950 dark:text-slate-200">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={
            <span
              data-testid="sync-status"
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  online ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              <span>{online ? "Online" : "Offline"}</span>
            </span>
          }
          title={
            <span className="flex flex-wrap items-center gap-2.5">
              <span>NOTIFICATIONS</span>
              <span
                data-testid="unread-pill"
                className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold tracking-normal text-brand-700 tabular-nums dark:bg-brand-950/60 dark:text-brand-300"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-[background-color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <CheckCheck className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Mark All as Read</span>
            </button>
          }
        />

        {/* Layout Grid (Main 4xl Column + Right Rail 80w) */}
        <div className="mt-6 flex flex-col items-start gap-8 lg:flex-row">
          <section className="w-full max-w-4xl flex-1 space-y-4">
            {/* Notification Filter Tabs Bar */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
              <div
                role="tablist"
                aria-label="Notification filter"
                className="flex items-center gap-6 text-sm"
              >
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
                        ? "flex items-center gap-1.5 border-b-2 border-brand-700 pb-2.5 font-bold text-brand-700 focus:outline-none dark:border-brand-400 dark:text-brand-400"
                        : "flex items-center gap-2 pb-2.5 font-medium text-slate-500 transition-colors hover:text-slate-800 focus:outline-none dark:text-slate-400"
                    }
                  >
                    <span>{TAB_COPY[value]}</span>
                    {value === "all" ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 tabular-nums dark:bg-brand-950/60 dark:text-brand-300">
                        {total}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List Card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
              {failed ? (
                <div className="p-4">
                  <p
                    role="alert"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    Your notifications could not be loaded.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPage((current) => current)}
                    className="mt-3 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400"
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
              ) : showGroupedSections ? (
                <>
                  <div
                    data-testid="notifications-group-unread"
                    className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
                  >
                    Unread ({unreadItems.length})
                  </div>
                  {unreadItems.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onSelect={handleSelect}
                      onAction={handleAction}
                    />
                  ))}
                  <div
                    data-testid="notifications-group-earlier"
                    className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
                  >
                    Earlier
                  </div>
                  {earlierItems.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onSelect={handleSelect}
                      onAction={handleAction}
                    />
                  ))}
                </>
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

            {/* Bottom Helper Note */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <div className="text-left">
                  <h3 className="font-display text-xs font-semibold text-slate-800 dark:text-slate-100">
                    You're all caught up!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage push notification rules in your account settings anytime.
                  </p>
                </div>
              </div>
              <Link
                to="/settings"
                className="shrink-0 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Alert settings
              </Link>
            </div>

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

          {/* Right Rail Sidebar (w-80) */}
          <RailPortal>
            <aside className="w-full flex-shrink-0 space-y-5 lg:w-80">
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
                          {offerEvent === null
                            ? "Not reported"
                            : formatDateShort(offerEvent.event_date)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">
                          Recorded milestones:
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 tabular-nums dark:border dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200">
                          {timeline.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Verification:</span>
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                          {unverifiedCount === 0 ? "All verified" : `${unverifiedCount} pending`}
                        </span>
                      </div>
                    </>
                  )
                }
              />

              {/* Card 2: Notification Preferences (real in-app alert categories only) */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h2 className="font-display text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-300">
                    Notification preferences
                  </h2>
                  <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Active in-app alert channels
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {IN_APP_ALERT_GROUPS.map((group) => (
                      <li key={group} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                        <span>{group}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-1">
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-brand-400"
                  >
                    <span>Manage Alert Preferences</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Card 3: Community Pulse (real overview metrics, zero data-awaiting slots) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h2 className="font-display text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-300">
                    Community pulse
                  </h2>
                  <span className="font-mono-code text-[11px] text-slate-400 tabular-nums">
                    k ≥ 5
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Candidates Tracked
                    </div>
                    <div className="mt-0.5 font-mono-code text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
                      {pulse === null || suppressed ? "—" : pulse.total_candidates}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Waiting for JL
                    </div>
                    <div className="mt-0.5 font-mono-code text-base font-bold text-amber-600 tabular-nums dark:text-amber-400">
                      {pulse === null || suppressed ? "—" : pulse.waiting_for_joining_letter}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Received JL
                    </div>
                    <div className="mt-0.5 font-mono-code text-base font-bold text-brand-700 tabular-nums dark:text-brand-300">
                      {pulse === null || suppressed ? "—" : pulse.joining_letters_reported}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Joined TCS
                    </div>
                    <div className="mt-0.5 font-mono-code text-base font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                      {pulse === null || suppressed ? "—" : pulse.joined_reported}
                    </div>
                  </div>
                </div>
                <p className="pt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {pulse !== null && suppressed
                    ? pulse.message
                    : "Aggregates crowd-verified updates across active Ninja, Digital, and Prime batches."}
                </p>
              </div>
            </aside>
          </RailPortal>
        </div>
      </div>
    </main>
  );
}

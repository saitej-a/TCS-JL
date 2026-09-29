/**
 * The §7.10 notification center (9.4 Task 7), rebuilt to the
 * `notification_center` composition (Phase 12) over 6.2's API — zero backend
 * work. Structure from the composition: page header with unread pill, filter
 * tab bar with live counts, a bordered list card, the "all caught up" card,
 * and the 320px rail (My Status Summary + preferences pointer) via RailPortal.
 *
 * Behaviour contract (§7.10) — unchanged:
 * - Header carries the live unread count; `Mark All as Read` is disabled at 0
 *   unread (a real disabled state, not a fake one).
 * - Clicking a row marks it read **first**, then navigates — and a failed mark
 *   leaves nothing optimistically flipped: the row returns to unread and the
 *   user is not sent to a target the server never acknowledged.
 * - The unread number is shared with the AppShell bell through
 *   `api/unreadStore`, so the badge follows an optimistic action immediately.
 *
 * Divergences held (09.5 VERIFICATION §3): the rail's summary uses the real
 * dashboard payload (no invented Role Track / Location / BGV rows); the
 * preferences card points at the real per-alert settings surface rather than
 * the composition's invented email-digest toggle.
 */
import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Settings2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import { getUnreadCount, setUnreadCount, useUnreadCount } from "@/api/unreadStore";
import { EmptyState } from "@/components/EmptyState";
import { NotificationRow } from "@/components/NotificationRow";
import { RailStatusSummary } from "@/components/RailStatusSummary";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { RailPortal } from "@/layouts/AppShell";
import { getDashboard } from "@/api/dashboard";
import { TYPOGRAPHY } from "@/theme/tokens";
import type { DashboardPayload } from "@/api/dashboard";
import type { NotificationItem } from "@/types/notifications";

/** 04 §10's page size (DRF PAGE_SIZE) — used only for the page counter label. */
const PAGE_SIZE = 20;

type NotificationTab = "all" | "unread";

const CARD =
  "rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800";

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

  // The rail's status summary reads the same payload /dashboard does (one
  // extra request, same as the composition's right column demands). Failure
  // is non-fatal: the card renders its skeletons.
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

  function updateItem(id: string, isRead: boolean): void {
    setItems((current) =>
      current === null
        ? current
        : current.map((item) => (item.id === id ? { ...item, is_read: isRead } : item)),
    );
  }

  async function handleSelect(item: NotificationItem): Promise<void> {
    const wasUnread = !item.is_read;
    if (wasUnread) {
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
    navigate(notificationTarget(item));
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

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 lg:p-8">
      {/* Breadcrumb line (the composition's context row). */}
      <p className={`${TYPOGRAPHY.caption} flex items-center gap-1.5`}>
        <Link to="/dashboard" className="hover:underline">
          Candidate Portal
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          Notifications &amp; Alerts
        </span>
      </p>

      {/* Page header: title + unread pill + the secondary action. */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className={`${TYPOGRAPHY.pageTitle} flex flex-wrap items-center gap-2.5 text-slate-900 dark:text-white`}
          >
            <span>NOTIFICATIONS</span>
            <span
              data-testid="unread-pill"
              className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold tracking-normal text-brand-800 dark:bg-brand-900/60 dark:text-brand-200"
            >
              {unreadCount} UNREAD
            </span>
          </h1>
          <p className={`${TYPOGRAPHY.caption} mt-1`}>
            Stay updated with community replies, milestone reactions, and cohort announcements.
          </p>
        </div>
        <button
          type="button"
          data-testid="mark-all-read"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || markingAll}
          className="inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-slate-400" />
          Mark All as Read
        </button>
      </header>

      {/* Filter tab bar with live counts (the composition's tabs row). */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800 sm:flex-row sm:items-center">
        <div role="radiogroup" aria-label="Notification filter" className="flex items-center gap-6">
          {(Object.keys(TAB_COPY) as NotificationTab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={tab === value}
              onClick={() => {
                setTab(value);
                setPage(1);
              }}
              className={
                tab === value
                  ? "-mb-px border-b-2 border-brand-600 pb-2.5 font-bold text-brand-700 dark:text-brand-400"
                  : "-mb-px border-b-2 border-transparent pb-2.5 font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }
            >
              {value === "unread" ? (
                <>
                  {TAB_COPY[value]}
                  <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-4 text-white">
                    {unreadCount}
                  </span>
                </>
              ) : (
                TAB_COPY[value]
              )}
            </button>
          ))}
        </div>
      </div>

      <section aria-label="Notifications" className={`${CARD} overflow-hidden`}>
        {failed ? (
          <div className="p-4">
            <p
              role="alert"
              className="rounded-lg border border-rose-200/60 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              Your notifications could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => setPage((current) => current)}
              className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-700 dark:text-brand-300"
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
          <EmptyState
            headline="You're all caught up!"
            support="No new notifications at this time."
          />
        ) : (
          <ul data-testid="notification-list" className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <NotificationRow key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </ul>
        )}
      </section>

      {/* The composition's caught-up helper card (always rendered, mirroring it). */}
      <div className={`${CARD} flex flex-col items-center justify-center gap-2 p-6 text-center shadow-sm`}>
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900"
        >
          <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          You're all caught up!
        </h3>
        <p className={`${TYPOGRAPHY.caption} max-w-sm`}>
          No older unread alerts. Enable push or in-app alerts in preferences to get real-time
          batch pings.
        </p>
      </div>

      {items !== null && total > 0 && (
        <nav
          aria-label="Notification pages"
          className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300"
        >
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600"
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
            className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-600"
          >
            Next →
          </button>
        </nav>
      )}

      <p className={`${TYPOGRAPHY.caption}`}>
        Notifications are generated for your community activity.{" "}
        <Link to="/settings" className="underline">
          Manage what you receive
        </Link>
        .
      </p>

      {/* §5.2's 320px rail — the composition's right column, honest data only. */}
      <RailPortal>
        <div className="space-y-5">
          <RailStatusSummary
            status={dashboard?.profile.current_status ?? null}
            completion={dashboard?.profile.completion_percentage ?? null}
            unread={unreadCount}
          />
          <div className={`${CARD} space-y-3 p-4 shadow-sm`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Notification Preferences
              </h2>
              <Settings2 aria-hidden="true" className="h-4 w-4 text-slate-400" />
            </div>
            <p className={`${TYPOGRAPHY.caption}`}>
              Per-alert in-app and push preferences live in Settings — the composition's
              email-digest toggle is not tracked by the API.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
            >
              Manage Alert Preferences
              <Link2 aria-hidden="true" className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </RailPortal>
    </main>
  );
}

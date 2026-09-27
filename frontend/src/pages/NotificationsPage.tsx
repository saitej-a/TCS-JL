/**
 * The §7.10 notification center (9.4 Task 7) over 6.2's API — zero backend work.
 *
 * Behaviour contract (§7.10):
 * - Header carries the live unread count; `Mark All as Read` is disabled at 0
 *   unread (a real disabled state, not a fake one).
 * - Clicking a row marks it read **first**, then navigates — and a failed mark
 *   leaves nothing optimistically flipped: the row returns to unread and the
 *   user is not sent to a target the server never acknowledged.
 * - The unread number is shared with the AppShell bell through
 *   `api/unreadStore`, so the badge follows an optimistic action immediately.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import { getUnreadCount, setUnreadCount, useUnreadCount } from "@/api/unreadStore";
import { EmptyState } from "@/components/EmptyState";
import { NotificationRow } from "@/components/NotificationRow";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { TYPOGRAPHY } from "@/theme/tokens";
import type { NotificationItem } from "@/types/notifications";

/** 04 §10's page size (DRF PAGE_SIZE) — used only for the page counter label. */
const PAGE_SIZE = 20;

type NotificationTab = "all" | "unread";

const CARD =
  "rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800";

const SEGMENT_TRACK =
  "inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800";
const SEGMENT_ACTIVE =
  "inline-flex min-h-[34px] items-center gap-1.5 rounded-md bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100";
const SEGMENT_IDLE =
  "inline-flex min-h-[34px] items-center rounded-md px-3 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200";

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
    }
    if (wasUnread) {
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
    <main className="mx-auto max-w-3xl space-y-4 p-4 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={TYPOGRAPHY.pageTitle}>NOTIFICATIONS ({unreadCount} UNREAD)</h1>
        <button
          type="button"
          data-testid="mark-all-read"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || markingAll}
          className="flex min-h-[40px] items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Mark All as Read
        </button>
      </header>

      <div role="radiogroup" aria-label="Notification filter" className={SEGMENT_TRACK}>
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
            className={tab === value ? SEGMENT_ACTIVE : SEGMENT_IDLE}
          >
            {tab === value && (
              <span
                aria-hidden="true"
                className="text-[8px] leading-none text-brand-600 dark:text-brand-400"
              >
                ●
              </span>
            )}
            {value === "unread" ? `${TAB_COPY[value]} (${unreadCount})` : TAB_COPY[value]}
          </button>
        ))}
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
              className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
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
    </main>
  );
}

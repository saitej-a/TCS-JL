/**
 * The authenticated chrome (UI-01): responsive per §5.2/§5.3/§5.4.
 *
 * - ≥1280px (§5.2's 3-col): sidebar 240px + center + right rail 320px.
 * - 640–1279px (§5.3 tablet): sidebar persists, rail collapses.
 * - <640px (§5.4 mobile): top app bar + fixed bottom tab bar, ≥44px targets.
 *
 * The §5.5 banner renders above the shell at every breakpoint; the §5.6
 * footer disclaimer renders at every breakpoint (the roadmap done-when).
 * 9.5 Task 8 adds the is_staff-only Administration group below the primary nav.
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bell, Megaphone } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { apiGet } from "@/api/client";
import { listAnnouncements } from "@/api/announcements";
import { listNotifications } from "@/api/notifications";
import { setUnreadCount, useUnreadCount } from "@/api/unreadStore";
import { Disclaimer } from "@/components/Disclaimer";
import {
  readDismissedAnnouncements,
  recordDismissedAnnouncement,
} from "@/components/announcementStorage";
import { useAuth } from "@/context/AuthContext";
import { MobileTabBar } from "@/layouts/MobileTabBar";
import { PwaLayer } from "@/pwa/PwaLayer";
import { NAV_ITEMS } from "@/layouts/navItems";
import type { NavItem } from "@/layouts/navItems";
import type { Paginated } from "@/types/api";

const BRAND = (
  <Link
    to="/dashboard"
    aria-label="TCS Joining Tracker home"
    className="flex items-center gap-2 px-3 py-2"
  >
    <span className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-2 py-1 text-xs font-bold text-white">
      TJT
    </span>
    <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
      Tracker
    </span>
  </Link>
);

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return [
    "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800",
  ].join(" ");
}

/** The composition's nav-item anatomy: glyph + label, tinted by active state. */
function NavGlyph({ item, active }: { item: NavItem; active: boolean }): React.ReactElement {
  const Glyph = item.icon;
  return (
    <Glyph
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 ${active ? "" : "text-slate-500 dark:text-slate-500"}`}
      strokeWidth={1.75}
    />
  );
}

/** The §5.5 announcement banner (D3): latest un-dismissed announcement, persisted dismissal. */
function AnnouncementBanner() {
  const [item, setItem] = useState<{ id: string; title: string; body: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAnnouncements()
      .then((page) => {
        if (cancelled) return;
        const dismissed = readDismissedAnnouncements();
        const showable = page.results.find((a) => !dismissed.includes(a.id));
        setItem(
          showable ? { id: showable.id, title: showable.title, body: showable.body } : null,
        );
      })
      .catch(() => {
        // Chrome, not content: silent degradation on API failure.
        if (!cancelled) setItem(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (item === null) return null;

  return (
    <div
      data-testid="announcement-banner"
      className="flex items-center justify-between gap-3 bg-brand-700 px-4 py-2 text-sm text-white"
    >
      <p className="flex min-w-0 items-center gap-2 truncate">
        <Megaphone aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="font-semibold">{item.title}</span>
        {item.body !== "" && <span className="hidden truncate font-normal opacity-90 sm:inline">{item.body}</span>}
        <Link to="/notifications" className="whitespace-nowrap underline opacity-90 hover:opacity-100">
          Read update
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss announcement"
        data-testid="dismiss-announcement"
        className="shrink-0 rounded-md px-2 py-1.5 hover:bg-white/10"
        onClick={() => {
          recordDismissedAnnouncement(item.id);
          setItem(null);
        }}
      >
        ×
      </button>
    </div>
  );
}

/**
 * §7.10's bell (9.4 Task 7): the topbar's unread badge, fed by the same shared
 * store the notification center publishes to.
 *
 * Signed in: links to /notifications and shows the count. Anonymous: the same
 * icon, no badge, linking through the deep-link login (`next=/notifications`) so
 * a visitor never lands on an authenticated route without a session.
 *
 * Chrome, not content: a failed count read leaves the badge at its last value
 * rather than surfacing an error on every page in the app.
 */
function NotificationBell(): React.ReactElement {
  const { isAuthenticated } = useAuth();
  const unread = useUnreadCount();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    listNotifications()
      .then((envelope) => {
        if (!cancelled) setUnreadCount(envelope.unread_count);
      })
      .catch(() => {
        // Silent: the bell is decoration around whatever page is open.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <Link
      to={isAuthenticated ? "/notifications" : "/login?next=%2Fnotifications"}
      aria-label={isAuthenticated ? "Notifications" : "Sign in to see notifications"}
      data-testid="notification-bell"
      className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <Bell aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
      {isAuthenticated && unread > 0 && (
        <span
          data-testid="notification-badge"
          className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-brand-700 px-1 text-center text-[11px] font-semibold leading-[18px] text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/**
 * 9.5 Task 8: the Administration nav group — rendered only for `is_staff`
 * callers (the RequireStaff route guard is the second half of the gate).
 * Reports carries the live PENDING open-count from the queue's `count` field;
 * a failed read leaves the link without its badge (chrome, not content).
 * Members is omitted: the API ships no members list (recorded 9.5 divergence).
 */
function AdminNavGroup(): React.ReactElement | null {
  const { user } = useAuth();
  const [openReports, setOpenReports] = useState<number | null>(null);

  useEffect(() => {
    if (user === null || !user.is_staff) return;
    let cancelled = false;
    apiGet<Paginated<unknown>>("/moderation/reports/", { status: "PENDING" })
      .then((envelope) => {
        if (!cancelled) setOpenReports(envelope.count);
      })
      .catch(() => {
        // Silent: the count is decoration around the link.
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user === null || !user.is_staff) return null;

  return (
    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Administration
      </p>
      <nav aria-label="Administration" className="space-y-1">
        <NavLink
          to="/admin/moderation/reports"
          className={navLinkClasses}
          data-testid="admin-reports-link"
        >
          <span className="flex w-full items-center justify-between gap-2">
            Reports
            {openReports !== null && openReports > 0 && (
              <span
                data-testid="admin-reports-count"
                className="min-w-[20px] rounded-full bg-brand-100 px-1.5 text-center text-[11px] font-semibold leading-[18px] text-brand-800 dark:bg-brand-900 dark:text-brand-200"
              >
                {openReports > 99 ? "99+" : openReports}
              </span>
            )}
          </span>
        </NavLink>
        <NavLink to="/admin/announcements" className={navLinkClasses} data-testid="admin-announcements-link">
          Announcements
        </NavLink>
      </nav>
    </div>
  );
}

/**
 * Right-rail slot (9.3 Task 6): AppShell owns the rail's chrome and placement
 * (§5.2's 320px rail at ≥1280px only). Pages fill it through `RailPortal`,
 * which portals their content into the shell's slot node — a page never
 * renders rail markup in its own tree, and pages that fill nothing leave the
 * rail empty.
 */
const RAIL_SLOT_ID = "appshell-rail-slot";

export function RailPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.getElementById(RAIL_SLOT_ID));
  }, []);
  if (container === null) return null;
  return createPortal(children, container);
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" data-testid="app-shell">
      {/* §10.1's offline strip, install promotion and push primer (9.4 Task 8). */}
      <PwaLayer />
      <AnnouncementBanner />
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        {/* Sidebar: ≥640px (§5.3 persists it; §5.2 shows it beside the rail) */}
        <aside className="hidden border-slate-200 dark:border-slate-800 lg:sticky lg:top-0 lg:block lg:h-screen lg:border-r">
          <div className="flex h-full flex-col justify-between p-3">
            <div>
              {BRAND}
              <nav aria-label="Primary" className="mt-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLinkClasses}>
                    {({ isActive }) => (
                      <>
                        <NavGlyph item={item} active={isActive} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              <AdminNavGroup />
            </div>
            <div className="space-y-1 px-3 pb-4 text-xs text-slate-500 dark:text-slate-400">
              <Link to="/about" className="block py-1 hover:text-slate-800 dark:hover:text-slate-200">
                About
              </Link>
              <Link to="/privacy" className="block py-1 hover:text-slate-800 dark:hover:text-slate-200">
                Privacy
              </Link>
              <Link to="/terms" className="block py-1 hover:text-slate-800 dark:hover:text-slate-200">
                Terms
              </Link>
            </div>
          </div>
        </aside>

        {/* Center column */}
        <div className="flex min-h-screen min-w-0 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            {/* Mobile app bar (§5.4) */}
            <div className="flex items-center justify-between px-4 py-2 lg:hidden">
              {BRAND}
              <div className="flex items-center gap-2">
                {/* §7.10's bell: same component on both breakpoints, so the
                    badge and its store stay in one place. */}
                <NotificationBell />
              </div>
            </div>
            {/* Desktop/tablet search row (§7.4) */}
            <div className="hidden items-center justify-between gap-4 px-6 py-2.5 lg:flex">
              <input
                type="search"
                aria-label="Search community"
                placeholder="Search community…"
                className="w-80 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50"
              />
              <div className="flex items-center gap-3">
                <Link
                  to="/community/create"
                  className="flex min-h-[40px] items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-800"
                >
                  + Post
                </Link>
                <NotificationBell />
                {user !== null && user.is_staff && (
                  <span
                    data-testid="moderator-chip"
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                  >
                    Moderator
                  </span>
                )}
                {user !== null && (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {user.email}
                  </span>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-8">{children ?? <Outlet />}</main>

          <footer className="border-t border-slate-200 px-4 py-3 lg:px-8 dark:border-slate-800">
            <Disclaimer variant="footer" />
          </footer>
        </div>

        {/* Right rail: §5.2's 320px rail at ≥1280px only; 9.3 fills it */}
        <aside className="hidden border-slate-200 dark:border-slate-800 xl:sticky xl:top-0 xl:block xl:h-screen xl:border-l">
          <div id={RAIL_SLOT_ID} className="space-y-4 p-4" />
        </aside>
      </div>

      {/* Mobile bottom tab bar (§5.4) */}
      <MobileTabBar />
    </div>
  );
}

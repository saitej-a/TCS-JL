/**
 * The authenticated & public workspace chrome (UI-01, upgraded in Phase 2
 * Anti-Slop Overhaul):
 *
 * - Built on the drawn `Accent ladder / Open plane` workspace direction
 *   (seed 1948030239) with the **Forest Emerald & Warm Stone** palette.
 * - Zero Material Symbols font ligatures: all navigation, alert, announcement,
 *   and action icons use `lucide-react` vector SVGs (`1.75px` stroke width).
 * - Keyboard-first `/` shortcut focuses the top-bar search input when no form
 *   control is active.
 * - ≥1024px (`lg`): 240px open-plane sidebar + fluid center + collapsible 320px
 *   right context rail (`RailPortal`).
 * - <1024px: responsive top bar + slide-over navigation drawer with `Escape`
 *   key dismissal.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Flag,
  Megaphone,
  Menu,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { apiGet } from "@/api/client";
import { listAnnouncements } from "@/api/announcements";
import { listNotifications } from "@/api/notifications";
import { setUnreadCount, useUnreadCount } from "@/api/unreadStore";
import { BrandMark } from "@/components/BrandMark";
import { Disclaimer } from "@/components/Disclaimer";
import {
  readDismissedAnnouncements,
  recordDismissedAnnouncement,
} from "@/components/announcementStorage";
import { useAuth } from "@/context/AuthContext";
import { setRailOccupied, useRailOccupied } from "@/layouts/railStore";
import { APP_HEADER_SURFACE } from "@/layouts/appHeaderStyles";
import { PwaLayer } from "@/pwa/PwaLayer";
import { NAV_ITEMS } from "@/layouts/navItems";
import type { Paginated } from "@/types/api";

const BRAND = (
  <Link
    to="/dashboard"
    aria-label="TCSJL home"
    className="flex items-center gap-2.5 px-2 py-1 rounded-lg transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/50"
  >
    <BrandMark className="h-9 w-9 shrink-0" />
    <div>
      <h1 className="font-headline text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
        Recruitment Status
      </h1>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none">
        Joining Ledger
      </p>
    </div>
  </Link>
);

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return [
    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] min-h-[44px]",
    isActive
      ? "bg-brand-50 text-brand-700 border border-brand-200/70 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800/50 font-semibold"
      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent",
  ].join(" ");
}

/**
 * The §5.5 announcement banner: latest un-dismissed announcement, persisted
 * dismissal. It reports its own visibility upward because the sticky chrome
 * offsets below it (`top-9` / `h-[calc(100dvh-36px)]`) only while visible.
 */
function AnnouncementBanner({
  onVisibilityChange,
}: {
  onVisibilityChange: (visible: boolean) => void;
}) {
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
        if (!cancelled) setItem(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onVisibilityChange(item !== null);
  }, [item, onVisibilityChange]);

  if (item === null) return null;

  return (
    <aside
      id="global-announcement"
      data-testid="announcement-banner"
      className="bg-brand-700 text-white text-xs sm:text-sm font-medium px-4 sm:px-6 py-2 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200 dark:bg-brand-950 dark:border-b dark:border-brand-800/60 dark:text-brand-100"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <span className="p-1 rounded bg-brand-800/60 flex items-center justify-center shrink-0">
          <Megaphone className="h-4 w-4 text-brand-100" aria-hidden="true" />
        </span>
        <p className="truncate">
          <span className="font-semibold">NOTICE:</span> {item.title}
          {item.body !== "" && (
            <span className="hidden truncate font-normal opacity-90 sm:inline"> · {item.body}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <Link
          to="/notifications"
          className="text-xs sm:text-sm underline underline-offset-2 text-brand-100 hover:text-white font-semibold transition-colors duration-150"
        >
          Read update
        </Link>
        <button
          type="button"
          aria-label="Dismiss announcement"
          data-testid="dismiss-announcement"
          className="p-1 rounded hover:bg-brand-800/70 text-brand-200 hover:text-white transition-colors duration-150 flex items-center active:scale-[0.96]"
          onClick={() => {
            recordDismissedAnnouncement(item.id);
            setItem(null);
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

/**
 * §7.10's bell: the topbar's unread badge, fed by the shared unreadStore.
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <Link
      to={isAuthenticated ? "/notifications" : "/login?next=%2Fnotifications"}
      aria-label={isAuthenticated ? "Notifications" : "Sign in to see notifications"}
      data-testid="notification-bell"
      className="relative p-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-[background-color,color,transform] duration-150 active:scale-[0.97]"
    >
      <Bell className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
      {isAuthenticated && unread > 0 && (
        <span
          data-testid="notification-badge"
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white leading-none tabular-nums"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/**
 * The Administration nav group — rendered only for `is_staff` callers.
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user === null || !user.is_staff) return null;

  return (
    <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
      <p className="px-3 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        Administration
      </p>
      <nav aria-label="Administration" className="space-y-1">
        <NavLink
          to="/admin/moderation/reports"
          className={navLinkClasses}
          data-testid="admin-reports-link"
        >
          {({ isActive }) => (
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-3">
                <Flag
                  className={`h-[18px] w-[18px] ${
                    isActive
                      ? "text-brand-700 dark:text-brand-400 stroke-[2]"
                      : "text-slate-500 dark:text-slate-400 stroke-[1.75]"
                  }`}
                  aria-hidden="true"
                />
                <span>Reports</span>
              </span>
              {openReports !== null && openReports > 0 && (
                <span
                  data-testid="admin-reports-count"
                  className="min-w-[20px] rounded-full bg-amber-100 text-amber-800 dark:bg-brand-950 dark:text-brand-300 dark:border dark:border-brand-800/60 px-1.5 text-center text-[11px] font-semibold leading-[18px] tabular-nums"
                >
                  {openReports > 99 ? "99+" : openReports}
                </span>
              )}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/admin/announcements"
          className={navLinkClasses}
          data-testid="admin-announcements-link"
        >
          {({ isActive }) => (
            <span className="flex items-center gap-3">
              <Megaphone
                className={`h-[18px] w-[18px] ${
                  isActive
                    ? "text-brand-700 dark:text-brand-400 stroke-[2]"
                    : "text-slate-500 dark:text-slate-400 stroke-[1.75]"
                }`}
                aria-hidden="true"
              />
              <span>Announcements</span>
            </span>
          )}
        </NavLink>
        <NavLink
          to="/admin/members"
          className={navLinkClasses}
          data-testid="admin-members-link"
        >
          {({ isActive }) => (
            <span className="flex items-center gap-3">
              <UsersRound
                className={`h-[18px] w-[18px] ${
                  isActive
                    ? "text-brand-700 dark:text-brand-400 stroke-[2]"
                    : "text-slate-500 dark:text-slate-400 stroke-[1.75]"
                }`}
                aria-hidden="true"
              />
              <span>Members</span>
            </span>
          )}
        </NavLink>
      </nav>
    </div>
  );
}

const RAIL_SLOT_ID = "appshell-rail-slot";

export function RailPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setContainer(document.getElementById(RAIL_SLOT_ID));
    setRailOccupied(true);
    return () => setRailOccupied(false);
  }, []);
  if (container === null) return null;
  return createPortal(children, container);
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const railOccupied = useRailOccupied();
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(location.search).get("search") ?? "",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const stickyOffset = bannerVisible
    ? "top-9 h-[calc(100dvh-36px)]"
    : "top-0 h-[100dvh]";

  useEffect(() => {
    setSearchQuery(new URLSearchParams(location.search).get("search") ?? "");
  }, [location.search]);

  // Close mobile menu on route change or Escape key
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        return;
      }
      // Keyboard shortcut `/` focuses the community search input when no form field is focused
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const active = document.activeElement;
        const tag = active?.tagName.toLowerCase();
        const isEditable =
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          (active instanceof HTMLElement && active.isContentEditable);
        if (!isEditable && searchInputRef.current !== null) {
          event.preventDefault();
          searchInputRef.current.focus();
        }
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [mobileMenuOpen]);

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query === "" ? "/community" : `/community?search=${encodeURIComponent(query)}`);
  }

  const railStickyOffset = bannerVisible
    ? "top-[100px] h-[calc(100dvh-100px)]"
    : "top-16 h-[calc(100dvh-64px)]";

  return (
    <div
      className="min-h-[100dvh] bg-slate-50 text-slate-900 font-body antialiased selection:bg-brand-100 selection:text-brand-900 dark:bg-slate-900 dark:text-slate-100 dark:selection:bg-brand-900 dark:selection:text-brand-100"
      data-testid="app-shell"
    >
      <PwaLayer />
      <AnnouncementBanner onVisibilityChange={setBannerVisible} />

      <div className="flex flex-1 w-full min-w-0">
        {/* Sidebar: 240px wide, desktop ≥1024px */}
        <aside
          className={`w-60 bg-white border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 sticky ${stickyOffset} z-30 overflow-y-auto hidden lg:flex`}
        >
          <div className="flex flex-col gap-6">
            {BRAND}
            <nav
              aria-label="Primary"
              data-testid="desktop-nav"
              className="space-y-1 font-body text-sm leading-6 tracking-normal"
            >
              {NAV_ITEMS.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} className={navLinkClasses}>
                    {({ isActive }) => (
                      <>
                        <ItemIcon
                          className={`h-[18px] w-[18px] shrink-0 ${
                            isActive
                              ? "text-brand-700 dark:text-brand-400 stroke-[2]"
                              : "text-slate-500 dark:text-slate-400 stroke-[1.75]"
                          }`}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
              <AdminNavGroup />
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <Link
              to="/community/create"
              className="w-full flex items-center justify-center gap-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-medium text-xs py-2 px-3 rounded-lg border border-brand-200 dark:border-brand-800 transition-[background-color,transform] duration-150 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Share Update</span>
            </Link>
            <div className="flex items-center gap-3 px-2 text-xs text-slate-500 dark:text-slate-400">
              <Link to="/about" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                About
              </Link>
              <span>·</span>
              <Link to="/privacy" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Privacy
              </Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Terms
              </Link>
            </div>
            <p className="px-2 text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
              v2.4.0 Community Edition
            </p>
          </div>
        </aside>

        <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
          <header
            data-testid="app-header"
            className={`${APP_HEADER_SURFACE} sticky ${
              bannerVisible ? "top-9" : "top-0"
            }`}
          >
            <div className="flex w-full min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex shrink-0 items-center gap-2.5">
                <button
                  type="button"
                  data-testid="mobile-menu-button"
                  aria-label="Open menu"
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((s) => !s)}
                  className="rounded-lg p-2 transition-[background-color,transform] duration-150 hover:bg-slate-100 active:scale-[0.97] dark:hover:bg-slate-800 lg:hidden"
                >
                  <Menu className="h-[22px] w-[22px] lg:hidden" aria-hidden="true" />
                </button>
                <Link
                  to="/dashboard"
                  aria-label="TCSJL home"
                  data-testid="app-title"
                  className="flex items-center gap-2.5"
                >
                  <BrandMark className="h-9 w-9 shrink-0" />
                  <span className="hidden text-sm font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100 sm:block lg:hidden">
                    Recruitment Status
                  </span>
                </Link>
              </div>

              <form
                role="search"
                onSubmit={handleSearch}
                className="relative min-w-0 flex-1 sm:max-w-xl"
              >
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  aria-label="Search community"
                  placeholder="Search community, region, batch…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 transition-[border-color,background-color,box-shadow] duration-150 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900 sm:text-sm"
                />
                <kbd
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400 sm:inline-block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                >
                  /
                </kbd>
              </form>

              <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                <div className="hidden lg:block">
                  <Link
                    to="/community/create"
                    className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] sm:text-sm"
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Post</span>
                  </Link>
                </div>
                {user !== null && user.is_staff && (
                  <span
                    data-testid="moderator-chip"
                    className="hidden rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300 sm:inline-flex"
                  >
                    Moderator
                  </span>
                )}
                <NotificationBell />
                {user !== null && (
                  <Link
                    to="/settings"
                    aria-label="User profile settings"
                    className="flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg p-1 transition-[background-color,transform] duration-150 hover:bg-slate-100 active:scale-[0.98] dark:hover:bg-slate-800 sm:px-2"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 bg-brand-100 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
                      {user.email ? user.email.slice(0, 2).toUpperCase() : "CA"}
                    </span>
                    <span className="hidden max-w-36 truncate text-xs font-semibold text-slate-900 dark:text-slate-100 md:block">
                      {user.email}
                    </span>
                  </Link>
                )}
              </div>
            </div>

            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div
                  className="absolute inset-0 bg-slate-950/40 transition-opacity duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <aside className="absolute bottom-0 left-0 top-0 w-64 overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    {BRAND}
                    <button
                      type="button"
                      aria-label="Close menu"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <nav aria-label="Mobile primary" className="space-y-1">
                    <Link
                      to="/community/create"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mb-2 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800/60 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-900/60"
                    >
                      <Plus className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span>Share Update</span>
                    </Link>
                    {NAV_ITEMS.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <ItemIcon className="h-[18px] w-[18px] shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    {user !== null && user.is_staff && (
                      <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800 space-y-1">
                        <p className="px-3 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Administration
                        </p>
                        <Link
                          to="/admin/moderation/reports"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Flag className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          <span>Reports</span>
                        </Link>
                        <Link
                          to="/admin/announcements"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Megaphone className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          <span>Announcements</span>
                        </Link>
                        <Link
                          to="/admin/members"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <UsersRound className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          <span>Members</span>
                        </Link>
                      </div>
                    )}
                  </nav>
                </aside>
              </div>
            )}
          </header>

          <div data-testid="app-content-row" className="flex min-w-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-900">
              <main
                className={`flex-1 space-y-4 px-4 pt-4 lg:px-8 lg:pb-8 ${
                  location.pathname === "/messages" ? "pb-0" : "pb-28"
                }`}
              >
                {children ?? <Outlet />}
              </main>

              <footer className="border-t border-slate-200 px-4 py-3 lg:px-8 dark:border-slate-800">
                <Disclaimer variant="footer" />
              </footer>
            </div>

            {/* Right rail shares the content row, below the app-wide top bar. */}
            <aside
              className={`${railOccupied ? "hidden lg:block" : "hidden"} sticky ${railStickyOffset} z-10 w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900`}
            >
              <div id={RAIL_SLOT_ID} className="space-y-5" />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The §5.4 mobile bottom tab bar: five tabs, ≥44px touch targets, active tab
 * in brand color. Rendered by AppShell below lg; hidden on desktop.
 *
 * Phase 12: each tab renders its `app_shell` glyph above the label, matching
 * the composition's tab anatomy (icon over a 11px label).
 */
import { NavLink } from "react-router-dom";

import { MOBILE_TABS } from "@/layouts/navItems";
import { useUnreadCount } from "@/api/unreadStore";

export function MobileTabBar() {
  const unread = useUnreadCount();

  return (
    <nav
      aria-label="Primary mobile"
      data-testid="mobile-tab-bar"
      className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-around items-center h-16 px-2 pb-[env(safe-area-inset-bottom,12px)] bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg dark:bg-slate-900/95 dark:border-slate-800 lg:hidden"
    >
      <ul className="flex w-full justify-around items-center">
        {MOBILE_TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                [
                  "relative flex flex-col items-center justify-center py-1 min-h-[44px] min-w-[44px] w-full active:scale-[0.98] transition-transform duration-150",
                  isActive
                    ? "text-[#4F46E5] dark:text-indigo-400 font-semibold"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative inline-flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[22px]"
                      data-icon={tab.glyph}
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      aria-hidden="true"
                    >
                      {tab.glyph}
                    </span>
                    {tab.to === "/notifications" && unread > 0 && (
                      <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white leading-none">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                  <span className="font-label text-[11px] tracking-wide mt-0.5">
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

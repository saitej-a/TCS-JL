/**
 * The §5.4 mobile bottom tab bar: ≥44px touch targets, active tab in Forest
 * Emerald (`brand-*`), rendered with crisp Lucide SVG icons (Phase 2 Anti-Slop
 * Overhaul).
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
      className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-around items-center h-16 px-2 pb-[env(safe-area-inset-bottom,12px)] bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 lg:hidden"
    >
      <ul className="flex w-full justify-around items-center">
        {MOBILE_TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  [
                    "relative flex flex-col items-center justify-center py-1 min-h-[44px] min-w-[44px] w-full active:scale-[0.98] transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isActive
                      ? "text-brand-700 dark:text-brand-400 font-semibold"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative inline-flex items-center justify-center">
                      <TabIcon
                        className={`h-5 w-5 ${
                          isActive
                            ? "text-brand-700 dark:text-brand-400 stroke-[2.25]"
                            : "text-slate-500 dark:text-slate-400 stroke-[1.75]"
                        }`}
                        aria-hidden="true"
                      />
                      {tab.to === "/notifications" && unread > 0 && (
                        <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white leading-none tabular-nums">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                    <span className="font-label text-[11px] tracking-tight mt-0.5">
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

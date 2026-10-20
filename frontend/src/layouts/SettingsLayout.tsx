/**
 * The settings section layout (Phase 7 Anti-Slop Overhaul):
 * Provides a persistent left sub-navigation rail on desktop (`w-52 shrink-0`)
 * and horizontal scroll pills on mobile/tablet so candidates can jump directly
 * between Overview, Profile, Privacy, Security, Devices & notifications, and
 * Danger zone without bouncing through a 2×2 card grid.
 */
import type { ReactElement, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Eye,
  Lock,
  SlidersHorizontal,
  Smartphone,
  UserRound,
  type LucideIcon,
} from "lucide-react";

interface SettingsNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  danger?: boolean;
}

const SETTINGS_NAV_ITEMS: readonly SettingsNavItem[] = [
  { to: "/settings", label: "Overview", icon: SlidersHorizontal, end: true },
  { to: "/settings/profile", label: "Profile", icon: UserRound },
  { to: "/settings/privacy", label: "Privacy", icon: Eye },
  { to: "/settings/security", label: "Security", icon: Lock },
  { to: "/settings/devices", label: "Devices & alerts", icon: Smartphone },
  { to: "/settings/danger", label: "Danger zone", icon: AlertTriangle, danger: true },
] as const;

export function SettingsLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start lg:gap-8 lg:p-8"
      data-testid="settings-layout"
    >
      {/* Persistent settings sub-navigation rail */}
      <aside
        aria-label="Settings navigation"
        className="w-full shrink-0 lg:sticky lg:top-20 lg:w-52"
      >
        <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {SETTINGS_NAV_ITEMS.map(({ to, label, icon: Icon, end, danger }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => {
                if (danger) {
                  return [
                    "inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    isActive
                      ? "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
                      : "text-rose-600 hover:bg-rose-50/60 dark:text-rose-400 dark:hover:bg-rose-950/30",
                  ].join(" ");
                }
                return [
                  "inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  isActive
                    ? "border border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
                ].join(" ");
              }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Active settings pane */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

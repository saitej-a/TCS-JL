/**
 * The settings section shell (9.5 Task 2; Phase 12 reconciliation) — the
 * compositions' shared settings anatomy: breadcrumb (Home → Settings → section)
 * over the page header, with the section nav kept as the in-page switcher.
 * Every settings page mounts inside it, so the layout is built once (the plan's
 * "Tasks 3–7 share a settings layout component" note).
 */
import type { ReactElement, ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { Disclaimer } from "@/components/Disclaimer";
import { TYPOGRAPHY } from "@/theme/tokens";

/** Screen #1's section list, in catalogue order. */
export const SETTINGS_SECTIONS = [
  { to: "/settings/profile", label: "Profile information", description: "Name, recruitment details, timeline visibility" },
  { to: "/settings/privacy", label: "Privacy & visibility", description: "Identity mode, search engines, data export" },
  { to: "/settings/devices", label: "Devices & notifications", description: "Push alerts, quiet hours, registered devices" },
  { to: "/settings/security", label: "Security", description: "Password, sessions, sign-out everywhere" },
  { to: "/settings/danger", label: "Danger zone", description: "Export, deactivation, permanent deletion" },
] as const;

export function SettingsLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}): ReactElement {
  const { user } = useAuth();

  const isHub = title === "Settings";
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      {/* Composition breadcrumb: Home → Settings → section (hub shows two steps). */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/dashboard" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
          Home
        </Link>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
        {isHub ? (
          <span className="font-medium text-brand-700 dark:text-brand-400">Settings</span>
        ) : (
          <>
            <Link to="/settings" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              Settings
            </Link>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
            <span aria-current="page" className="font-medium text-brand-700 dark:text-brand-400">
              {title}
            </span>
          </>
        )}
      </nav>
      <header className="space-y-1">
        <h1 className={TYPOGRAPHY.pageTitle}>{title}</h1>
        {description !== undefined && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </header>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-800">
          <ul className="space-y-1">
            {SETTINGS_SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  className={({ isActive }) =>
                    [
                      "flex min-h-[44px] flex-col justify-center rounded-lg px-3 py-2 text-sm font-medium",
                      // Composition's active state: tinted ground + left brand bar.
                      isActive
                        ? "border-l-4 border-brand-700 bg-brand-50 pl-2.5 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800",
                    ].join(" ")
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
      {user !== null && <Disclaimer variant="footer" />}
    </main>
  );
}

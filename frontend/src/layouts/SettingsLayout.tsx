/**
 * The settings section wrapper (9.5 Task 2; Phase 16 port).
 *
 * The five settings compositions each render their own breadcrumb, page header,
 * card stack and footer **inside** the document's `<main>` — the global chrome
 * (sidebar, top bar, footer disclaimer) comes from the shell composition. The app
 * shell already supplies both, so this wrapper is only the section's mount point.
 *
 * The section switcher the pre-port revision carried here (a 240px nav listing the
 * five sections) is not part of any composition: the hub's own card grid is the
 * navigation, exactly as `tcs_joining_tracker_desktop_settings_screen` draws it,
 * and every sub-page's breadcrumb links back to that hub.
 */
import type { ReactElement, ReactNode } from "react";

export function SettingsLayout({ children }: { children: ReactNode }): ReactElement {
  return <div className="w-full min-w-0">{children}</div>;
}

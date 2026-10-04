/**
 * The §5.4 visitor shell (9.5.1 D-05): VisitorHeader + main + VisitorFooter.
 * The frame for the landing page and the three legal pages; used as a router
 * layout route (children render through <Outlet />).
 */
import { Outlet } from "react-router-dom";

import { VisitorFooter } from "@/layouts/VisitorFooter";
import { VisitorHeader } from "@/layouts/VisitorHeader";

export function VisitorShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="skin-v2 flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 font-body antialiased">
      <VisitorHeader />
      <main id="content" className="flex-1">
        {children ?? <Outlet />}
      </main>
      <VisitorFooter />
    </div>
  );
}

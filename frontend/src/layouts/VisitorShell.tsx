/**
 * The §5.4 visitor shell (9.5.1 D-05, upgraded in Phase 2 Anti-Slop Overhaul):
 * VisitorHeader + main + VisitorFooter on the unified Forest Emerald & Warm
 * Stone ground.
 */
import { Outlet } from "react-router-dom";

import { VisitorFooter } from "@/layouts/VisitorFooter";
import { VisitorHeader } from "@/layouts/VisitorHeader";

export function VisitorShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-body antialiased selection:bg-brand-100 selection:text-brand-900 dark:selection:bg-brand-900 dark:selection:text-brand-100">
      <VisitorHeader />
      <main id="content" className="flex-1">
        {children ?? <Outlet />}
      </main>
      <VisitorFooter />
    </div>
  );
}

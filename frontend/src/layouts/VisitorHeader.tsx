/**
 * The §5.4 visitor header (9.5.1 D-05/D-07/D-08): the shared chrome for the
 * landing page and the legal pages. Nav is Community + About; the auth zone
 * is auth-aware — a signed-in reader is never shown Register, and the zone
 * stays hidden while the silent refresh is still deciding.
 */
import { Link } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

export function VisitorHeader() {
  const { status } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2" aria-label="TCS Joining Tracker home">
            <span className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-2 py-1 text-xs font-bold text-white">
              TJT
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              TCS Joining Tracker
            </span>
          </Link>
          <nav aria-label="Visitor" className="flex items-center gap-4">
            <Link
              to="/community"
              className="flex min-h-[44px] items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Community
            </Link>
            <Link
              to="/about"
              className="flex min-h-[44px] items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              About
            </Link>
          </nav>
        </div>
        {status !== "booting" && (
          <div className="flex items-center gap-2">
            {status === "authenticated" ? (
              <Link
                to="/dashboard"
                className="flex min-h-[44px] items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                My tracker
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex min-h-[44px] items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="flex min-h-[44px] items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

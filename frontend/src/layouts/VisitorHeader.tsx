/**
 * The §5.4 visitor header (9.5.1 D-05/D-07/D-08): the shared chrome for the
 * landing page and the legal pages. Nav is Community + About; the auth zone
 * is auth-aware — a signed-in reader is never shown Register, and the zone
 * stays hidden while the silent refresh is still deciding.
 */
import { Link } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { APP_HEADER_SURFACE } from "@/layouts/appHeaderStyles";

export function VisitorHeader() {
  const { status } = useAuth();

  return (
    <header className={`${APP_HEADER_SURFACE} sticky top-0`}>
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="TCSJL home">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-[9px] font-bold text-white shadow-sm">
              TCSJL
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100">
                TCSJL
              </span>
              <span className="mt-1 block text-[10px] leading-none text-slate-500 dark:text-slate-400">
                Recruitment Status
              </span>
            </span>
          </Link>
          <nav aria-label="Visitor" className="hidden items-center gap-4 sm:flex">
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

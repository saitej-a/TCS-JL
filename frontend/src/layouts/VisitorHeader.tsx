/**
 * The §5.4 visitor header (9.5.1 D-05/D-07/D-08, upgraded in Phase 2 Anti-Slop
 * Overhaul): the shared architectural chrome for the landing page and legal
 * pages. Nav is Community + About; the auth zone is auth-aware — a signed-in
 * reader is never shown Register, and the zone stays hidden while the silent
 * refresh is still deciding.
 */
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/BrandMark";
import { useAuth } from "@/context/AuthContext";
import { APP_HEADER_SURFACE } from "@/layouts/appHeaderStyles";

export function VisitorHeader() {
  const { status } = useAuth();

  return (
    <header className={`${APP_HEADER_SURFACE} sticky top-0`}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg transition-opacity duration-150 hover:opacity-90"
            aria-label="TCSJL home"
          >
            <BrandMark className="h-9 w-9 shrink-0" />
            <span className="hidden font-headline text-[15px] font-semibold leading-none tracking-tight text-slate-900 sm:block dark:text-slate-100">
              Recruitment Status
            </span>
          </Link>
          <nav aria-label="Visitor" className="hidden items-center gap-5 sm:flex">
            <Link
              to="/community"
              className="flex min-h-[44px] items-center text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Community
            </Link>
            <Link
              to="/about"
              className="flex min-h-[44px] items-center text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              About
            </Link>
          </nav>
        </div>
        {status !== "booting" && (
          <div className="flex items-center gap-2.5">
            {status === "authenticated" ? (
              <Link
                to="/dashboard"
                className="flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition-[background-color,border-color,transform] duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                My tracker
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-[background-color,border-color,transform] duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="flex min-h-[40px] items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98]"
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

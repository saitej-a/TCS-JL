/**
 * The §5.4 visitor footer (9.5.1 D-08, upgraded in Phase 2 Anti-Slop Overhaul):
 * the architectural typographic close with the About/Privacy/Terms/Community
 * link row above the mandatory TCS non-affiliation disclaimer (`05 §5.6`).
 */
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/BrandMark";
import { Disclaimer } from "@/components/Disclaimer";

const FOOTER_LINKS = [
  { label: "About", to: "/about" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Explore Community", to: "/community" },
] as const;

export function VisitorFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/60 px-6 py-8 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7 shrink-0" />
            <span className="font-headline text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              TCS Joining Tracker
            </span>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex min-h-[36px] items-center text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <Disclaimer variant="footer" />
        </div>
      </div>
    </footer>
  );
}

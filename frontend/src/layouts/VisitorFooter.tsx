/**
 * The §5.4 visitor footer (9.5.1 D-08): the About/Privacy/Terms/Community
 * link row above the shipped footer disclaimer — one footer for the landing
 * page and the legal pages.
 */
import { Link } from "react-router-dom";

import { Disclaimer } from "@/components/Disclaimer";

const FOOTER_LINKS = [
  { label: "About", to: "/about" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
  { label: "Explore Community", to: "/community" },
] as const;

export function VisitorFooter() {
  return (
    <footer className="border-t border-slate-200 px-4 py-6 dark:border-slate-800">
      <div className="mx-auto max-w-3xl text-center">
        <nav aria-label="Footer" className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex min-h-[44px] items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Disclaimer variant="footer" />
      </div>
    </footer>
  );
}

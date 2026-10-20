/**
 * The shared editorial `Read`-mode legal layout (9.5.1 D-13, upgraded in Phase 3
 * Anti-Slop Overhaul):
 *
 * - Enforces a calm 65ch reading measure with generous paragraph rhythm and
 *   Forest Emerald & Warm Stone surface tone steps.
 * - Sticky desktop index rail (`legal-toc`) + collapsible mobile TOC disclosure
 *   (`legal-toc-mobile`) when a page has two or more sections.
 * - Preserves all honesty contracts (09.5.1 D-03/D-14/D-16): no fabricated
 *   publication dates, no unshipped feature claims, and the single canonical
 *   independence notice (`FOOTER_DISCLAIMER`).
 */
import type { ReactElement } from "react";

import { FOOTER_DISCLAIMER } from "@/content/disclaimer";
import { TYPOGRAPHY } from "@/theme/tokens";

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: string[];
}

export interface LegalPageData {
  title: string;
  sections: LegalSection[];
}

/** The single shared honesty sentence (D-03) — caption voice, under the title. */
export const LEGAL_HONESTY_LINE =
  "This page describes how this community platform actually behaves. It is not legal advice.";

export function LegalLayout({ page }: { page: LegalPageData }): ReactElement {
  const hasToc = page.sections.length >= 2;

  const tocLinks = (
    <nav aria-label="On this page">
      <p className={`${TYPOGRAPHY.subheadLabel} text-slate-500 dark:text-slate-400`}>
        On this page
      </p>
      <ul className="mt-2.5 space-y-1.5 pl-3">
        {page.sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`${TYPOGRAPHY.bodySecondary} flex items-baseline gap-2 py-0.5 text-slate-600 transition-colors duration-150 hover:text-brand-700 hover:underline dark:text-slate-300 dark:hover:text-brand-400`}
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 font-body antialiased">
      <div className="max-w-[65ch]">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {page.title}
        </h1>
        <p
          className="mt-3 rounded-lg bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-800 dark:bg-brand-950/60 dark:text-brand-200"
          data-testid="legal-honesty"
        >
          {LEGAL_HONESTY_LINE}
        </p>

        {/* Canonical independence notice from the single shipped disclaimer string (UI-04). */}
        <div
          data-testid="legal-independence-notice"
          className="mt-4 rounded-xl bg-white p-4 ring-1 ring-inset ring-slate-200/90 dark:bg-slate-800/60 dark:ring-slate-800"
        >
          <p className={`${TYPOGRAPHY.subheadLabel} text-slate-800 dark:text-slate-200`}>
            Independent initiative notice
          </p>
          <p className={`${TYPOGRAPHY.legal} mt-1 leading-relaxed text-slate-600 dark:text-slate-400`}>
            {FOOTER_DISCLAIMER}
          </p>
        </div>
      </div>

      {page.sections.length === 0 ? (
        <p className={`mt-8 ${TYPOGRAPHY.bodySecondary} text-slate-500 dark:text-slate-400`}>
          This page has no published sections yet.
        </p>
      ) : (
        <div className="mt-10 gap-12 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          {hasToc && (
            <aside
              className="mb-6 hidden lg:sticky lg:top-20 lg:mb-0 lg:block"
              data-testid="legal-toc"
            >
              {tocLinks}
            </aside>
          )}
          <div className="max-w-[65ch]">
            {hasToc && (
              <details className="mb-8 rounded-xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-800 lg:hidden">
                <summary
                  className={`${TYPOGRAPHY.subheadLabel} cursor-pointer text-slate-700 dark:text-slate-200`}
                >
                  On this page
                </summary>
                <div className="mt-3" data-testid="legal-toc-mobile">
                  {tocLinks}
                </div>
              </details>
            )}
            <div className="space-y-10">
              {page.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-20">
                  <h2 className="font-headline text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {section.heading}
                  </h2>
                  <div className="mt-3 space-y-3.5">
                    {section.paragraphs.map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-[15px] leading-[1.65] text-slate-700 dark:text-slate-300"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

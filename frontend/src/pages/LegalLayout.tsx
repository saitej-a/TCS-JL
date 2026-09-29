/**
 * The shared legal layout (9.5.1 D-13): one component owns the 65–75ch prose
 * measure, the section TOC (D-14) and the honesty line (D-03). Pages are
 * content modules rendered as data — text nodes only, never HTML injection.
 *
 * No publication-history/version line anywhere (D-14): with nothing yet
 * published it would be the same fiction as a version string.
 */
import type { ReactElement } from "react";

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
      <p className={`${TYPOGRAPHY.subheadLabel} text-slate-500 dark:text-slate-400`}>On this page</p>
      <ul className="mt-2 space-y-1">
        {page.sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`${TYPOGRAPHY.bodySecondary} text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white`}
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className={`${TYPOGRAPHY.pageTitle} text-slate-900 dark:text-slate-50`}>{page.title}</h1>
      <p
        className="mt-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
        data-testid="legal-honesty"
      >
        {LEGAL_HONESTY_LINE}
      </p>

      {page.sections.length === 0 ? (
        <p className={`mt-8 ${TYPOGRAPHY.bodySecondary} text-slate-500 dark:text-slate-400`}>
          This page has no published sections yet.
        </p>
      ) : (
        <div className="mt-8 gap-10 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
          {hasToc && (
        <aside className="mb-6 hidden lg:sticky lg:top-6 lg:mb-0 lg:block" data-testid="legal-toc">
          {tocLinks}
        </aside>
      )}
          <div className="max-w-[72ch]">
            {hasToc && (
              <details className="mb-6 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 lg:hidden">
                <summary className={`${TYPOGRAPHY.subheadLabel} cursor-pointer text-slate-600 dark:text-slate-300`}>
                  On this page
                </summary>
                <div data-testid="legal-toc-mobile">{tocLinks}</div>
              </details>
            )}
            {page.sections.map((section) => (
              <section key={section.id} id={section.id} className="mb-8 scroll-mt-6">
                <h2 className={`${TYPOGRAPHY.sectionHeader} text-slate-900 dark:text-slate-50`}>
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className={`${TYPOGRAPHY.bodyPrimary} text-slate-700 dark:text-slate-300`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

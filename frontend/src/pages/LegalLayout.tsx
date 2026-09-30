/**
 * The shared legal layout (9.5.1 D-13), reconciled to the
 * `informational_legal_privacy_policy_privacy` composition in Phase 12: the
 * numbering on the section TOC and the in-body independence notice are the
 * composition's, while its fiction is not (09.5.1 D-14/D-16):
 * - the publication-date stamp and version chip the mockup carries stay out —
 *   there is no publication history to state (D-14);
 * - the "Zero-knowledge hashing" / "Self-serve data export" chips are dropped:
 *   the platform neither hashes nor exports anything (export is a disabled
 *   control in settings);
 * - the data-protection mailbox contact block is dropped — no such mailbox
 *   exists and this project has no data-protection officer;
 * - the composition's About/Privacy/Terms row is already shipped twice over
 *   (VisitorHeader nav + VisitorFooter links), so it is not duplicated here.
 *
 * One component still owns the 65–75ch prose measure, the section TOC (D-14)
 * and the honesty line (D-03). Pages are content modules rendered as data —
 * text nodes only, never HTML injection.
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
      <p className={`${TYPOGRAPHY.subheadLabel} text-slate-500 dark:text-slate-400`}>On this page</p>
      <ul className="mt-2 space-y-1">
        {page.sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`${TYPOGRAPHY.bodySecondary} flex items-baseline gap-2 text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white`}
            >
              {/* The composition numbers its contents list. */}
              <span aria-hidden="true" className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {String(index + 1).padStart(2, "0")}
              </span>
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

      {/* The composition's independence notice, rendered from the ONE shipped
          non-affiliation string (imported, never re-typed — UI-04) without
          borrowing the footer's test id. */}
      <div
        data-testid="legal-independence-notice"
        className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40"
      >
        <p className={`${TYPOGRAPHY.subheadLabel} text-slate-700 dark:text-slate-200`}>
          Independent initiative notice
        </p>
        <p className={`${TYPOGRAPHY.legal} mt-1 text-slate-500 dark:text-slate-400`}>
          {FOOTER_DISCLAIMER}
        </p>
      </div>

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

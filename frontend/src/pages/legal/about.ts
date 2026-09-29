/**
 * /about content (9.5.1 D-15): the words are the user's. The paste lands here
 * as data; the empty sections array is the awaiting-copy state the UI-SPEC
 * covers (LegalLayout renders the title + honesty line with no section list).
 *
 * Structural contract (from the UI-SPEC, independent of the words):
 * - covers the mission (PROJECT.md core value) and the non-affiliation
 *   boundary (05 §1);
 * - documents NO contribution guidelines (no LICENSE/CONTRIBUTING exists —
 *   a deferred idea, not an omission).
 */
import type { LegalPageData } from "@/pages/LegalLayout";

export const aboutContent: LegalPageData = {
  title: "About",
  sections: [
    // Paste the final copy here (D-16). Nothing ships in place of it.
  ],
};

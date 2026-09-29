/**
 * /terms content (9.5.1 D-15): the words are the user's. The empty sections
 * array is the awaiting-copy state the UI-SPEC covers. The paste map below is
 * the structural contract the copy must fill, independent of the words:
 *
 * 1. acceptable-use     — mirrors the moderation vocabulary: SPAM, HARASSMENT,
 *                         MISINFORMATION, ABUSIVE_CONTENT, SCAM, OTHER
 * 2. enforcement        — the report flow → review actions
 * 3. non-affiliation    — restatement of the §1 boundary
 */
import type { LegalPageData } from "@/pages/LegalLayout";

export const termsContent: LegalPageData = {
  title: "Terms of Service",
  sections: [
    // Paste the final copy here (D-16) as the three sections above.
  ],
};

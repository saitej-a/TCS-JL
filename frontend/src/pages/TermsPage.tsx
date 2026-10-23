/** /terms — the real page (9.5.1 D-01): content module through LegalLayout. */
import { LegalLayout } from "@/pages/LegalLayout";
import { termsContent } from "@/pages/legal/terms";

export function TermsPage() {
  return <LegalLayout page={termsContent} />;
}

/** /privacy — the real page (9.5.1 D-01): content module through LegalLayout. */
import { LegalLayout } from "@/pages/LegalLayout";
import { privacyContent } from "@/pages/legal/privacy";

export function PrivacyPage() {
  return <LegalLayout page={privacyContent} />;
}

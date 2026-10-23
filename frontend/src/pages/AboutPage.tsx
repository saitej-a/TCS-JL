/** /about — the real page (9.5.1 D-01): content module through LegalLayout. */
import { LegalLayout } from "@/pages/LegalLayout";
import { aboutContent } from "@/pages/legal/about";

export function AboutPage() {
  return <LegalLayout page={aboutContent} />;
}

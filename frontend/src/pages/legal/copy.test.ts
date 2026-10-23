/**
 * Legal content-module facts (9.5.1 Task 5): structure is valid, the banned
 * fiction ledger never appears, and the required real facts do. While the
 * modules await the user's copy (D-15/D-16), the banned-strings assertions
 * hold vacuously — they become load-bearing the moment the paste lands.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { aboutContent } from "@/pages/legal/about";
import { privacyContent } from "@/pages/legal/privacy";
import { termsContent } from "@/pages/legal/terms";

/** The §3.3 do-not-copy ledger — screen #5's fiction, never in product copy. */
const BANNED_STRINGS = [
  "email hashing",
  "hashing",
  "SHA-256",
  "HMAC",
  "hello@tjt-community",
  "business days",
  "TJT-Auth",
  "TJT-Core",
  "WebAuthn",
  "TOTP",
  "three visibility",
  "passwordless",
  "IndexedDB",
  "Last updated",
];

const MODULE_PATHS = {
  about: "src/pages/legal/about.ts",
  privacy: "src/pages/legal/privacy.ts",
  terms: "src/pages/legal/terms.ts",
} as const;

function moduleSource(name: keyof typeof MODULE_PATHS): string {
  return readFileSync(MODULE_PATHS[name], "utf-8");
}

describe("legal content modules — structure", () => {
  it("every module has a title and well-formed sections", () => {
    for (const content of [aboutContent, privacyContent, termsContent]) {
      expect(content.title.length).toBeGreaterThan(0);
      for (const section of content.sections) {
        expect(section.id).toMatch(/^[a-z0-9-]+$/);
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.paragraphs.length).toBeGreaterThan(0);
        for (const paragraph of section.paragraphs) {
          expect(paragraph.trim().length).toBeGreaterThan(0);
          expect(paragraph).not.toMatch(/TODO|PLACEHOLDER|Lorem/i);
        }
      }
    }
  });

  it("privacy declares the seven required section slots in its paste map", () => {
    const source = moduleSource("privacy");
    for (const slot of [
      "what-we-collect",
      "email-handling",
      "trackers",
      "notifications",
      "your-controls",
      "deletion",
      "community-data",
    ]) {
      expect(source).toContain(slot);
    }
  });

  it("terms declares the required section slots in its paste map", () => {
    const source = moduleSource("terms");
    for (const slot of ["acceptable-use", "enforcement", "non-affiliation"]) {
      expect(source).toContain(slot);
    }
  });
});

describe("legal content modules — the honesty ledger", () => {
  it("no banned fiction appears in any module source or rendered copy", () => {
    for (const name of ["about", "privacy", "terms"] as const) {
      const source = moduleSource(name);
      for (const banned of BANNED_STRINGS) {
        expect(source.toLowerCase()).not.toContain(banned.toLowerCase());
      }
    }
    // Rendered data too — the copy test is the gate that survives the paste.
    const rendered = JSON.stringify([aboutContent, privacyContent, termsContent]);
    for (const banned of BANNED_STRINGS) {
      expect(rendered.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("the layout never renders a Last updated line", () => {
    const layout = readFileSync("src/pages/LegalLayout.tsx", "utf-8");
    expect(layout).not.toContain("Last updated");
    expect(layout).not.toContain("dangerouslySetInnerHTML");
  });
});

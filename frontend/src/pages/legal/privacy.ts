/**
 * /privacy content (9.5.1 D-15): the words are the user's. The empty sections
 * array is the awaiting-copy state the UI-SPEC covers. The paste map below is
 * the structural contract the copy must fill, independent of the words:
 *
 * 1. what-we-collect   — self-reported milestones + cohort metadata
 * 2. email-handling    — masking (`a***@example.com`) + what the address is for
 * 3. trackers          — D-04's scoped no-tracker claim + the FCM transport clause
 * 4. notifications     — per-device token scoping (9.4's PushBackend)
 * 5. your-controls     — the ONE shipped identity-mode field (not three modes)
 * 6. deletion          — D-02: immediate, self-service, irreversible
 * 7. community-data    — COMMUNITY_REPORTED aggregates, threshold-suppressed <5
 */
import type { LegalPageData } from "@/pages/LegalLayout";

export const privacyContent: LegalPageData = {
  title: "Privacy Policy",
  sections: [
    // Paste the final copy here (D-16) as the seven sections above.
  ],
};

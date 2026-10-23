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
    {
      id: "scope",
      heading: "Scope & Non-Affiliation",
      paragraphs: [
        "TCS Joining Tracker is an independent, community-driven platform created to help candidates share and understand recruitment and joining-related experiences.",
        "TCS Joining Tracker is not affiliated with, endorsed by, sponsored by, authorized by, or operated by Tata Consultancy Services (TCS).",
        "This Privacy Policy explains what information we collect, how we use it, how we protect it, and what choices you have when using the application and community services.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "Information We Collect",
      paragraphs: [
        "Account Information: When creating an account, we collect your email address, authentication credentials, email verification status, and timestamps. Passwords are protected using secure Argon2id cryptographic password algorithms and are never stored in readable form.",
        "Candidate Milestones and Metadata: You may voluntarily provide recruitment-related information such as your display name, batch year, hiring category (Prime, Digital, Ninja, or Other), interview details, region, joining location, status, offer letter date, expected joining date, and timeline milestone events.",
        "Community Content: We collect discussions, posts, comments, replies, upvotes, reports, and moderation history that you submit to the community.",
        "Technical and Diagnostics: To ensure security, prevent abuse, and maintain service reliability, our infrastructure processes technical identifiers such as IP addresses, browser and device user agent strings, request timestamps, and security events.",
      ],
    },
    {
      id: "email-handling",
      heading: "Email Handling & Protection",
      paragraphs: [
        "Your email address is used strictly for authentication, email verification, password reset links, and critical security notices.",
        "We never display your full email address publicly to other candidates. On settings and summary surfaces, email addresses are masked (for example, a***@example.com) to prevent exposure.",
        "We do not sell, rent, or trade candidate email addresses, nor do we disclose them in community discussions, timelines, or public profiles.",
      ],
    },
    {
      id: "your-controls",
      heading: "Your Controls & Public Identity",
      paragraphs: [
        "You control how your community identity appears. The platform supports two public identity modes: Anonymous Candidate or your chosen Display Name.",
        "In Anonymous mode, your public contributions are labeled generically along with cohort metadata (for example, Anonymous Candidate • 2025 • Digital • Hyderabad) without revealing your personal name or account details.",
        "You can switch between Anonymous and Display Name modes at any time in Settings. We enforce strict server-side serialization boundaries to prevent private profile fields from leaking into public API responses.",
      ],
    },
    {
      id: "community-data",
      heading: "Community-Reported Data & Aggregation",
      paragraphs: [
        "Candidate timelines, wait-time statistics, joining distributions, and cohort paces displayed on this platform are community-reported data based on voluntary candidate submissions.",
        "Aggregated analytics are computed across cohorts to help candidates benchmark wait durations. To protect individual privacy, aggregate metrics for small groups with fewer than five candidates are suppressed (k-anonymity privacy protection).",
        "Community data represents crowd-sourced candidate submissions and should never be construed as official TCS announcements or corporate statistics.",
      ],
    },
    {
      id: "notifications",
      heading: "Device Registration & Push Notifications",
      paragraphs: [
        "If you choose to enable browser push notifications, we register a device-scoped notification push token to route alerts to that specific browser session.",
        "Device tokens are stored privately in your account and are never exposed publicly or shared with other candidates.",
        "Notification payloads are designed to carry minimal necessary context and avoid sensitive personal identifiers. You can manage or revoke registered devices and alert preferences at any time in your Settings.",
      ],
    },
    {
      id: "trackers",
      heading: "No Third-Party Trackers & Storage",
      paragraphs: [
        "TCS Joining Tracker does not use third-party advertising cookies, cross-site behavioral tracking scripts, or data-broker trackers.",
        "We use essential first-party storage (such as HTTP-only cookies and local browser storage) exclusively for secure authentication session management, dark mode preference, and platform security.",
        "Firebase Cloud Messaging and web push protocols are utilized strictly as notification delivery transports and not for behavioral surveillance.",
      ],
    },
    {
      id: "deletion",
      heading: "Account Deletion & Data Retention",
      paragraphs: [
        "You have the right to delete your account at any time through the self-service Danger Zone in Settings.",
        "Account deletion is immediate and irreversible: your email address is anonymized with a tombstone address, password credentials are neutralized, and active session tokens are permanently revoked.",
        "Personal profile data is removed, while public discussion structure and moderation audit logs may be retained in anonymized form to preserve platform integrity and protect against repeated abuse.",
      ],
    },
    {
      id: "security",
      heading: "Security Safeguards",
      paragraphs: [
        "We apply defense-in-depth security measures including encrypted HTTPS transport, Argon2id password protection, role-based authorization, rate limiting, and automated abuse detection.",
        "TCS Joining Tracker will never ask for your confidential TCS NextStep passwords, Ultimatix credentials, employee credentials, or official verification OTPs.",
      ],
    },
  ],
};

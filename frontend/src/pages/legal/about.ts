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
    {
      id: "overview",
      heading: "Overview",
      paragraphs: [
        "Waiting for a TCS Joining Letter, joining date, or onboarding communication can be confusing and stressful.",
        "TCS Joining Tracker is an independent, community-driven platform built to give candidates a structured place to track their recruitment journey, share updates, and understand what other candidates in the community are experiencing.",
        "Our goal is simple: Help candidates understand where they are in the joining process and learn from community-reported experiences.",
      ],
    },
    {
      id: "platform-features",
      heading: "What Can You Do Here?",
      paragraphs: [
        "Track Your Journey: Maintain your personal recruitment timeline and record milestones such as interview, selection, offer letter, joining readiness survey, joining letter, joining date, and joined status. You can update your timeline whenever your status changes.",
        "Explore Community Updates: See posts and discussions from other candidates about joining letters, joining dates, offer letters, locations, interview experiences, onboarding, documentation, and general topics.",
        "Understand Community Trends: View aggregated community insights such as candidate-reported timelines, wait-time trends, and cohort statistics based on voluntary candidate submissions.",
        "Choose How You Appear: Privacy is a core part of the platform. You can participate using an anonymous identity or a display name without exposing private account information to other users.",
      ],
    },
    {
      id: "non-affiliation",
      heading: "Independent From TCS",
      paragraphs: [
        "TCS Joining Tracker is an independent, community-driven platform and is not affiliated with, endorsed by, sponsored by, or operated by Tata Consultancy Services (TCS).",
        "We do not represent TCS, make recruitment decisions, issue joining letters, control joining dates, or have access to internal TCS recruitment systems.",
        "The platform does not require or process official TCS credentials such as NextStep passwords, Ultimatix credentials, internal authentication tokens, or other confidential login information. This separation is an intentional security boundary of the platform.",
      ],
    },
    {
      id: "community-context",
      heading: "Community, Not Official Communication",
      paragraphs: [
        "Information shared on TCS Joining Tracker comes from individual candidates and may be incomplete, inaccurate, outdated, or different from another candidate's situation.",
        "For important recruitment or employment decisions, always verify information through legitimate official TCS communication channels. A community post, notification, statistic, timeline, or trend shown on this platform should never be interpreted as an official TCS communication.",
      ],
    },
    {
      id: "privacy-and-safety",
      heading: "Privacy and Community Safety",
      paragraphs: [
        "We believe candidates should be able to participate without unnecessarily exposing their identity. Anonymous participation is supported, and sensitive data such as email addresses, passwords, IP addresses, credentials, and notification tokens are never publicly exposed.",
        "The platform protects candidates from scams, impersonation, harassment, doxxing, spam, and misleading recruitment claims. Selling fake joining letters, asking for money, or impersonating official personnel is strictly prohibited.",
        "Our moderation system allows users to report harmful content and enables administrators to take appropriate action.",
      ],
    },
    {
      id: "community-principles",
      heading: "Our Principles",
      paragraphs: [
        "Community First: Candidates should have a dedicated space to share experiences and support one another through the onboarding waiting period.",
        "Privacy First: Participation should not require publicly revealing real-world identity.",
        "Truth in Data: Community information should never be presented as official TCS information.",
        "Safety First: Scams, credential theft, doxxing, impersonation, and harassment have no place in the community.",
      ],
    },
    {
      id: "contact",
      heading: "Questions and Support",
      paragraphs: [
        "For general inquiries, community feedback, or assistance, reach out through the platform support channels or discussion boards.",
      ],
    },
  ],
};

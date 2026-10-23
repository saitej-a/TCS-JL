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
    {
      id: "non-affiliation",
      heading: "Independent Community Platform & Non-Affiliation",
      paragraphs: [
        "TCS Joining Tracker is an independent community platform.",
        "TCS Joining Tracker is not affiliated with, endorsed by, sponsored by, authorized by, or operated by Tata Consultancy Services (TCS) or any of its subsidiaries.",
        "The platform has no authority to speak for TCS and does not represent TCS recruitment, HR, onboarding, or corporate communications. References to TCS, joining letters, hiring categories, recruitment processes, locations, or timelines are made solely for the purpose of facilitating peer discussions.",
      ],
    },
    {
      id: "platform-purpose",
      heading: "Purpose & Unofficial Nature of Information",
      paragraphs: [
        "The platform is intended to help candidates maintain their own recruitment timeline, share voluntary joining updates, discuss recruitment experiences with peers, and view community-reported trends.",
        "The service is not an official recruitment portal, employment portal, or replacement for official TCS communication channels.",
        "Community statistics, wait-time estimates, joining trends, and candidate-reported updates must not be interpreted as official TCS statistics or guarantees. For important recruitment decisions, always rely on official communications received through legitimate TCS channels.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "Acceptable Use & Prohibited Conduct",
      paragraphs: [
        "All participants must follow community standards. Our moderation system enforces rules around prohibited content categories: SPAM, HARASSMENT, MISINFORMATION, ABUSIVE_CONTENT, SCAM, and OTHER harmful behaviors.",
        "You agree not to use the platform to harass or threaten another person, dox personal details, or post abusive remarks.",
        "Recruitment scams are strictly forbidden: you must never sell fake joining letters, request money in exchange for supposed joining assistance, claim paid expediting of dates, or phish for credentials.",
        "You must never submit or request TCS NextStep passwords, Ultimatix credentials, internal tokens, or OTPs. Attempting unauthorized access, API exploitation, scraping, or platform disruption is prohibited.",
      ],
    },
    {
      id: "public-identity-and-content",
      heading: "Public Identity & User Content",
      paragraphs: [
        "You may participate using an Anonymous identity or a chosen Display Name. You remain responsible for information you voluntarily post. Selecting Anonymous does not make information you personally disclose in text impossible to identify.",
        "You retain ownership of content you submit. By posting content to the platform, you grant TCS Joining Tracker a limited, non-exclusive license to host, store, reproduce, display, format, moderate, and distribute that content as necessary to operate the service.",
      ],
    },
    {
      id: "enforcement",
      heading: "Moderation Enforcement & Reports",
      paragraphs: [
        "Users may report posts or comments they believe violate these Terms. Reports enter the administrative moderation queue for triage by authorized moderators.",
        "Enforcement actions include issuing warnings, locking discussions, soft-deleting or hiding content, temporarily restricting accounts, and issuing permanent bans.",
        "We may take moderation action without advance notice when reasonably necessary to protect users, the community, or platform integrity.",
      ],
    },
    {
      id: "disclaimer-and-liability",
      heading: "Disclaimer of Warranties & Limitation of Liability",
      paragraphs: [
        "To the extent permitted by applicable law, the platform is provided on an as-is and as-available basis. We do not guarantee that the service will be uninterrupted, error-free, or secure against every possible attack.",
        "TCS Joining Tracker does not guarantee a joining letter, joining date, onboarding schedule, or employment offer. Use of this service does not establish any employment relationship with TCS or any other entity.",
        "To the maximum extent permitted by applicable law, TCS Joining Tracker and its operators will not be liable for indirect, incidental, special, consequential, or similar damages arising from use of, or inability to use, the platform.",
      ],
    },
    {
      id: "governing-law",
      heading: "Governing Law & Updates",
      paragraphs: [
        "These Terms shall be governed by and construed in accordance with the applicable laws of India.",
        "We may revise these Terms as the service evolves or legal requirements change. Updated Terms will be published on the platform, and continued use signifies acceptance of amended terms.",
      ],
    },
  ],
};

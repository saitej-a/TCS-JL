/**
 * The §7.1 landing page, rebuilt to the `marketing_landing_page` composition
 * (Phase 12 Task 12 / D-04): hero → live stats band → feature grid → community
 * band → FAQ, inside the shared 9.5.1 visitor chrome.
 *
 * The composition is a stale-v1 export whose *structure* governs (D-01). Its
 * fiction does not survive the ledger (09.5.1 CONTEXT §3.3), and each omission
 * is recorded in RECONCILIATION.md:
 * - the mock in-browser dashboard preview (predicted dispatch windows, regional
 *   wave percentages, "Survey Confidence 94.2%", "All submissions
 *   cryptographic hash verified", a sample candidate profile) is omitted —
 *   none of it is data the API produces;
 * - the "Active Discussions / Join 4,800+ peers" band linked to third-party
 *   groups this project does not operate; a community band with the real
 *   discussion count takes its slot instead;
 * - the FAQ's document-hashing story is replaced by what the app actually
 *   does, and the "Over 1,200 candidates verified" trust chip becomes the
 *   live candidate count;
 * - footer link columns (Telegram, Reddit, Report Data) are covered by the
 *   shipped VisitorFooter.
 *
 * The page's own honesty rule is unchanged: if /public/stats/ fails, the band
 * renders the fallback message — never fabricated numbers (the numbers ARE the
 * product's claim).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Lock, ShieldCheck, Users } from "lucide-react";

import { getPublicStats, type PublicStats } from "@/api/stats";
import { Skeleton } from "@/components/Skeleton";
import { VisitorFooter } from "@/layouts/VisitorFooter";
import { VisitorHeader } from "@/layouts/VisitorHeader";
import { TYPOGRAPHY } from "@/theme/tokens";

/** The composition's three feature cards, with lucide chips in place of glyphs. */
const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Peer-corroborated timeline",
    body: "Timeline events are reported by candidates in the same batch and region, so the community timeline reflects more than one voice at a time. Nothing is uploaded and nothing is checked against TCS systems.",
    chip: "bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300",
  },
  {
    icon: BarChart3,
    title: "Batch analytics",
    body: "Understand cohort waves and dispatch windows from community-reported data — aggregated across candidates and privacy-suppressed below the reporting threshold.",
    chip: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
  },
  {
    icon: Lock,
    title: "Privacy-first identity",
    body: "A pseudonymous display name is all the community ever sees. Your email is never shown on a post, and anonymous mode hides even the name.",
    chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
] as const;

/**
 * The composition's FAQ, answered with what the platform actually does. The
 * mockup's answers describe hashing nomenclatures and a data-privacy mailbox
 * that do not exist here (09.5.1 D-16 keeps the copy gate open).
 */
const FAQS = [
  {
    question: "Is this officially linked to TCS?",
    answer:
      "No. This is an independent community project built by and for incoming candidates. It is not affiliated with, endorsed by, or operated by Tata Consultancy Services.",
  },
  {
    question: "Does the tracker verify my joining letter?",
    answer:
      "It cannot, and it does not collect one. There is no document upload and no connection to any TCS portal. Everything on the timeline is self-reported by candidates and shown as community-reported data.",
  },
  {
    question: "What can other candidates see about me?",
    answer:
      "Only your display name (or nothing at all in anonymous mode) plus the cohort details you choose to publish. Your email address, notification tokens and device list are never shown to other candidates.",
  },
] as const;

const FALLBACK =
  "Live stats are unavailable right now — they will return as soon as the community numbers do.";

export function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPublicStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statCells: Array<[string, number, string]> | null =
    stats === null
      ? null
      : [
          ["Candidates tracked", stats.registered_candidates, "Community accounts"],
          ["Community posts", stats.community_posts, "Discussions and replies"],
          ["Timeline events", stats.timeline_events, "Self-reported milestones"],
        ];

  return (
    <div className="skin-v1 flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 font-body antialiased" data-testid="landing-page">
      {/* Shared visitor chrome (§5.4, 9.5.1 D-06). */}
      <VisitorHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        {/* Hero (§7.1, marketing composition) */}
        <section className="py-14 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live community tracker
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
            Know where you stand. Without the guesswork.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            A community-built tracker for TCS joining letters: peer-reported timeline events, batch
            analytics, and status updates from candidates like you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="flex min-h-[44px] items-center rounded-lg bg-brand-700 px-6 text-sm font-medium text-white hover:bg-brand-800"
            >
              Track my joining journey
            </Link>
            <Link
              to="/analytics"
              className="flex min-h-[44px] items-center rounded-lg border border-slate-200 px-6 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Explore community stats
            </Link>
          </div>
          {/* The composition's trust chips: the third one ("Over 1,200 candidates
              verified") is replaced by the live count when the API answers. */}
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Free &amp; anonymous</span>
            <span aria-hidden="true">•</span>
            <span>No corporate login required</span>
            <span aria-hidden="true">•</span>
            <span>
              {stats === null
                ? "Pseudonymous by design"
                : `${stats.registered_candidates.toLocaleString("en-US")} candidates tracked`}
            </span>
          </p>
        </section>

        {/* Live stats band (04 §80) in the composition's heading + cells shape. */}
        <section aria-label="Live community stats" className="pb-14">
          <div className="text-center">
            <h2 className={`${TYPOGRAPHY.cardTitle} text-slate-900 dark:text-slate-50`}>
              Community-reported, updated live
            </h2>
            <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Aggregated from anonymous candidate entries across recruitment batches and regions.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3" data-testid="landing-stats">
            {statCells === null && !failed && (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            )}
            {failed && (
              <p
                className="text-sm text-slate-500 sm:col-span-3 dark:text-slate-400"
                role="status"
              >
                {FALLBACK}
              </p>
            )}
            {statCells !== null &&
              statCells.map(([label, value, caption]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-800"
                >
                  <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    {value.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {caption}
                  </p>
                </div>
              ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
            Community-reported data, not official TCS metrics.
          </p>
        </section>

        {/* Feature cards (§7.1) in the composition's icon-chip anatomy. */}
        <section className="pb-14">
          <div className="text-center">
            <p className={`${TYPOGRAPHY.badgePill} uppercase tracking-wide text-brand-700 dark:text-brand-300`}>
              Independent community intelligence
            </p>
            <h2 className={`${TYPOGRAPHY.pageTitle} mt-2 text-slate-900 dark:text-slate-50`}>
              Built by candidates, for candidates
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Fill the silence between your offer letter and your date of joining with what other
              candidates in your batch and region are actually seeing.
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.chip}`}
                >
                  <feature.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {feature.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Community band — the composition's "Active Discussions" slot, over
            the real community routes and the real discussion count. */}
        <section className="pb-14">
          <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-800">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
                <Users aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Community discussions
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {stats === null
                    ? "Read what candidates are reporting, or add your own update."
                    : `${stats.community_posts.toLocaleString("en-US")} discussions started so far — read what candidates are reporting, or add your own update.`}
                </p>
              </div>
            </div>
            <Link
              to="/community"
              className="flex min-h-[44px] shrink-0 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Open the community feed
            </Link>
          </div>
        </section>

        {/* FAQ — the composition's section, with the honest answers. */}
        <section className="pb-16" aria-label="Frequently asked questions">
          <div className="text-center">
            <h2 className={`${TYPOGRAPHY.pageTitle} text-slate-900 dark:text-slate-50`}>
              Frequently asked questions
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Clear facts about how this community project works and what it does with your data.
            </p>
          </div>
          <div className="mx-auto mt-6 max-w-3xl space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.question}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-800"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <VisitorFooter />
    </div>
  );
}

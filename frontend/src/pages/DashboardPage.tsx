/**
 * The §7.4 dashboard, rebuilt to the `candidate_dashboard_1` composition
 * (Phase 12): welcome card with inline status chip and both header CTAs, the
 * progression card with header rule + subheading, the two-column stat cards
 * with uppercase labels and divider-separated value rows, and the discussions
 * card with per-row vote/comment pills.
 *
 * Two honesty rules govern every block (unchanged):
 * - **Suppression** (4.2 D2): a suppressed analytics block renders the API's
 *   message and the COMMUNITY_REPORTED attribution — never zeros, never a
 *   blank card. The `DashboardAnalytics` union forces this at compile time.
 * - **D6's labelling**: the discussions block shows the community's newest
 *   posts and says exactly that. The composition's "LATEST DISCUSSIONS IN
 *   YOUR STREAM (DIGITAL)" heading and its "Filtered peer discussions"
 *   subline are mock fiction (the feed endpoint has no stream filter) — the
 *   heading never implies stream filtering.
 *
 * Other recorded divergences (RECONCILIATION.md): the composition's
 * "Verified Stage 4" chip, "Above Avg" wait badge, "+18 this week" delta,
 * dispatch progress bar, "Live Regional Activity" and "Connect with Peer
 * Groups" rail cards have no API basis and are not copied.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDashboard, type DashboardPayload } from "@/api/dashboard";
import { listCommunityPosts, type PostCard } from "@/api/community";
import {
  listMyTimelineEvents,
  type TimelineEventPrivate,
  type TimelineEventType,
} from "@/api/timeline";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { MilestoneStepper } from "@/components/MilestoneStepper";
import { RailStatusSummary } from "@/components/RailStatusSummary";
import { RailPortal } from "@/layouts/AppShell";
import { STATUS_LABELS } from "@/theme/badges";
import type { CandidateStatus } from "@/types/user";
import { daysSince, formatDateShort, timeAgo } from "@/utils/date";

const CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800";

/** The composition's stat-card section header: icon-ish label + optional chip. */
function StatCardHeader({ label }: { label: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">
      {label}
    </h3>
  );
}

/** A divider-separated label/value row (the composition's stat rows). */
function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs last:border-b-0 dark:border-slate-700">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </li>
  );
}

/**
 * The candidate's own wait (§7.4's "Your wait time"), taken from their record:
 * days since the readiness survey, else since the offer, else since the latest
 * event. Returns null only when the record is empty — never a made-up number.
 */
function ownWaitDays(events: TimelineEventPrivate[]): number | null {
  if (events.length === 0) return null;
  const preference: readonly TimelineEventType[] = [
    "READINESS_SURVEY",
    "OFFER_LETTER",
    "SELECTION",
  ];
  for (const type of preference) {
    const match = events.filter((event) => event.event_type === type);
    if (match.length > 0) {
      const earliest = match.reduce((a, b) => (a.event_date < b.event_date ? a : b));
      return daysSince(earliest.event_date);
    }
  }
  const latest = events.reduce((a, b) => (a.event_date > b.event_date ? a : b));
  return daysSince(latest.event_date);
}

interface DashboardData {
  dashboard: DashboardPayload;
  events: TimelineEventPrivate[];
  posts: PostCard[];
}

/** §7.4's benchmark card, with the suppression discipline enforced by the union. */
function BenchmarkCard({ data }: { data: DashboardData | null }) {
  if (data === null) {
    return (
      <div className={`${CARD} p-5`} aria-busy="true" data-testid="benchmark-card">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-8 w-24" />
      </div>
    );
  }
  const analytics = data.dashboard.analytics;
  if (analytics.suppressed) {
    return (
      <div className={`${CARD} flex flex-col p-5`} data-testid="benchmark-card">
        <StatCardHeader label="How you compare" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{analytics.message}</p>
        <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] italic text-slate-400 dark:border-slate-700">
          Community-reported data.
        </p>
      </div>
    );
  }
  const distribution = analytics.status_distribution;
  const wait = ownWaitDays(data.events);
  return (
    <div className={`${CARD} flex flex-col justify-between p-5`} data-testid="benchmark-card">
      <div>
        <StatCardHeader label="How you compare" />
        {/* The composition's divider-separated stat rows; every value is a
            real payload field (the mock's 1,248/75.3% figures are fiction). */}
        <ul className="mt-3">
          <StatRow
            label="Candidates currently waiting"
            value={analytics.community_waiting_count}
          />
          <StatRow
            label="Reported receiving their joining letter"
            value={distribution.JOINING_LETTER_RECEIVED}
          />
          <StatRow label="Reported joining" value={distribution.JOINED} />
          <StatRow
            label="Salary structure breakdown"
            value={<span data-awaiting="dashboard.salary_breakdown">—</span>}
          />
          <StatRow
            label="Regional track cohort"
            value={<span data-awaiting="dashboard.role_track">—</span>}
          />
        </ul>
        {/* The composition's highlighted wait block, honest number only —
            no "Above Avg" badge (the API ships no cohort average). */}
        {wait !== null && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Wait Time
            </div>
            <div className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-400">
              {wait} {wait === 1 ? "day" : "days"} so far
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] italic text-slate-400 dark:border-slate-700">
        Community-reported data ({analytics.data_source.toLowerCase()}).
      </p>
    </div>
  );
}

/** §7.4's community pulse: derived strictly from real payload fields. */
function PulseCard({ data }: { data: DashboardData | null }) {
  if (data === null) {
    return (
      <div className={`${CARD} p-5`} aria-busy="true">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-3 h-4 w-48" />
      </div>
    );
  }
  const analytics = data.dashboard.analytics;
  if (analytics.suppressed) {
    // Same discipline as the benchmark: the message, never fabricated numbers.
    return (
      <div className={`${CARD} flex flex-col p-5`}>
        <StatCardHeader label="Community pulse" />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{analytics.message}</p>
        <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] italic text-slate-400 dark:border-slate-700">
          Community-reported data.
        </p>
      </div>
    );
  }
  const distribution = analytics.status_distribution;
  const rows = (Object.entries(distribution) as [CandidateStatus, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  return (
    <div className={`${CARD} flex flex-col justify-between p-5`}>
      <div>
        <StatCardHeader label="Community pulse" />
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            No community activity has been reported yet.
          </p>
        ) : (
          /* The composition's fact-list rows over the real distribution. */
          <ul className="mt-3">
            {rows.map(([status, count]) => (
              <StatRow key={status} label={STATUS_LABELS[status] ?? status} value={count} />
            ))}
          </ul>
        )}
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] italic text-slate-400 dark:border-slate-700">
        Community-reported status counts.
      </p>
    </div>
  );
}

export function DashboardPage(): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getDashboard(),
      listMyTimelineEvents().then((page) => page.results),
      listCommunityPosts({ tab: "newest" }).then((page) => page.results.slice(0, 5)),
    ])
      .then(([dashboard, events, posts]) => {
        if (cancelled) return;
        setData({ dashboard: dashboard, events: events, posts: posts });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <main className="mx-auto max-w-5xl p-4 lg:p-8">
        <EmptyState
          headline="Your dashboard could not be loaded"
          support="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </main>
    );
  }

  const latest = data?.dashboard.timeline.latest_event ?? null;
  const since = latest !== null ? formatDateShort(latest.event_date) : null;

  return (
    <>
      <RailPortal>
        <RailStatusSummary
          status={data?.dashboard.profile.current_status ?? null}
          completion={data?.dashboard.profile.completion_percentage ?? null}
          unread={data?.dashboard.community.unread_notifications ?? null}
        />
      </RailPortal>

      <main className="skin-v1 mx-auto max-w-5xl space-y-4 p-4 lg:space-y-6 lg:p-8 font-body antialiased" data-testid="dashboard-page">
        {/* SECTION 1: welcome header card with inline status chip + CTAs */}
        <header
          className={`${CARD} flex flex-col justify-between gap-4 p-4 sm:p-6 md:flex-row md:items-center`}
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-headline">
                Hello, Candidate!
              </h1>
              {data !== null ? (
                <Badge.status value={data.dashboard.profile.current_status} />
              ) : (
                <Skeleton className="h-5 w-36 rounded-full" />
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {data !== null && since !== null ? `Latest milestone since ${since}` : "Your recruitment at a glance"}
            </p>
          </div>
          {/* §7.4's header carries BOTH CTAs (composition order kept). */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/timeline"
              className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm" data-icon="edit_calendar" aria-hidden="true">
                edit_calendar
              </span>
              <span>Update Timeline</span>
            </Link>
            <Link
              to="/community/create"
              className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 transition active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm" data-icon="help_outline" aria-hidden="true">
                help_outline
              </span>
              <span>Ask Question</span>
            </Link>
          </div>
        </header>

        {/* SECTION 2: recruitment progression (§7.4.1) — header rule + subline */}
        <section className={`${CARD} p-4 sm:p-6`} aria-label="Your recruitment progression">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-headline">
                Your recruitment progression
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Real milestones from your own reported timeline — never estimated dates.
              </p>
            </div>
          </div>
          <div className="pt-4">
            {data === null ? <Skeleton className="h-16 w-full" /> : <MilestoneStepper events={data.events} />}
          </div>
        </section>

        {/* SECTION 3: benchmark + pulse (§7.4.2) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
          <BenchmarkCard data={data} />
          <PulseCard data={data} />
        </div>

        {/* SECTION 4: latest discussions (§7.4.3, D6 labelling) */}
        <section className={`${CARD} p-4 sm:p-6`}>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-headline">
                Latest community discussions
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                The community's newest posts — every candidate's discussions, not filtered to your stream.
              </p>
            </div>
            <Link
              to="/community"
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <span>View All Discussions</span>
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                chevron_right
              </span>
            </Link>
          </div>
          {data === null ? (
            <div className="mt-3 space-y-3" aria-busy="true">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : data.posts.length === 0 ? (
            <EmptyState
              headline="No discussions yet"
              support="Be the first to ask a question in the community."
              actionLabel="Ask a question"
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.posts.map((post) => {
                // The composition's row caption: author • when. Cohort detail
                // (hiring_type/region) is real `PostCardSerializer` data
                // (author is redaction-safe).
                const cohort = [post.author.hiring_type, post.author.region]
                  .filter((part) => part !== null && part !== "")
                  .join(" • ");
                return (
                  <li
                    key={post.id}
                    className="flex items-start justify-between gap-4 rounded-lg px-2 py-3.5 transition-colors first:pt-2 last:pb-2 hover:bg-slate-50/70 dark:hover:bg-slate-700/30"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge.category code={post.category} />
                        <Link
                          to={`/community/posts/${post.id}`}
                          className="truncate text-sm font-semibold text-slate-900 hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-400"
                        >
                          {post.title}
                        </Link>
                      </div>
                      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span>{post.author.display_name}</span>
                        <span aria-hidden="true">•</span>
                        <span>{timeAgo(post.created_at)}</span>
                        {cohort !== "" && (
                          <>
                            <span aria-hidden="true">•</span>
                            <span>{cohort}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {/* The composition's vote & comment pills. */}
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        <span className="font-bold">{post.vote_count}</span>
                        <span aria-hidden="true">▲</span>
                      </span>
                      <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{post.comment_count}</span>
                        <span aria-hidden="true">💬</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

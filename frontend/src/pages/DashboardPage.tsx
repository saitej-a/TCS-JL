/**
 * The §7.4 dashboard, built to the `candidate_dashboard_1` composition: the
 * 12-column `max-w-[1600px]` workspace with an 8-column center feed and the
 * composition's 4-column rail, the welcome card with its inline status chip and
 * both header CTAs, the progression card with its header rule and rule-anchored
 * stepper, the two side-by-side comparison cards, and the discussions card with
 * per-row vote/comment pills.
 *
 * Two honesty rules govern every block (unchanged):
 * - **Suppression** (4.2 D2): a suppressed analytics block renders the API's
 *   message and the COMMUNITY_REPORTED attribution — never zeros, never a
 *   blank card. The `DashboardAnalytics` union forces this at compile time.
 * - **D6's labelling**: the discussions block shows the community's newest
 *   posts and says exactly that. The composition's "LATEST DISCUSSIONS IN
 *   YOUR STREAM (DIGITAL)" heading and its "Filtered peer discussions" subline
 *   are mock fiction (the feed endpoint has no stream filter) — the heading
 *   never implies stream filtering.
 *
 * Every figure the composition prints (1,248 candidates, 75.3%, 210 received,
 * Bangalore 42%, 64-day average, 22.3% dispatch, +18 this week, "126 days since
 * survey", "Above Avg", "Verified Stage 4", the regional telemetry and the
 * external-channel cards) has no API basis and is not copied; the real payload
 * fills the composition's own rows instead. Recorded in RECONCILIATION-16.md.
 *
 * Dark parity (Phase 16 follow-up): the card shells, the comparison rows, the
 * callouts and the discussions list carry their `dark:` pairs. The dense
 * repeated blocks (section headings, stat icons, provenance lines) are collected
 * here rather than sprinkled per call site.
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
import { STATUS_LABELS } from "@/theme/badges";
import type { CandidateStatus } from "@/types/user";
import { daysSince, formatDateShort, timeAgo } from "@/utils/date";

/** The composition's card shell. */
const CARD =
  "bg-white rounded-xl border border-slate-200 p-6 shadow-sm dark:bg-slate-800 dark:border-slate-800";

/** The composition's stat-card shell (p-5, not p-6). */
const STAT_CARD =
  "bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between dark:bg-slate-800 dark:border-slate-800";

/** The stat/progression section heading shared by both comparison cards. */
const SECTION_HEADING =
  "text-xs font-bold tracking-tight text-slate-900 uppercase dark:text-slate-100";

/** The composition's stat icon. */
const STAT_ICON = "material-symbols-outlined text-indigo-600 text-lg dark:text-indigo-400";

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

/** One divider-separated comparison row (the composition's `py-1 border-b` row). */
function CompareRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

/** The composition's italic provenance line under each comparison card. */
function ProvenanceNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 italic dark:border-slate-700 dark:text-slate-500">
      {children}
    </div>
  );
}

/** §7.4's benchmark card, with the suppression discipline enforced by the union. */
function BenchmarkCard({ data }: { data: DashboardData | null }) {
  if (data === null) {
    return (
      <div className={STAT_CARD} aria-busy="true" data-testid="benchmark-card">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-8 w-24" />
      </div>
    );
  }
  const analytics = data.dashboard.analytics;
  if (analytics.suppressed) {
    return (
      <div className={STAT_CARD} data-testid="benchmark-card">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={STAT_ICON}
              data-icon="insights"
              aria-hidden="true"
            >
              insights
            </span>
            <h3 className={SECTION_HEADING}>How you compare</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{analytics.message}</p>
        </div>
        <ProvenanceNote>*Community-reported data. Aggregated anonymously.</ProvenanceNote>
      </div>
    );
  }
  const distribution = analytics.status_distribution;
  const wait = ownWaitDays(data.events);
  return (
    <div className={STAT_CARD} data-testid="benchmark-card">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={STAT_ICON}
            data-icon="insights"
            aria-hidden="true"
          >
            insights
          </span>
          <h3 className={SECTION_HEADING}>How you compare</h3>
        </div>
        {/* The composition's rows, each filled from a real payload field. */}
        <div className="space-y-3 mt-4">
          <CompareRow
            label="Candidates currently waiting"
            value={`${analytics.community_waiting_count}`}
          />
          <CompareRow
            label="Reported receiving their JL"
            value={`${distribution.JOINING_LETTER_RECEIVED}`}
          />
          <CompareRow label="Reported joining" value={`${distribution.JOINED}`} />
          <CompareRow
            label="Salary structure breakdown"
            value={<span data-awaiting="dashboard.salary_breakdown">—</span>}
          />
          <CompareRow
            label="Regional track cohort"
            value={<span data-awaiting="dashboard.role_track">—</span>}
          />
        </div>
        {/* The composition's highlighted wait block, honest number only —
            no "Above Avg" badge (the API ships no cohort average). */}
        {wait !== null && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-900/60 dark:border-slate-700">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold dark:text-slate-400">
              Your Wait Time
            </div>
            <div className="text-sm font-bold text-amber-700 mt-1 flex items-center justify-between dark:text-amber-400">
              <span>
                {wait} {wait === 1 ? "day" : "days"} since survey
              </span>
            </div>
          </div>
        )}
      </div>
      <ProvenanceNote>
        *Community-reported data ({analytics.data_source.toLowerCase()}). Aggregated anonymously
        across verification nodes.
      </ProvenanceNote>
    </div>
  );
}

/** §7.4's community pulse: derived strictly from real payload fields. */
function PulseCard({ data }: { data: DashboardData | null }) {
  if (data === null) {
    return (
      <div className={STAT_CARD} aria-busy="true">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-3 h-4 w-48" />
      </div>
    );
  }
  const analytics = data.dashboard.analytics;
  if (analytics.suppressed) {
    // Same discipline as the benchmark: the message, never fabricated numbers.
    return (
      <div className={STAT_CARD}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={STAT_ICON}
              data-icon="query_stats"
              aria-hidden="true"
            >
              query_stats
            </span>
            <h3 className={SECTION_HEADING}>Community pulse</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{analytics.message}</p>
        </div>
        <ProvenanceNote>*Community-reported data. Aggregated anonymously.</ProvenanceNote>
      </div>
    );
  }
  const distribution = analytics.status_distribution;
  const rows = (Object.entries(distribution) as [CandidateStatus, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  return (
    <div className={STAT_CARD}>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={STAT_ICON}
            data-icon="query_stats"
            aria-hidden="true"
          >
            query_stats
          </span>
          <h3 className={SECTION_HEADING}>Community pulse</h3>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No community activity has been reported yet.
          </p>
        ) : (
          /* The composition's rows over the real distribution. */
          <div className="space-y-3 mt-4">
            {rows.map(([status, count]) => (
              <CompareRow
                key={status}
                label={STATUS_LABELS[status] ?? status}
                value={`${count}`}
              />
            ))}
          </div>
        )}
      </div>
      <ProvenanceNote>*Community-reported status counts.</ProvenanceNote>
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

  const status = data?.dashboard.profile.current_status ?? null;
  const latest = data?.dashboard.timeline.latest_event ?? null;
  const since = latest !== null ? formatDateShort(latest.event_date) : null;

  return (
    <main
      className="skin-v1 flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-[1600px] w-full mx-auto font-body antialiased max-sm:p-4"
      data-testid="dashboard-page"
    >
      {/* CENTER COLUMN — the composition's 8 columns */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* SECTION 1: welcome header card with inline status chip + both CTAs */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-slate-800 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-headline text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Hello, Candidate!
              </h1>
              {status !== null ? (
                <Badge.status value={status} />
              ) : (
                <Skeleton className="h-5 w-36 rounded-full" />
              )}
            </div>
            {/* The composition's batch line ("Recruitment batch 2025 • TCS Digital
                Stream") is fiction — the account carries no batch. This states the
                real latest milestone instead. */}
            <p className="text-xs text-slate-500 font-medium dark:text-slate-400">
              {since !== null ? `Latest milestone since ${since}` : "Your recruitment at a glance"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/timeline"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-[0.98] flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm" data-icon="edit_calendar" aria-hidden="true">
                edit_calendar
              </span>
              <span>Update Timeline</span>
            </Link>
            <Link
              to="/community/create"
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition active:scale-[0.98] flex items-center gap-1.5 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-200"
            >
              <span className="material-symbols-outlined text-sm" data-icon="help_outline" aria-hidden="true">
                help_outline
              </span>
              <span>Ask Question</span>
            </Link>
          </div>
        </div>

        {/* SECTION 2: recruitment progression — header rule + stepper diagram */}
        <div className={CARD} aria-label="Your recruitment progression">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                YOUR RECRUITMENT PROGRESSION
              </h2>
              {/* The composition's subline promises "real-time milestone
                  transitions against reported batch batches"; this says what the
                  block actually shows. */}
              <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                Real milestones from your own reported timeline — never estimated dates.
              </p>
            </div>
            {/* The composition's "Verified Stage 4" chip is fiction (nothing
                verifies the stage); the real current status is the chip. */}
            {status !== null && (                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60">
                {STATUS_LABELS[status]}
              </span>
            )}
          </div>
          {data === null ? (
            <div className="py-8">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <MilestoneStepper events={data.events} />
          )}
          {/* The composition's "Next anticipated rollout" callout stated a
              forecast ("Mid-June to early-July") nothing here can support. */}
          <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-2.5 dark:bg-indigo-950/40 dark:border-indigo-900/60">
            <span
              className="material-symbols-outlined text-indigo-600 text-lg flex-shrink-0 mt-0.5 dark:text-indigo-400"
              data-icon="info"
              aria-hidden="true"
            >
              info
            </span>
            <div className="text-xs text-indigo-900 leading-relaxed dark:text-indigo-200">
              <span className="font-semibold">Every date here is yours:</span> nodes fill in from
              the timeline events you report, and nothing is estimated on your behalf.
            </div>
          </div>
        </div>

        {/* SECTION 3: the two comparison cards, side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BenchmarkCard data={data} />
          <PulseCard data={data} />
        </div>

        {/* SECTION 4: latest discussions */}
        <div className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              {/* The composition's "IN YOUR STREAM (DIGITAL)" heading and its
                  "Filtered peer discussions for Digital 2025 track" subline are
                  mock fiction (D6) — this block is the community's newest posts. */}
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                LATEST DISCUSSIONS
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The community's newest posts — every candidate's discussions, not filtered to
                your stream.
              </p>
            </div>
            <Link
              to="/community"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <span>View All Discussions</span>
              <span className="material-symbols-outlined text-sm" data-icon="chevron_right" aria-hidden="true">
                chevron_right
              </span>
            </Link>
          </div>
          {data === null ? (
            <div className="space-y-3" aria-busy="true">
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
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.posts.map((post) => {
                // The composition's row caption: author • when. Cohort detail
                // (hiring_type/region) is real `PostCardSerializer` data
                // (author is redaction-safe).
                const cohort = [post.author.hiring_type, post.author.region]
                  .filter((part) => part !== null && part !== "")
                  .join(" • ");
                return (
                  <div
                    key={post.id}
                    className="py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-lg transition-colors dark:hover:bg-slate-700/40"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge.category code={post.category} />
                        <Link
                          to={`/community/posts/${post.id}`}
                          className="text-xs font-semibold text-slate-900 hover:text-indigo-600 cursor-pointer truncate dark:text-slate-100 dark:hover:text-indigo-400"
                        >
                          {post.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-xs dark:text-slate-500">
                        <span>{post.author.display_name}</span>
                        <span aria-hidden="true">•</span>
                        <span>{timeAgo(post.created_at)}</span>
                        {cohort !== "" && (
                          <>
                            <span aria-hidden="true">•</span>
                            <span>{cohort}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* The composition's vote & comment pills. */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium dark:bg-slate-700 dark:text-slate-200">
                        <span className="font-bold">{post.vote_count}</span>
                        <span aria-hidden="true">▲</span>
                      </span>
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium dark:bg-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{post.comment_count}</span>
                        <span aria-hidden="true">💬</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT RAIL — the composition's 4 columns */}
      <aside className="lg:col-span-4 flex flex-col gap-6">
        <RailStatusSummary
          status={status}
          completion={data?.dashboard.profile.completion_percentage ?? null}
          unread={data?.dashboard.community.unread_notifications ?? null}
        />
      </aside>
    </main>
  );
}

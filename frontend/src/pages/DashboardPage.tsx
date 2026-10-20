/**
 * The §7.4 candidate dashboard (Phase 5 Anti-Slop Overhaul):
 * - Typographic KPIs (`tabular-nums`, zero icon circles);
 * - Precision 6-stage horizontal milestone track with stage-to-stage day-deltas;
 * - Cohort comparison ledger with zero `data-awaiting` mock placeholders;
 * -Suppression & D6 honesty rules preserved.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarPlus,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  Info,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

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

/** Flat architectural card shell (1px border, zero resting shadow). */
const CARD =
  "bg-white rounded-xl border border-slate-200 p-6 dark:bg-slate-800 dark:border-slate-800";

/** Flat stat-card shell (p-5). */
const STAT_CARD =
  "bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between dark:bg-slate-800 dark:border-slate-800";

/** Section heading shared across ledger cards. */
const SECTION_HEADING =
  "text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100";

/** Subtle inline mark for comparison section titles (never inside a tinted square). */
const STAT_ICON = "h-4 w-4 text-brand-700 shrink-0 dark:text-brand-400";

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

/** One divider-separated comparison row (`py-1.5 border-b`). */
function CompareRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-xs dark:border-slate-700">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-mono-code font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

/** Provenance footnote under each comparison card. */
function ProvenanceNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
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
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className={STAT_ICON} aria-hidden="true" />
            <h3 className={SECTION_HEADING}>How you compare</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{analytics.message}</p>
        </div>
        <ProvenanceNote>Community-reported data · Aggregated anonymously (k ≥ 5).</ProvenanceNote>
      </div>
    );
  }
  const distribution = analytics.status_distribution;
  const wait = ownWaitDays(data.events);
  const surveyAndOfferCount =
    (distribution.OFFER_RECEIVED ?? 0) + (distribution.READINESS_SURVEY ?? 0);
  const joiningConfirmedCount = distribution.JOINING_DATE_RECEIVED ?? 0;

  return (
    <div className={STAT_CARD} data-testid="benchmark-card">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className={STAT_ICON} aria-hidden="true" />
          <h3 className={SECTION_HEADING}>How you compare</h3>
        </div>
        {/* Real cohort ledger rows — zero data-awaiting placeholders. */}
        <div className="mt-4 space-y-2.5">
          <CompareRow
            label="Candidates currently waiting"
            value={`${analytics.community_waiting_count}`}
          />
          <CompareRow
            label="Offer & readiness survey stage"
            value={`${surveyAndOfferCount}`}
          />
          <CompareRow
            label="Reported receiving their JL"
            value={`${distribution.JOINING_LETTER_RECEIVED}`}
          />
          <CompareRow
            label="Joining date confirmed"
            value={`${joiningConfirmedCount}`}
          />
          <CompareRow label="Reported joining" value={`${distribution.JOINED}`} />
        </div>
        {wait !== null && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="text-[11px] font-semibold tracking-tight text-slate-500 dark:text-slate-400">
              Your wait time
            </div>
            <div className="mt-1 flex items-center justify-between font-mono-code text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
              <span>
                {wait} {wait === 1 ? "day" : "days"} since survey
              </span>
            </div>
          </div>
        )}
      </div>
      <ProvenanceNote>
        Community-reported data ({analytics.data_source.toLowerCase()}) · Aggregated anonymously.
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
    return (
      <div className={STAT_CARD}>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Activity className={STAT_ICON} aria-hidden="true" />
            <h3 className={SECTION_HEADING}>Community pulse</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{analytics.message}</p>
        </div>
        <ProvenanceNote>Community-reported data · Aggregated anonymously (k ≥ 5).</ProvenanceNote>
      </div>
    );
  }
  const distribution = analytics.status_distribution;
  const rows = (Object.entries(distribution) as [CandidateStatus, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return (
    <div className={STAT_CARD}>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Activity className={STAT_ICON} aria-hidden="true" />
          <h3 className={SECTION_HEADING}>Community pulse</h3>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No community activity has been reported yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2.5">
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
      <ProvenanceNote>Community-reported status counts across active cohorts.</ProvenanceNote>
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
  const waitDays = data !== null ? ownWaitDays(data.events) : null;
  const completionPct = data?.dashboard.profile.completion_percentage ?? null;

  return (
    <main
      className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 items-start gap-8 p-4 font-body antialiased sm:p-6 lg:grid-cols-12 lg:p-8"
      data-testid="dashboard-page"
    >
      {/* CENTER COLUMN — 8 columns */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        {/* SECTION 1: welcome header + typographic KPI ledger strip (zero icon circles) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-800">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Hello, Candidate!
                </h1>
                {status !== null ? (
                  <Badge.status value={status} />
                ) : (
                  <Skeleton className="h-5 w-36 rounded-full" />
                )}
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {since !== null
                  ? `Latest milestone since ${since}`
                  : "Your recruitment at a glance"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/timeline"
                className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98]"
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Update Timeline</span>
              </Link>
              <Link
                to="/community/create"
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-[background-color,border-color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ask Question</span>
              </Link>
            </div>
          </div>

          {/* Typographic KPI strip (tabular-nums, no icon boxes) */}
          {data !== null && (
            <dl
              data-testid="dashboard-kpi-strip"
              className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 dark:border-slate-700/80"
            >
              <div>
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Logged milestones
                </dt>
                <dd className="mt-0.5 font-mono-code text-lg font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {data.events.length}{" "}
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                    / 6
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Elapsed wait
                </dt>
                <dd className="mt-0.5 font-mono-code text-lg font-bold text-slate-900 tabular-nums dark:text-slate-100">
                  {waitDays !== null ? `${waitDays}d` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Profile completion
                </dt>
                <dd className="mt-0.5 font-mono-code text-lg font-bold text-brand-700 tabular-nums dark:text-brand-300">
                  {completionPct !== null ? `${completionPct}%` : "—"}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* SECTION 2: recruitment progression — header rule + stepper diagram */}
        <div className={CARD} aria-label="Your recruitment progression">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6 dark:border-slate-700">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Your recruitment progression
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Real milestones from your own reported timeline — never estimated dates.
              </p>
            </div>
            {status !== null && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
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
          <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-brand-200 bg-brand-50/70 p-3 dark:border-brand-900/60 dark:bg-brand-950/40">
            <Info
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-700 dark:text-brand-400"
              aria-hidden="true"
            />
            <div className="text-xs leading-relaxed text-brand-950 dark:text-brand-200">
              <span className="font-semibold">Every date here is yours:</span> nodes fill in from
              the timeline events you report, and nothing is estimated on your behalf.
            </div>
          </div>
        </div>

        {/* SECTION 3: the two comparison cards, side by side */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <BenchmarkCard data={data} />
          <PulseCard data={data} />
        </div>

        {/* SECTION 4: latest discussions */}
        <div className={CARD}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Latest discussions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The community's newest posts — every candidate's discussions, not filtered to
                your stream.
              </p>
            </div>
            <Link
              to="/community"
              className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <span>View All Discussions</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
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
                const cohort = [post.author.hiring_type, post.author.region]
                  .filter((part) => part !== null && part !== "")
                  .join(" • ");
                return (
                  <div
                    key={post.id}
                    className="flex items-start justify-between gap-4 rounded-lg px-2 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/40"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge.category code={post.category} />
                        <Link
                          to={`/community/posts/${post.id}`}
                          className="cursor-pointer truncate text-xs font-semibold text-slate-900 hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-400"
                        >
                          {post.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
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
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 tabular-nums dark:bg-slate-700 dark:text-slate-200">
                        <span className="font-bold">{post.vote_count}</span>
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 tabular-nums dark:bg-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{post.comment_count}</span>
                        <MessageSquare className="h-3 w-3" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT RAIL — 4 columns */}
      <aside className="flex flex-col gap-6 lg:col-span-4">
        <RailStatusSummary
          status={status}
          events={data?.events ?? null}
        />
      </aside>
    </main>
  );
}

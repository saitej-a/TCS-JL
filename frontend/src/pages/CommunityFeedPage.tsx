/**
 * The §7.6 community feed: header + create CTA, debounced (300ms) search,
 * category pills, sort tabs, pinned announcement, cards with optimistic
 * votes, pagination, and honest empty/error states. Filter state lives in
 * the URL (tab/category/search) so a filtered feed is linkable — the feed is
 * public since D1.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import {
  listCommunityPosts,
  pinCommunityPost,
  unpinCommunityPost,
  unvoteCommunityPost,
  voteCommunityPost,
  type PostCard as PostCardData,
} from "@/api/community";
import { listAnnouncements, type AnnouncementPublic } from "@/api/announcements";
import { getDashboard } from "@/api/dashboard";
import { CategoryTabs, FEED_TABS, type FeedTab } from "@/components/CategoryTabs";
import { CreatePostModal } from "@/components/CreatePostModal";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PostCard } from "@/components/PostCard";
import { RailStatusSummary } from "@/components/RailStatusSummary";
import { SkeletonCard } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { RailPortal } from "@/layouts/AppShell";
import type { CandidateStatus } from "@/types/user";
import { timeAgo } from "@/utils/date";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const VALID_TABS = new Set(FEED_TABS.map((entry) => entry.value));

interface VoteState {
  voted: boolean;
  count: number;
}

/** §7.6's rail fills the shell's slot with §7.4's status summary. */
interface RailState {
  status: CandidateStatus;
  completion: number;
  unread: number;
}

export function CommunityFeedPage(): React.ReactElement {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // D-03 hand-off: /community/create (the former page) redirects here with
  // `createOpen: true` in location state — the modal opens on arrival.
  const [createOpen, setCreateOpen] = useState(
    (location.state as { createOpen?: boolean } | null)?.createOpen === true,
  );
  useEffect(() => {
    if ((location.state as { createOpen?: boolean } | null)?.createOpen === true) {
      setCreateOpen(true);
      // Clear the hand-off state so back/forward does not re-open the dialog.
      navigate("/community", { replace: true, state: null });
    }
  }, [location.state, navigate]);

  const tabParam = searchParams.get("tab") ?? "newest";
  const tab: FeedTab = VALID_TABS.has(tabParam as FeedTab) ? (tabParam as FeedTab) : "newest";
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search") ?? "";

  const [searchDraft, setSearchDraft] = useState(searchParam);
  const [posts, setPosts] = useState<PostCardData[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [votes, setVotes] = useState<Record<string, VoteState>>({});
  const [failed, setFailed] = useState(false);
  const [rail, setRail] = useState<RailState | null>(null);
  const [pinned, setPinned] = useState<AnnouncementPublic | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the visible search draft in sync with back/forward navigation.
  useEffect(() => {
    setSearchDraft(searchParam);
  }, [searchParam]);

  const load = useCallback(
    (targetPage: number) => {
      setFailed(false);
      listCommunityPosts({
        tab: tab === "votes" ? "votes" : tab,
        category: categoryParam ?? undefined,
        search: searchParam === "" ? undefined : searchParam,
        page: targetPage,
      })
        .then((result) => {
          setPosts(result.results);
          setTotal(result.count);
          setVotes((current) => {
            const merged = { ...current };
            for (const post of result.results) {
              if (merged[post.id] === undefined) {
                merged[post.id] = { voted: post.has_voted, count: post.vote_count };
              }
            }
            return merged;
          });
        })
        .catch(() => {
          setFailed(true);
          setPosts(null);
        });
    },
    [tab, categoryParam, searchParam],
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  useEffect(() => {
    let cancelled = false;
    listAnnouncements()
      .then((result) => {
        if (cancelled) return;
        const announcement = result.results.find((item) => item.is_pinned) ?? null;
        setPinned(announcement);
      })
      .catch(() => {
        // The pinned card is a garnish; its failure is silent.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The rail is a signed-in affordance: the design shows it beside the feed,
  // but a visitor has no status to summarise, so the request is not made at all
  // (the feed stays public and unauthenticated reads stay single-request).
  useEffect(() => {
    if (status !== "authenticated") {
      setRail(null);
      return;
    }
    let cancelled = false;
    getDashboard()
      .then((payload) => {
        if (cancelled) return;
        setRail({
          status: payload.profile.current_status,
          completion: payload.profile.completion_percentage,
          unread: payload.community.unread_notifications,
        });
      })
      .catch(() => {
        // A failed rail read leaves the slot empty; the feed itself is unaffected.
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  function updateParams(mutate: (params: URLSearchParams) => void): void {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next);
    setPage(1);
  }

  function handleSearchDraftChange(value: string): void {
    setSearchDraft(value);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams((params) => {
        if (value === "") {
          params.delete("search");
        } else {
          params.set("search", value);
        }
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleVote(postId: string, next: boolean) {
    return next ? voteCommunityPost(postId) : unvoteCommunityPost(postId);
  }

  function handleCommitVote(postId: string, commit: VoteState): void {
    setVotes((current) => ({ ...current, [postId]: commit }));
  }

  async function handleTogglePin(postId: string, nextPinned: boolean): Promise<void> {
    if (nextPinned) {
      await pinCommunityPost(postId);
    } else {
      await unpinCommunityPost(postId);
    }
    setPosts((current) =>
      current
        ? current.map((p) => (p.id === postId ? { ...p, is_pinned: nextPinned } : p))
        : null,
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);
  const loading = posts === null && !failed;
  const createCta = useMemo(
    () => (
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow active:scale-[0.98] transition-all dark:bg-indigo-600 dark:hover:bg-indigo-500"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          add
        </span>
        <span>+ Create New Post</span>
      </button>
    ),
    [],
  );

  return (
    // The shell owns the frame (padding, sidebar, rail) — the page only owns
    // its own vertical rhythm, so it must not add a second max-width/padding.
    // The composition's column is `lg:col-span-8 flex flex-col gap-5`; the shell
    // owns the 12-column split here (its sidebar and rail are separate DOM
    // columns), so the page carries the column's own rhythm and declares the
    // grid-track class dropped in RECONCILIATION-16.md.
    <main
      className="skin-v1 flex flex-col gap-5 font-body antialiased"
      data-testid="community-feed"
    >
      {status === "authenticated" && (
        <RailPortal>
          <RailStatusSummary
            status={rail?.status ?? null}
            completion={rail?.completion ?? null}
            unread={rail?.unread ?? null}
          />
        </RailPortal>
      )}

      <PageHeader
        eyebrow={
          <>
            <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/60 dark:text-indigo-300">
              Live Peer Feed
            </span>
            {posts !== null && (
              <span className="text-xs text-slate-400 dark:text-slate-400">• {total} posts</span>
            )}
          </>
        }
        title="COMMUNITY DISCUSSIONS"
        description="Connect, share updates, and verify regional batch timelines with peers."
        action={
          status === "authenticated" ? (
            createCta
          ) : (
            <Link
              to="/login?next=%2Fcommunity"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow active:scale-[0.98] dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              Sign in to post
            </Link>
          )
        }
      />

      {pinned !== null && (
        /* §7.6's pinned announcement card, in the composition's amber gradient
           shell with its corner flourish. An announcement is not a post — it
           carries no votes, comments, or author — so none of those are rendered
           (D9); the composition's vote/comment pills are therefore absent. */
        <article className="bg-gradient-to-r from-amber-50/70 via-white to-indigo-50/50 rounded-xl p-5 border border-amber-200/90 shadow-sm relative overflow-hidden dark:from-amber-950/40 dark:via-slate-800 dark:to-indigo-950/40 dark:border-amber-800/80">
          <div
            className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none dark:bg-indigo-400/5"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/70">
                <span
                  className="material-symbols-outlined text-xs fill-current text-amber-700 dark:text-amber-400"
                  data-icon="push_pin"
                  aria-hidden="true"
                >
                  push_pin
                </span>
                📌 Pinned announcement
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/70">
                Official Advisory
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-400 shrink-0">Sticky</span>
          </div>
          <h2 className="font-headline text-base font-bold text-slate-900 tracking-tight mt-1 hover:text-indigo-600 transition-colors cursor-pointer dark:text-slate-100 dark:hover:text-indigo-400">
            {pinned.title}
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed dark:text-slate-300">{pinned.body}</p>
          <div className="mt-4 pt-3 border-t border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-800 font-bold text-[10px] dark:bg-amber-900/80 dark:text-amber-200">
                M
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">Platform Moderator</span>
              <span aria-hidden="true">•</span>
              <span>Pinned</span>
              {pinned.published_at !== null && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{timeAgo(pinned.published_at)}</span>
                </>
              )}
            </div>
          </div>
        </article>
      )}

      {/* §7.6 groups the search field, the pills and the tabs in one bordered
          filter block above the list. */}
      {/* 2. Search bar, in the composition's own card. */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700/80">
        <div className="relative w-full">
          <div
            className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-xl">search</span>
          </div>
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => handleSearchDraftChange(event.target.value)}
            placeholder="Search posts by keyword, location, or batch..."
            aria-label="Search posts"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition dark:bg-slate-900/70 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* 3+4. The composition's category pills and sort tabs. */}
      <section aria-label="Feed filters" className="contents">
        <CategoryTabs
          category={categoryParam}
          tab={tab}
          onCategoryChange={(next) =>
            updateParams((params) => {
              if (next === null) {
                params.delete("category");
              } else {
                params.set("category", next);
              }
            })
          }
          onTabChange={(next) =>
            updateParams((params) => {
              params.set("tab", next);
            })
          }
        />
      </section>

      {failed ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <p>The feed could not be loaded.</p>
          <button
            type="button"
            onClick={() => load(page)}
            className="mt-2 min-h-[36px] rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:text-rose-200"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (posts ?? []).length === 0 ? (
        <EmptyState
          headline={
            searchParam === ""
              ? "No discussions found in this category."
              : "No discussions match your search."
          }
          support="Be the first candidate to share an update or question."
          actionLabel="Create Post"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <div className="space-y-4">
            {(posts ?? []).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                voted={votes[post.id]?.voted ?? post.has_voted}
                count={votes[post.id]?.count ?? post.vote_count}
                onRequestVote={handleVote}
                onCommitVote={handleCommitVote}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
          {total > 0 && (
            <nav
              className="flex flex-wrap items-center justify-between gap-3"
              aria-label="Feed pagination"
            >
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {firstShown}-{lastShown} of {total} posts
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  Next →
                </button>
              </span>
            </nav>
          )}
        </>
      )}

      {/* D-03: posting is a dialog on the feed, per the create-post modal
          composition. A 201 closes the dialog and refreshes the feed. */}
      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onPublished={() => {
          setCreateOpen(false);
          setPage(1);
          load(1);
        }}
      />
    </main>
  );
}

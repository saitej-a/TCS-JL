/**
 * The §7.6 post card, built to the `community_discussions_feed` composition and
 * in its order: the category pill opposite "Posted 2 hours ago", the headline,
 * the body preview, the §6.5 identity row (compact — 24px disc, cohort caption
 * with the region accented), and the composition's action footer:
 * `[▲ Upvote | 42]  💬 18 Comments` on the left, `Share` and `Report` on the
 * right.
 *
 * Per plan Task 8.2 the report/share affordances must never be silently dead:
 * - **Share** is implemented (copy the post's link), because the feed is public
 *   and URL-stateful — this is the honest reading of the spec's Share action.
 * - **Report** stays visible and disabled *with its reason* in the title;
 *   reporting belongs to the moderation surface (9.4/8.1).
 *
 * Tombstoned cards render the API's masked copy with voting and sharing closed.
 *
 * Dark parity (Phase 16 follow-up): the card shell, both pills, the upvote
 * controls and the action footer each carry a `dark:` pair, so the feed reads on
 * the app's default dark surface while the composition's light classes stay
 * byte-identical.
 */
import { useEffect, useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { Link } from "react-router-dom";

import {
  pinCommunityPost,
  unpinCommunityPost,
  type PostCard as PostCardData,
} from "@/api/community";
import { CATEGORY_LABELS } from "@/theme/badges";
import { IdentityPill } from "@/components/IdentityPill";
import { useToast } from "@/components/Toast";
import { UpvotePill, type CommitVote } from "@/components/UpvotePill";
import { useAuth } from "@/context/AuthContext";
import { timeAgo } from "@/utils/date";

export interface PostCardProps {
  post: PostCardData;
  /** Committed vote state for this card (owned by the feed). */
  voted: boolean;
  /**
   * Committed vote COUNT for this card, also owned by the feed. It must be the
   * store's value, not `post.vote_count` (which is the list fetch's stale
   * snapshot): dropping it made a *successful* vote visibly revert to the
   * pre-vote number the moment the optimistic overlay cleared.
   */
  count: number;
  onRequestVote: (postId: string, next: boolean) => Promise<{ has_voted?: boolean; vote_count?: number } | void>;
  onCommitVote: (postId: string, commit: CommitVote) => void;
  onTogglePin?: (postId: string, nextPinned: boolean) => Promise<void>;
}

/** The composition's card shell. */
const CARD =
  "bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow transition-all flex flex-col gap-3 dark:bg-slate-800 dark:border-slate-800 dark:hover:border-slate-700";
/** The composition's category pill. */
const CATEGORY_PILL =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 tracking-wide dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900/60";
/** The composition's "pinned" pill (the announcement card's amber pill). */
const PINNED_PILL =
  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60";
/** The composition's upvote pill, idle and voted. */
const UPVOTE_IDLE =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-600";
const UPVOTE_ACTIVE =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-500 text-brand-700 font-semibold shadow-xs dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-700";
const FOOTER_ACTION =
  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100";

export function PostCard({
  post,
  voted,
  count,
  onRequestVote,
  onCommitVote,
  onTogglePin,
}: PostCardProps): React.ReactElement {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user !== null && user.is_staff;
  const tombstone = post.is_deleted;
  const [isPinned, setIsPinned] = useState(post.is_pinned);
  const [pinning, setPinning] = useState(false);

  useEffect(() => {
    setIsPinned(post.is_pinned);
  }, [post.is_pinned]);

  async function handlePinToggle(): Promise<void> {
    if (pinning || tombstone) return;
    setPinning(true);
    const next = !isPinned;
    try {
      if (onTogglePin) {
        await onTogglePin(post.id, next);
      } else {
        if (next) {
          await pinCommunityPost(post.id);
        } else {
          await unpinCommunityPost(post.id);
        }
      }
      setIsPinned(next);
      toast({
        message: next ? "Post pinned to top." : "Post unpinned.",
        variant: "success",
      });
    } catch {
      toast({
        message: "Failed to update pinned status.",
        variant: "error",
      });
    } finally {
      setPinning(false);
    }
  }

  async function handleShare(): Promise<void> {
    const url = `${window.location.origin}/community/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: "Post link copied to your clipboard.", variant: "success" });
    } catch {
      toast({
        message: "Could not copy the link. Copy it from the address bar instead.",
        variant: "error",
      });
    }
  }

  return (
    <article className={CARD}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className={CATEGORY_PILL}>
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          {isPinned && (
            <span className={PINNED_PILL}>
              <span
                className="material-symbols-outlined text-xs fill-current text-amber-700 dark:text-amber-400"
                data-icon="push_pin"
                aria-hidden="true"
              >
                push_pin
              </span>
              Pinned
            </span>
          )}
          {tombstone && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              [removed]
            </span>
          )}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Posted {timeAgo(post.created_at)}
        </span>
      </div>

      <h2 className="font-headline text-base font-semibold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors leading-snug dark:text-slate-100 dark:hover:text-indigo-400">
        {tombstone ? (
          post.title
        ) : (
          <Link to={`/community/posts/${post.id}`}>{post.title}</Link>
        )}
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 dark:text-slate-300">
        {post.body}
      </p>

      <IdentityPill author={post.author} className="pt-1" compact />

      <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs dark:border-slate-700">
        <div className="flex items-center gap-2">
          <UpvotePill
            voted={voted}
            count={count}
            disabled={tombstone || post.is_locked}
            disabledReason={
              tombstone
                ? "This post has been removed; voting is closed."
                : post.is_locked
                  ? "This thread is locked; voting is closed."
                  : undefined
            }
            request={(next) => onRequestVote(post.id, next)}
            onCommit={(commit) => onCommitVote(post.id, commit)}
            controlClassName={UPVOTE_IDLE}
            activeControlClassName={UPVOTE_ACTIVE}
          />
          <span
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            title={tombstone ? "Comments are closed on removed posts." : undefined}
          >
            <span
              className="material-symbols-outlined text-[17px] text-slate-400 dark:text-slate-500"
              data-icon="chat_bubble_outline"
              aria-hidden="true"
            >
              chat_bubble_outline
            </span>
            <span>
              {post.comment_count} Comment{post.comment_count === 1 ? "" : "s"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              type="button"
              onClick={() => void handlePinToggle()}
              disabled={tombstone || pinning}
              title={isPinned ? "Unpin post" : "Pin post"}
              aria-label={isPinned ? "Unpin post" : "Pin post"}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 disabled:opacity-50 ${
                isPinned
                  ? "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 dark:hover:bg-amber-900/60"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              }`}
            >
              {isPinned ? (
                <PinOff className="h-[17px] w-[17px]" aria-hidden="true" />
              ) : (
                <Pin className="h-[17px] w-[17px]" aria-hidden="true" />
              )}
              <span>{isPinned ? "Unpin" : "Pin"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={tombstone}
            title={tombstone ? "Removed posts cannot be shared." : "Share discussion link"}
            className={`${FOOTER_ACTION}${tombstone ? " cursor-not-allowed opacity-50" : ""}`}
          >
            <span className="material-symbols-outlined text-[17px]" data-icon="share" aria-hidden="true">
              share
            </span>
            <span>Share</span>
          </button>
          <button
            type="button"
            disabled
            title="Reporting arrives with the moderation surface (Phase 9.4)."
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-not-allowed opacity-60 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            <span className="material-symbols-outlined text-[17px]" data-icon="flag" aria-hidden="true">
              flag
            </span>
            <span>Report</span>
          </button>
        </div>
      </div>
    </article>
  );
}

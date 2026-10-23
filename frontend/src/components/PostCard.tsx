/**
 * The §7.6 post card (upgraded in Phase 1 Anti-Slop Overhaul):
 * category pill opposite "Posted 2 hours ago", headline, body preview,
 * §6.5 identity row (compact — 24px disc, cohort caption), and action footer:
 * `[▲ Upvote | 42]  18 Comments` on the left, `Share` and `Report` on the
 * right.
 *
 * Uses flat 1px architectural borders (no resting drop-shadows), Deep Cerulean
 * (`brand-*`) accents, Lucide SVG icons, and explicit property transitions.
 */
import { useEffect, useState } from "react";
import { Flag, MessageSquare, Pin, PinOff, Share2 } from "lucide-react";
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

/** Flat 1px architectural card shell (no resting drop-shadow, no transition-all). */
const CARD =
  "bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 transition-[border-color,background-color] duration-150 flex flex-col gap-3 dark:bg-slate-800 dark:border-slate-800 dark:hover:border-slate-700";
/** Category pill on the Accent Ladder (`brand-*`). */
const CATEGORY_PILL =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800/60";
/** Amber pinned pill. */
const PINNED_PILL =
  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60";
/** Upvote pill states. */
const UPVOTE_IDLE =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-600";
const UPVOTE_ACTIVE =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-500 text-brand-700 font-semibold active:scale-[0.97] transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-700";
const FOOTER_ACTION =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-[0.97] transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100";

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
              <Pin
                className="h-3 w-3 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
              Pinned
            </span>
          )}
          {tombstone && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              [removed]
            </span>
          )}
        </span>
        <span className="text-xs text-slate-400 tabular-nums dark:text-slate-500">
          Posted {timeAgo(post.created_at)}
        </span>
      </div>

      <h2 className="font-headline text-base font-semibold text-slate-900 hover:text-brand-700 cursor-pointer transition-colors duration-150 leading-snug dark:text-slate-100 dark:hover:text-brand-400">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150 tabular-nums dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            title={tombstone ? "Comments are closed on removed posts." : undefined}
          >
            <MessageSquare
              className="h-4 w-4 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
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
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:opacity-50 ${
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
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>Share</span>
          </button>
          <button
            type="button"
            disabled
            title="Reporting arrives with the moderation surface (Phase 9.4)."
            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-not-allowed opacity-60 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            <span>Report</span>
          </button>
        </div>
      </div>
    </article>
  );
}

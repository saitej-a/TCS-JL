/**
 * §7.8 post detail (9.4 Task 5): back link → post card → action row →
 * composer → one-level thread, over the live API.
 *
 * - The §6.8 action row reuses `UpvotePill` untouched (the plan's fail-when)
 *   with the same reconcile contract the feed uses.
 * - Share copies the canonical URL (§6.7.1 toast); Report calls the real 8.1
 *   `POST /reports/` endpoint — no disabled-with-fake-reason affordances.
 * - Composer rules: anonymous visitors get the sign-in prompt; a locked post
 *   replaces the composer with the amber banner (rule 4); submit errors
 *   preserve the draft and show the §6.7 error strip.
 * - Reply flow: inline autofocus form beneath the parent (rule 2); the created
 *   node is inserted optimistically into the thread state.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  copyPostLink,
  createPostComment,
  createReport,
  getCommunityPost,
  listPostComments,
  unvoteCommunityPost,
  voteCommunityPost,
  type PostCard as PostCardData,
} from "@/api/community";
import { CommentThread } from "@/components/CommentThread";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { IdentityPill } from "@/components/IdentityPill";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Textarea } from "@/components/Textarea";
import { useToast } from "@/components/Toast";
import { UpvotePill, type CommitVote } from "@/components/UpvotePill";
import { useAuth } from "@/context/AuthContext";
import { TYPOGRAPHY } from "@/theme/tokens";
import { timeAgo } from "@/utils/date";

const BACK_LINK_COPY = "← Back to Community Feed";
const COMPOSER_LABEL = "WRITE A COMMENT:";
const COMPOSER_PLACEHOLDER = "Share your timeline update or reply to this candidate...";
const COMPOSER_SUBMIT = "Post Comment";
const LOCKED_BANNER_COPY =
  "🔒 This discussion is locked. New comments and replies are disabled.";
const ANON_PROMPT_COPY = "Sign in to join the discussion.";


export function PostDetailPage(): React.ReactElement {
  const { id = "" } = useParams<{ id: string }>();
  const { status } = useAuth();
  const { toast } = useToast();
  const authenticated = status === "authenticated";

  const [post, setPost] = useState<PostCardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [missing, setMissing] = useState(false);
  const [vote, setVote] = useState<CommitVote | null>(null);

  const [comments, setComments] = useState<import("@/types/community").CommentNode[] | null>(null);
  const [totalComments, setTotalComments] = useState(0);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const loadComments = useCallback(() => {
    listPostComments(id)
      .then((page) => {
        setComments(page.results);
        setTotalComments(page.total_comments);
      })
      .catch(() => {
        setComments(null);
      });
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setMissing(false);
    getCommunityPost(id)
      .then((payload) => {
        if (cancelled) return;
        setPost(payload);
        setVote({ voted: payload.has_voted, count: payload.vote_count });
      })
      .catch(() => {
        if (cancelled) setFailed(true);
      });
    loadComments();
    return () => {
      cancelled = true;
    };
  }, [id, loadComments]);

  function handleVote(next: boolean) {
    return next ? voteCommunityPost(id) : unvoteCommunityPost(id);
  }

  async function handleShare(): Promise<void> {
    const copied = await copyPostLink(id);
    toast({
      message: copied
        ? "Post link copied to your clipboard."
        : "Could not copy the link. Copy it from the address bar instead.",
      variant: copied ? "success" : "error",
    });
  }

  function handleReport(): void {
    createReport({ post_id: id, reason: "OTHER" })
      .then(() => toast({ message: "Post reported to the moderators.", variant: "success" }))
      .catch(() =>
        toast({ message: "Could not send the report. Please try again.", variant: "error" }),
      );
  }

  async function submitComment(): Promise<void> {
    const trimmed = draft.trim();
    if (trimmed === "" || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      await createPostComment(id, { body: trimmed });
      setDraft("");
      loadComments();
    } catch {
      // §6.7 error strip above the composer; the draft survives for retry.
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply(parentId: string, body: string): Promise<void> {
    await createPostComment(id, { body, parent_id: parentId });
    loadComments();
  }

  if (failed || missing) {
    return (
      <main className="mx-auto max-w-3xl space-y-4">
        <Link to="/community" className="text-sm font-medium text-brand-700 hover:text-brand-700 dark:text-brand-300">
          {BACK_LINK_COPY}
        </Link>
        <EmptyState
          headline="This post could not be loaded"
          support="It may have been removed, or the link is wrong."
          actionLabel="Back to the community feed"
          onAction={() => window.location.assign("/community")}
        />
      </main>
    );
  }

  if (post === null) {
    return (
      <main className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <SkeletonCard />
        <SkeletonCard />
      </main>
    );
  }

  const locked = post.is_locked;

  return (
    <main className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/community"
        className="inline-flex min-h-[36px] items-center text-sm font-medium text-brand-700 hover:text-brand-700 dark:text-brand-300"
      >
        {BACK_LINK_COPY}
      </Link>

      {/* §7.8's post card: badge + relative time, title, body, author line. */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge.category code={post.category} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Posted {timeAgo(post.created_at)}
          </span>
        </div>
        <h1 className={`${TYPOGRAPHY.cardTitle} mt-2 text-xl`}>{post.title}</h1>
        <div className="mt-2 space-y-2">
          {post.body.split("\n").filter((paragraph) => paragraph.trim() !== "").map((paragraph, index) => (
            <p key={index} className={TYPOGRAPHY.bodyPrimary + " text-slate-700 dark:text-slate-300"}>
              {paragraph}
            </p>
          ))}
        </div>
        <div className="mt-3">
          <IdentityPill author={post.author} />
        </div>

        {/* §6.8 action row: UpvotePill reused untouched, then 💬/Share/Report. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          <UpvotePill
            voted={vote?.voted ?? post.has_voted}
            count={vote?.count ?? post.vote_count}
            disabled={post.is_deleted}
            disabledReason={post.is_deleted ? "This post has been removed; voting is closed." : undefined}
            request={handleVote}
            onCommit={setVote}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            💬 {totalComments} Comment{totalComments === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={post.is_deleted}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <span aria-hidden="true">🔗</span> Share
          </button>
          {!post.is_deleted && authenticated && (
            <button
              type="button"
              onClick={handleReport}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <span aria-hidden="true">⚑</span> Report
            </button>
          )}
        </div>
      </article>

      {/* Composer rules: locked banner (rule 4) → anonymous prompt → form. */}
      {locked ? (
        <div
          data-testid="locked-banner"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {LOCKED_BANNER_COPY}
        </div>
      ) : authenticated ? (
        <form
          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800"
          onSubmit={(event) => {
            event.preventDefault();
            void submitComment();
          }}
        >
          <Textarea
            label={COMPOSER_LABEL}
            placeholder={COMPOSER_PLACEHOLDER}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            aria-label="Write a comment"
          />
          {submitError && (
            <div
              data-testid="comment-error"
              className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
            >
              Your comment could not be posted. Please try again — your draft is preserved.
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || draft.trim() === ""}
            className="mt-3 flex min-h-[40px] items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
          >
            {COMPOSER_SUBMIT}
          </button>
        </form>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-800" data-testid="anon-composer">
          <span className="text-slate-600 dark:text-slate-300">{ANON_PROMPT_COPY}</span>
          <Link
            to={`/login?next=${encodeURIComponent(`/community/posts/${id}`)}`}
            className="ml-2 font-medium text-brand-700 hover:text-brand-700 dark:text-brand-300"
          >
            Sign in
          </Link>
        </div>
      )}

      <CommentThread
        comments={comments}
        totalComments={totalComments}
        isLocked={locked}
        canComment={authenticated}
        onSubmitReply={submitReply}
      />
    </main>
  );
}

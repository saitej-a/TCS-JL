/**
 * §7.8's comment thread (9.4 Task 5; reshaped by Phase 11 per 11-UI-SPEC.md).
 *
 * The rules that replaced the one-level design:
 * - **Recursive rendering** (D-01/D-02): a `CommentRow` renders its own
 *   children; depth is whatever the bounded API assembled.
 * - **Capped-indent rails** (D-07): each of the first INDENT_LEVELS levels adds
 *   one 16px unit (2px rail + 14px content gap); deeper rows share the
 *   level-3 indent while that rail continues alongside them — a depth-50 chain
 *   costs the same width as depth 3 (05 §2.5's mobile rationale, answered).
 *   The unit is one constant in one module; never per-row ml- arithmetic.
 * - **Reply context** (D-07): depth ≥ 2 rows carry `replying to @author`
 *   between the IdentityPill and the body; the name resolves through the same
 *   author payload IdentityPill already consumes — never a second renderer.
 * - **Reply + Report on every node** (D-09), unlocked + authenticated; the
 *   inline autofocused form works from any node (9.4's rule 2, generalised).
 * - **Breadth collapse** (D-10): more than BREADTH_VISIBLE direct replies
 *   renders the first BREADTH_VISIBLE + `Show N more replies`; the count is
 *   always visible; a newly inserted reply auto-expands its own row.
 * - **Continue this thread** (D-08): a node truncated by the server's depth
 *   bound renders `N more replies — continue this thread` (N = the API's true
 *   descendant_count, never a guess); clicking fetches the subtree and expands
 *   it in place; the same control becomes `Collapse thread`.
 * - **Closed branch** (D-06): `is_branch_closed` from the API (never derived
 *   from is_deleted ancestry client-side) disables the composer with the
 *   reason inline. A locked thread still wins thread-wide.
 */
import { useState } from "react";

import { createReport, fetchCommentSubtree } from "@/api/community";
import type { CommentNode } from "@/types/community";
import { IdentityPill } from "@/components/IdentityPill";
import { Textarea } from "@/components/Textarea";
import { useToast } from "@/components/Toast";
import { TYPOGRAPHY } from "@/theme/tokens";
import { timeAgo } from "@/utils/date";

/** The spec's literal placeholder — the copy table is the single source. */
export const DELETED_COMMENT_COPY = "[This comment was removed]";
export const REPLY_LABEL = "Reply";
export const REPORT_LABEL = "Report";
export const COMMENTS_HEADER_PREFIX = "COMMENTS & REPLIES (";
export const REPLY_SUBMIT_LABEL = "Post Reply";
/** Phase 11 copy contract (11-UI-SPEC.md) — all strings in one exported block. */
export const REPLY_CONTEXT_PREFIX = "replying to @";
export const CONTINUE_THREAD_PREFIX = " more replies — continue this thread";
export const COLLAPSE_THREAD_LABEL = "Collapse thread";
export const SHOW_MORE_PREFIX = "Show ";
export const SHOW_MORE_SUFFIX = " more replies";
export const BRANCH_CLOSED_COPY = "Replies are closed above a removed comment.";
export const SUBTREE_RETRY_COPY = "Could not load replies. Retry.";

/** D-07: indent units before deeper rows share the last step. */
export const INDENT_LEVELS = 3;
/** D-10: direct replies shown before "Show N more replies" (working value 3). */
export const BREADTH_VISIBLE = 3;

export interface CommentThreadProps {
  comments: CommentNode[] | null;
  totalComments: number;
  /** The post these comments belong to (the subtree fetch needs it). */
  postId: string;
  /** Locked thread: no reply forms, no report buttons (rule 4). */
  isLocked: boolean;
  /** Verified-only writes; anonymous visitors see no write affordances. */
  canComment: boolean;
  onSubmitReply: (parentId: string, body: string) => Promise<void>;
  /** The id of the most recently inserted reply (D-10's auto-expand input). */
  newlyInsertedId?: string | null;
  /**
   * The continue-this-thread fetch (D-08). One owner — the api module's
   * `fetchCommentSubtree`; the default wiring calls it directly. Injectable
   * for tests and for a page that wants to reconcile the result itself.
   */
  onFetchSubtree?: (postId: string, parentId: string) => Promise<CommentNode[]>;
}

function DeletedRow(): React.ReactElement {
  return (
    <div
      data-testid="deleted-comment"
      className="rounded-lg border border-dashed border-slate-300 p-3 text-sm italic text-slate-400 dark:border-slate-600 dark:text-slate-500"
    >
      {DELETED_COMMENT_COPY}
    </div>
  );
}

function ReportButton({
  commentId,
  onDone,
}: {
  commentId: string;
  onDone: () => void;
}): React.ReactElement {
  const { toast } = useToast();
  return (
    <button
      type="button"
      className="min-h-[32px] rounded-lg px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
      onClick={() => {
        createReport({ comment_id: commentId, reason: "OTHER" })
          .then(() => {
            toast({ message: "Comment reported to the moderators.", variant: "success" });
            onDone();
          })
          .catch(() => {
            toast({ message: "Could not send the report. Please try again.", variant: "error" });
          });
      }}
    >
      {REPORT_LABEL}
    </button>
  );
}

/** One comment at any depth. Depth 0 renders as a card; deeper rows as rows. */
function CommentRow({
  node,
  depth,
  postId,
  isLocked,
  canComment,
  onSubmitReply,
  onFetchSubtree,
  reportedIds,
  markReported,
  newlyInsertedId,
}: {
  node: CommentNode;
  /** 0 for top-level rows; each nesting level adds one. */
  depth: number;
  postId: string;
  isLocked: boolean;
  canComment: boolean;
  onSubmitReply: (parentId: string, body: string) => Promise<void>;
  onFetchSubtree: (postId: string, parentId: string) => Promise<CommentNode[]>;
  reportedIds: Set<string>;
  markReported: (id: string) => void;
  newlyInsertedId: string | null;
}): React.ReactElement {
  const [replyingTo, setReplyingTo] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [breadthCollapsed, setBreadthCollapsed] = useState(true);
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [fetchedChildren, setFetchedChildren] = useState<CommentNode[] | null>(null);
  const [loadingSubtree, setLoadingSubtree] = useState(false);
  const [subtreeFailed, setSubtreeFailed] = useState(false);

  const writable = !isLocked && canComment && !node.is_branch_closed;
  const hasReplies = node.replies.length > 0;
  /** D-02: the server assembled zero children but reports true descendants. */
  const truncated = !hasReplies && node.descendant_count > 0;
  const hiddenDirect = Math.max(node.replies.length - BREADTH_VISIBLE, 0);

  // D-10: a newly inserted reply is never hidden by its own row's collapse —
  // the row reveals up to and including it (its "path"), nothing further.
  const insertedIndex =
    newlyInsertedId !== null ? node.replies.findIndex((r) => r.id === newlyInsertedId) : -1;
  const insertedHere = insertedIndex >= 0;
  const renderLimit = breadthCollapsed
    ? Math.max(BREADTH_VISIBLE, insertedIndex + 1)
    : node.replies.length;
  const renderedReplies = node.replies.slice(0, renderLimit);

  function continueThread(): void {
    if (loadingSubtree) return;
    setLoadingSubtree(true);
    setSubtreeFailed(false);
    onFetchSubtree(postId, node.id)
      .then((children) => {
        setFetchedChildren(children);
        setThreadExpanded(true);
      })
      .catch(() => {
        setSubtreeFailed(true);
      })
      .finally(() => setLoadingSubtree(false));
  }

  async function submitReply(): Promise<void> {
    const trimmed = replyDraft.trim();
    if (trimmed === "" || submitting) return;
    setSubmitting(true);
    try {
      await onSubmitReply(node.id, trimmed);
      setReplyingTo(false);
      setReplyDraft("");
    } finally {
      setSubmitting(false);
    }
  }

  const body = node.is_deleted ? (
    <DeletedRow />
  ) : (
    <div className="space-y-1.5">
      <IdentityPill author={node.author} />
      {depth >= 2 && (
        <p data-testid="reply-context" className="text-xs text-slate-500 dark:text-slate-400">
          {REPLY_CONTEXT_PREFIX}
          {node.author.display_name}
        </p>
      )}
      <p
        className={
          depth === 0
            ? "text-[15px] leading-relaxed text-slate-800 dark:text-slate-200"
            : "text-sm text-slate-700 dark:text-slate-300"
        }
      >
        {node.body}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(node.created_at)}</span>
        {writable && (
          <button
            type="button"
            className="min-h-[32px] rounded-lg px-2 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
            aria-expanded={replyingTo}
            onClick={() => {
              setReplyingTo((current) => !current);
              setReplyDraft("");
            }}
          >
            {REPLY_LABEL}
          </button>
        )}
        {!isLocked && canComment && !reportedIds.has(node.id) && (
          <ReportButton commentId={node.id} onDone={() => markReported(node.id)} />
        )}
      </div>
      {node.is_branch_closed && (
        <p
          data-testid="branch-closed-reason"
          className="text-xs font-medium text-rose-600 dark:text-rose-400"
        >
          {BRANCH_CLOSED_COPY}
        </p>
      )}
    </div>
  );

  // D-07: the children wrapper is the per-level rail — but only for the first
  // INDENT_LEVELS child levels; deeper rows share the last indent while that
  // rail continues alongside them (same width as depth 3).
  const childDepth = depth + 1;
  const childRail =
    childDepth <= INDENT_LEVELS
      ? "mt-3 space-y-3 border-l-2 border-slate-200 pl-4 dark:border-slate-700"
      : "mt-3 space-y-3";

  const showChildren = hasReplies || truncated || (threadExpanded && fetchedChildren !== null);

  return (
    <li
      className={
        depth === 0
          ? "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800"
          : ""
      }
    >
      {body}

      {/* Rule 2 generalised: the reply form lives INLINE beneath its parent, focused. */}
      {replyingTo && writable && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submitReply();
          }}
        >
          <Textarea
            label="WRITE A REPLY:"
            value={replyDraft}
            onChange={(event) => setReplyDraft(event.target.value)}
            maxLength={2000}
            autoFocus
            aria-label="Write a reply"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || replyDraft.trim() === ""}
              className="flex min-h-[40px] items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
            >
              {REPLY_SUBMIT_LABEL}
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyingTo(false);
                setReplyDraft("");
              }}
              className="min-h-[40px] rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showChildren && (
        <ul className={childRail}>
          {renderedReplies.map((reply) => (
            <CommentRow
              key={reply.id}
              node={reply}
              depth={childDepth}
              postId={postId}
              isLocked={isLocked}
              canComment={canComment}
              onSubmitReply={onSubmitReply}
              onFetchSubtree={onFetchSubtree}
              reportedIds={reportedIds}
              markReported={markReported}
              newlyInsertedId={insertedHere ? newlyInsertedId : null}
            />
          ))}

          {/* D-10: breadth collapse, count always visible. */}
          {hiddenDirect > 0 && (
            <li>
              <button
                type="button"
                data-testid="breadth-toggle"
                className="min-h-[32px] rounded-lg px-2 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                aria-expanded={!breadthCollapsed}
                onClick={() => setBreadthCollapsed((current) => !current)}
              >
                {breadthCollapsed
                  ? `${SHOW_MORE_PREFIX}${hiddenDirect}${SHOW_MORE_SUFFIX}`
                  : COLLAPSE_THREAD_LABEL}
              </button>
            </li>
          )}

          {/* D-08: the truncated node's true-count continuation control. */}
          {truncated && (
            <li>
              <button
                type="button"
                data-testid="continue-thread"
                className="min-h-[32px] rounded-lg px-2 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                aria-expanded={threadExpanded}
                disabled={loadingSubtree}
                onClick={() => {
                  if (threadExpanded) setThreadExpanded(false);
                  else continueThread();
                }}
              >
                {threadExpanded
                  ? COLLAPSE_THREAD_LABEL
                  : `${node.descendant_count}${CONTINUE_THREAD_PREFIX}`}
              </button>
              {loadingSubtree && (
                <span role="status" className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                  Loading…
                </span>
              )}
              {subtreeFailed && (
                <button
                  type="button"
                  data-testid="subtree-retry"
                  className="ml-2 min-h-[32px] rounded-lg px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  onClick={continueThread}
                >
                  {SUBTREE_RETRY_COPY}
                </button>
              )}
            </li>
          )}

          {/* A fetched subtree renders in place as siblings of this row's ul. */}
          {threadExpanded &&
            fetchedChildren !== null &&
            fetchedChildren.map((child) => (
              <CommentRow
                key={`fetched-${child.id}`}
                node={child}
                depth={childDepth}
                postId={postId}
                isLocked={isLocked}
                canComment={canComment}
                onSubmitReply={onSubmitReply}
                onFetchSubtree={onFetchSubtree}
                reportedIds={reportedIds}
                markReported={markReported}
                newlyInsertedId={null}
              />
            ))}
        </ul>
      )}
    </li>
  );
}

export function CommentThread({
  comments,
  totalComments,
  postId,
  isLocked,
  canComment,
  onSubmitReply,
  newlyInsertedId = null,
  onFetchSubtree,
}: CommentThreadProps): React.ReactElement {
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  function markReported(id: string): void {
    setReportedIds((current) => new Set(current).add(id));
  }

  const fetcher: (pid: string, parentId: string) => Promise<CommentNode[]> =
    onFetchSubtree ?? ((pid, parentId) => fetchCommentSubtree(pid, parentId).then((page) => page.results));

  return (
    <section aria-label="Comments" className="space-y-3">
      <h2 className={TYPOGRAPHY.sectionHeader}>
        {COMMENTS_HEADER_PREFIX}
        {totalComments}):
      </h2>

      {comments !== null && comments.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No comments yet — be the first to reply.
        </p>
      )}

      <ul className="space-y-4" data-testid="comment-list">
        {(comments ?? []).map((comment) => (
          <CommentRow
            key={comment.id}
            node={comment}
            depth={0}
            postId={postId}
            isLocked={isLocked}
            canComment={canComment}
            onSubmitReply={onSubmitReply}
            onFetchSubtree={fetcher}
            reportedIds={reportedIds}
            markReported={markReported}
            newlyInsertedId={newlyInsertedId}
          />
        ))}
      </ul>
    </section>
  );
}

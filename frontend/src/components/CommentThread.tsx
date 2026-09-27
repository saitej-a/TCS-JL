/**
 * §7.8's comment thread (9.4 Task 5): one nesting level, exactly as §7.8 rule 1
 * demands and 04 §40 enforces server-side.
 *
 * - Top-level rows carry Reply + Report; a reply renders indented
 *   (`border-l-2 pl-4` — the UI-SPEC's single allowed indent unit) with Report
 *   only, so a two-level thread cannot exist in the DOM.
 * - The reply form inserts beneath its parent with autofocus (rule 2) and POSTs
 *   `parent_id`.
 * - A tombstoned row renders the spec's literal placeholder in place, muted on a
 *   dashed border, and keeps its position (rule 3) — `[This comment was removed]`,
 *   never the mockup's invented copy.
 * - Locked threads hide every write affordance (rule 4's composer rule applied to
 *   replies): the thread becomes read-only.
 */
import { useState } from "react";

import { createReport } from "@/api/community";
import type { CommentNode, CommentReply } from "@/types/community";
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

export interface CommentThreadProps {
  comments: CommentNode[] | null;
  totalComments: number;
  /** Locked thread: no reply forms, no report buttons (rule 4). */
  isLocked: boolean;
  /** Verified-only writes; anonymous visitors see no write affordances. */
  canComment: boolean;
  onSubmitReply: (parentId: string, body: string) => Promise<void>;
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

function ReplyRow({
  reply,
  isLocked,
  canComment,
  onReported,
}: {
  reply: CommentReply;
  isLocked: boolean;
  canComment: boolean;
  onReported: () => void;
}): React.ReactElement {
  return (
    <li className="ml-4 border-l-2 border-slate-200 pl-4 dark:border-slate-700" data-testid="comment-reply">
      {reply.is_deleted ? (
        <DeletedRow />
      ) : (
        <div className="space-y-1.5">
          <IdentityPill author={reply.author} />
          <p className="text-sm text-slate-700 dark:text-slate-300">{reply.body}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(reply.created_at)}</span>
            {!isLocked && canComment && (
              <ReportButton commentId={reply.id} onDone={onReported} />
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function CommentThread({
  comments,
  totalComments,
  isLocked,
  canComment,
  onSubmitReply,
}: CommentThreadProps): React.ReactElement {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  function markReported(id: string): void {
    setReportedIds((current) => new Set(current).add(id));
  }

  async function submitReply(parentId: string): Promise<void> {
    const trimmed = replyDraft.trim();
    if (trimmed === "" || submitting) return;
    setSubmitting(true);
    try {
      await onSubmitReply(parentId, trimmed);
      // Optimistic insert happens in the page; the form closes on success.
      setReplyingTo(null);
      setReplyDraft("");
    } finally {
      setSubmitting(false);
    }
  }

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
          <li key={comment.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800">
            {comment.is_deleted ? (
              <DeletedRow />
            ) : (
              <div className="space-y-2">
                <IdentityPill author={comment.author} />
                <p className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
                  {comment.body}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {timeAgo(comment.created_at)}
                  </span>
                  {!isLocked && canComment && (
                    <button
                      type="button"
                      className="min-h-[32px] rounded-lg px-2 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
                      aria-expanded={replyingTo === comment.id}
                      onClick={() => {
                        setReplyingTo((current) => (current === comment.id ? null : comment.id));
                        setReplyDraft("");
                      }}
                    >
                      {REPLY_LABEL}
                    </button>
                  )}
                  {!isLocked && canComment && !reportedIds.has(comment.id) && (
                    <ReportButton commentId={comment.id} onDone={() => markReported(comment.id)} />
                  )}
                </div>
              </div>
            )}

            {/* Rule 2: the reply form lives INLINE beneath its parent, focused. */}
            {replyingTo === comment.id && !isLocked && canComment && (
              <form
                className="mt-3 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitReply(comment.id);
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
                    className="flex min-h-[40px] items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                  >
                    {REPLY_SUBMIT_LABEL}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyDraft("");
                    }}
                    className="min-h-[40px] rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {comment.replies.length > 0 && (
              <ul className="mt-3 space-y-3">
                {comment.replies.map((reply) => (
                  <ReplyRow
                    key={reply.id}
                    reply={reply}
                    isLocked={isLocked}
                    canComment={canComment}
                    onReported={() => markReported(reply.id)}
                  />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

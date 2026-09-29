/**
 * Community types (9.4 Task 4; reshaped by Phase 11 D-01/D-02).
 *
 * - `PostCardData` re-exports the feed card (`PostCardSerializer`, 04 §31) —
 *   post detail renders the same payload; §7.8 adds no fields.
 * - `CommentNode` mirrors `CommentSerializer` (04 §39, rewritten). Replies
 *   nest **recursively**: the server assembles subtrees to its render depth
 *   (D-02) and truncating nodes carry `descendant_count` — the UI's
 *   continue/collapse controls consume the true counts, never arithmetic.
 * - The old `CommentReply` type (which pinned a single nesting level via an
 *   empty-replies guarantee) is deleted: the wire no longer has that shape.
 */
import type { PostAuthor, PostCard } from "@/api/community";
import type { PostCategory } from "@/content/postCategories";

export type { PostCategory, PostAuthor, PostCard as PostCardData };

/** CommentSerializer (04 §39, rewritten) — a comment at any depth. */
export interface CommentNode {
  id: string;
  post: string;
  parent: string | null;
  author: PostAuthor;
  body: string;
  is_deleted: boolean;
  /** Assembled children — recursive to the server's render depth (D-02). */
  replies: CommentNode[];
  /** True descendant count from the API — feeds "N more replies" (never UI math). */
  descendant_count: number;
  /** Server's closure signal (D-06): an ancestor was removed; the branch is closed. */
  is_branch_closed: boolean;
  created_at: string;
  updated_at: string;
}

/** `CommentListCreateView.get`'s response: honest top-level count + total. */
export interface CommentPage {
  count: number;
  total_comments: number;
  results: CommentNode[];
}

/** CommentWriteSerializer (04 §41): body + optional parent. */
export interface CommentCreatePayload {
  body: string;
  parent_id?: string;
}

/**
 * `POST /api/v1/reports/` body (ReportWriteSerializer, 04 §63): exactly one of
 * post_id / comment_id, validated server-side by an XOR. Declared as a union
 * instead of interface-extends so the XOR is a compile-time shape.
 */
export type ReportCreatePayload =
  | { post_id: string; reason: string; description?: string }
  | { comment_id: string; reason: string; description?: string };

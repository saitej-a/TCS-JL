/**
 * Community types (9.4 Task 4): shapes byte-mirroring the shipped serializers.
 *
 * - `PostCardData` re-exports the feed card (`PostCardSerializer`, 04 §31) —
 *   post detail renders the same payload; §7.8 adds no fields.
 * - `CommentNode` mirrors `CommentSerializer` (04 §39). The server serializes a
 *   comment together with its one level of `replies`; the UI builds the thread
 *   from the top-level list's nesting, never by walking deeper (§7.8 rule 1).
 */
import type { PostAuthor, PostCard } from "@/api/community";
import type { PostCategory } from "@/content/postCategories";

export type { PostCategory, PostAuthor, PostCard as PostCardData };

/** CommentSerializer (04 §39) — flat row with its preloaded one-level replies. */
export interface CommentReply {
  id: string;
  post: string;
  parent: string | null;
  author: PostAuthor;
  body: string;
  is_deleted: boolean;
  replies: [];
  created_at: string;
  updated_at: string;
}

export interface CommentNode {
  id: string;
  post: string;
  parent: string | null;
  author: PostAuthor;
  body: string;
  is_deleted: boolean;
  /** Preloaded children — always empty for a reply (one nesting level, 04 §40). */
  replies: CommentReply[];
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

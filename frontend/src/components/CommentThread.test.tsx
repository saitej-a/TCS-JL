/**
 * CommentThread unit tests — §7.8's rules + the Phase 11 contract
 * (11-UI-SPEC.md): recursion, capped rails, context line, breadth collapse,
 * continue-this-thread, closed-branch composer, tombstone/locked/anonymous.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  BREADTH_VISIBLE,
  BRANCH_CLOSED_COPY,
  CommentThread,
  DELETED_COMMENT_COPY,
} from "@/components/CommentThread";
import { ToastProvider } from "@/components/Toast";
import type { CommentNode } from "@/types/community";

const AUTHOR = {
  id: "a1",
  display_name: "Anonymous Candidate",
  batch: "2025",
  hiring_type: "DIGITAL",
  region: "Hyderabad",
  avatar_seed: 1,
};

function row(id: string, body: string, overrides: Partial<CommentNode> = {}): CommentNode {
  return {
    id,
    post: "p1",
    parent: null,
    author: AUTHOR,
    body,
    is_deleted: false,
    replies: [],
    descendant_count: 0,
    is_branch_closed: false,
    created_at: "2026-09-20T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
    ...overrides,
  };
}

function chain(root: CommentNode, depth: number): CommentNode {
  // Built deepest-first so each level wraps the previous one: root → d1 → d2 → …
  if (depth < 1) return root;
  let child: CommentNode = row(`d${depth}`, `depth ${depth} body`, { parent: root.id });
  for (let i = depth - 1; i >= 1; i -= 1) {
    child = { ...row(`d${i}`, `depth ${i} body`, { parent: child.id }), replies: [child] };
  }
  return { ...root, replies: [child] };
}

function renderThread(
  comments: CommentNode[],
  props: Partial<Parameters<typeof CommentThread>[0]> = {},
) {
  return render(
    <ToastProvider>
      <CommentThread
        comments={comments}
        totalComments={comments.length}
        postId="p1"
        isLocked={false}
        canComment={true}
        onSubmitReply={vi.fn().mockResolvedValue(undefined)}
        {...props}
      />
    </ToastProvider>,
  );
}

describe("CommentThread", () => {
  it("renders the header with the total and the top-level row", () => {
    renderThread([row("c1", "Top-level body.")]);
    expect(screen.getByText("COMMENTS & REPLIES (1):")).toBeInTheDocument();
    expect(screen.getByText("Top-level body.")).toBeInTheDocument();
  });

  it("renders the literal deleted placeholder for tombstoned rows", () => {
    renderThread([row("c1", "gone", { is_deleted: true }), row("c2", "survivor")]);
    expect(screen.getByText(DELETED_COMMENT_COPY)).toBeInTheDocument();
    expect(screen.queryByText("gone")).not.toBeInTheDocument();
    expect(screen.getByText("survivor")).toBeInTheDocument();
  });

  it("hides reply and report affordances on a locked thread", () => {
    renderThread([row("c1", "body")], { isLocked: true });
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report" })).not.toBeInTheDocument();
  });

  it("hides write affordances for anonymous visitors", () => {
    renderThread([row("c1", "body")], { canComment: false });
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report" })).not.toBeInTheDocument();
  });

  it("focuses the inline reply form on open and submits through the callback", async () => {
    const user = userEvent.setup();
    const onSubmitReply = vi.fn().mockResolvedValue(undefined);
    renderThread([row("c1", "Top-level body.")], { onSubmitReply });
    await user.click(screen.getByRole("button", { name: "Reply" }));

    const box = screen.getByLabelText("Write a reply");
    expect(box).toHaveFocus();
    await user.type(box, "A reply draft");
    await user.click(screen.getByRole("button", { name: "Post Reply" }));

    expect(onSubmitReply).toHaveBeenCalledWith("c1", "A reply draft");
  });

  it("shows the empty hint when the thread has no comments", () => {
    renderThread([], { totalComments: 0 });
    expect(screen.getByText("No comments yet — be the first to reply.")).toBeInTheDocument();
  });

  // --- Phase 11: depth ------------------------------------------------------

  it("renders replies recursively at any depth (D-01)", () => {
    const deep = chain(row("c1", "root"), 4); // root + 4 levels below
    renderThread([deep]);
    for (let i = 1; i <= 4; i += 1) {
      expect(screen.getByText(`depth ${i} body`)).toBeInTheDocument();
    }
  });

  it("carries the replying-to context only at depth ≥ 2 (D-07)", () => {
    const deep = chain(row("c1", "root"), 3);
    renderThread([deep]);
    const contexts = screen.getAllByTestId("reply-context");
    expect(contexts.length).toBe(2); // depth 2 and depth 3 rows
    expect(contexts[0]).toHaveTextContent("replying to @Anonymous Candidate");
  });

  it("caps the indent structure: deep levels share the last rail step (D-07)", () => {
    const deep = chain(row("c1", "root"), 6);
    renderThread([deep]);
    // Rails are per-level wrappers; count them — one per level up to the cap.
    const rails = screen.getAllByTestId("comment-list")[0].querySelectorAll("ul.border-l-2");
    expect(rails.length).toBe(3); // INDENT_LEVELS — depth 4+ adds no new rail unit
    // But every depth still renders.
    for (let i = 1; i <= 6; i += 1) {
      expect(screen.getByText(`depth ${i} body`)).toBeInTheDocument();
    }
  });

  it("auto-expands the breadth of a row whose own reply was just inserted (D-10)", () => {
    const threeReplies = row("c1", "root", {
      descendant_count: 5,
      replies: [
        row("r1", "first", { parent: "c1" }),
        row("r2", "second", { parent: "c1" }),
        row("r3", "third", { parent: "c1" }),
        row("r4", "fourth", { parent: "c1" }),
        row("r5", "fifth", { parent: "c1" }),
      ],
    });
    renderThread([threeReplies], { newlyInsertedId: "r4" });
    // Collapsed by default hides reply 4; the just-inserted one must show.
    expect(screen.getByText("fourth")).toBeInTheDocument();
    expect(screen.queryByText("fifth")).not.toBeInTheDocument();
  });

  // --- Phase 11: breadth ----------------------------------------------------

  it("collapses breadth past the constant with a true count (D-10)", async () => {
    const user = userEvent.setup();
    const replies = Array.from({ length: 5 }, (_, i) => row(`r${i + 1}`, `reply ${i + 1}`, { parent: "c1" }));
    renderThread([row("c1", "root", { descendant_count: 5, replies })]);

    expect(screen.getByText("reply 1")).toBeInTheDocument();
    expect(screen.getAllByText(`reply ${BREADTH_VISIBLE}`).length).toBe(1);
    expect(screen.queryByText("reply 4")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("breadth-toggle"));
    expect(screen.getByText("reply 4")).toBeInTheDocument();
    expect(screen.getByText("reply 5")).toBeInTheDocument();
    expect(screen.getByTestId("breadth-toggle")).toHaveAttribute("aria-expanded", "true");
  });

  // --- Phase 11: continue this thread ---------------------------------------

  it("renders the truncated node's true-count continuation control (D-08)", () => {
    const truncated = chain(row("c1", "root", { descendant_count: 12 }), 2);
    const leaf = row("leaf", "last assembled", { parent: "d1-c1", descendant_count: 9 });
    const two = chain(truncated, 1);
    two.replies[0].replies = [leaf];
    renderThread([two]);

    const control = screen.getByTestId("continue-thread");
    expect(control).toHaveTextContent("9 more replies — continue this thread");
    expect(control).toHaveAttribute("aria-expanded", "false");
  });

  it("fetches the subtree in place and toggles to Collapse thread (D-08)", async () => {
    const user = userEvent.setup();
    const onFetchSubtree = vi.fn().mockResolvedValue([row("sub1", "fetched child")]);
    const truncated = row("c1", "root", { descendant_count: 3 });
    renderThread([truncated], { onFetchSubtree });

    await user.click(screen.getByTestId("continue-thread"));

    await waitFor(() => {
      expect(screen.getByText("fetched child")).toBeInTheDocument();
    });
    expect(onFetchSubtree).toHaveBeenCalledWith("p1", "c1");
    expect(screen.getByTestId("continue-thread")).toHaveTextContent("Collapse thread");
    expect(screen.getByTestId("continue-thread")).toHaveAttribute("aria-expanded", "true");
  });

  it("shows inline retry when the subtree fetch fails (UI-SPEC error state)", async () => {
    const user = userEvent.setup();
    const onFetchSubtree = vi.fn().mockRejectedValue(new Error("offline"));
    renderThread([row("c1", "root", { descendant_count: 3 })], { onFetchSubtree });

    await user.click(screen.getByTestId("continue-thread"));

    const retry = await screen.findByTestId("subtree-retry");
    expect(retry).toHaveTextContent("Could not load replies. Retry.");
  });

  // --- Phase 11: closed branches --------------------------------------------

  it("disables the composer with the reason on every node of a closed branch (D-06)", () => {
    const closed = row("c1", "root", {
      is_branch_closed: true,
      descendant_count: 2,
      replies: [
        row("r1", "inside closed", { parent: "c1", is_branch_closed: true }),
        row("r2", "also inside", { parent: "c1", is_branch_closed: true }),
      ],
    });
    renderThread([closed, row("open", "outside the branch")]);

    expect(screen.getAllByTestId("branch-closed-reason")).toHaveLength(3); // root + 2 replies
    expect(screen.getAllByText(BRANCH_CLOSED_COPY).length).toBeGreaterThanOrEqual(3);
    // The closed rows offer no Reply; the row outside the branch still does.
    const list = screen.getByTestId("comment-list");
    expect(within(list).getAllByRole("button", { name: "Reply" }).length).toBe(1);
  });

  it("renders a tombstone with its descendants read-only-open (D-04 readability)", () => {
    const tombstone = row("c1", "gone", {
      is_deleted: true,
      is_branch_closed: false,
      descendant_count: 1,
      replies: [row("r1", "survives beneath", { parent: "c1" })],
    });
    renderThread([tombstone]);
    expect(screen.getByText(DELETED_COMMENT_COPY)).toBeInTheDocument();
    expect(screen.getByText("survives beneath")).toBeInTheDocument();
  });
});

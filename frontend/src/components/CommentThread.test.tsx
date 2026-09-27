/**
 * CommentThread unit tests (§7.8's four rules at the component level).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CommentThread, DELETED_COMMENT_COPY } from "@/components/CommentThread";
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

function comment(overrides: Partial<CommentNode> = {}): CommentNode {
  return {
    id: "c1",
    post: "p1",
    parent: null,
    author: AUTHOR,
    body: "Top-level body.",
    is_deleted: false,
    replies: [
      {
        id: "r1",
        post: "p1",
        parent: "c1",
        author: AUTHOR,
        body: "Nested reply body.",
        is_deleted: false,
        replies: [],
        created_at: "2026-09-21T10:00:00Z",
        updated_at: "2026-09-21T10:00:00Z",
      },
    ],
    created_at: "2026-09-20T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
    ...overrides,
  };
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
        isLocked={false}
        canComment={true}
        onSubmitReply={vi.fn().mockResolvedValue(undefined)}
        {...props}
      />
    </ToastProvider>,
  );
}

describe("CommentThread", () => {
  it("renders the header with the total and one nesting level", () => {
    renderThread([comment()]);
    expect(screen.getByText("COMMENTS & REPLIES (1):")).toBeInTheDocument();
    expect(screen.getByText("Top-level body.")).toBeInTheDocument();
    expect(screen.getByText("Nested reply body.")).toBeInTheDocument();
    // Exactly one Reply affordance — it lives on the top-level row only.
    expect(screen.getAllByRole("button", { name: "Reply" }).length).toBe(1);
  });

  it("renders the literal deleted placeholder for tombstoned rows", () => {
    renderThread([
      comment({ is_deleted: true, body: "gone", replies: [] }),
      comment({ id: "c2", body: "survivor", replies: [] }),
    ]);
    expect(screen.getByText(DELETED_COMMENT_COPY)).toBeInTheDocument();
    expect(screen.queryByText("gone")).not.toBeInTheDocument();
    // Position is retained: the surviving comment still renders after it.
    expect(screen.getByText("survivor")).toBeInTheDocument();
  });

  it("hides reply and report affordances on a locked thread", () => {
    renderThread([comment()], { isLocked: true });
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report" })).not.toBeInTheDocument();
  });

  it("hides write affordances for anonymous visitors", () => {
    renderThread([comment()], { canComment: false });
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report" })).not.toBeInTheDocument();
  });

  it("focuses the inline reply form on open and submits through the callback", async () => {
    const user = userEvent.setup();
    const onSubmitReply = vi.fn().mockResolvedValue(undefined);
    renderThread([comment()], { onSubmitReply });
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
});

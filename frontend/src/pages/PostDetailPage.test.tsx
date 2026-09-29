/**
 * PostDetailPage tests (§7.8): the four comment rules, the composer states and
 * the action row, over scripted axios responses (adapter swap, no mocking dep,
 * no StrictMode assumption — the 9.3 lesson).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PostDetailPage } from "@/pages/PostDetailPage";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { scriptAdapter } from "@/test/axiosTestHelper";
import type { CommentNode } from "@/types/community";

const POST = {
  id: "p1",
  author: {
    id: "a1",
    display_name: "Anonymous Candidate",
    batch: "2025",
    hiring_type: "DIGITAL",
    region: "Hyderabad",
    avatar_seed: 2,
  },
  title: "Anyone from Hyderabad got JL?",
  body: "Asking for the August batch.\nSecond paragraph for the wrap test.",
  category: "JOINING_LETTER",
  is_pinned: false,
  is_locked: false,
  is_deleted: false,
  vote_count: 41,
  comment_count: 3,
  has_voted: false,
  created_at: "2026-09-20T10:00:00Z",
  updated_at: "2026-09-20T10:00:00Z",
};

function topLevel(overrides: Partial<CommentNode> = {}): CommentNode {
  return {
    id: "c1",
    post: POST.id,
    parent: null,
    author: { ...POST.author, id: "a2" },
    body: "Mine arrived last week.",
    is_deleted: false,
    descendant_count: 1,
    is_branch_closed: false,
    replies: [
      {
        id: "r1",
        post: POST.id,
        parent: "c1",
        author: { ...POST.author, id: "a3" },
        body: "Congrats! Mine is still pending.",
        is_deleted: false,
        descendant_count: 0,
        is_branch_closed: false,
        replies: [],
        created_at: "2026-09-21T10:00:00Z",
        updated_at: "2026-09-21T10:00:00Z",
      },
    ],
    created_at: "2026-09-20T12:00:00Z",
    updated_at: "2026-09-20T12:00:00Z",
    ...overrides,
  };
}

function commentPage(results: CommentNode[], total = 3) {
  return { status: 200, data: { count: results.length, total_comments: total, results } };
}

function renderPage(entry = "/community/posts/p1") {
  // `useParams` needs a MATCHING route — a bare MemoryRouter entry gives the
  // page an empty id (post detail fetched `/community/posts//`).
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/community/posts/:id" element={<PostDetailPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/**
 * Render as a signed-in candidate: seed the refresh token so AuthProvider's
 * boot runs the silent refresh. The page's own GETs fire synchronously on
 * mount — BEFORE the boot refresh resolves — so the script must carry the
 * page's fetches FIRST and the boot's refresh + /me/ steps LAST (the boot
 * awaits them out of band and AuthProvider settles after; the page renders
 * from its own steps either way).
 */
/**
 * `initialSteps` are consumed by the page's mount GETs + the boot's silent
 * refresh (the sequential script cursor: page GETs first, then refresh +
 * /me/). `interactionSteps` (POSTs, refetches) must come AFTER the boot —
 * otherwise the boot consumes them and fails as anonymous.
 */
function authenticatedScript(
  initialSteps: Parameters<typeof scriptAdapter>[0],
  interactionSteps: Parameters<typeof scriptAdapter>[0] = [],
) {
  localStorage.setItem("tjt.refresh_token", "stored-refresh");
  scriptAdapter([
    ...initialSteps,
    { url: "/auth/token/refresh/", method: "post", respond: () => ({ status: 200, data: { access: "a1", refresh: "r1" } }) },
    { url: "/me/", respond: () => ({ status: 200, data: { id: "u1", email: "candidate@example.com", is_verified: true, created_at: "t", profile_completed: true } }) },
    ...interactionSteps,
  ]);
  return renderPage();
}

afterEach(() => {
  localStorage.clear();
});

// scriptAdapter matches URL SUFFIXES, so the scripted `url` must be the exact
// tail of the requested URL **including the trailing slash** axios preserves
// ("/community/posts/p1/".endsWith("/posts/p1") is false — the slash matters).
function scriptPost(overrides: Partial<typeof POST> = {}) {
  scriptAdapter([
    { url: "/posts/p1/", respond: () => ({ status: 200, data: { ...POST, ...overrides } }) },
    {
      url: "/posts/p1/comments/",
      respond: () => commentPage([topLevel()]),
    },
  ]);
}

describe("PostDetailPage (§7.8)", () => {
  it("renders the post card, action row and the nested thread", async () => {
    authenticatedScript([
      { url: "/posts/p1/", respond: () => ({ status: 200, data: POST }) },
      { url: "/posts/p1/comments/", respond: () => commentPage([topLevel()]) },
    ]);

    expect(await screen.findByText("Anyone from Hyderabad got JL?")).toBeInTheDocument();
    expect(screen.getByText("Asking for the August batch.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upvote/ })).toBeInTheDocument();
    expect(screen.getByText(/3 Comments/)).toBeInTheDocument();
    // Nested reply renders in place.
    expect(await screen.findByText("Mine arrived last week.")).toBeInTheDocument();
    expect(await screen.findByText("Congrats! Mine is still pending.")).toBeInTheDocument();
    // D-09 (supersedes the old "replies render Report only" rule): every node
    // offers Reply — root + its reply, parent's button first in document order.
    expect(screen.getAllByRole("button", { name: "Reply" })).toHaveLength(2);
  });

  it("autofocuses the inline reply form beneath its parent and POSTs parent_id", async () => {
    const user = userEvent.setup();
    authenticatedScript(
      [
        { url: "/posts/p1/", respond: () => ({ status: 200, data: POST }) },
        { url: "/posts/p1/comments/", respond: () => commentPage([topLevel()]) },
      ],
      [
        {
          url: "/posts/p1/comments/",
          method: "post",
          respond: (config) => {
            expect(JSON.parse(String(config.data)).parent_id).toBe("c1");
            return { status: 201, data: topLevel() };
          },
        },
        // Refetch after the reply lands
        { url: "/posts/p1/comments/", respond: () => commentPage([topLevel()], 4) },
      ],
    );
    await screen.findByText("Mine arrived last week.");

    // Document order puts the root's Reply first; the POST assertion below
    // proves it opened c1's form (not the nested reply's).
    await user.click(screen.getAllByRole("button", { name: "Reply" })[0]);
    const box = screen.getByLabelText("Write a reply");
    expect(box).toHaveFocus();
    await user.type(box, "Thanks, hopeful news!");
    await user.click(screen.getByRole("button", { name: "Post Reply" }));

    await waitFor(() => {
      expect(screen.getByText(/4 Comments/)).toBeInTheDocument();
    });
  });

  it("renders the deleted-comment placeholder copy in place", async () => {
    scriptAdapter([
      { url: "/posts/p1/", respond: () => ({ status: 200, data: POST }) },
      {
        url: "/posts/p1/comments/",
        respond: () =>
          commentPage([
            topLevel(),
            topLevel({
              id: "c2",
              body: "removed body",
              is_deleted: true,
              replies: [],
            }),
          ]),
      },
    ]);
    renderPage();
    // §7.8 rule 3's literal string, not the mockup's invention.
    const placeholders = await screen.findAllByText("[This comment was removed]");
    expect(placeholders.length).toBe(1);
    expect(screen.queryByText("removed body")).not.toBeInTheDocument();
  });

  it("replaces the composer with the locked banner on a locked post", async () => {
    scriptPost({ is_locked: true });
    renderPage();

    expect(await screen.findByTestId("locked-banner")).toHaveTextContent(
      "🔒 This discussion is locked. New comments and replies are disabled.",
    );
    expect(screen.queryByRole("button", { name: "Post Comment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
  });

  it("swaps the composer for a sign-in prompt for anonymous visitors", async () => {
    scriptPost();
    renderPage();

    expect(await screen.findByTestId("anon-composer")).toHaveTextContent(
      "Sign in to join the discussion.",
    );
    expect(screen.queryByRole("button", { name: "Post Comment" })).not.toBeInTheDocument();
  });

  it("preserves the draft and shows the error strip when the submit fails", async () => {
    const user = userEvent.setup();
    authenticatedScript(
      [
        { url: "/posts/p1/", respond: () => ({ status: 200, data: POST }) },
        { url: "/posts/p1/comments/", respond: () => commentPage([]) },
      ],
      // The submit fails; the boot's silent refresh still runs first.
      [{ url: "/posts/p1/comments/", method: "post", respond: () => ({ status: 403, data: {} }) }],
    );
    // The composer appears only once the boot settles as authenticated.
    const box = await screen.findByLabelText("Write a comment");
    await user.type(box, "Still waiting in Pune…");
    await user.click(screen.getByRole("button", { name: "Post Comment" }));

    expect(await screen.findByTestId("comment-error")).toBeInTheDocument();
    expect(box).toHaveValue("Still waiting in Pune…");
  });

  it("writes the canonical URL to the clipboard on Share", async () => {
    const user = userEvent.setup();
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    try {
      scriptPost();
      renderPage();
      await screen.findByText("Anyone from Hyderabad got JL?");
      await user.click(screen.getByRole("button", { name: /Share/ }));
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          "http://localhost:3000/community/posts/p1",
        );
      });
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true,
      });
    }
  });
});

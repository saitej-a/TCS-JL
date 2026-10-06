/**
 * Create-post tests (Phase 12): posting is a modal on the feed (D-03).
 *
 * Two harnesses, because the axios fake can't tell the feed's GET from the
 * modal's POST on the same URL (`routeAdapter` matches by URL substring only):
 * - Feed-level tests (routeAdapter) assert the open paths: the CTA and the
 *   old page URL's redirect hand-off both surface the dialog.
 * - Modal-level tests (scriptAdapter, strict order) pin the contracts moved
 *   verbatim from the former page: the D7 category payload, 201 → close,
 *   the two writer rejections rendering distinctly (scam never implies
 *   rewording; duplicate names the 60-minute window), client-side
 *   validation, and the identity preview.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommunityFeedPage } from "@/pages/CommunityFeedPage";
import { CreatePostPage } from "@/pages/CreatePostPage";
import { CreatePostModal } from "@/components/CreatePostModal";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { setRefreshToken } from "@/api/tokenStore";
import { routeAdapter, scriptAdapter, type RoutedCall } from "@/test/axiosTestHelper";

const PROFILE = {
  id: "prof-1",
  display_name: "Sai",
  public_identity_mode: "ANONYMOUS" as const,
  batch: "2025",
  hiring_type: "DIGITAL",
  region: "Hyderabad",
  interview_center: "HYD",
  interview_date: null,
  joining_location: "Hyderabad",
  current_status: "WAITING_FOR_JOINING_LETTER",
  offer_letter_date: "2026-05-05",
  expected_joining_date: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

function profileStep() {
  return { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) };
}

// --- Feed-level (routeAdapter) ----------------------------------------------

const FEED_POST = {
  id: "p1",
  author: {
    id: "a1",
    display_name: "Anonymous Candidate",
    batch: "2025 Digital",
    hiring_type: "DIGITAL",
    region: "Hyderabad",
    avatar_seed: 3,
  },
  title: "Anyone from Hyderabad got JL?",
  body: "Asking for the August batch.",
  category: "JOINING_LETTER",
  is_pinned: false,
  is_locked: false,
  is_deleted: false,
  vote_count: 41,
  comment_count: 7,
  has_voted: false,
  created_at: "2026-09-20T10:00:00Z",
  updated_at: "2026-09-20T10:00:00Z",
};

function feedRoutes(): RoutedCall[] {
  return [
    {
      url: "/auth/token/refresh/",
      answers: [{ status: 200, data: { access: "acc", refresh: "ref" } }],
    },
    {
      url: "/me/",
      answers: [
        {
          status: 200,
          data: {
            id: "u1",
            email: "c@example.com",
            is_verified: true,
            created_at: "2026-01-01T00:00:00Z",
            profile_completed: true,
          },
        },
      ],
    },
    {
      url: "/community/posts/",
      answers: [
        {
          status: 200,
          data: { count: 1, next: null, previous: null, results: [FEED_POST] },
        },
      ],
    },
    { url: "/announcements/", answers: [{ status: 200, data: { count: 0, next: null, previous: null, results: [] } }] },
    {
      url: "/dashboard/",
      answers: [
        {
          status: 200,
          data: {
            profile: { completion_percentage: 80, current_status: "WAITING_FOR_JOINING_LETTER" },
            timeline: { latest_event: null },
            community: { unread_notifications: 0 },
            analytics: {
              data_source: "COMMUNITY_REPORTED",
              suppressed: true,
              message: "Not enough community data to display this breakdown.",
            },
          },
        },
      ],
    },
    { url: "/profile/", answers: [{ status: 200, data: PROFILE }] },
  ];
}

function renderFeed(initialEntry = "/community", includeShim = false) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/community" element={<CommunityFeedPage />} />
            {includeShim && <Route path="/community/create" element={<CreatePostPage />} />}
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// --- Modal-level (scriptAdapter) --------------------------------------------

function renderModal(onPublished = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={["/community"]}>
      <CreatePostModal open onClose={() => {}} onPublished={onPublished} />
    </MemoryRouter>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(await screen.findByLabelText(/Title/i), "Joining letter timeline");
  await user.type(screen.getByLabelText(/Discussion Body/i), "Anyone heard back about the August wave?");
  await user.click(screen.getByRole("button", { name: /Publish Post/i }));
}

describe("CreatePostModal (feed flow)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Seed the session the way a successful login would: the refresh token in
    // storage flips the provider's boot to authenticated (signed-in CTA).
    setRefreshToken("test-refresh-token");
  });

  it("opens from the feed CTA", async () => {
    routeAdapter(feedRoutes());
    renderFeed();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Create New Post/i }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Create Community Discussion Post")).toBeInTheDocument();
  });

  it("opens the modal when the old /community/create URL is visited (redirect hand-off)", async () => {
    routeAdapter(feedRoutes());
    // The real shim page mounts, redirects to /community with the hand-off
    // state, and the feed opens the dialog on arrival.
    renderFeed("/community/create", true);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Create Community Discussion Post")).toBeInTheDocument();
  });
});

describe("CreatePostModal (contracts)", () => {
  it("posts exactly {title, body, category} with the D7 category and closes on 201", async () => {
    const user = userEvent.setup();
    const onPublished = vi.fn();
    const { calls } = scriptAdapter([
      profileStep(),
      { url: "/community/posts/", method: "post", respond: () => ({ status: 201, data: { id: "p2" } }) },
    ]);
    renderModal(onPublished);
    await fillAndSubmit(user);
    await waitFor(() => {
      expect(onPublished).toHaveBeenCalledTimes(1);
    });
    const post = calls.find(
      (call) => String(call.url).includes("/community/posts/") && call.method?.toLowerCase() === "post",
    );
    expect(post).toBeDefined();
    const body = JSON.parse(String(post?.data));
    expect(Object.keys(body).sort()).toEqual(["body", "category", "title"]);
    expect(body).toMatchObject({
      title: "Joining letter timeline",
      category: "GENERAL", // POST_CATEGORIES[0] — the D7 vocabulary's default
    });
  });

  it("renders the scam rejection distinctly, keeps the modal open, and never publishes", async () => {
    const user = userEvent.setup();
    const onPublished = vi.fn();
    scriptAdapter([
      profileStep(),
      {
        url: "/community/posts/",
        method: "post",
        respond: () => ({ status: 400, data: { error: { code: "scam_pattern_detected", message: "blocked" } } }),
      },
    ]);
    renderModal(onPublished);
    await fillAndSubmit(user);
    await waitFor(() => {
      expect(screen.getByText(/blocked by our anti-scam screening/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/60 minutes/i)).not.toBeInTheDocument();
    expect(onPublished).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the duplicate rejection with the 60-minute window", async () => {
    const user = userEvent.setup();
    const onPublished = vi.fn();
    scriptAdapter([
      profileStep(),
      {
        url: "/community/posts/",
        method: "post",
        respond: () => ({ status: 400, data: { error: { code: "duplicate_post", message: "duplicate" } } }),
      },
    ]);
    renderModal(onPublished);
    await fillAndSubmit(user);
    await waitFor(() => {
      expect(screen.getByText(/60 minutes/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/anti-scam/i)).not.toBeInTheDocument();
    expect(onPublished).not.toHaveBeenCalled();
  });

  it("requires title and body client-side before any request", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([profileStep()]);
    renderModal();
    await user.click(await screen.findByRole("button", { name: /Publish Post/i }));
    expect(screen.getByText("A title is required.")).toBeInTheDocument();
    expect(calls.some((call) => call.method?.toLowerCase() === "post")).toBe(false);
  });

  it("shows the identity preview from the profile (ANONYMOUS sentinel, never the name)", async () => {
    scriptAdapter([profileStep()]);
    renderModal();
    await waitFor(() => {
      expect(screen.getByText(/Anonymous Candidate • 2025 • DIGITAL • Hyderabad/)).toBeInTheDocument();
    });
    expect(screen.getByTestId("posting-identity-icon").tagName.toLowerCase()).toBe("svg");
    expect(screen.queryByText("theater_comedy")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Sai$/)).not.toBeInTheDocument();
  });
});

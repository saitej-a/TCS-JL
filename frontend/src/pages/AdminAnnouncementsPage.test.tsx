/**
 * AdminAnnouncementsPage tests (9.5 Task 9):
 * - Composer gates: preview requires title+body; saving creates a DRAFT via
 *   POST /announcements/ (the write endpoint never publishes).
 * - Publish is the deliberate second step: PATCH {is_published:true} only
 *   after the confirm dialog, with the push-honesty note visible.
 * - Published list renders the public feed; the copy admits no reach figures
 *   and no staff draft list exist (the API's real shape).
 * - Deleting a draft issues DELETE and drops the row.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { AdminAnnouncementsPage } from "@/pages/AdminAnnouncementsPage";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { routeAdapter } from "@/test/axiosTestHelper";

const DRAFT = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  title: "Scheduled maintenance",
  body: "The app will be unavailable on Sunday morning.",
  is_pinned: false,
  is_published: false,
  published_at: null,
  expires_at: null,
};

function envelope(results: object[], total?: number) {
  return {
    count: total ?? results.length,
    next: null,
    previous: null,
    results,
  };
}

function setup(routes: Parameters<typeof routeAdapter>[0]): void {
  localStorage.setItem("tjt.refresh_token", "test-refresh");
  routeAdapter([
    {
      url: "/auth/token/refresh/",
      answers: [{ status: 200, data: { access: "a", refresh: "r" } }],
    },
    {
      url: "/me/",
      answers: [
        {
          status: 200,
          data: {
            id: "u1",
            email: "uat93@example.com",
            is_verified: true,
            is_staff: true,
            created_at: "2026-08-15T09:00:00Z",
            profile_completed: true,
          },
        },
      ],
    },
    // Detail route first: substring matching is first-match-wins, so
    // /announcements/<id>/ must precede /announcements/.
    ...routes,
  ]);
  render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AdminAnnouncementsPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
});

describe("AdminAnnouncementsPage (9.5 Task 9)", () => {
  it("renders the published feed with the honesty notes", async () => {
    setup([
      {
        url: "/announcements/",
        answers: [
          { status: 200, data: envelope([{ ...DRAFT, is_published: true, published_at: "2026-09-25T08:00:00Z" }]) },
        ],
      },
    ]);
    await screen.findByTestId("published-list");
    expect(screen.getByText("Scheduled maintenance")).toBeInTheDocument();
    expect(screen.getByText(/reach figures are not tracked/i)).toBeInTheDocument();
    expect(screen.getByText(/no send-later option/i)).toBeInTheDocument();
  });

  it("shows the error state when the feed fails to load", async () => {
    setup([
      { url: "/announcements/", answers: [{ status: 500, data: {} }] },
    ]);
    expect(await screen.findByTestId("announcements-error")).toBeInTheDocument();
  });

  it("requires title and body before preview", async () => {
    const user = userEvent.setup();
    setup([
      { url: "/announcements/", answers: [{ status: 200, data: envelope([], 0) }] },
    ]);
    await screen.findByTestId("admin-announcements");
    await user.click(screen.getByTestId("ann-preview"));
    expect(screen.queryByTestId("preview-dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/title and body are required/i);
  });

  it("previews, saves as a draft via POST, and keeps it unpublished", async () => {
    const user = userEvent.setup();
    setup([
      // Detail route first (publish/delete target /announcements/<id>/).
      { url: `/announcements/${DRAFT.id}/`, answers: [{ status: 200, data: DRAFT }] },
      {
        // GET (feed) then POST (create draft) — queue order matches call order.
        url: "/announcements/",
        answers: [
          { status: 200, data: envelope([], 0) },
          { status: 201, data: DRAFT },
          { status: 200, data: envelope([], 0) },
        ],
      },
    ]);
    await screen.findByTestId("admin-announcements");

    await user.type(screen.getByTestId("ann-title"), DRAFT.title);
    await user.type(screen.getByTestId("ann-body"), DRAFT.body);
    await user.click(screen.getByTestId("ann-preview"));
    expect(screen.getByTestId("preview-dialog")).toBeInTheDocument();
    expect(screen.getByText(/nothing is broadcast until you publish/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("preview-save"));
    expect(await screen.findByTestId("draft-row")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    // The honest-to-the-model state machine: a saved draft shows Publish…, not sent.
    expect(screen.getByTestId(`publish-${DRAFT.id}`)).toBeInTheDocument();
  });

  it("publishes only after the confirm dialog, via PATCH is_published", async () => {
    const user = userEvent.setup();
    const published = {
      ...DRAFT,
      is_published: true,
      published_at: "2026-09-26T10:00:00Z",
    };
    setup([
      {
        url: `/announcements/${DRAFT.id}/`,
        answers: [
          { status: 200, data: published },
          { status: 204, data: {} },
        ],
      },
      {
        url: "/announcements/",
        answers: [
          { status: 200, data: envelope([], 0) },
          { status: 201, data: DRAFT },
          { status: 200, data: envelope([{ ...published }], 1) },
        ],
      },
    ]);
    await screen.findByTestId("admin-announcements");
    await user.type(screen.getByTestId("ann-title"), DRAFT.title);
    await user.type(screen.getByTestId("ann-body"), DRAFT.body);
    await user.click(screen.getByTestId("ann-preview"));
    await user.click(screen.getByTestId("preview-save"));
    expect(await screen.findByTestId("draft-row")).toBeInTheDocument();

    // Confirm gate first — no PATCH before it.
    await user.click(screen.getByTestId(`publish-${DRAFT.id}`));
    expect(screen.getByTestId("publish-dialog")).toBeInTheDocument();
    expect(screen.getByText(/one push broadcast will be dispatched/i)).toBeInTheDocument();
    await user.click(screen.getByTestId("publish-confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("draft-row")).toHaveTextContent("Published");
    });
    // Publish button is gone after the transition.
    expect(screen.queryByTestId(`publish-${DRAFT.id}`)).not.toBeInTheDocument();
  });

  it("deletes a draft with DELETE and drops the row", async () => {
    const user = userEvent.setup();
    setup([
      {
        url: `/announcements/${DRAFT.id}/`,
        answers: [{ status: 204, data: {} }],
      },
      {
        url: "/announcements/",
        answers: [
          { status: 200, data: envelope([], 0) },
          { status: 201, data: DRAFT },
        ],
      },
    ]);
    await screen.findByTestId("admin-announcements");
    await user.type(screen.getByTestId("ann-title"), DRAFT.title);
    await user.type(screen.getByTestId("ann-body"), DRAFT.body);
    await user.click(screen.getByTestId("ann-preview"));
    await user.click(screen.getByTestId("preview-save"));
    expect(await screen.findByTestId("draft-row")).toBeInTheDocument();

    await user.click(screen.getByTestId(`delete-${DRAFT.id}`));
    await waitFor(() => {
      expect(screen.queryByTestId("draft-row")).not.toBeInTheDocument();
    });
  });
});

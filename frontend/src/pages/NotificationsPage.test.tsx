/**
 * NotificationsPage tests (§7.10 + Phase 12's composition rebuild).
 *
 * Behaviour contracts from §7.10 are re-pinned on the new DOM: a row click
 * marks read before navigating, a failed mark-read rolls the optimistic flip
 * back and refuses to navigate, and the shared unread count never lies after
 * `Mark All as Read`. Structure assertions follow the `notification_center`
 * composition: unread pill, underline tab bar, glyph chips, caught-up card.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { getUnreadCount, setUnreadCount } from "@/api/unreadStore";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { routeAdapter } from "@/test/axiosTestHelper";
import type { NotificationItem } from "@/types/notifications";

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n1",
    type: "COMMENT",
    title: "New Comment on Your Post",
    message: "Sai T. commented on 'Anyone from Hyderabad got JL?': 'Mine arrived last week.'",
    is_read: false,
    read_at: null,
    post_id: "p1",
    comment_id: "c1",
    created_at: "2026-09-20T10:00:00Z",
    ...overrides,
  };
}

const UNREAD_REPLY = item();
const UNREAD_MILESTONE = item({
  id: "n2",
  type: "VOTE_MILESTONE",
  title: "Your post reached 40 upvotes",
  message: "",
  post_id: "p2",
  comment_id: null,
});
const READ_REMINDER = item({
  id: "n3",
  type: "TIMELINE_REMINDER",
  title: "Reminder: update your timeline",
  message: "Don't forget to update your timeline if your portal status changed!",
  is_read: true,
  read_at: "2026-09-19T10:00:00Z",
  post_id: null,
  comment_id: null,
});

function envelope(results: NotificationItem[], unread: number, count = results.length) {
  return { count, unread_count: unread, next: null, previous: null, results };
}

function PostProbe(): React.ReactElement {
  const location = useLocation();
  return <div data-testid="post-page">{`${location.pathname}${location.hash}`}</div>;
}

function DashboardProbe(): React.ReactElement {
  return <div data-testid="dashboard-page">dashboard</div>;
}

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/notifications"]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/community/posts/:id" element={<PostProbe />} />
            <Route path="/dashboard" element={<DashboardProbe />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Route order matters: exact paths before the bare list path. The rail's
 *  dashboard fetch is scripted per-test where it matters (failure is
 *  non-fatal, so tests that don't script it just render skeletons). */
function routes(overrides: Parameters<typeof routeAdapter>[0] = []) {
  return [
    { url: "/notifications/read-all/", answers: [{ status: 200, data: { updated_count: 2, message: "ok" } }] },
    { url: "/read/", answers: [{ status: 200, data: { id: "n1", is_read: true, read_at: "now" } }] },
    {
      url: "/notifications/",
      answers: [{ status: 200, data: envelope([UNREAD_REPLY, UNREAD_MILESTONE, READ_REMINDER], 2) }],
    },
    ...overrides,
  ];
}

afterEach(() => {
  localStorage.clear();
  setUnreadCount(0);
});

describe("§7.10 NotificationsPage (notification_center composition)", () => {
  it("renders the composition's header, tabs and row anatomy from the real payload", async () => {
    routeAdapter(routes());
    renderPage();

    expect(await screen.findByTestId("notification-row-n1")).toBeInTheDocument();
    // The composition's header: title + live unread pill (not the old parenthesised form).
    expect(screen.getByRole("heading", { name: /NOTIFICATIONS/ })).toBeInTheDocument();
    expect(screen.getByTestId("unread-pill")).toHaveTextContent("2 UNREAD");
    expect(screen.getByText("All Notifications")).toBeInTheDocument();
    expect(screen.getByText(/Unread Only/)).toBeInTheDocument();

    // Marker dots and lucide glyph chips per row, and the quoted snippet callout.
    expect(screen.getByTestId("marker-unread-n1")).toBeInTheDocument();
    expect(screen.getByTestId("marker-read-n3")).toBeInTheDocument();
    expect(screen.getByTestId("notification-glyph-n2")).toBeInTheDocument();
    const snippet = screen.getByTestId("notification-snippet-n1");
    expect(snippet).toHaveTextContent("Mine arrived last week.");
    // A row with no message renders no quoted line.
    expect(screen.queryByTestId("notification-snippet-n2")).not.toBeInTheDocument();

    // The API's count is what the shared store now reports (the bell's source).
    expect(getUnreadCount()).toBe(2);
  });

  it("marks the row read before navigating to its post anchor", async () => {
    const { calls } = routeAdapter(routes());
    renderPage();

    await userEvent.click(await screen.findByTestId("notification-row-n1"));

    expect(await screen.findByTestId("post-page")).toHaveTextContent("/community/posts/p1#comment-c1");
    const readCalls = calls.filter((call) => String(call.url).includes("/notifications/n1/read/"));
    expect(readCalls).toHaveLength(1);
    expect(String(readCalls[0]?.method).toLowerCase()).toBe("post");
    // The badge source dropped by exactly the one row that was unread.
    expect(getUnreadCount()).toBe(1);
  });

  it("navigates without a read call when the row is already read", async () => {
    const { calls } = routeAdapter(routes());
    renderPage();

    await userEvent.click(await screen.findByTestId("notification-row-n3"));

    // n3 has no post — §7.10's fallback target is the dashboard.
    expect(await screen.findByTestId("dashboard-page")).toBeInTheDocument();
    expect(calls.filter((call) => String(call.url).includes("/read/"))).toHaveLength(0);
  });

  it("rolls the optimistic flip back and refuses to navigate when mark-read fails", async () => {
    routeAdapter([
      { url: "/read/", answers: [{ status: 500, data: { error: { code: "X", message: "boom" } } }] },
      {
        url: "/notifications/",
        answers: [{ status: 200, data: envelope([UNREAD_REPLY], 1) }],
      },
    ]);
    renderPage();

    await userEvent.click(await screen.findByTestId("notification-row-n1"));

    // The optimistic state is rolled back …
    await waitFor(() => {
      expect(screen.getByTestId("marker-unread-n1")).toBeInTheDocument();
    });
    expect(getUnreadCount()).toBe(1);
    // … the user is told …
    expect(await screen.findByTestId("toast")).toHaveTextContent(
      "That notification could not be marked as read.",
    );
    // … and no navigation happened.
    expect(screen.queryByTestId("post-page")).not.toBeInTheDocument();
  });

  it("zeroes the count, the badge source and the rows on Mark All as Read", async () => {
    const { calls } = routeAdapter(routes());
    renderPage();

    const button = await screen.findByTestId("mark-all-read");
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("unread-pill")).toHaveTextContent("0 UNREAD");
    });
    expect(getUnreadCount()).toBe(0);
    // A real disabled state, not a fake one.
    expect(screen.getByTestId("mark-all-read")).toBeDisabled();
    // Every rendered row now shows the read marker.
    expect(screen.getByTestId("marker-read-n1")).toBeInTheDocument();
    expect(screen.getByTestId("marker-read-n2")).toBeInTheDocument();
    expect(calls.filter((call) => String(call.url).includes("/read-all/"))).toHaveLength(1);
  });

  it("restores the count when Mark All as Read fails", async () => {
    routeAdapter([
      {
        url: "/notifications/read-all/",
        answers: [{ status: 500, data: { error: { code: "X", message: "boom" } } }],
      },
      {
        url: "/notifications/",
        answers: [{ status: 200, data: envelope([UNREAD_REPLY, READ_REMINDER], 1) }],
      },
    ]);
    renderPage();

    const button = await screen.findByTestId("mark-all-read");
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("toast")).toHaveTextContent(
        "Notifications could not be marked as read.",
      );
    });
    // The store must not keep a count the server refused.
    expect(getUnreadCount()).toBe(1);
    expect(screen.getByTestId("marker-unread-n1")).toBeInTheDocument();
    expect(screen.getByTestId("mark-all-read")).toBeEnabled();
  });

  it("requests only unread rows on the Unread Only tab", async () => {
    const { calls } = routeAdapter([
      { url: "/read/", answers: [{ status: 200, data: { id: "n1", is_read: true, read_at: "now" } }] },
      {
        url: "/notifications/",
        answers: [
          { status: 200, data: envelope([UNREAD_REPLY, READ_REMINDER], 1) },
          { status: 200, data: envelope([UNREAD_REPLY], 1) },
        ],
      },
    ]);
    renderPage();

    await screen.findByTestId("notification-row-n1");
    await userEvent.click(screen.getByRole("radio", { name: /Unread Only/ }));

    await waitFor(() => {
      const filtered = calls.filter(
        (call) => (call.params as Record<string, unknown> | undefined)?.is_read === "false",
      );
      expect(filtered).toHaveLength(1);
    });
    // The read row is gone from an unread-only list.
    await waitFor(() => {
      expect(screen.queryByTestId("notification-row-n3")).not.toBeInTheDocument();
    });
  });

  it("shows the spec's empty state and the composition's caught-up card", async () => {
    routeAdapter([
      { url: "/notifications/", answers: [{ status: 200, data: envelope([], 0) }] },
    ]);
    renderPage();

    expect(await screen.findByTestId("empty-state")).toHaveTextContent("You're all caught up!");
    expect(screen.getByText("No new notifications at this time.")).toBeInTheDocument();
    expect(screen.getByTestId("mark-all-read")).toBeDisabled();
    expect(screen.getByTestId("unread-pill")).toHaveTextContent("0 UNREAD");
  });
});

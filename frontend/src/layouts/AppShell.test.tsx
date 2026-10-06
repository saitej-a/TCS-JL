/**
 * AppShell tests: the §5.5 banner (show → dismiss → persisted across remount;
 * a new announcement id shows again), the §5.4 tab bar's presence and 44px
 * targets, the footer disclaimer at the shell level, D2 (no staff links), and
 * §7.10's bell (badge only for a signed-in reader).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { setUnreadCount } from "@/api/unreadStore";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/layouts/AppShell";
import { routeAdapter, scriptAdapter } from "@/test/axiosTestHelper";

const ANNOUNCEMENT = {
  id: "a-1",
  title: "NOTICE: JL dispatch wave",
  body: "Hyderabad region reports dispatches.",
  is_pinned: true,
  published_at: "2026-09-01T00:00:00Z",
  expires_at: null,
};

function renderShell(path = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AppShell>
                <p>page-content</p>
              </AppShell>
            }
          />
          <Route path="/notifications" element={<p>notifications-here</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function scriptAnnouncements(items: unknown[]): void {
  scriptAdapter([
    { url: "/announcements/", respond: () => ({ status: 200, data: { count: items.length, next: null, previous: null, results: items } }) },
  ]);
}

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // The unread count is module state, shared across every page in the app.
    setUnreadCount(0);
  });

  it("renders content, the mobile tab bar, and the footer disclaimer", async () => {
    scriptAnnouncements([]);
    renderShell();
    expect(screen.getByText("page-content")).toBeInTheDocument();
    await waitFor(() => {
      const menuButton = screen.getByTestId("mobile-menu-button");
      expect(menuButton).toBeInTheDocument();
      expect(menuButton.querySelector("svg")).toBeInTheDocument();
      expect(screen.getByRole("banner")).toHaveClass("px-8", "py-3", "shadow-sm");
    });
    expect(screen.getByTestId("disclaimer-footer")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("shows the latest announcement with a Read update link", async () => {
    scriptAnnouncements([ANNOUNCEMENT]);
    renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("announcement-banner")).toHaveTextContent("NOTICE: JL dispatch wave");
    });
    expect(screen.getByText("Read update")).toBeInTheDocument();
  });

  it("persists dismissal per announcement id and re-shows a new id", async () => {
    const user = userEvent.setup();
    scriptAnnouncements([ANNOUNCEMENT]);
    const { unmount } = renderShell();
    await waitFor(() => screen.getByTestId("announcement-banner"));
    await user.click(screen.getByTestId("dismiss-announcement"));
    expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument();

    // Remount = reload: the same id stays dismissed.
    scriptAnnouncements([ANNOUNCEMENT]);
    unmount();
    renderShell();
    expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("tjt.dismissed_announcements") ?? "[]")).toEqual(["a-1"]);

    // A NEW announcement id is shown (per-announcement dismissal, 9.2 D3).
    scriptAnnouncements([{ ...ANNOUNCEMENT, id: "a-2", title: "Fresh notice" }]);
    unmount();
    renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("announcement-banner")).toHaveTextContent("Fresh notice");
    });
  });

  it("degrades silently when the announcements API fails", async () => {
    scriptAdapter([
      {
        url: "/announcements/",
        respond: () => ({ status: 500, data: { error: { code: "UNKNOWN", message: "x" } } }),
      },
    ]);
    renderShell();
    await waitFor(() => {
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument();
    });
    expect(screen.getByText("page-content")).toBeInTheDocument();
  });

  it("ships no staff navigation (D2)", async () => {
    scriptAnnouncements([]);
    renderShell();
    await waitFor(() => screen.getByRole("navigation", { name: "Primary" }));
    expect(screen.queryByText(/moderation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
  });

  it("shows no unread badge to a visitor, and sends the bell through login", async () => {
    scriptAnnouncements([]);
    renderShell();

    const bells = await screen.findAllByTestId("notification-bell");
    expect(bells).toHaveLength(2); // the mobile app bar and the desktop cluster
    expect(screen.queryAllByTestId("notification-badge")).toHaveLength(0);
    for (const bell of bells) {
      expect(bell).toHaveAttribute("href", "/login?next=%2Fnotifications");
    }
  });

  it("shows the unread badge when authenticated, fed by the notification API", async () => {
    // Routed (not ordered) fake: the shell's two reads race on mount.
    routeAdapter([
      {
        url: "/auth/token/refresh/",
        answers: [{ status: 200, data: { access: "a1", refresh: "r1" } }],
      },
      {
        url: "/me/",
        answers: [
          {
            status: 200,
            data: {
              id: "u1",
              email: "e@x.io",
              is_verified: true,
              created_at: "t",
              profile_completed: true,
            },
          },
        ],
      },
      { url: "/announcements/", answers: [{ status: 200, data: { count: 0, next: null, previous: null, results: [] } }] },
      {
        url: "/notifications/",
        answers: [
          {
            status: 200,
            data: { count: 3, unread_count: 3, next: null, previous: null, results: [] },
          },
        ],
      },
    ]);
    window.localStorage.setItem("tjt.refresh_token", "stored-refresh");
    renderShell();

    await waitFor(() => {
      expect(screen.getAllByTestId("notification-badge")).toHaveLength(2);
    });
    expect(screen.getAllByTestId("notification-badge")[0]).toHaveTextContent("3");
    for (const bell of screen.getAllByTestId("notification-bell")) {
      expect(bell).toHaveAttribute("href", "/notifications");
    }
  });
});

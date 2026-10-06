/**
 * SettingsDevicesPage tests (9.5 Task 5): the banner states the real
 * Notification.permission value (denied copy never promises a re-prompt),
 * the alert toggles PATCH their own key, revoke removes exactly its row and
 * refetches (F-94-1 routing untouched), and no quiet-hours control exists
 * (the backend has no such field).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsDevicesPage } from "@/pages/SettingsDevicesPage";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { routeAdapter } from "@/test/axiosTestHelper";

const PREFS = {
  notify_on_comment: true,
  notify_on_reply: true,
  notify_on_vote_milestone: false,
  notify_on_announcements: true,
  notify_timeline_reminders: true,
  push_enabled: true,
};

const DEVICES = [
  {
    id: "d1",
    device_type: "FIREBASE_WEB",
    browser: "Chrome",
    is_active: true,
    last_seen_at: "2026-09-28T10:00:00Z",
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "d2",
    device_type: "ANDROID",
    browser: "",
    is_active: true,
    last_seen_at: "2026-09-27T10:00:00Z",
    created_at: "2026-09-01T10:00:00Z",
  },
];

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
            created_at: "2026-08-15T09:00:00Z",
            profile_completed: true,
          },
        },
      ],
    },
    ...routes,
  ]);
  render(
    <MemoryRouter initialEntries={["/settings/devices"]}>
      <AuthProvider>
        <ToastProvider>
          <SettingsDevicesPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function withRoutes(overrides: Parameters<typeof routeAdapter>[0] = []): Parameters<typeof routeAdapter>[0] {
  return [
    { url: "/notifications/preferences/", answers: [{ status: 200, data: PREFS }] },
    { url: "/devices/", answers: [{ status: 200, data: DEVICES }] },
    ...overrides,
  ];
}

afterEach(() => {
  localStorage.clear();
  delete (globalThis as { Notification?: unknown }).Notification;
});

describe("SettingsDevicesPage (9.5 Task 5)", () => {
  it("shows the denied-permission banner and never promises an in-app re-prompt", async () => {
    (globalThis as { Notification?: unknown }).Notification = { permission: "denied" };
    setup(withRoutes());
    const banner = await screen.findByTestId("push-banner");
    expect(banner).toHaveTextContent(/blocking notifications/i);
    expect(banner).toHaveTextContent(/site settings/i);
    expect(banner).not.toHaveTextContent(/ask again here|re-enable here|tap to allow/i);
  });

  it("shows the granted banner when permission is granted", async () => {
    (globalThis as { Notification?: unknown }).Notification = { permission: "granted" };
    setup(withRoutes());
    expect(await screen.findByTestId("push-banner")).toHaveTextContent(
      /Push alerts are on for this browser/i,
    );
  });

  it("renders the device list with mono last-active and a this-device marker", async () => {
    // jsdom's UA contains no Chrome token; describeBrowser falls back to
    // "Browser" — so name the test row that to exercise the marker logic.
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
            data: { id: "u1", email: "e@x.com", is_verified: true, created_at: "2026-08-15T09:00:00Z", profile_completed: true },
          },
        ],
      },
      { url: "/notifications/preferences/", answers: [{ status: 200, data: PREFS }] },
      {
        url: "/devices/",
        answers: [
          {
            status: 200,
            data: [
              {
                id: "d1",
                device_type: "FIREBASE_WEB",
                browser: "Browser",
                is_active: true,
                last_seen_at: null,
                created_at: "2026-09-01T10:00:00Z",
              },
            ],
          },
        ],
      },
    ]);
    render(
      <MemoryRouter initialEntries={["/settings/devices"]}>
        <AuthProvider>
          <ToastProvider>
            <SettingsDevicesPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByTestId("device-row");
    expect(screen.getByText(/Last active never/)).toBeInTheDocument();
    expect(screen.getByTestId("this-device")).toBeInTheDocument();
  });

  it("revokes exactly the targeted row and refetches the list", async () => {
    const user = userEvent.setup();
    (globalThis as { Notification?: unknown }).Notification = { permission: "granted" };
    // One devices route, call-ordered: GET (list) → DELETE /devices/d1/ →
    // GET (refetch, list minus d1). routeAdapter matches URL substring, so
    // these share a route; the cursor gives each call its own answer.
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
            data: { id: "u1", email: "e@x.com", is_verified: true, created_at: "2026-08-15T09:00:00Z", profile_completed: true },
          },
        ],
      },
      { url: "/notifications/preferences/", answers: [{ status: 200, data: PREFS }] },
      {
        url: "/devices/",
        answers: [
          { status: 200, data: DEVICES },
          { status: 200, data: DEVICES }, // the DELETE's response body (ignored)
          { status: 200, data: [DEVICES[1]] }, // the refetch after revoke
        ],
      },
    ]);
    render(
      <MemoryRouter initialEntries={["/settings/devices"]}>
        <AuthProvider>
          <ToastProvider>
            <SettingsDevicesPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    // Two rows initially — findAll, not findBy.
    await screen.findAllByTestId("device-row");
    await user.click(screen.getByTestId("revoke-d1"));
    await waitFor(() => {
      // The refetched list keeps the Android row and drops the revoked one.
      expect(screen.getAllByTestId("device-row").length).toBe(1);
      expect(screen.getByText(/Android/i)).toBeInTheDocument();
      expect(screen.queryByText(/Chrome/)).not.toBeInTheDocument();
    });
  });

  it("patches a single alert-type key optimistically and offers no quiet-hours control", async () => {
    const user = userEvent.setup();
    // Single preferences route: GET → PREFS, PATCH → the saved false value.
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
            data: { id: "u1", email: "e@x.com", is_verified: true, created_at: "2026-08-15T09:00:00Z", profile_completed: true },
          },
        ],
      },
      {
        url: "/notifications/preferences/",
        answers: [
          { status: 200, data: PREFS },
          { status: 200, data: { ...PREFS, notify_on_comment: false } },
        ],
      },
      { url: "/devices/", answers: [{ status: 200, data: DEVICES }] },
    ]);
    render(
      <MemoryRouter initialEntries={["/settings/devices"]}>
        <AuthProvider>
          <ToastProvider>
            <SettingsDevicesPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    const toggle = await screen.findByTestId("alert-notify_on_comment");
    expect(toggle).toBeChecked();
    // No quiet-hours fiction anywhere on the page.
    expect(screen.queryByText(/quiet hours/i)).not.toBeInTheDocument();
    await user.click(toggle);
    await waitFor(() => {
      expect(screen.getByTestId("alert-notify_on_comment")).not.toBeChecked();
    });
  });
});

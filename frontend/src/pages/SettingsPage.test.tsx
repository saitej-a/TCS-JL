/**
 * SettingsPage tests (9.5 Task 2): the hub's honesty contract — status lines
 * sourced from real APIs (device count, profile category/joining date, the
 * browser's actual Notification.permission), explicit "unknown" on failure,
 * masked email, and the loading state between mount and data.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsPage } from "@/pages/SettingsPage";
import { AuthProvider } from "@/context/AuthContext";
import { routeAdapter } from "@/test/axiosTestHelper";
import { PUSH_DENIED_FLAG } from "@/pwa/pushClient";

/** The authenticated boot: refresh → /me/, like the other page suites. */
const AUTH_ROUTES = [
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
];

function renderSettings(): void {
  render(
    <MemoryRouter initialEntries={["/settings"]}>
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const PROFILE = {
  id: "p1",
  display_name: "Sai T.",
  public_identity_mode: "DISPLAY_NAME",
  batch: "2025",
  hiring_type: "DIGITAL",
  region: "Hyderabad",
  interview_center: "HYD",
  interview_date: null,
  joining_location: "",
  current_status: "WAITING_FOR_JOINING_LETTER",
  offer_letter_date: null,
  expected_joining_date: "2026-11-02",
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

const DEVICES = [
  { id: "d1", device_type: "WEB", browser: "Chrome", is_active: true, last_seen_at: null, created_at: "2026-09-01T10:00:00Z" },
  { id: "d2", device_type: "WEB", browser: "Firefox", is_active: true, last_seen_at: null, created_at: "2026-09-01T10:00:00Z" },
  { id: "d3", device_type: "WEB", browser: "Edge", is_active: false, last_seen_at: null, created_at: "2026-09-01T10:00:00Z" },
];

afterEach(() => {
  localStorage.removeItem(PUSH_DENIED_FLAG);
  localStorage.removeItem("tjt.refresh_token");
  delete (globalThis as { Notification?: unknown }).Notification;
});

function authed(): void {
  localStorage.setItem("tjt.refresh_token", "test-refresh");
}

describe("SettingsPage (9.5 Task 2)", () => {
  it("renders the loading state before data arrives (no fake status lines)", () => {
    authed();
    routeAdapter([
      ...AUTH_ROUTES,
      { url: "/profile/", answers: [{ status: 200, data: PROFILE }] },
      { url: "/devices/", answers: [{ status: 200, data: DEVICES }] },
    ]);
    renderSettings();
    // During load: no device count and no category line — explicit unknown or skeleton only.
    expect(screen.getByText(/devices unknown/i)).toBeInTheDocument();
    expect(screen.queryByText(/2 active devices/i)).not.toBeInTheDocument();
  });

  it("shows real status lines: profile category + joining date, active device count, push state", async () => {
    authed();
    routeAdapter([
      ...AUTH_ROUTES,
      { url: "/profile/", answers: [{ status: 200, data: PROFILE }] },
      { url: "/devices/", answers: [{ status: 200, data: DEVICES }] },
    ]);
    (globalThis as { Notification?: unknown }).Notification = { permission: "granted" };
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText(/DIGITAL • Joining date 2026-11-02/i)).toBeInTheDocument();
    });
    // Only the two ACTIVE devices count (the deactivated row is excluded).
    expect(screen.getByText(/2 active devices/i)).toBeInTheDocument();
    expect(screen.getByText(/Push on/i)).toBeInTheDocument();
    // The cards deep-link to their routes.
    expect(screen.getByTestId("card-profile").getAttribute("href")).toBe("/settings/profile");
    expect(screen.getByTestId("card-devices").getAttribute("href")).toBe("/settings/devices");
    expect(screen.getByTestId("card-danger").getAttribute("href")).toBe("/settings/danger");
  });

  it("renders explicit unknown states when the APIs fail (never a hard-coded count)", async () => {
    authed();
    routeAdapter([
      ...AUTH_ROUTES,
      { url: "/profile/", answers: [{ status: 500, data: {} }] },
      { url: "/devices/", answers: [{ status: 500, data: {} }] },
    ]);
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText(/devices unknown/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Category and joining date unknown/i)).toBeInTheDocument();
    expect(screen.getByText(/Visibility state unknown/i)).toBeInTheDocument();
  });

  it("masks the email and reports the browser's real permission value", async () => {
    authed();
    routeAdapter([
      ...AUTH_ROUTES,
      { url: "/profile/", answers: [{ status: 200, data: PROFILE }] },
      { url: "/devices/", answers: [{ status: 200, data: DEVICES }] },
    ]);
    (globalThis as { Notification?: unknown }).Notification = { permission: "denied" };
    localStorage.setItem(PUSH_DENIED_FLAG, "1");
    renderSettings();
    // Masked: local part collapses to first char + *** (never the full address).
    // It renders after the async auth boot, hence waitFor.
    await waitFor(() => {
      expect(screen.getByText("u***@example.com")).toBeInTheDocument();
    });
    expect(screen.queryByText("uat93@example.com")).not.toBeInTheDocument();
    expect(screen.getByText(/Blocked/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Alerts are off in this browser's site settings/i),
    ).toBeInTheDocument();
  });
});

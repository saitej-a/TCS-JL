/**
 * SettingsSecurityPage tests (9.5 Task 6): destructive/security actions carry
 * an explicit confirm step (sign-out-everywhere two-step), the password row
 * drives the email reset flow (the only change path the API offers), and the
 * 2FA/session rows state their unavailability instead of faking controls.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsSecurityPage } from "@/pages/SettingsSecurityPage";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { routeAdapter } from "@/test/axiosTestHelper";

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
  // Plain MemoryRouter (not a data router): this page uses useNavigate only,
  // and data routers construct Request objects with jsdom AbortSignals that
  // node's undici rejects during navigation.
  render(
    <MemoryRouter initialEntries={["/settings/security"]}>
      <Routes>
        <Route
          path="/settings/security"
          element={
            <AuthProvider>
              <ToastProvider>
                <SettingsSecurityPage />
              </ToastProvider>
            </AuthProvider>
          }
        />
        <Route path="/login" element={<div data-testid="login-page">login</div>} />
        <Route path="*" element={<div data-testid="other-page">other</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
});

describe("SettingsSecurityPage (9.5 Task 6)", () => {
  it("requires an explicit confirm before sign-out-everywhere, then signs out", async () => {
    const user = userEvent.setup();    setup([{ url: "/auth/logout/", answers: [{ status: 204, data: "" }]}]);
    await screen.findByTestId("signout-everywhere");
    // One click: only the confirm appears — nothing has signed out yet.
    await user.click(screen.getByTestId("signout-everywhere"));
    expect(screen.getByTestId("signout-confirm")).toBeInTheDocument();
    // queryBy for the negative assertion — getBy throws when absent.
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    // Second click commits, and the user lands on /login.
    await user.click(screen.getByTestId("signout-confirm-yes"));
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  it("sends the password reset to the sign-in email when asked", async () => {
    const user = userEvent.setup();
    setup([
      {
        url: "/auth/password-reset/request/",
        answers: [{ status: 200, data: null }],
      },
    ]);
    await screen.findByTestId("request-reset");
    await user.click(screen.getByTestId("request-reset"));
    await waitFor(() => {
      expect(screen.getByTestId("reset-sent")).toBeInTheDocument();
    });
  });

  it("states 2FA and session-list unavailability instead of faking controls", async () => {
    setup([]);
    await screen.findByText(/Two-factor authentication/);
    expect(screen.getByText(/Not available yet\. 2FA is planned/)).toBeInTheDocument();
    expect(screen.getByText(/rotating tokens, not a session list/)).toBeInTheDocument();
    // No fake toggles for either row.
    expect(screen.queryByRole("switch", { name: /two-factor/i })).not.toBeInTheDocument();
  });
});

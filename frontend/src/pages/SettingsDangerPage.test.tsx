/**
 * SettingsDangerPage tests (9.5 Task 7): deletion is the highest-consequence
 * action in the product — the confirm cannot be satisfied by a single click
 * (typed DELETE + understanding checkbox + password re-auth, in that order),
 * the button is disabled until every condition is met, the copy matches the
 * real contract (immediate anonymization — no grace period), and the abort
 * path clears all three steps.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsDangerPage } from "@/pages/SettingsDangerPage";
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
  render(
    <MemoryRouter initialEntries={["/settings/danger"]}>
      <Routes>
        <Route
          path="/settings/danger"
          element={
            <AuthProvider>
              <ToastProvider>
                <SettingsDangerPage />
              </ToastProvider>
            </AuthProvider>
          }
        />
        <Route path="/login" element={<div data-testid="login-page">login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
});

describe("SettingsDangerPage (9.5 Task 7)", () => {
  it("keeps delete disabled until typed DELETE, checkbox and password are all present", async () => {
    const user = userEvent.setup();
    setup([]);
    await screen.findByTestId("delete-account-btn");
    const del = screen.getByTestId("delete-account-btn");
    expect(del).toBeDisabled();

    await user.type(screen.getByTestId("delete-confirm-input"), "DELETE");
    expect(del).toBeDisabled(); // checkbox still off

    await user.click(screen.getByTestId("delete-understands"));
    expect(del).toBeDisabled(); // password still empty

    await user.type(screen.getByTestId("delete-password"), "hunter2!");
    expect(del).toBeEnabled();

    // Wrong typed word keeps it locked even with everything else present —
    // and clearing the word re-locks the checkbox (deliberate re-arm step).
    await user.clear(screen.getByTestId("delete-confirm-input"));
    await user.type(screen.getByTestId("delete-confirm-input"), "delete");
    expect(del).toBeDisabled(); // case-sensitive
    expect(screen.getByTestId("delete-understands")).not.toBeChecked();

    // Full re-arm: retype DELETE, re-accept, still needs the password intact.
    await user.clear(screen.getByTestId("delete-confirm-input"));
    await user.type(screen.getByTestId("delete-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("delete-understands"));
    expect(del).toBeEnabled();
  });

  it("states immediate anonymization, no grace period, and no fake export", async () => {
    setup([]);
    await screen.findByText(/immediate and permanent/i);
    expect(screen.getByText(/no grace period and no undelete/i)).toBeInTheDocument();
    expect(
      screen.getByText(/tombstone records/i),
    ).toBeInTheDocument();
    // Export row: honest unavailability, no fake request button.
    expect(screen.getByText(/Not available yet\. Data export needs/)).toBeInTheDocument();
    expect(screen.queryByTestId("export-request")).not.toBeInTheDocument();
  });

  it("deletes with the password and lands on /login on success", async () => {
    const user = userEvent.setup();
    setup([{ url: "/account/", answers: [{ status: 204, data: "" }] }]);
    await screen.findByTestId("delete-account-btn");
    await user.type(screen.getByTestId("delete-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("delete-understands"));
    await user.type(screen.getByTestId("delete-password"), "hunter2!");
    await user.click(screen.getByTestId("delete-account-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  it("surfaces the generic failure toast and stays on the page (abort path intact)", async () => {
    const user = userEvent.setup();
    setup([
      { url: "/account/", answers: [{ status: 403, data: { detail: "x" } }] },
    ]);
    await screen.findByTestId("delete-account-btn");
    await user.type(screen.getByTestId("delete-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("delete-understands"));
    await user.type(screen.getByTestId("delete-password"), "wrong!");
    await user.click(screen.getByTestId("delete-account-btn"));
    // Failure: stay on the page with the generic toast (no hint which credential was wrong).
    expect(await screen.findByRole("alert")).toHaveTextContent(/did not match your account/i);
    expect(screen.getByTestId("delete-account-btn")).toBeEnabled();
    // The abort path clears every step.
    await user.click(screen.getByTestId("delete-abort"));
    expect(screen.getByTestId("delete-confirm-input")).toHaveValue("");
    expect(screen.getByTestId("delete-understands")).not.toBeChecked();
    expect(screen.getByTestId("delete-password")).toHaveValue("");
    expect(screen.getByTestId("delete-account-btn")).toBeDisabled();
  });
});

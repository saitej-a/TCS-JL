/**
 * ResetPasswordPage tests (9.5.1 Tasks 3): the real shared password policy
 * gates submission, the copy states the real 60-minute single-use window,
 * and the invalid-link path echoes the attempted token in a wrapping-safe pill.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { scriptAdapter } from "@/test/axiosTestHelper";

const LONG_TOKEN =
  "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6-this-is-deliberately-long";

function renderReset(token = "tok-valid-1") {
  return render(
    <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/login" element={<p>login-here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  it("states the real 60-minute, single-use window in the subtitle", () => {
    renderReset();
    expect(screen.getByText(/time-limited and single-use/)).toBeInTheDocument();
    expect(screen.getByText(/60 minutes/)).toBeInTheDocument();
  });

  it("blocks submission and names the missing rule for a weak password", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([]); // any request = failure
    renderReset();
    await user.type(screen.getByLabelText("New password"), "weakpass");
    await user.type(screen.getByLabelText("Confirm new password"), "weakpass");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Password needs");
    });
    expect(screen.getByTestId("password-rules")).toBeInTheDocument();
    expect(screen.getByTestId("rule-upper")).toHaveTextContent("missing");
    expect(calls).toHaveLength(0);
  });

  it("renders the attempted token in a wrapping-safe pill on the invalid-link path", async () => {
    const user = userEvent.setup();
    scriptAdapter([
      {
        url: "/auth/password-reset/confirm/",
        respond: () => ({
          status: 400,
          data: {
            error: { code: "TOKEN_INVALID", message: "Reset link is invalid or has expired." },
          },
        }),
      },
    ]);
    renderReset(LONG_TOKEN);
    await user.type(screen.getByLabelText("New password"), "Str0ng!Pass");
    await user.type(screen.getByLabelText("Confirm new password"), "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This reset link is invalid or has expired. Request a new one.",
      );
    });
    const pill = screen.getByTestId("attempted-token");
    expect(pill).toHaveTextContent(LONG_TOKEN);
    expect(pill.className).toContain("overflow-wrap:anywhere");
    expect(pill.className).not.toContain("word-break");
  });

  it("keeps the reveal toggle on both password fields (Input backstop)", () => {
    renderReset();
    const toggles = screen.getAllByRole("button", { name: "Toggle password visibility" });
    expect(toggles).toHaveLength(2);
    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute("aria-pressed");
    }
  });

  it("navigates to /login on success", async () => {
    const user = userEvent.setup();
    scriptAdapter([
      {
        url: "/auth/password-reset/confirm/",
        respond: () => ({ status: 204, data: null }),
      },
    ]);
    renderReset();
    await user.type(screen.getByLabelText("New password"), "Str0ng!Pass");
    await user.type(screen.getByLabelText("Confirm new password"), "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    await waitFor(() => {
      expect(screen.getByText("login-here")).toBeInTheDocument();
    });
  });
});

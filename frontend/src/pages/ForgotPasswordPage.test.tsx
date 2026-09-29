/**
 * ForgotPasswordPage tests (Phase 12 Task 3 — the suite the screen never had).
 * Pins the rebuilt composition DOM, the submit call shape, the
 * enumeration-safe success behavior, and the back-to-sign-in affordance.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { scriptAdapter } from "@/test/axiosTestHelper";

function renderForgot() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<p>login-here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  it("renders the composition's heading, field, and CTA", () => {
    renderForgot();
    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
    expect(screen.getByText("Back to sign in")).toBeInTheDocument();
  });

  it("posts the typed email to the reset endpoint", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([
      { url: "/auth/password-reset/request/", respond: () => ({ status: 204, data: null }) },
    ]);
    renderForgot();
    await user.type(screen.getByLabelText("Email address"), "cand@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "If that email exists, a reset link is on its way.",
      );
    });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0].data))).toMatchObject({ email: "cand@example.com" });
  });

  it("presents the same success state when the request fails (enumeration-safe)", async () => {
    const user = userEvent.setup();
    scriptAdapter([
      {
        url: "/auth/password-reset/request/",
        respond: () => ({
          status: 400,
          data: { error: { code: "VALIDATION", message: "bad email" } },
        }),
      },
    ]);
    renderForgot();
    await user.type(screen.getByLabelText("Email address"), "ghost@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "If that email exists, a reset link is on its way.",
      );
    });
    // No error strip may appear — the enumeration-safe contract.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not submit with an empty field", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([]);
    renderForgot();
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(calls).toHaveLength(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("links back to sign in", async () => {
    const user = userEvent.setup();
    renderForgot();
    await user.click(screen.getByText("Back to sign in"));
    expect(screen.getByText("login-here")).toBeInTheDocument();
  });
});
